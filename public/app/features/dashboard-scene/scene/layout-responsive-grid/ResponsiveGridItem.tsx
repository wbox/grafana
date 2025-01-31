import { css, cx } from '@emotion/css';

import { SceneObjectState, VizPanel, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';

import { DashboardLayoutItem } from '../types';

import { getResponsiveGridItemOptions } from './ResponsiveGridItemEditor';

export interface ResponsiveGridItemState extends SceneObjectState {
  body: VizPanel;
  hideWhenNoData?: boolean;
}

export class ResponsiveGridItem extends SceneObjectBase<ResponsiveGridItemState> implements DashboardLayoutItem {
  public static Component = ResponsiveGridItemRenderer;

  public readonly isDashboardLayoutItem = true;

  public getOptions(): OptionsPaneCategoryDescriptor {
    return getResponsiveGridItemOptions(this);
  }
}

function ResponsiveGridItemRenderer({ model }: SceneComponentProps<ResponsiveGridItem>) {
  const { body } = model.useState();
  const style = useStyles2(getStyles);

  return (
    <div className={cx(style.wrapper)}>
      <body.Component model={body} />
    </div>
  );
}

function getStyles() {
  return {
    wrapper: css({
      width: '100%',
      height: '100%',
      position: 'relative',
    }),
  };
}
