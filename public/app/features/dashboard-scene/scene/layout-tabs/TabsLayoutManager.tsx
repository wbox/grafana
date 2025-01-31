import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState, VizPanel } from '@grafana/scenes';
import { TabContent, TabsBar, useStyles2 } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { DashboardLayoutManager, LayoutRegistryItem } from '../types';

import { TabItem } from './TabItem';
import { TabItemRepeaterBehavior } from './TabItemRepeaterBehavior';

interface TabsLayoutManagerState extends SceneObjectState {
  tabs: TabItem[];
  currentTab: TabItem;
}

export class TabsLayoutManager extends SceneObjectBase<TabsLayoutManagerState> implements DashboardLayoutManager {
  public static Component = TabsLayoutManagerRenderer;

  public readonly isDashboardLayoutManager = true;

  public getDescriptor(): LayoutRegistryItem {
    return TabsLayoutManager.getDescriptor();
  }

  public addPanel(vizPanel: VizPanel) {
    this.state.currentTab.getLayout().addPanel(vizPanel);
  }

  public removePanel(panel: VizPanel) {
    this.state.tabs.forEach((tab) => tab.getLayout().removePanel(panel));
  }

  public duplicatePanel(panel: VizPanel) {
    this.state.tabs.forEach((tab) => tab.getLayout().duplicatePanel(panel));
  }

  public getVizPanels(): VizPanel[] {
    const panels: VizPanel[] = [];

    for (const tab of this.state.tabs) {
      const innerPanels = tab.getLayout().getVizPanels();
      panels.push(...innerPanels);
    }

    return panels;
  }

  public getMaxPanelId(): number {
    return Math.max(...this.state.tabs.map((tab) => tab.getLayout().getMaxPanelId()));
  }

  public addNewTab() {
    const currentTab = new TabItem();
    this.setState({ tabs: [...this.state.tabs, currentTab], currentTab });
  }

  public addNewRow() {
    this.state.currentTab.getLayout().addNewRow();
  }

  public editModeChanged(isEditing: boolean) {
    this.state.tabs.forEach((tab) => tab.getLayout().editModeChanged?.(isEditing));
  }

  public activateRepeaters() {
    this.state.tabs.forEach((tab) => {
      const behavior = (tab.state.$behaviors ?? []).find((b) => b instanceof TabItemRepeaterBehavior);

      if (behavior) {
        if (!tab.isActive) {
          tab.activate();
        }

        if (!tab.getLayout().isActive) {
          tab.getLayout().activate();
        }

        if (!behavior.isActive) {
          behavior.activate();
        }
      }
    });
  }

  public removeTab(tab: TabItem) {
    if (this.state.tabs.length === 1) {
      throw new Error('TabsLayoutManager: Cannot remove last tab');
    }

    if (this.state.currentTab === tab) {
      const currentTabIndex = this.state.tabs.indexOf(tab);
      const nextTabIndex = currentTabIndex === 0 ? 1 : currentTabIndex - 1;
      const nextTab = this.state.tabs[nextTabIndex];
      this.setState({ tabs: this.state.tabs.filter((t) => t !== tab), currentTab: nextTab });
      return;
    }

    this.setState({
      tabs: this.state.tabs.filter((tab) => tab !== this.state.currentTab),
      currentTab: this.state.tabs[this.state.tabs.length - 1],
    });
  }

  public changeTab(tab: TabItem) {
    this.setState({ currentTab: tab });
  }

  public static getDescriptor(): LayoutRegistryItem {
    return {
      name: t('dashboard.tabs-layout.name', 'Tabs'),
      description: t('dashboard.tabs-layout.description', 'Tabs layout'),
      id: 'tabs-layout',
      createFromLayout: TabsLayoutManager.createFromLayout,
    };
  }

  public static createEmpty(): TabsLayoutManager {
    const tab = new TabItem();
    return new TabsLayoutManager({ tabs: [tab], currentTab: tab });
  }

  public static createFromLayout(layout: DashboardLayoutManager): TabsLayoutManager {
    const tab = new TabItem({ layout: layout.clone() });
    return new TabsLayoutManager({ tabs: [tab], currentTab: tab });
  }
}

function TabsLayoutManagerRenderer({ model }: SceneComponentProps<TabsLayoutManager>) {
  const styles = useStyles2(getStyles);
  const { tabs, currentTab } = model.useState();
  const { layout } = currentTab.useState();

  return (
    <>
      <TabsBar className={styles.tabsContainer}>
        {tabs.map((tab) => (
          <tab.Component model={tab} key={tab.state.key!} />
        ))}
      </TabsBar>
      <TabContent className={styles.tabContentContainer}>{layout && <layout.Component model={layout} />}</TabContent>
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  tabsContainer: css({
    flexShrink: 1,
    padding: '2px 2px 0 2px',
    marginBottom: theme.spacing(1),
  }),
  tabContentContainer: css({
    backgroundColor: 'transparent',
    display: 'flex',
    flex: 1,
    height: '100%',
    overflow: 'auto',
    scrollbarWidth: 'thin',
    padding: '2px 2px 0 2px',
  }),
});
