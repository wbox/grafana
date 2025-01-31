import { SelectableValue } from '@grafana/data';
import { SceneCSSGridLayout } from '@grafana/scenes';
import { Select } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

export function getResponsiveGridOptions(cssLayout: SceneCSSGridLayout): OptionsPaneItemDescriptor[] {
  const options: OptionsPaneItemDescriptor[] = [];

  const rowOptions: Array<SelectableValue<string>> = [];
  const sizes = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 650];
  const colOptions: Array<SelectableValue<string>> = [
    { label: t('dashboard.responsive-layout.options.one-column', '1 column'), value: '1fr' },
    { label: t('dashboard.responsive-layout.options.two-columns', '2 columns'), value: '1fr 1fr' },
    { label: t('dashboard.responsive-layout.options.three-columns', '3 columns'), value: '1fr 1fr 1fr' },
  ];

  for (const size of sizes) {
    const label = t('dashboard.responsive-layout.options.min', 'Min: {{size}}px').replace('{{size}}', size.toString());

    colOptions.push({ label, value: `repeat(auto-fit, minmax(${size}px, auto))` });

    rowOptions.push({ label, value: `minmax(${size}px, auto)` });
  }

  for (const size of sizes) {
    rowOptions.push({
      label: t('dashboard.responsive-layout.options.fixed', 'Fixed: {{size}}px').replace('{{size}}', size.toString()),
      value: `${size}px`,
    });
  }

  options.push(
    new OptionsPaneItemDescriptor({
      title: t('dashboard.responsive-layout.options.columns', 'Columns'),
      render: () => {
        const { templateColumns } = cssLayout.useState();

        return (
          <Select
            options={colOptions}
            value={String(templateColumns)}
            onChange={(value) => cssLayout.setState({ templateColumns: value.value })}
            allowCustomValue={true}
          />
        );
      },
    })
  );

  options.push(
    new OptionsPaneItemDescriptor({
      title: t('dashboard.responsive-layout.options.rows', 'Rows'),
      render: () => {
        const { autoRows } = cssLayout.useState();

        return (
          <Select
            options={rowOptions}
            value={String(autoRows)}
            onChange={(value) => cssLayout.setState({ autoRows: value.value })}
            allowCustomValue={true}
          />
        );
      },
    })
  );

  return options;
}
