/* eslint-disable @typescript-eslint/tslint/config */
/********************************************************************************
 * Copyright (C) 2020 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable max-len */

import CoreURI from '@theia/core/lib/common/uri';
import { injectable } from 'inversify';
import {
    IFileService, IFileSystemProvider, IResolveMetadataFileOptions, IFileStatWithMetadata, IResolveFileOptions, IFileStat, IFileContent, FileDeleteOptions, IWriteFileOptions,
    IFileSystemProviderWithFileReadWriteCapability, IFileSystemProviderWithOpenReadWriteCloseCapability, FileOperationError, FileOperationResult, FileSystemProviderCapabilities,
    hasOpenReadWriteCloseCapability, hasFileFolderCopyCapability, hasReadWriteCapability, IStat, FileType, ETAG_DISABLED, etag,
    FileSystemProviderErrorCode, toFileSystemProviderErrorCode, ensureFileSystemProviderError, toFileOperationResult
} from '../../common/files';
import { Disposable } from '@theia/core/src/common';
import { URI } from 'vscode-uri';
import { VSBuffer, VSBufferReadable, bufferToReadable } from '../../common/buffer';
import { Schemes as Schemas } from '../../common/uri-components';

const isAbsolutePath = (resource: URI) => new CoreURI(resource).path.isAbsolute;
const isEqual = (resource: URI, resource2: URI) => {
    const relativePath = new CoreURI(resource).relative(new CoreURI(resource2));
    return relativePath && relativePath.toString() === '';
};
const dirname = (resource: URI) => new CoreURI(resource).parent['codeUri'];
const basename = (resource: URI) => new CoreURI(resource).path.base;
const joinPath = (resource: URI, ...pathFragment: string[]) => {
    const coreUri = new CoreURI(resource);
    return coreUri.withPath(coreUri.path.join(...pathFragment))['codeUri'];
};

@injectable()
export class PluginFileService implements IFileService {

    private readonly provider = new Map<string, IFileSystemProvider>();

    registerProvider(scheme: string, provider: IFileSystemProvider): Disposable {
        throw new Error("Method not implemented.");
    }

    async activateProvider(scheme: string): Promise<void> {

        // Emit an event that we are about to activate a provider with the given scheme.
        // Listeners can participate in the activation by registering a provider for it.
        const joiners: Promise<void>[] = [];
        this._onWillActivateFileSystemProvider.fire({
            scheme,
            join(promise) {
                if (promise) {
                    joiners.push(promise);
                }
            },
        });

        if (this.provider.has(scheme)) {
            return; // provider is already here so we can return directly
        }

        // If the provider is not yet there, make sure to join on the listeners assuming
        // that it takes a bit longer to register the file system provider.
        await Promise.all(joiners);
    }

    canHandleResource(resource: URI): boolean {
        return this.provider.has(resource.scheme);
    }

    hasCapability(resource: URI, capability: FileSystemProviderCapabilities): boolean {
        const provider = this.provider.get(resource.scheme);

        return !!(provider && (provider.capabilities & capability));
    }

    protected async withProvider(resource: URI): Promise<IFileSystemProvider> {
        // Assert path is absolute
        if (!isAbsolutePath(resource)) {
            throw new FileOperationError(`Unable to resolve filesystem provider with relative file path ${this.resourceForError(resource)}`, FileOperationResult.FILE_INVALID_PATH);
        }

        // Activate provider
        await this.activateProvider(resource.scheme);

        // Assert provider
        const provider = this.provider.get(resource.scheme);
        if (!provider) {
            const error = new Error();
            error.name = 'ENOPRO';
            error.message = `No file system provider found for resource ${resource.toString()}`;

            throw error;
        }

        return provider;
    }

