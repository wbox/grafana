import {
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  VizPanel,
} from '@grafana/scenes';
import { t } from 'app/core/internationalization';

import { ObjectRemovedFromCanvasEvent, ObjectsReorderedOnCanvasEvent } from '../../edit-pane/shared';
import { RowsLayoutManager } from '../layout-rows/RowsLayoutManager';
import { DashboardLayoutManager } from '../types/DashboardLayoutManager';
import { LayoutRegistryItem } from '../types/LayoutRegistryItem';

import { TabItem } from './TabItem';
import { TabsLayoutManagerRenderer } from './TabsLayoutManagerRenderer';

interface TabsLayoutManagerState extends SceneObjectState {
  draggedTab: TabItem | undefined;
  tabs: TabItem[];
  currentTabIndex: number;
}

export class TabsLayoutManager extends SceneObjectBase<TabsLayoutManagerState> implements DashboardLayoutManager {
  public static Component = TabsLayoutManagerRenderer;

  public readonly isDashboardLayoutManager = true;

  public static readonly descriptor: LayoutRegistryItem = {
    get name() {
      return t('dashboard.tabs-layout.name', 'Tabs');
    },
    get description() {
      return t('dashboard.tabs-layout.description', 'Organize panels into horizontal tabs');
    },
    id: 'tabs-layout',
    createFromLayout: TabsLayoutManager.createFromLayout,
    kind: 'TabsLayout',
    isGridLayout: false,
  };

  public readonly descriptor = TabsLayoutManager.descriptor;

  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['tab'] });

  public constructor(state: Partial<TabsLayoutManagerState>) {
    super({
      ...state,
      draggedTab: undefined,
      tabs: state.tabs ?? [new TabItem()],
      currentTabIndex: state.currentTabIndex ?? 0,
    });
  }

  public getUrlState() {
    return { tab: this.state.currentTabIndex.toString() };
  }

  public updateFromUrl(values: SceneObjectUrlValues) {
    if (!values.tab) {
      return;
    }
    if (typeof values.tab === 'string') {
      const tabIndex = parseInt(values.tab, 10);
      if (this.state.tabs[tabIndex]) {
        this.setState({ currentTabIndex: tabIndex });
      } else {
        this.setState({ currentTabIndex: 0 });
      }
    }
  }

  public getCurrentTab(): TabItem {
    return this.state.tabs.length > this.state.currentTabIndex
      ? this.state.tabs[this.state.currentTabIndex]
      : this.state.tabs[0];
  }

  public addPanel(vizPanel: VizPanel) {
    this.getCurrentTab().getLayout().addPanel(vizPanel);
  }

  public getVizPanels(): VizPanel[] {
    const panels: VizPanel[] = [];

    for (const tab of this.state.tabs) {
      const innerPanels = tab.getLayout().getVizPanels();
      panels.push(...innerPanels);
    }

    return panels;
  }

  public cloneLayout(ancestorKey: string, isSource: boolean): DashboardLayoutManager {
    throw new Error('Method not implemented.');
  }

  public addNewTab() {
    const newTab = new TabItem();
    this.setState({ tabs: [...this.state.tabs, newTab], currentTabIndex: this.state.tabs.length });
    return newTab;
  }

  public editModeChanged(isEditing: boolean) {
    this.state.tabs.forEach((tab) => tab.getLayout().editModeChanged?.(isEditing));
  }

  public activateRepeaters() {
    this.state.tabs.forEach((tab) => tab.getLayout().activateRepeaters?.());
  }

  public removeTab(tabToRemove: TabItem) {
    // Do not allow removing last tab (for now)
    if (this.state.tabs.length === 1) {
      return;
    }

    const currentTab = this.getCurrentTab();

    if (currentTab === tabToRemove) {
      const nextTabIndex = this.state.currentTabIndex > 0 ? this.state.currentTabIndex - 1 : 0;
      this.setState({ tabs: this.state.tabs.filter((t) => t !== tabToRemove), currentTabIndex: nextTabIndex });
      this.publishEvent(new ObjectRemovedFromCanvasEvent(tabToRemove), true);
      return;
    }

    const filteredTab = this.state.tabs.filter((tab) => tab !== tabToRemove);
    const tabs = filteredTab.length === 0 ? [new TabItem()] : filteredTab;

    this.setState({ tabs, currentTabIndex: 0 });
    this.publishEvent(new ObjectRemovedFromCanvasEvent(tabToRemove), true);
  }

  public startDrag(tab: TabItem) {
    this.setState({ draggedTab: tab });
  }

  public endDrag() {
    this.setState({ draggedTab: undefined });
    this.publishEvent(new ObjectsReorderedOnCanvasEvent(this), true);
  }

  public moveTab(overTab: TabItem) {
    const tabs = [...this.state.tabs];

    const currentTab = this.state.tabs[this.state.currentTabIndex];

    const draggedTabIndex = tabs.indexOf(this.state.draggedTab!);
    const overTabIndex = tabs.indexOf(overTab);

    tabs.splice(draggedTabIndex, 1);
    tabs.splice(overTabIndex, 0, this.state.draggedTab!);

    const currentTabIndex = tabs.indexOf(currentTab);

    this.setState({ tabs, currentTabIndex });
  }

  public static createEmpty(): TabsLayoutManager {
    const tab = new TabItem();
    return new TabsLayoutManager({ tabs: [tab] });
  }

  public static createFromLayout(layout: DashboardLayoutManager): TabsLayoutManager {
    let tabs: TabItem[] = [];

    if (layout instanceof RowsLayoutManager) {
      tabs = layout.state.rows.map((row) => new TabItem({ layout: row.state.layout.clone(), title: row.state.title }));
    } else {
      tabs.push(new TabItem({ layout: layout.clone() }));
    }

    return new TabsLayoutManager({ tabs });
  }
}
