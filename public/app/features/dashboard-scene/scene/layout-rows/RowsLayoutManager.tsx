import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import {
  SceneComponentProps,
  SceneGridItemLike,
  SceneGridRow,
  SceneObjectBase,
  SceneObjectState,
  VizPanel,
} from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { isClonedKey } from '../../utils/clone';
import { getSelectedObject, switchLayout } from '../../utils/utils';
import { DashboardGridItem } from '../layout-default/DashboardGridItem';
import { DefaultGridLayoutManager } from '../layout-default/DefaultGridLayoutManager';
import { RowRepeaterBehavior } from '../layout-default/RowRepeaterBehavior';
import { TabsLayoutManager } from '../layout-tabs/TabsLayoutManager';
import { DashboardLayoutManager, LayoutRegistryItem } from '../types';

import { RowItem } from './RowItem';
import { RowItemRepeaterBehavior } from './RowItemRepeaterBehavior';

interface RowsLayoutManagerState extends SceneObjectState {
  rows: RowItem[];
}

export class RowsLayoutManager extends SceneObjectBase<RowsLayoutManagerState> implements DashboardLayoutManager {
  public static Component = RowsLayoutManagerRenderer;

  public readonly isDashboardLayoutManager = true;

  public getDescriptor(): LayoutRegistryItem {
    return RowsLayoutManager.getDescriptor();
  }

  public addPanel(vizPanel: VizPanel) {
    // Try to add new panels to the selected row
    const selectedObject = getSelectedObject(this);
    if (selectedObject instanceof RowItem) {
      return selectedObject.getLayout().addPanel(vizPanel);
    }

    // If we don't have selected row add it to the first row
    if (this.state.rows.length > 0) {
      return this.state.rows[0].getLayout().addPanel(vizPanel);
    }

    // Otherwise fallback to adding a new row and a panel
    this.addNewRow();
    this.state.rows[this.state.rows.length - 1].getLayout().addPanel(vizPanel);
  }

  public removePanel(panel: VizPanel) {
    this.state.rows.forEach((row) => row.getLayout().removePanel(panel));
  }

  public duplicatePanel(panel: VizPanel) {
    this.state.rows.forEach((row) => row.getLayout().duplicatePanel(panel));
  }

  public getVizPanels(): VizPanel[] {
    const panels: VizPanel[] = [];

    for (const row of this.state.rows) {
      const innerPanels = row.getLayout().getVizPanels();
      panels.push(...innerPanels);
    }

    return panels;
  }

  public getMaxPanelId(): number {
    return Math.max(...this.state.rows.map((row) => row.getLayout().getMaxPanelId()));
  }

  public addNewTab() {
    const tabsLayout = TabsLayoutManager.createFromLayout(this);
    tabsLayout.addNewTab();
    switchLayout(this, tabsLayout);
  }

  public addNewRow() {
    this.setState({ rows: [...this.state.rows, new RowItem()] });
  }

  public editModeChanged(isEditing: boolean) {
    this.state.rows.forEach((row) => row.getLayout().editModeChanged?.(isEditing));
  }

  public activateRepeaters() {
    this.state.rows.forEach((row) => {
      const behavior = (row.state.$behaviors ?? []).find((b) => b instanceof RowItemRepeaterBehavior);

      if (behavior) {
        if (!row.isActive) {
          row.activate();
        }

        if (!row.getLayout().isActive) {
          row.getLayout().activate();
        }

        if (!behavior.isActive) {
          behavior.activate();
        }
      }
    });
  }

  public removeRow(row: RowItem) {
    this.setState({ rows: this.state.rows.filter((r) => r !== row) });
  }

  public static getDescriptor(): LayoutRegistryItem {
    return {
      name: t('dashboard.rows-layout.name', 'Rows'),
      description: t('dashboard.rows-layout.description', 'Rows layout'),
      id: 'rows-layout',
      createFromLayout: RowsLayoutManager.createFromLayout,
    };
  }

  public static createEmpty(): RowsLayoutManager {
    return new RowsLayoutManager({ rows: [new RowItem()] });
  }

  public static createFromLayout(layout: DashboardLayoutManager): RowsLayoutManager {
    let rows: RowItem[];

    if (layout instanceof DefaultGridLayoutManager) {
      const config: Array<{
        title?: string;
        isCollapsed?: boolean;
        isDraggable?: boolean;
        isResizable?: boolean;
        children: SceneGridItemLike[];
        repeat?: string;
      }> = [];
      let children: SceneGridItemLike[] | undefined;

      layout.state.grid.forEachChild((child) => {
        if (!(child instanceof DashboardGridItem) && !(child instanceof SceneGridRow)) {
          throw new Error('Child is not a DashboardGridItem or SceneGridRow, invalid scene');
        }

        if (child instanceof SceneGridRow) {
          if (!isClonedKey(child.state.key!)) {
            const behaviour = child.state.$behaviors?.find((b) => b instanceof RowRepeaterBehavior);

            config.push({
              title: child.state.title,
              isCollapsed: !!child.state.isCollapsed,
              isDraggable: child.state.isDraggable ?? layout.state.grid.state.isDraggable,
              isResizable: child.state.isResizable ?? layout.state.grid.state.isResizable,
              children: child.state.children,
              repeat: behaviour?.state.variableName,
            });

            // Since we encountered a row item, any subsequent panels should be added to a new row
            children = undefined;
          }
        } else {
          if (!children) {
            children = [];
            config.push({ children });
          }

          children.push(child);
        }
      });

      rows = config.map(
        (rowConfig) =>
          new RowItem({
            title: rowConfig.title,
            isCollapsed: !!rowConfig.isCollapsed,
            layout: DefaultGridLayoutManager.fromGridItems(
              rowConfig.children,
              rowConfig.isDraggable,
              rowConfig.isResizable
            ),
            $behaviors: rowConfig.repeat ? [new RowItemRepeaterBehavior({ variableName: rowConfig.repeat })] : [],
          })
      );
    } else {
      rows = [new RowItem({ layout: layout.clone() })];
    }

    return new RowsLayoutManager({ rows });
  }
}

function RowsLayoutManagerRenderer({ model }: SceneComponentProps<RowsLayoutManager>) {
  const { rows } = model.useState();
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.wrapper}>
      {rows.map((row) => (
        <row.Component model={row} key={row.state.key!} />
      ))}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    wrapper: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      flexGrow: 1,
      width: '100%',
    }),
  };
}
