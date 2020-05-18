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

import { injectable, inject } from 'inversify';
import { TreeModelImpl } from '@theia/core/lib/browser/tree';
import { TimelineTree } from './timeline-tree';
import { ExpandableTreeNode, TreeNode } from '@theia/core/lib/browser';

@injectable()
export class TimelineTreeModel extends TreeModelImpl {

    @inject(TimelineTree) protected readonly tree: TimelineTree;

    async initializeRoot(): Promise<void> {
        const children: TreeNode [] = [];
        const root: ExpandableTreeNode = {
            id: 'root-node-id',
            name: 'Apply the preference to selected preferences file',
            parent: undefined,
            visible: true,
            children: children,
            expanded: true,
        };
        const node: TreeNode = {
            id: 'node-id-property',
            name: 'node-name',
            parent: root,
            visible: true
        };
        children.push(node);
        this.tree.root = root;
    }
}
