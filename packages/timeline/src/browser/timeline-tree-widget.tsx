/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
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

import { inject, injectable } from 'inversify';
import {
    ContextMenuRenderer,
    TreeProps,
    TreeWidget
} from '@theia/core/lib/browser';
import { TimelineTreeModel } from './timeline-tree-model';
import { WorkspaceCommandContribution } from '@theia/workspace/lib/browser';

@injectable()
export class TimelineTreeWidget extends TreeWidget {
    /**
     * The widget `id`.
     */
    static readonly ID = 'timeline.widget';
    /**
     * The widget `label` which is used for display purposes.
     */
    static readonly LABEL = 'Getting Started';

    constructor(
        @inject(TreeProps) readonly props: TreeProps,
        @inject(TimelineTreeModel) readonly model: TimelineTreeModel,
        @inject(ContextMenuRenderer) contextMenuRenderer: ContextMenuRenderer,
        @inject(WorkspaceCommandContribution) commandContribution: WorkspaceCommandContribution
    ) {
        super(props, model, contextMenuRenderer);

        this.id = TimelineTreeWidget.ID;
        this.title.label = TimelineTreeWidget.LABEL;
        this.title.caption = 'Call Hierarchy';
        // this.title.iconClass = 'fa call-hierarchy-tab-icon';
        this.title.closable = true;
        commandContribution.onDidCreateNewFile(event => {
            this.model.initializeRoot();
        });
    }
}