    private async withWriteProvider(resource: URI): Promise<IFileSystemProviderWithFileReadWriteCapability | IFileSystemProviderWithOpenReadWriteCloseCapability> {
        const provider = await this.withProvider(resource);
        if (hasOpenReadWriteCloseCapability(provider) || hasReadWriteCapability(provider)) {
            return provider;
        }

        throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither has FileReadWrite nor FileOpenReadWriteClose capability which is needed for the write operation.`);
    }

    resolve(resource: URI, options: IResolveMetadataFileOptions): Promise<IFileStatWithMetadata>;
    resolve(resource: URI, options?: IResolveFileOptions | undefined): Promise<IFileStat>;
    resolve(resource: any, options?: any) {
        throw new Error("Method not implemented.");
    }

    async writeFile(resource: URI, buffer: VSBuffer, options?: IWriteFileOptions): Promise<IFileStatWithMetadata> {
        const provider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(resource), resource);

        try {

            // validate write
            const stat = await this.validateWriteFile(provider, resource, options);

            // mkdir recursively as needed
            if (!stat) {
                await this.mkdirp(provider, dirname(resource));
            }

            // write file: unbuffered (only if data to write is a buffer, or the provider has no buffered write capability)
            if (!hasOpenReadWriteCloseCapability(provider) || (hasReadWriteCapability(provider) && buffer instanceof VSBuffer)) {
                await this.doWriteUnbuffered(provider, resource, buffer);
            }

            // write file: buffered
            else {
                await this.doWriteBuffered(provider, resource, bufferToReadable(buffer));
            }
        } catch (error) {
            throw new FileOperationError(`Unable to write file ${this.resourceForError(resource)} (${ensureFileSystemProviderError(error).toString()})`, toFileOperationResult(error), options);
        }

        return this.resolve(resource, { resolveMetadata: true });
    }

    private async validateWriteFile(provider: IFileSystemProvider, resource: URI, options?: IWriteFileOptions): Promise<IStat | undefined> {
        let stat: IStat | undefined = undefined;
        try {
            stat = await provider.stat(resource);
        } catch (error) {
            return undefined; // file might not exist
        }

        // file cannot be directory
        if ((stat.type & FileType.Directory) !== 0) {
            throw new FileOperationError(`Unable to write file ${this.resourceForError(resource)} that is actually a directory`, FileOperationResult.FILE_IS_DIRECTORY, options);
        }

        // Dirty write prevention: if the file on disk has been changed and does not match our expected
        // mtime and etag, we bail out to prevent dirty writing.
        //
        // First, we check for a mtime that is in the future before we do more checks. The assumption is
        // that only the mtime is an indicator for a file that has changed on disk.
        //
        // Second, if the mtime has advanced, we compare the size of the file on disk with our previous
        // one using the etag() function. Relying only on the mtime check has prooven to produce false
        // positives due to file system weirdness (especially around remote file systems). As such, the
        // check for size is a weaker check because it can return a false negative if the file has changed
        // but to the same length. This is a compromise we take to avoid having to produce checksums of
        // the file content for comparison which would be much slower to compute.
        if (
            options && typeof options.mtime === 'number' && typeof options.etag === 'string' && options.etag !== ETAG_DISABLED &&
            typeof stat.mtime === 'number' && typeof stat.size === 'number' &&
            options.mtime < stat.mtime && options.etag !== etag({ mtime: options.mtime /* not using stat.mtime for a reason, see above */, size: stat.size })
        ) {
            throw new FileOperationError('File Modified Since', FileOperationResult.FILE_MODIFIED_SINCE, options);
        }

        return stat;
    }

    readFile(resource: URI): Promise<IFileContent> {
        throw new Error("Method not implemented.");
    }

    move(source: URI, target: URI, overwrite?: boolean | undefined): Promise<IFileStatWithMetadata> {
        throw new Error("Method not implemented.");
    }
    copy(source: URI, target: URI, overwrite?: boolean | undefined): Promise<IFileStatWithMetadata> {
        throw new Error("Method not implemented.");
    }

    createFolder(resource: URI): Promise<IFileStatWithMetadata> {
        throw new Error("Method not implemented.");
    }

    private async mkdirp(provider: IFileSystemProvider, directory: URI): Promise<void> {
        const directoriesToCreate: string[] = [];

        // mkdir until we reach root
        while (!isEqual(directory, dirname(directory))) {
            try {
                const stat = await provider.stat(directory);
                if ((stat.type & FileType.Directory) === 0) {
                    throw new Error(`Unable to create folder ${this.resourceForError(directory)} that already exists but is not a directory`);
                }

                break; // we have hit a directory that exists -> good
            } catch (error) {

                // Bubble up any other error that is not file not found
                if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileNotFound) {
                    throw error;
                }

                // Upon error, remember directories that need to be created
                directoriesToCreate.push(basename(directory));

                // Continue up
                directory = dirname(directory);
            }
        }

        // Create directories as needed
        for (let i = directoriesToCreate.length - 1; i >= 0; i--) {
            directory = joinPath(directory, directoriesToCreate[i]);

            try {
                await provider.mkdir(directory);
            } catch (error) {
                if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileExists) {
                    // For mkdirp() we tolerate that the mkdir() call fails
                    // in case the folder already exists. This follows node.js
                    // own implementation of fs.mkdir({ recursive: true }) and
                    // reduces the chances of race conditions leading to errors
                    // if multiple calls try to create the same folders
                    // As such, we only throw an error here if it is other than
                    // the fact that the file already exists.
                    // (see also https://github.com/microsoft/vscode/issues/89834)
                    throw error;
                }
            }
        }
    }

    del(resource: URI, options?: FileDeleteOptions | undefined): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // #region Helpers

    private writeQueues: Map<string, Promise<void>> = new Map();

    private ensureWriteQueue(provider: IFileSystemProvider, resource: URI, task: () => Promise<void>): Promise<void> {
        // ensure to never write to the same resource without finishing
        // the one write. this ensures a write finishes consistently
        // (even with error) before another write is done.
        const queueKey = this.toMapKey(provider, resource);
        const writeQueue = (this.writeQueues.get(queueKey) || Promise.resolve()).then(task, task);
        this.writeQueues.set(queueKey, writeQueue);
        return writeQueue;
    }

    private toMapKey(provider: IFileSystemProvider, resource: URI): string {
        const isPathCaseSensitive = !!(provider.capabilities & FileSystemProviderCapabilities.PathCaseSensitive);

        return isPathCaseSensitive ? resource.toString() : resource.toString().toLowerCase();
    }

    private async doWriteBuffered(provider: IFileSystemProviderWithOpenReadWriteCloseCapability, resource: URI, readableOrStream: VSBufferReadable): Promise<void> {
        return this.ensureWriteQueue(provider, resource, async () => {

            // open handle
            const handle = await provider.open(resource, { create: true });

            // write into handle until all bytes from buffer have been written
            try {
                await this.doWriteReadableBufferedQueued(provider, handle, readableOrStream);
            } catch (error) {
                throw ensureFileSystemProviderError(error);
            } finally {

                // close handle always
                await provider.close(handle);
            }
        });
    }

    private async doWriteReadableBufferedQueued(provider: IFileSystemProviderWithOpenReadWriteCloseCapability, handle: number, readable: VSBufferReadable): Promise<void> {
        let posInFile = 0;

        let chunk: VSBuffer | null;
        while ((chunk = readable.read()) !== null) {
            await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);

            posInFile += chunk.byteLength;
        }
    }

    private async doWriteBuffer(provider: IFileSystemProviderWithOpenReadWriteCloseCapability, handle: number, buffer: VSBuffer, length: number, posInFile: number, posInBuffer: number): Promise<void> {
        let totalBytesWritten = 0;
        while (totalBytesWritten < length) {
            const bytesWritten = await provider.write(handle, posInFile + totalBytesWritten, buffer.buffer, posInBuffer + totalBytesWritten, length - totalBytesWritten);
            totalBytesWritten += bytesWritten;
        }
    }

    private async doWriteUnbuffered(provider: IFileSystemProviderWithFileReadWriteCapability, resource: URI, bufferOrReadableOrStream: VSBuffer): Promise<void> {
        return this.ensureWriteQueue(provider, resource, () => this.doWriteUnbufferedQueued(provider, resource, bufferOrReadableOrStream));
    }

    private async doWriteUnbufferedQueued(provider: IFileSystemProviderWithFileReadWriteCapability, resource: URI, buffer: VSBuffer): Promise<void> {
        return provider.writeFile(resource, buffer.buffer, { create: true, overwrite: true });
    }

    protected throwIfFileSystemIsReadonly<T extends IFileSystemProvider>(provider: T, resource: URI): T {
        if (provider.capabilities & FileSystemProviderCapabilities.Readonly) {
            throw new FileOperationError(`Unable to modify readonly file ${this.resourceForError(resource)}`, FileOperationResult.FILE_PERMISSION_DENIED);
        }

        return provider;
    }

    private resourceForError(resource: URI): string {
        if (resource.scheme === Schemas.file) {
            return resource.fsPath;
        }

        return resource.toString(true);
    }

    // #endregion

}
