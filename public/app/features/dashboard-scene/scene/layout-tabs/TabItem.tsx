import { ReactNode, useMemo } from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  sceneGraph,
  VariableDependencyConfig,
  SceneComponentProps,
} from '@grafana/scenes';
import { Tab, useElementSelection } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';

import { isClonedKey } from '../../utils/clone';
import { getDashboardSceneFor } from '../../utils/utils';
import { ResponsiveGridLayoutManager } from '../layout-responsive-grid/ResponsiveGridLayoutManager';
import { DashboardLayoutManager, EditableDashboardElement, LayoutParent } from '../types';

import { getTabItemActions, getTabItemEditPaneOptions } from './TabItemEditor';
import { TabsLayoutManager } from './TabsLayoutManager';

export interface TabItemState extends SceneObjectState {
  layout: DashboardLayoutManager;
  title?: string;
}

export class TabItem extends SceneObjectBase<TabItemState> implements LayoutParent, EditableDashboardElement {
  public static Component = TabItemRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    statePaths: ['title'],
  });

  public readonly isEditableDashboardElement = true;
  public readonly typeName = 'Tab';

  constructor(state?: Partial<TabItemState>) {
    super({
      ...state,
      title: state?.title ?? t('dashboard.tabs-layout.tab.new', 'New tab'),
      layout: state?.layout ?? ResponsiveGridLayoutManager.createEmpty(),
    });
  }

  public useEditPaneOptions(): OptionsPaneCategoryDescriptor[] {
    return getTabItemEditPaneOptions(this);
  }

  public renderActions(): ReactNode {
    return getTabItemActions(this);
  }

  public switchLayout(layout: DashboardLayoutManager) {
    this.setState({ layout });
  }

  public getParentLayout(): TabsLayoutManager {
    return sceneGraph.getAncestor(this, TabsLayoutManager);
  }

  public getLayout(): DashboardLayoutManager {
    return this.state.layout;
  }
}

function TabItemRenderer({ model }: SceneComponentProps<TabItem>) {
  const { title, key } = model.useState();
  const isClone = useMemo(() => isClonedKey(key!), [key]);
  const parentLayout = model.getParentLayout();
  const { currentTab } = parentLayout.useState();
  const dashboard = getDashboardSceneFor(model);
  const { isEditing } = dashboard.useState();
  const titleInterpolated = sceneGraph.interpolate(model, title, undefined, 'text');
  const { isSelected, onSelect } = useElementSelection(key);

  return (
    <Tab
      className={!isClone && isSelected ? 'dashboard-selected-element' : undefined}
      label={titleInterpolated}
      active={model === currentTab}
      onPointerDown={(evt) => {
        evt.stopPropagation();

        if (isEditing) {
          if (isClone) {
            dashboard.state.editPane.clearSelection();
          } else {
            onSelect?.(evt);
          }
        }

        parentLayout.changeTab(model);
      }}
    />
  );
}
