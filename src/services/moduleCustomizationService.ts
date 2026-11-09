// Global Module Customization Engine & Persistence Service
import { db, generateUUID } from './storage';
import { 
  ModuleId, 
  ModuleLayoutState, 
  ModuleWidgetConfig, 
  WidgetSize, 
  DashboardLayoutState 
} from '../types';
import { 
  MODULE_WIDGET_REGISTRY, 
  MODULE_PRESETS, 
  createModulePresetLayout, 
  getPresetsForModule 
} from './moduleWidgetRegistry';

export const ModuleCustomizationService = {
  /**
   * Retrieves the layout state for a given module.
   * If not already configured in state, generates and persists the default preset layout.
   */
  getLayout(moduleId: ModuleId): ModuleLayoutState {
    const state = db.getState();

    // 1. Dashboard legacy bridge
    if (moduleId === 'dashboard') {
      if (state.moduleLayouts && state.moduleLayouts['dashboard']) {
        return state.moduleLayouts['dashboard'];
      }
      if (state.dashboardLayout && state.dashboardLayout.widgets && state.dashboardLayout.widgets.length > 0) {
        const legacy: ModuleLayoutState = {
          moduleId: 'dashboard',
          version: state.dashboardLayout.version || 1,
          preset: state.dashboardLayout.preset || 'complete_overview',
          widgets: state.dashboardLayout.widgets,
          updated_at: state.dashboardLayout.updated_at || Date.now(),
        };
        this.saveLayout('dashboard', legacy);
        return legacy;
      }
      const defaultDashboard = createModulePresetLayout('dashboard', 'complete_overview');
      this.saveLayout('dashboard', defaultDashboard);
      return defaultDashboard;
    }

    // 2. Other modules
    if (state.moduleLayouts && state.moduleLayouts[moduleId]) {
      const existing = state.moduleLayouts[moduleId];
      if (existing.widgets && existing.widgets.length > 0) {
        return existing;
      }
    }

    // Determine default preset ID for this module
    const presets = getPresetsForModule(moduleId);
    const defaultPresetId = Object.keys(presets)[0] || 'complete';
    const defaultLayout = createModulePresetLayout(moduleId, defaultPresetId);
    this.saveLayout(moduleId, defaultLayout);
    return defaultLayout;
  },

  /**
   * Saves the layout for a specific module to persistent storage.
   */
  saveLayout(moduleId: ModuleId, layout: ModuleLayoutState): void {
    db.updateState(draft => {
      if (!draft.moduleLayouts) {
        draft.moduleLayouts = {};
      }
      draft.moduleLayouts[moduleId] = {
        ...layout,
        moduleId,
        updated_at: Date.now(),
      };

      // Keep legacy dashboardLayout synchronized
      if (moduleId === 'dashboard') {
        draft.dashboardLayout = {
          version: layout.version,
          preset: layout.preset as any,
          widgets: layout.widgets,
          updated_at: Date.now(),
        };
      }
    });
  },

  /**
   * Applies a predefined layout preset to the module.
   */
  applyPreset(moduleId: ModuleId, presetId: string): ModuleLayoutState {
    const layout = createModulePresetLayout(moduleId, presetId);
    this.saveLayout(moduleId, layout);
    return layout;
  },

  /**
   * Resets the module's layout to its default preset.
   */
  resetToDefault(moduleId: ModuleId): ModuleLayoutState {
    const presets = getPresetsForModule(moduleId);
    const defaultPresetId = Object.keys(presets)[0] || 'complete';
    return this.applyPreset(moduleId, defaultPresetId);
  },

  /**
   * Reorders widgets inside the module layout array.
   */
  reorderWidgets(moduleId: ModuleId, sourceIndex: number, destinationIndex: number): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const cloned = [...layout.widgets];
    const [moved] = cloned.splice(sourceIndex, 1);
    cloned.splice(destinationIndex, 0, moved);

    const updated = cloned.map((w, i) => ({ ...w, order: i }));
    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(moduleId, newLayout);
    return newLayout;
  },

  /**
   * Moves a widget up by one position
   */
  moveWidgetUp(moduleId: ModuleId, widgetId: string): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const index = layout.widgets.findIndex(w => w.id === widgetId);
    if (index > 0) {
      return this.reorderWidgets(moduleId, index, index - 1);
    }
    return layout;
  },

  /**
   * Moves a widget down by one position
   */
  moveWidgetDown(moduleId: ModuleId, widgetId: string): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const index = layout.widgets.findIndex(w => w.id === widgetId);
    if (index >= 0 && index < layout.widgets.length - 1) {
      return this.reorderWidgets(moduleId, index, index + 1);
    }
    return layout;
  },

  /**
   * Adds a widget of given type to the module layout.
   */
  addWidget(moduleId: ModuleId, widgetType: string, size?: WidgetSize): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const def = MODULE_WIDGET_REGISTRY[widgetType];

    const newWidget: ModuleWidgetConfig = {
      id: `mod-${moduleId}-${widgetType}-${generateUUID().slice(0, 8)}`,
      widgetType,
      size: size || def?.defaultSize || 'full',
      visible: true,
      order: layout.widgets.length,
    };

    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: [...layout.widgets, newWidget],
      updated_at: Date.now(),
    };
    this.saveLayout(moduleId, newLayout);
    return newLayout;
  },

  /**
   * Removes a widget from the layout. Does NOT delete underlying user data.
   */
  removeWidget(moduleId: ModuleId, widgetId: string): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const filtered = layout.widgets.filter(w => w.id !== widgetId);
    const reordered = filtered.map((w, idx) => ({ ...w, order: idx }));

    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: reordered,
      updated_at: Date.now(),
    };
    this.saveLayout(moduleId, newLayout);
    return newLayout;
  },

  /**
   * Toggles visibility of a widget without removing it.
   */
  toggleWidgetVisibility(moduleId: ModuleId, widgetId: string): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const updated = layout.widgets.map(w => {
      if (w.id === widgetId) {
        return { ...w, visible: !w.visible };
      }
      return w;
    });

    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(moduleId, newLayout);
    return newLayout;
  },

  /**
   * Changes the responsive size of a widget.
   */
  changeWidgetSize(moduleId: ModuleId, widgetId: string, size: WidgetSize): ModuleLayoutState {
    const layout = this.getLayout(moduleId);
    const updated = layout.widgets.map(w => {
      if (w.id === widgetId) {
        return { ...w, size };
      }
      return w;
    });

    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: updated,
      updated_at: Date.now(),
    };
    this.saveLayout(moduleId, newLayout);
    return newLayout;
  },
};
