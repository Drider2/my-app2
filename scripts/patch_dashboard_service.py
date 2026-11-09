import re

with open('src/services/dashboardService.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Update import of ResolutionMode and SIZE_RESOLUTION_OPTIONS
if 'ResolutionMode' not in c:
    c = c.replace(
        "WidgetSize \n} from '../types';",
        "WidgetSize,\n  ResolutionMode,\n  SIZE_RESOLUTION_OPTIONS\n} from '../types';"
    ).replace(
        "WidgetSize\n} from '../types';",
        "WidgetSize,\n  ResolutionMode,\n  SIZE_RESOLUTION_OPTIONS\n} from '../types';"
    ).replace(
        "WidgetSize } from '../types';",
        "WidgetSize, ResolutionMode, SIZE_RESOLUTION_OPTIONS } from '../types';"
    )

update_size_target = '''  updateWidgetSize(widgetId: string, size: WidgetSize): DashboardLayoutState {
    const layout = this.getLayout();
    const updated = layout.widgets.map(w => {
      if (w.id === widgetId) {
        return { ...w, size };
      }
      return w;
    });

    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(newLayout);
    return newLayout;
  },'''

update_size_replacement = '''  updateWidgetSize(widgetId: string, size: WidgetSize, resolution?: ResolutionMode): DashboardLayoutState {
    const resMode: ResolutionMode = resolution || (size === 'portrait' ? 'portrait' : size === 'small' ? 'small' : 'full');
    const layout = this.getLayout();
    const updated = layout.widgets.map(w => {
      if (w.id === widgetId) {
        return { 
          ...w, 
          size, 
          resolution: resMode, 
          dimensions: SIZE_RESOLUTION_OPTIONS[resMode] 
        };
      }
      return w;
    });

    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(newLayout);
    return newLayout;
  },'''

add_widget_target = '''  addWidget(widgetType: string, customSize?: WidgetSize): DashboardLayoutState {
    const layout = this.getLayout();
    const def = WIDGET_REGISTRY[widgetType];
    if (!def) return layout;

    const newWidget: DashboardWidgetConfig = {
      id: `widget-${widgetType}-${generateUUID().slice(0, 8)}`,
      widgetType,
      size: customSize || def.defaultSize,
      visible: true,
      order: layout.widgets.length,
    };

    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: [...layout.widgets, newWidget],
      updated_at: Date.now(),
    };
    this.saveLayout(newLayout);
    return newLayout;
  }'''

add_widget_replacement = '''  addWidget(widgetType: string, customSize?: WidgetSize, resolution?: ResolutionMode): DashboardLayoutState {
    const layout = this.getLayout();
    const def = WIDGET_REGISTRY[widgetType];
    if (!def) return layout;

    const chosenRes: ResolutionMode = resolution || (customSize === 'portrait' ? 'portrait' : customSize === 'small' ? 'small' : 'full');
    const finalSize: WidgetSize = customSize || (chosenRes === 'portrait' ? 'portrait' : chosenRes === 'small' ? 'small' : def.defaultSize);

    const newWidget: DashboardWidgetConfig = {
      id: `widget-${widgetType}-${generateUUID().slice(0, 8)}`,
      widgetType,
      size: finalSize,
      resolution: chosenRes,
      dimensions: SIZE_RESOLUTION_OPTIONS[chosenRes],
      visible: true,
      order: layout.widgets.length,
    };

    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: [...layout.widgets, newWidget],
      updated_at: Date.now(),
    };
    this.saveLayout(newLayout);
    return newLayout;
  }'''

c = c.replace(update_size_target, update_size_replacement)
c = c.replace(add_widget_target, add_widget_replacement)

with open('src/services/dashboardService.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print('dashboardService.ts updated successfully.')
