/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
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

/**
* This is the place for API experiments and proposals.
* These API are NOT stable and subject to change. Use it on own risk.
*/
declare module '@theia/plugin' {
    export namespace languageServer {
        /**
         * Registers new language server.
         *
         * @param languageServerInfo information about the language server
         */
        export function registerLanguageServerProvider(languageServerInfo: LanguageServerInfo): Disposable;

        /**
         * Stops the language server.
         *
         * @param id language server's id
         */
        export function stop(id: string): void;
    }

    // Experimental API
    // https://github.com/Microsoft/vscode/blob/1.30.2/src/vs/vscode.proposed.d.ts#L1015
    export interface FileRenameEvent {
        readonly oldUri: Uri;
        readonly newUri: Uri;
    }

    // Experimental API
    // https://github.com/Microsoft/vscode/blob/1.30.2/src/vs/vscode.proposed.d.ts#L1020
    export interface FileWillRenameEvent {
        readonly oldUri: Uri;
        readonly newUri: Uri;
        waitUntil(thenable: PromiseLike<WorkspaceEdit>): void;
    }

    /**
    * The language contribution interface defines an information about language server which should be registered.
    */
    export interface LanguageServerInfo {
        /**
         * Language server's id.
         */
        id: string;
        /**
         * Language server's name.
         */
        name: string;
        /**
         * The command to run language server as a process.
         */
        command: string;
        /**
         * Command's arguments.
         */
        args: string[];
        /**
         * File's patterns which can be used to create file system watchers.
         */
        globPatterns?: string[];
        /**
         * Names of files. If the workspace contains some of them language server should be activated.
         */
        workspaceContains?: string[];
    }


    /**
     * The contiguous set of modified lines in a diff.
     */
    export interface LineChange {
        readonly originalStartLineNumber: number;
        readonly originalEndLineNumber: number;
        readonly modifiedStartLineNumber: number;
        readonly modifiedEndLineNumber: number;
    }

    export namespace commands {

        /**
        * Get the keybindings associated to commandId.
        * @param commandId The ID of the command for which we are looking for keybindings.
        */
        export function getKeyBinding(commandId: string): PromiseLike<CommandKeyBinding[] | undefined>;

        /**
         * Registers a diff information command that can be invoked via a keyboard shortcut,
         * a menu item, an action, or directly.
         *
         * Diff information commands are different from ordinary [commands](#commands.registerCommand) as
         * they only execute when there is an active diff editor when the command is called, and the diff
         * information has been computed. Also, the command handler of an editor command has access to
         * the diff information.
         *
         * @param command A unique identifier for the command.
         * @param callback A command handler function with access to the [diff information](#LineChange).
         * @param thisArg The `this` context used when invoking the handler function.
         * @return Disposable which unregisters this command on disposal.
         */
        export function registerDiffInformationCommand(command: string, callback: (diff: LineChange[], ...args: any[]) => any, thisArg?: any): Disposable;

    }

    /**
     * Key Binding of a command
     */
    export interface CommandKeyBinding {
        /**
         * Identifier of the command.
         */
        id: string;
        /**
         * Value of the keyBinding
         */
        value: string;
    }

    /**
     * Enumeration of the supported operating systems.
     */
    export enum OperatingSystem {
        Windows = 'Windows',
        Linux = 'Linux',
        OSX = 'OSX'
    }

    export namespace workspace {
        // Experimental API
        // https://github.com/Microsoft/vscode/blob/1.30.2/src/vs/vscode.proposed.d.ts#L1026-L1028
        export const onWillRenameFile: Event<FileWillRenameEvent>;
        export const onDidRenameFile: Event<FileRenameEvent>;
    }

    export namespace env {

        /**
         * Returns the type of the operating system on the client side (like browser'OS if using browser mode). If it is neither [Windows](isWindows) nor [OS X](isOSX), then
         * it always return with the `Linux` OS type.
         */
        export function getClientOperatingSystem(): PromiseLike<OperatingSystem>;

    }

