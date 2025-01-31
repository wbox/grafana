import { ReactNode, useMemo } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { Alert, Button, Input, TextLink } from '@grafana/ui';
import { t, Trans } from 'app/core/internationalization';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';
import { RepeatRowSelect2 } from 'app/features/dashboard/components/RepeatRowSelect/RepeatRowSelect';
import { SHARED_DASHBOARD_QUERY } from 'app/plugins/datasource/dashboard/constants';
import { MIXED_DATASOURCE_NAME } from 'app/plugins/datasource/mixed/MixedDataSource';

import { getDashboardSceneFor, getQueryRunnerFor } from '../../utils/utils';
import { useLayoutCategory } from '../layouts-shared/DashboardLayoutSelector';

import { TabItem } from './TabItem';
import { TabItemRepeaterBehavior } from './TabItemRepeaterBehavior';

export function getTabItemEditPaneOptions(tab: TabItem): OptionsPaneCategoryDescriptor[] {
  const tabOptions = useMemo(() => {
    return new OptionsPaneCategoryDescriptor({
      title: t('dashboard.tabs-layout.tab-options.title', 'Tab options'),
      id: 'tab-options',
      isOpenDefault: true,
    }).addItem(
      new OptionsPaneItemDescriptor({
        title: t('dashboard.tabs-layout.tab-options.title-option', 'Title'),
        render: () => {
          const { title } = tab.useState();

          return <Input value={title} onChange={(e) => tab.setState({ title: e.currentTarget.value })} />;
        },
      })
    );
  }, [tab]);

  const tabRepeatOptions = useMemo(() => {
    const dashboard = getDashboardSceneFor(tab);

    return new OptionsPaneCategoryDescriptor({
      title: t('dashboard.tabs-layout.tab-options.repeat.title', 'Repeat options'),
      id: 'tab-repeat-options',
      isOpenDefault: true,
    }).addItem(
      new OptionsPaneItemDescriptor({
        title: t('dashboard.tabs-layout.tab-options.repeat.variable.title', 'Variable'),
        render: () => {
          const { layout, $behaviors } = tab.useState();

          let repeatBehavior: TabItemRepeaterBehavior | undefined = $behaviors?.find(
            (b) => b instanceof TabItemRepeaterBehavior
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

                    repeatBehavior = new TabItemRepeaterBehavior({ variableName: repeat });
                    tab.setState({ $behaviors: [...(tab.state.$behaviors ?? []), repeatBehavior] });
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
                    <Trans i18nKey="dashboard.tabs-layout.tab-options.repeat.variable.warning">
                      Panels in this tab use the {{ SHARED_DASHBOARD_QUERY }} data source. These panels will reference
                      the panel in the original tab, not the ones in the repeated tabs.
                    </Trans>
                  </p>
                  <TextLink
                    external
                    href={
                      'https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/#configure-repeating-rows'
                    }
                  >
                    <Trans i18nKey="dashboard.tabs-layout.tab-options.repeat.variable.learn-more">Learn more</Trans>
                  </TextLink>
                </Alert>
              ) : undefined}
            </>
          );
        },
      })
    );
  }, [tab]);

  const { layout } = tab.useState();
  const layoutOptions = useLayoutCategory(layout);

  return [tabOptions, tabRepeatOptions, layoutOptions];
}

export function getTabItemActions(tab: TabItem): ReactNode {
  return (
    <>
      <Button size="sm" variant="secondary" icon="copy" />
      <Button
        size="sm"
        variant="destructive"
        fill="outline"
        onClick={() => tab.getParentLayout().removeTab(tab)}
        icon="trash-alt"
      />
    </>
  );
}
