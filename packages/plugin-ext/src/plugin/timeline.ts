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
// import { PLUGIN_RPC_CONTEXT, TimelineExt, TimelineMain } from '../common';
import { TimelineExt } from '../common';
import { RPCProtocol } from '../common/rpc-protocol';
// import { DisposableCollection, Disposable } from '@theia/core/lib/common';
import { Disposable } from '@theia/core/lib/common';
import { TimelineProvider } from '@theia/plugin';

export class TimelineExtImpl implements TimelineExt {
    // private handle: number = 0;
    // private readonly proxy: TimelineMain;
    private providers = new Map<string, TimelineProvider>();

    constructor(readonly rpc: RPCProtocol) {
        // this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.TIMELINE_MAIN);
    }

    registerTimelineProvider(scheme: string | string[], provider: TimelineProvider): Disposable {
        // const toDispose = new DisposableCollection();
        const existing = this.providers.get(provider.id);
        if (existing) {
            throw new Error(`Timeline Provider ${provider.id} already exists.`);
        }
        throw new Error();
    }
}