    export interface DecorationData {
        letter?: string;
        title?: string;
        color?: ThemeColor;
        priority?: number;
        bubble?: boolean;
        source?: string;
    }

    export interface SourceControl {

        /**
         * Whether the source control is selected.
         */
        readonly selected: boolean;

        /**
         * An event signaling when the selection state changes.
         */
        readonly onDidChangeSelection: Event<boolean>;
    }

    export interface SourceControlResourceDecorations {
        source?: string;
        letter?: string;
        color?: ThemeColor;
    }

    export interface DecorationProvider {
        onDidChangeDecorations: Event<undefined | Uri | Uri[]>;
        provideDecoration(uri: Uri, token: CancellationToken): ProviderResult<DecorationData>;
    }

    //#region LogLevel: https://github.com/microsoft/vscode/issues/85992

    /**
     * The severity level of a log message
     */
    export enum LogLevel {
        Trace = 1,
        Debug = 2,
        Info = 3,
        Warning = 4,
        Error = 5,
        Critical = 6,
        Off = 7
    }

    export namespace env {
        /**
         * Current logging level.
         */
        export const logLevel: LogLevel;

        /**
         * An [event](#Event) that fires when the log level has changed.
         */
        export const onDidChangeLogLevel: Event<LogLevel>;
    }

    //#endregion

    export namespace window {
        export function registerDecorationProvider(provider: DecorationProvider): Disposable;
    }

    //#region Tree View
    // copied from https://github.com/microsoft/vscode/blob/3ea5c9ddbebd8ec68e3b821f9c39c3ec785fde97/src/vs/vscode.proposed.d.ts#L1447-L1476
    /**
     * Label describing the [Tree item](#TreeItem)
     */
    export interface TreeItemLabel {

        /**
         * A human-readable string describing the [Tree item](#TreeItem).
         */
        label: string;

        /**
         * Ranges in the label to highlight. A range is defined as a tuple of two number where the
         * first is the inclusive start index and the second the exclusive end index
         */
        // TODO highlights?: [number, number][];

    }

    export class TreeItem2 extends TreeItem {
        /**
         * Label describing this item. When `falsy`, it is derived from [resourceUri](#TreeItem.resourceUri).
         */
        label?: string | TreeItemLabel | /* for compilation */ any;

        /**
         * @param label Label describing this item
         * @param collapsibleState [TreeItemCollapsibleState](#TreeItemCollapsibleState) of the tree item. Default is [TreeItemCollapsibleState.None](#TreeItemCollapsibleState.None)
         */
        constructor(label: TreeItemLabel, collapsibleState?: TreeItemCollapsibleState);
    }
    //#endregion

    //#region timeline
    // copied from https://github.com/microsoft/vscode/blob/d69a79b73808559a91206d73d7717ff5f798f23c/src/vs/vscode.proposed.d.ts#L1870-L2017
    export class TimelineItem {
        /**
         * A timestamp (in milliseconds since 1 January 1970 00:00:00) for when the timeline item occurred.
         */
        timestamp: number;

        /**
         * A human-readable string describing the timeline item.
         */
        label: string;

        /**
         * Optional id for the timeline item. It must be unique across all the timeline items provided by this source.
         *
         * If not provided, an id is generated using the timeline item's timestamp.
         */
        id?: string;

        /**
         * The icon path or [ThemeIcon](#ThemeIcon) for the timeline item.
         */
        iconPath?: Uri | { light: Uri; dark: Uri } | ThemeIcon;

        /**
         * A human readable string describing less prominent details of the timeline item.
         */
        description?: string;

        /**
         * The tooltip text when you hover over the timeline item.
         */
        detail?: string;

        /**
         * The [command](#Command) that should be executed when the timeline item is selected.
         */
        command?: Command;

        /**
         * Context value of the timeline item. This can be used to contribute specific actions to the item.
         * For example, a timeline item is given a context value as `commit`. When contributing actions to `timeline/item/context`
         * using `menus` extension point, you can specify context value for key `timelineItem` in `when` expression like `timelineItem == commit`.
         * ```
         *	"contributes": {
         *		"menus": {
         *			"timeline/item/context": [
         *				{
         *					"command": "extension.copyCommitId",
         *					"when": "timelineItem == commit"
         *				}
         *			]
         *		}
         *	}
         * ```
         * This will show the `extension.copyCommitId` action only for items where `contextValue` is `commit`.
         */
        contextValue?: string;

