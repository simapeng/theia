/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
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

import { Container, ContainerModule, interfaces } from 'inversify';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { TimelineService } from './timeline-service';
import { TimelineWidget } from './timeline-widget';
import { TimelineTreeWidget } from './timeline-tree-widget';
import { createTreeContainer, TreeModel, TreeModelImpl, TreeWidget } from '@theia/core/lib/browser';
import { TimelineTreeModel } from './timeline-tree-model';

export default new ContainerModule(bind => {
    bind(TimelineService).toSelf().inSingletonScope();

    bind(TimelineWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: TimelineWidget.ID,
        createWidget: () => container.get(TimelineWidget)
    })).inSingletonScope();
    bind(TimelineTreeWidget).toDynamicValue(ctx => {
        const child = createScmTreeContainer(ctx.container);
        return child.get(TimelineTreeWidget);
    });
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: TimelineTreeWidget.ID,
        createWidget: () => container.get(TimelineTreeWidget)
    })).inSingletonScope();
});

export function createScmTreeContainer(parent: interfaces.Container): Container {
    const child = createTreeContainer(parent, {
        virtualized: true,
        search: true
    });

    child.unbind(TreeWidget);
    child.bind(TimelineTreeWidget).toSelf();

    child.unbind(TreeModelImpl);
    child.bind(TimelineTreeModel).toSelf();
    child.rebind(TreeModel).toService(TimelineTreeModel);
    return child;
}
