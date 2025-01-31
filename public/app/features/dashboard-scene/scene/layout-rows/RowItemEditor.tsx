import { useMemo } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { Alert, Button, Input, RadioButtonGroup, Switch, TextLink } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';
import { RepeatRowSelect2 } from 'app/features/dashboard/components/RepeatRowSelect/RepeatRowSelect';
import { SHARED_DASHBOARD_QUERY } from 'app/plugins/datasource/dashboard/constants';
import { MIXED_DATASOURCE_NAME } from 'app/plugins/datasource/mixed/MixedDataSource';

import { getDashboardSceneFor, getQueryRunnerFor } from '../../utils/utils';
import { useLayoutCategory } from '../layouts-shared/DashboardLayoutSelector';

import { RowItem } from './RowItem';
import { RowItemRepeaterBehavior } from './RowItemRepeaterBehavior';

export function getRowItemEditPaneOptions(row: RowItem): OptionsPaneCategoryDescriptor[] {
  const rowOptions = useMemo(() => {
    return new OptionsPaneCategoryDescriptor({
      title: t('dashboard.rows-layout.row-options.title', 'Row options'),
      id: 'row-options',
      isOpenDefault: true,
    })
      .addItem(
        new OptionsPaneItemDescriptor({
          title: t('dashboard.rows-layout.row-options.title-option', 'Title'),
          render: () => {
            const { title } = row.useState();

            return <Input value={title} onChange={(e) => row.setState({ title: e.currentTarget.value })} />;
          },
        })
      )
      .addItem(
        new OptionsPaneItemDescriptor({
          title: t('dashboard.rows-layout.row-options.height.title', 'Height'),
          render: () => {
            const { height = 'expand' } = row.useState();

            const options = [
              {
                label: t('dashboard.rows-layout.row-options.height.expand', 'Expand'),
                value: 'expand' as const,
              },
              { label: t('dashboard.rows-layout.row-options.height.min', 'Min'), value: 'min' as const },
            ];

            return (
              <RadioButtonGroup
                options={options}
                value={height}
                onChange={(option) => row.setState({ height: option })}
              />
            );
          },
        })
      )
      .addItem(
        new OptionsPaneItemDescriptor({
          title: t('dashboard.rows-layout.row-options.height.hide-row-header', 'Hide row header'),
          render: () => {
            const { isHeaderHidden = false } = row.useState();

            return (
              <Switch
                value={isHeaderHidden}
                onChange={() => row.setState({ isHeaderHidden: !row.state.isHeaderHidden })}
              />
            );
          },
        })
      );
  }, [row]);

  const rowRepeatOptions = useMemo(() => {
    const dashboard = getDashboardSceneFor(row);

    return new OptionsPaneCategoryDescriptor({
      title: t('dashboard.rows-layout.row-options.repeat.title', 'Repeat options'),
      id: 'row-repeat-options',
      isOpenDefault: true,
    }).addItem(
      new OptionsPaneItemDescriptor({
        title: t('dashboard.rows-layout.row-options.repeat.variable.title', 'Variable'),
        render: () => {
          const { layout, $behaviors } = row.useState();

          let repeatBehavior: RowItemRepeaterBehavior | undefined = $behaviors?.find(
            (b) => b instanceof RowItemRepeaterBehavior
          );
          const { variableName } = repeatBehavior?.state ?? {};

          const isAnyPanelUsingDashboardDS = layout.getVizPanels().some((vizPanel) => {
            const runner = getQueryRunnerFor(vizPanel);
            return (
              runner?.state.datasource?.uid === SHARED_DASHBOARD_QUERY ||
              (runner?.state.datasource?.uid === MIXED_DATASOURCE_NAME &&
                runner?.state.queries.some((query) => query.datasource?.uid === SHARED_DASHBOARD_QUERY))
            );
          });

          return (
            <>
              <RepeatRowSelect2
                sceneContext={dashboard}
                repeat={variableName}
                onChange={(repeat) => {
                  if (repeat) {
                    // Remove repeat behavior if it exists to trigger repeat when adding new one
                    if (repeatBehavior) {
                      repeatBehavior.removeBehavior();
                    }

                    repeatBehavior = new RowItemRepeaterBehavior({ variableName: repeat });
                    row.setState({ $behaviors: [...(row.state.$behaviors ?? []), repeatBehavior] });
                    repeatBehavior.activate();
                  } else {
                    repeatBehavior?.removeBehavior();
                  }
                }}
              />
              {isAnyPanelUsingDashboardDS ? (
                <Alert
                  data-testid={selectors.pages.Dashboard.Rows.Repeated.ConfigSection.warningMessage}
                  severity="warning"
                  title=""
                  topSpacing={3}
                  bottomSpacing={0}
                >
                  <p>
                    <Trans i18nKey="dashboard.rows-layout.row-options.repeat.variable.warning">
                      Panels in this row use the {{ SHARED_DASHBOARD_QUERY }} data source. These panels will reference
                      the panel in the original row, not the ones in the repeated rows.
                    </Trans>
                  </p>
                  <TextLink
                    external
                    href={
                      'https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/#configure-repeating-rows'
                    }
                  >
                    <Trans i18nKey="dashboard.rows-layout.row-options.repeat.variable.learn-more">Learn more</Trans>
                  </TextLink>
                </Alert>
              ) : undefined}
            </>
          );
        },
      })
    );
  }, [row]);

  const { layout } = row.useState();
  const layoutOptions = useLayoutCategory(layout);

  return [rowOptions, rowRepeatOptions, layoutOptions];
}

export function getRowItemAction(row: RowItem) {
  return (
    <>
      <Button size="sm" variant="secondary" icon="copy" />
      <Button
        size="sm"
        variant="destructive"
        fill="outline"
        onClick={() => row.getParentLayout().removeRow(row)}
        icon="trash-alt"
      />
    </>
  );
}
