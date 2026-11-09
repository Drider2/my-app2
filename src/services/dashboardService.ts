// Dashboard Layout & Persistence Service
import { db, generateUUID } from './storage';
import { 
  DashboardLayoutState, 
  DashboardWidgetConfig, 
  DashboardPresetId, 
  WidgetSize,
  ResolutionMode,
  SIZE_RESOLUTION_OPTIONS
} from '../types';
import { WIDGET_REGISTRY, createPresetLayout } from './widgetRegistry';

export const DashboardService = {
  /**
   * Retrieves current dashboard layout state or initializes with Complete Overview preset
   */
  getLayout(): DashboardLayoutState {
    const state = db.getState();
    if (state.dashboardLayout && state.dashboardLayout.widgets && state.dashboardLayout.widgets.length > 0) {
      if (!state.dashboardLayout.widgets.some(w => w.widgetType === 'daily_progress')) {
        const dpWidget: DashboardWidgetConfig = {
          id: `widget-daily_progress-${generateUUID()}`,
          widgetType: 'daily_progress',
          size: 'full',
          visible: true,
          order: 0,
        };
        const updatedWidgets = [dpWidget, ...state.dashboardLayout.widgets].map((w, idx) => ({
          ...w,
          order: idx,
        }));
        state.dashboardLayout.widgets = updatedWidgets;
        this.saveLayout(state.dashboardLayout);
      }
      return state.dashboardLayout;
    }
    const defaultLayout = createPresetLayout('complete_overview');
    this.saveLayout(defaultLayout);
    return defaultLayout;
  },

  /**
   * Persists dashboard layout state
   */
  saveLayout(layout: DashboardLayoutState): void {
    db.updateState(draft => {
      draft.dashboardLayout = {
        ...layout,
        updated_at: Date.now(),
      };
    });
  },

  /**
   * Applies a predefined layout preset
   */
  applyPreset(presetId: DashboardPresetId): DashboardLayoutState {
    const layout = createPresetLayout(presetId);
    this.saveLayout(layout);
    return layout;
  },

  /**
   * Resets layout to default Complete Overview
   */
  resetToDefault(): DashboardLayoutState {
    return this.applyPreset('complete_overview');
  },

  /**
   * Reorders widget positions in the array
   */
  reorderWidgets(sourceIndex: number, destinationIndex: number): DashboardLayoutState {
    const layout = this.getLayout();
    const cloned = [...layout.widgets];
    const [moved] = cloned.splice(sourceIndex, 1);
    cloned.splice(destinationIndex, 0, moved);

    // Re-assign order indices
    const updated = cloned.map((w, i) => ({ ...w, order: i }));
    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(newLayout);
    return newLayout;
  },

  /**
   * Moves a widget up by one position
   */
  moveWidgetUp(widgetId: string): DashboardLayoutState {
    const layout = this.getLayout();
    const index = layout.widgets.findIndex(w => w.id === widgetId);
    if (index > 0) {
      return this.reorderWidgets(index, index - 1);
    }
    return layout;
  },

  /**
   * Moves a widget down by one position
   */
  moveWidgetDown(widgetId: string): DashboardLayoutState {
    const layout = this.getLayout();
    const index = layout.widgets.findIndex(w => w.id === widgetId);
    if (index >= 0 && index < layout.widgets.length - 1) {
      return this.reorderWidgets(index, index + 1);
    }
    return layout;
  },

  /**
   * Updates widget size
   */
  updateWidgetSize(widgetId: string, size: WidgetSize, resolution?: ResolutionMode): DashboardLayoutState {
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
  },

  /**
   * Toggles widget visibility (hide/show) without deleting it
   */
  toggleWidgetVisibility(widgetId: string): DashboardLayoutState {
    const layout = this.getLayout();
    const updated = layout.widgets.map(w => {
      if (w.id === widgetId) {
        return { ...w, visible: !w.visible };
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
  },

  /**
   * Removes a widget from the dashboard.
   * NEVER deletes any underlying data!
   */
  removeWidget(widgetId: string): DashboardLayoutState {
    const layout = this.getLayout();
    const updated = layout.widgets
      .filter(w => w.id !== widgetId)
      .map((w, idx) => ({ ...w, order: idx }));

    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(newLayout);
    return newLayout;
  },

  /**
   * Adds a new widget to the dashboard from the widget registry
   */
  addWidget(widgetType: string, customSize?: WidgetSize, resolution?: ResolutionMode): DashboardLayoutState {
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
  }
};
