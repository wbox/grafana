import { Switch } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { OptionsPaneCategoryDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneCategoryDescriptor';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

import { ResponsiveGridItem } from './ResponsiveGridItem';

export function getResponsiveGridItemOptions(gridItem: ResponsiveGridItem): OptionsPaneCategoryDescriptor {
  const category = new OptionsPaneCategoryDescriptor({
    title: t('dashboard.responsive-layout.item-options.title', 'Layout options'),
    id: 'layout-options',
    isOpenDefault: false,
  });

  category.addItem(
    new OptionsPaneItemDescriptor({
      title: t('dashboard.responsive-layout.item-options.hide-no-data', 'Hide when no data'),
      render: () => {
        const { hideWhenNoData } = gridItem.useState();

        return (
          <Switch
            value={hideWhenNoData}
            id="hide-when-no-data"
            onChange={() => gridItem.setState({ hideWhenNoData: !hideWhenNoData })}
          />
        );
      },
    })
  );

  return category;
}
