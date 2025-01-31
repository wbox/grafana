import { SceneComponentProps, SceneCSSGridLayout, SceneObjectBase, SceneObjectState, VizPanel } from '@grafana/scenes';
import { t } from 'app/core/internationalization';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

import { getNextPanelId, getPanelIdForVizPanel, getVizPanelKeyForPanelId, switchLayout } from '../../utils/utils';
import { RowsLayoutManager } from '../layout-rows/RowsLayoutManager';
import { TabsLayoutManager } from '../layout-tabs/TabsLayoutManager';
import { DashboardLayoutManager, LayoutRegistryItem } from '../types';

import { ResponsiveGridItem } from './ResponsiveGridItem';
import { getResponsiveGridOptions } from './ResponsiveGridLayoutManagerEditor';

interface ResponsiveGridLayoutManagerState extends SceneObjectState {
  layout: SceneCSSGridLayout;
}

export class ResponsiveGridLayoutManager
  extends SceneObjectBase<ResponsiveGridLayoutManagerState>
  implements DashboardLayoutManager
{
  public static Component = ResponsiveGridLayoutManagerRenderer;

  public readonly isDashboardLayoutManager = true;

  public getDescriptor(): LayoutRegistryItem {
    return ResponsiveGridLayoutManager.getDescriptor();
  }

  public addPanel(vizPanel: VizPanel) {
    const panelId = getNextPanelId(this);

    vizPanel.setState({ key: getVizPanelKeyForPanelId(panelId) });
    vizPanel.clearParent();

    this.state.layout.setState({
      children: [new ResponsiveGridItem({ body: vizPanel }), ...this.state.layout.state.children],
    });
  }

  public removePanel(panel: VizPanel) {
    const newChildren = this.state.layout.state.children.filter((child) => child !== panel.parent);

    if (this.state.layout.state.children.length === newChildren.length) {
      return;
    }

    this.state.layout.setState({ children: newChildren });
  }

  public duplicatePanel(panel: VizPanel) {
    const originalPanelIndex = this.state.layout.state.children.findIndex((child) => child === panel.parent);

    if (originalPanelIndex === -1) {
      return;
    }

    const panelId = getNextPanelId(this);

    const newPanel = panel.clone({ key: getVizPanelKeyForPanelId(panelId) });
    const newGridItem = new ResponsiveGridItem({ body: newPanel });

    this.state.layout.setState({
      children: [
        ...this.state.layout.state.children.slice(0, originalPanelIndex),
        newGridItem,
        ...this.state.layout.state.children.slice(originalPanelIndex),
      ],
    });
  }

  public getVizPanels(): VizPanel[] {
    const panels: VizPanel[] = [];

    for (const child of this.state.layout.state.children) {
      if (child instanceof ResponsiveGridItem) {
        panels.push(child.state.body);
      }
    }

    return panels;
  }

  public getMaxPanelId(): number {
    let max = 0;

    for (const child of this.state.layout.state.children) {
      if (child instanceof VizPanel) {
        let panelId = getPanelIdForVizPanel(child);

        if (panelId > max) {
          max = panelId;
        }
      }
    }

    return max;
  }

  public addNewTab() {
    const tabsLayout = TabsLayoutManager.createFromLayout(this);
    tabsLayout.addNewTab();
    switchLayout(this, tabsLayout);
  }

  public addNewRow() {
    const rowsLayout = RowsLayoutManager.createFromLayout(this);
    rowsLayout.addNewRow();
    switchLayout(this, rowsLayout);
  }

  public getOptions(): OptionsPaneItemDescriptor[] {
    return getResponsiveGridOptions(this.state.layout);
  }

  public static getDescriptor(): LayoutRegistryItem {
    return {
      name: t('dashboard.responsive-layout.name', 'Responsive grid'),
      description: t('dashboard.responsive-layout.description', 'CSS layout that adjusts to the available space'),
      id: 'responsive-grid',
      createFromLayout: ResponsiveGridLayoutManager.createFromLayout,
    };
  }

  public static createEmpty(): ResponsiveGridLayoutManager {
    return new ResponsiveGridLayoutManager({
      layout: new SceneCSSGridLayout({
        children: [],
        templateColumns: 'repeat(auto-fit, minmax(400px, auto))',
        autoRows: 'minmax(300px, auto)',
      }),
    });
  }

  public static createFromLayout(layout: DashboardLayoutManager): ResponsiveGridLayoutManager {
    const panels = layout.getVizPanels();
    const children: ResponsiveGridItem[] = [];

    for (let panel of panels) {
      children.push(new ResponsiveGridItem({ body: panel.clone() }));
    }

    const layoutManager = ResponsiveGridLayoutManager.createEmpty();
    layoutManager.state.layout.setState({ children });

    return layoutManager;
  }
}

function ResponsiveGridLayoutManagerRenderer({ model }: SceneComponentProps<ResponsiveGridLayoutManager>) {
  return <model.state.layout.Component model={model.state.layout} />;
}
