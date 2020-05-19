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
import { interfaces } from 'inversify';
import { TimelineMain } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import {
    Timeline,
    TimelineChangeEvent,
    TimelineOptions,
    TimelineService
} from '@theia/timeline/lib/browser/timeline-service';
import { CancellationToken, Emitter } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';

export class TimelineMainImpl implements TimelineMain {
    // private readonly proxy: TimelineExt;
    private readonly service: TimelineService;
    private readonly providerEmitters = new Map<string, Emitter<TimelineChangeEvent>>();
    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        // this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.TIMELINE_EXT);
        this.service = container.get<TimelineService>(TimelineService);
    }

    $registerTimelineProvider(id: string, label: string, scheme: string | string[]): void {
        const emitters = this.providerEmitters;
        let onDidChange = emitters.get(id);
        if (onDidChange === undefined) {
            onDidChange = new Emitter<TimelineChangeEvent>();
            emitters.set(id, onDidChange);
        }

        this.service.registerTimelineProvider({
            id,
            label,
            scheme,
            onDidChange: onDidChange.event,
            provideTimeline(uri: URI, options: TimelineOptions, token: CancellationToken): Promise<Timeline | undefined> {
                return new Promise<Timeline|undefined>(resolve => {});
            },
            dispose(): void {
                emitters.delete(id);
                if (onDidChange) {
                    onDidChange.dispose();
                }
            }
        });
    }

    $fireTimelineChanged(e: TimelineChangeEvent | undefined): void {
        if (e) {
            const emitter = this.providerEmitters.get(e.id!);
            if (emitter) {
                emitter.fire(e);
            }
            console.log('>>>>>>>>>>>>>>>>>>>');
        }
    }
}
