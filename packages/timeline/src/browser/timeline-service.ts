/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
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

import { injectable } from 'inversify';
import { CancellationToken, Command, Disposable, Emitter, Event } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';

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
    iconPath?: URI | { light: URI; dark: URI };

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
     * This will show the `extension.copyCommitId` action only for items where `contextValue` is `commit`.
     */
    contextValue?: string;

    /**
     * @param label A human-readable string describing the timeline item
     * @param timestamp A timestamp (in milliseconds since 1 January 1970 00:00:00) for when the timeline item occurred
     */
    constructor(label: string, timestamp: number) {
        this.label = label;
        this.timestamp = timestamp;
    }
}

export interface TimelineChangeEvent {
    id: string;
    uri: string | undefined;
    reset: boolean
}

export interface TimelineOptions {
    cursor?: string;
    limit?: number | { timestamp: number; id?: string };
}

export interface Timeline {
    source: string;
    items: TimelineItem[];

    paging?: {
        cursor: string | undefined;
    }
}

export interface TimelineProvider extends Disposable {
    id: string;
    label: string;
    scheme: string | string[];
    onDidChange?: Event<TimelineChangeEvent>;
    provideTimeline(uri: URI, options: TimelineOptions, token: CancellationToken ): Promise<Timeline | undefined>;
}

@injectable()
export class TimelineService {
    private readonly providers = new Map<string, TimelineProvider>();
    private readonly providerSubscriptions = new Map<string, Disposable>();
    private readonly onDidChangeProviders = new Emitter<void>();
    private readonly onDidChangeTimeline = new Emitter<TimelineChangeEvent>();

    registerTimelineProvider(provider: TimelineProvider): Disposable {
        const id = provider.id;

        const existing = this.providers.get(id);
        if (existing) {
            // For now to deal with https://github.com/microsoft/vscode/issues/89553 allow any overwritting here (still will be blocked in the Extension Host)
            // TODO@eamodio: Ultimately will need to figure out a way to unregister providers when the Extension Host restarts/crashes
            // throw new Error(`Timeline Provider ${id} already exists.`);
            try {
                existing.dispose();
            } catch { }
        }

        this.providers.set(id, provider);
        if (provider.onDidChange) {
            this.providerSubscriptions.set(id, provider.onDidChange(e => this.onDidChangeTimeline.fire(e)));
        }
        this.onDidChangeProviders.fire(undefined);

        return {
            dispose: () => {
                this.providers.delete(id);
                this.onDidChangeProviders.fire(undefined);
            }
        };
    }
}
