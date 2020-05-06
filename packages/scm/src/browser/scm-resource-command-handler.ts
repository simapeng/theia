/********************************************************************************
 * Copyright (C) 2020 Arm and others.
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

import { ScmResource } from './scm-provider';
import { CommandHandler } from '@theia/core/lib/common/command';

export interface ScmResourceCommandHandler {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute(resources: ScmResource[], ...args: any[]): any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isEnabled?(resources: ScmResource[], ...args: any[]): boolean;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isVisible?(resources: ScmResource[], ...args: any[]): boolean;

}

export class ScmResourceAwareCommandHandler implements CommandHandler {

    constructor(
        protected readonly handler: ScmResourceCommandHandler,
    ) { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected getResources(...args: any[]): ScmResource[] | undefined {
        const selectedResources = args[0];
        return selectedResources as ScmResource[];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute(...args: any[]): object | undefined {
        const uri = this.getResources(...args);
        return uri ? this.handler.execute(uri, ...args) : undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isVisible(...args: any[]): boolean {
        const resources = this.getResources(...args);
        if (resources) {
            if (this.handler.isVisible) {
                return this.handler.isVisible(resources as ScmResource[], ...args);
            }
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isEnabled(...args: any[]): boolean {
        const resources = this.getResources(...args);
        if (resources) {
            if (this.handler.isEnabled) {
                return this.handler.isEnabled(resources as ScmResource[], ...args);
            }
            return true;
        }
        return false;
    }

}