        /**
         * @param label A human-readable string describing the timeline item
         * @param timestamp A timestamp (in milliseconds since 1 January 1970 00:00:00) for when the timeline item occurred
         */
        constructor(label: string, timestamp: number);
    }

    export interface TimelineChangeEvent {
        /**
         * The [uri](#Uri) of the resource for which the timeline changed.
         */
        uri: Uri;

        /**
         * A flag which indicates whether the entire timeline should be reset.
         */
        reset?: boolean;
    }

    export interface Timeline {
        readonly paging?: {
            /**
             * A provider-defined cursor specifying the starting point of timeline items which are after the ones returned.
             * Use `undefined` to signal that there are no more items to be returned.
             */
            readonly cursor: string | undefined;
        }

        /**
         * An array of [timeline items](#TimelineItem).
         */
        readonly items: readonly TimelineItem[];
    }

    export interface TimelineOptions {
        /**
         * A provider-defined cursor specifying the starting point of the timeline items that should be returned.
         */
        cursor?: string;

        /**
         * An optional maximum number timeline items or the all timeline items newer (inclusive) than the timestamp or id that should be returned.
         * If `undefined` all timeline items should be returned.
         */
        limit?: number | { timestamp: number; id?: string };
    }

    export interface TimelineProvider {
        /**
         * An optional event to signal that the timeline for a source has changed.
         * To signal that the timeline for all resources (uris) has changed, do not pass any argument or pass `undefined`.
         */
        onDidChange?: Event<TimelineChangeEvent | undefined>;

        /**
         * An identifier of the source of the timeline items. This can be used to filter sources.
         */
        readonly id: string;

        /**
         * A human-readable string describing the source of the timeline items. This can be used as the display label when filtering sources.
         */
        readonly label: string;

        /**
         * Provide [timeline items](#TimelineItem) for a [Uri](#Uri).
         *
         * @param uri The [uri](#Uri) of the file to provide the timeline for.
         * @param options A set of options to determine how results should be returned.
         * @param token A cancellation token.
         * @return The [timeline result](#TimelineResult) or a thenable that resolves to such. The lack of a result
         * can be signaled by returning `undefined`, `null`, or an empty array.
         */
        provideTimeline(uri: Uri, options: TimelineOptions, token: CancellationToken): ProviderResult<Timeline>;
    }

    export namespace workspace {
        /**
         * Register a timeline provider.
         *
         * Multiple providers can be registered. In that case, providers are asked in
         * parallel and the results are merged. A failing provider (rejected promise or exception) will
         * not cause a failure of the whole operation.
         *
         * @param scheme A scheme or schemes that defines which documents this provider is applicable to. Can be `*` to target all documents.
         * @param provider A timeline provider.
         * @return A [disposable](#Disposable) that unregisters this provider when being disposed.
         */
        export function registerTimelineProvider(scheme: string | string[], provider: TimelineProvider): Disposable;
    }

    //#endregion

    //#region https://github.com/microsoft/vscode/issues/86788

    export interface CodeActionProviderMetadata {
        /**
         * Static documentation for a class of code actions.
         *
         * The documentation is shown in the code actions menu if either:
         *
         * - Code actions of `kind` are requested by VS Code. In this case, VS Code will show the documentation that
         *   most closely matches the requested code action kind. For example, if a provider has documentation for
         *   both `Refactor` and `RefactorExtract`, when the user requests code actions for `RefactorExtract`,
         *   VS Code will use the documentation for `RefactorExtract` intead of the documentation for `Refactor`.
         *
         * - Any code actions of `kind` are returned by the provider.
         */
        readonly documentation?: ReadonlyArray<{ readonly kind: CodeActionKind, readonly command: Command }>;
    }

    //#endregion
}
