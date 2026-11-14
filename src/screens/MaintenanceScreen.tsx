import React, { useState } from 'react';
import { 
  Wrench, 
  Sparkles, 
  ShoppingBag, 
  Car, 
  Calendar, 
  Check, 
  Plus, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  ChevronRight, 
  Gauge, 
  Tag, 
  X,
  RotateCcw,
  CheckCircle2,
  Edit2,
  Trash2,
  Download,
  Fuel,
  FileText
} from 'lucide-react';
import { db, formatCurrency, getTodayLocalDate } from '../services/storage';
import { 
  calculateMaintenanceSummary, 
  calculateItemMonthlyEstimate,
  getItemDueStatus, 
  completeMaintenanceItem, 
  addMaintenanceItem,
  updateMaintenanceItem,
  deleteMaintenanceItem,
  updateCarOdometer,
  exportMaintenanceHistoryCsv,
  exportMaintenanceHistoryMd
} from '../services/maintenanceService';
import { MaintenanceCategory, MaintenanceItem, RecurrenceType, ItemPriority, ModuleLayoutState, ModuleWidgetConfig, WidgetSize } from '../types';
import { ModuleCustomizationService } from '../services/moduleCustomizationService';
import { MODULE_WIDGET_REGISTRY } from '../services/moduleWidgetRegistry';
import { ModuleEditHeader } from '../components/customization/ModuleEditHeader';
import { ModuleWidgetContainer } from '../components/customization/ModuleWidgetContainer';
import { ModuleAddWidgetModal } from '../components/customization/ModuleAddWidgetModal';
import { ModulePresetModal } from '../components/customization/ModulePresetModal';
import { MaintenanceWidgetRenderer, UpdateOdometerModal,
  FuelLogModal, FuelMileageView, VehicleServiceModal } from '../components/maintenance';

interface MaintenanceScreenProps {
  onRefresh: () => void;
  onBack?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onRefresh, onBack }) => {
  const state = db.getState();
  const [activeTab, setActiveTab] = useState<MaintenanceCategory | 'overview' | 'fuel_mileage'>('overview');

  // Module Customization State
  const [layout, setLayout] = useState<ModuleLayoutState>(ModuleCustomizationService.getLayout('maintenance'));
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<ModuleWidgetConfig[]>([]);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const handleExportServiceHistoryCsv = () => {
    const csv = exportMaintenanceHistoryCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_maintenance_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Maintenance records exported as CSV');
  };

  const handleExportServiceHistoryMd = () => {
    const md = exportMaintenanceHistoryMd();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maintenance_audit_${getTodayLocalDate()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Vehicle & care audit report exported as Markdown');
  };


  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const handleStartEdit = () => {
    setDraftWidgets([...layout.widgets]);
    setIsEditMode(true);
    setActiveTab('overview');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setDraftWidgets([]);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveLayout = () => {
    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: draftWidgets,
      updated_at: Date.now(),
    };
    ModuleCustomizationService.saveLayout('maintenance', newLayout);
    setLayout(newLayout);
    setIsEditMode(false);
    triggerToast('✓ Maintenance layout saved successfully');
    onRefresh();
  };

  const handleResetDefault = () => {
    const res = ModuleCustomizationService.resetToDefault('maintenance');
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast('✓ Reset to default layout');
    onRefresh();
  };

  const handleApplyPreset = (presetId: string) => {
    const res = ModuleCustomizationService.applyPreset('maintenance', presetId);
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast(`✓ Applied ${presetId.replace('_', ' ')}`);
    onRefresh();
  };

  const handleAddWidget = (widgetType: string) => {
    if (isEditMode) {
      const def = MODULE_WIDGET_REGISTRY[widgetType];
      const newW: ModuleWidgetConfig = {
        id: `mod-maint-${widgetType}-${Date.now().toString(36)}`,
        widgetType,
        size: def?.defaultSize || 'full',
        visible: true,
        order: draftWidgets.length,
      };
      setDraftWidgets(prev => [...prev, newW]);
    } else {
      const res = ModuleCustomizationService.addWidget('maintenance', widgetType);
      setLayout(res);
    }
    setIsAddWidgetModalOpen(false);
    triggerToast('✓ Added widget to layout');
    onRefresh();
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.filter(w => w.id !== widgetId).map((w, idx) => ({ ...w, order: idx })));
    } else {
      const res = ModuleCustomizationService.removeWidget('maintenance', widgetId);
      setLayout(res);
    }
    triggerToast('✓ Removed card from page');
  };

  const handleToggleVisibility = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
    } else {
      const res = ModuleCustomizationService.toggleWidgetVisibility('maintenance', widgetId);
      setLayout(res);
    }
  };

  const handleChangeSize = (widgetId: string, size: WidgetSize) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, size } : w));
    } else {
      const res = ModuleCustomizationService.changeWidgetSize('maintenance', widgetId, size);
      setLayout(res);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const cloned = [...draftWidgets];
    const [item] = cloned.splice(index, 1);
    cloned.splice(index - 1, 0, item);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index >= draftWidgets.length - 1) return;
    const cloned = [...draftWidgets];
    const [item] = cloned.splice(index, 1);
    cloned.splice(index + 1, 0, item);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode || draggedIndex === null) return;
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const cloned = [...draftWidgets];
    const [moved] = cloned.splice(draggedIndex, 1);
    cloned.splice(targetIndex, 0, moved);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const [selectedItemForCompletion, setSelectedItemForCompletion] = useState<MaintenanceItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [completionCost, setCompletionCost] = useState<number>(0);
  const [completionDate, setCompletionDate] = useState<string>(getTodayLocalDate());
  const [recordInFinance, setRecordInFinance] = useState(true);
  const [completionOdometer, setCompletionOdometer] = useState<number>(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // New Item Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<MaintenanceCategory>('personal_care');
  const [newCostMajor, setNewCostMajor] = useState<number>(600);
  const [newRecurrenceType, setNewRecurrenceType] = useState<RecurrenceType>('days');
  const [newInterval, setNewInterval] = useState<number>(10);
  const [newPriority, setNewPriority] = useState<ItemPriority>('medium');
  const [newNotes, setNewNotes] = useState('');

  // Edit Item Form State
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCostMajor, setEditCostMajor] = useState<number>(0);
  const [editInterval, setEditInterval] = useState<number>(10);
  const [editPriority, setEditPriority] = useState<ItemPriority>('medium');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenEdit = (item: MaintenanceItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCostMajor(Math.round(item.estimated_cost_minor / 100));
    setEditInterval(item.recurrence_interval || 10);
    setEditPriority(item.priority || 'medium');
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    updateMaintenanceItem(editingItem.id, {
      name: editName.trim(),
      estimated_cost_minor: Math.round(editCostMajor * 100),
      recurrence_interval: editInterval,
      priority: editPriority,
      notes: editNotes.trim(),
    });

    setEditingItem(null);
    setSuccessBanner(`Updated ${editName.trim()}`);
    setTimeout(() => setSuccessBanner(null), 3000);
    onRefresh();
  };

  const handleDeleteItem = (itemId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMaintenanceItem(itemId);
      setSuccessBanner(`Deleted ${name}`);
      setTimeout(() => setSuccessBanner(null), 3000);
      onRefresh();
    }
  };

  const summary = calculateMaintenanceSummary(state.maintenanceItems);

  // Filter items by category
  const filteredItems = state.maintenanceItems.filter(
    item => !item.deleted_at && item.category === activeTab
  );

  const handleOpenCompletionModal = (item: MaintenanceItem) => {
    setSelectedItemForCompletion(item);
    setCompletionCost(Math.round(item.estimated_cost_minor / 100));
    setCompletionDate(getTodayLocalDate());
    setCompletionOdometer(item.current_odometer_km || 142500);
    setRecordInFinance(true);
  };

  const handleConfirmCompletion = () => {
    if (!selectedItemForCompletion) return;

    const result = completeMaintenanceItem({
      itemId: selectedItemForCompletion.id,
      completionDate,
      actualCostMinor: Math.round(completionCost * 100),
      recordInFinance,
      newOdometerKm: selectedItemForCompletion.category === 'car_maintenance' ? completionOdometer : undefined,
    });

    setSelectedItemForCompletion(null);
    setSuccessBanner(result.message);
    setTimeout(() => setSuccessBanner(null), 4000);
    onRefresh();
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const today = getTodayLocalDate();
    addMaintenanceItem({
      name: newName.trim(),
      category: newCategory,
      estimated_cost_minor: Math.round(newCostMajor * 100),
      recurrence_type: newRecurrenceType,
      recurrence_interval: newInterval,
      next_reminder_date: today,
      priority: newPriority,
      status: 'upcoming',
      notes: newNotes.trim() || undefined,
      finance_category_id: newCategory === 'car_maintenance' ? 'cat-car' : 'cat-personal',
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewNotes('');
    onRefresh();
  };

  const getPriorityBadgeClass = (priority: ItemPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-[#D97979]/15 text-[#D97979] border-[#D97979]/30';
      case 'medium':
        return 'bg-[#D6AD68]/15 text-[#D6AD68] border-[#D6AD68]/30';
      case 'low':
        return 'bg-[#A1ABA2]/15 text-[var(--color-text-secondary)] border-[var(--color-border)]';
    }
  };

  const activeWidgets = isEditMode ? draftWidgets : layout.widgets.filter(w => w.visible);

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs  border border-[var(--color-border)] flex items-center gap-2 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. REUSABLE MODULE EDIT HEADER                           */}
      {/* ======================================================== */}
      <ModuleEditHeader
        title="Personal Maintenance"
        subtitle="Care cycles, car service & recurring shopping"
        isEditMode={isEditMode}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveLayout={handleSaveLayout}
        onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onResetDefault={handleResetDefault}
        actionsRight={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(true)}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-cyan-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Vehicle Service & Parts Desk"
              aria-label="Vehicle Service"
            >
              <Wrench className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={() => setIsFuelModalOpen(true)}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Fuel Fill-up Log & Mileage Efficiency"
              aria-label="Fuel Log"
            >
              <Fuel className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => setIsOdometerModalOpen(true)}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-cyan-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Quick Update Car Odometer"
              aria-label="Update Odometer"
            >
              <Gauge className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={handleExportServiceHistoryCsv}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Maintenance History (.CSV)"
              aria-label="Export Maintenance CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportServiceHistoryMd}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Audit Report (.MD)"
              aria-label="Export Maintenance MD"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (activeTab === 'overview') setNewCategory('personal_care');
                else setNewCategory(activeTab as MaintenanceCategory);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold transition-all tap-feedback shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        }
      />

      {/* Success Banner */}
      {successBanner && (
        <div className="p-3 rounded-2xl bg-[var(--color-positive)]/15 border border-[var(--color-positive)]/40 text-[var(--color-positive)] text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CATEGORY TABS (OVERVIEW | PERSONAL | CAR | SHOPPING)  */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('overview');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-feedback ${
            activeTab === 'overview'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <span>OVERVIEW</span>
        </button>

        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('personal_care');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-feedback ${
            activeTab === 'personal_care'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Personal Care</span>
        </button>

        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('car_maintenance');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-feedback ${
            activeTab === 'car_maintenance'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Vehicle Care</span>
        </button>

        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('shopping');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-feedback ${
            activeTab === 'shopping'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Shopping List</span>
        </button>

        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('fuel_mileage');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tap-feedback ${
            activeTab === 'fuel_mileage'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Fuel & Mileage</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 0. TAB: OVERVIEW (CUSTOMIZABLE MAINTENANCE WIDGETS GRID) */}
      {/* ======================================================== */}
      {(activeTab === 'overview' || isEditMode) && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {activeWidgets.map((widgetConfig, idx) => (
              <div
                key={widgetConfig.id}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-150 ${
                  isEditMode && dragOverIndex === idx ? 'border-t-2 border-[var(--color-accent)] pt-1' : ''
                }`}
              >
                <ModuleWidgetContainer
                  widget={widgetConfig}
                  isEditMode={isEditMode}
                  isFirst={idx === 0}
                  isLast={idx === activeWidgets.length - 1}
                  onMoveUp={() => handleMoveUp(idx)}
                  onMoveDown={() => handleMoveDown(idx)}
                  onRemove={() => handleRemoveWidget(widgetConfig.id)}
                  onToggleVisibility={() => handleToggleVisibility(widgetConfig.id)}
                  onChangeSize={(sz) => handleChangeSize(widgetConfig.id, sz)}
                >
                  <MaintenanceWidgetRenderer
                    widget={widgetConfig}
                    onRefresh={onRefresh}
                    onOpenAddItemModal={() => {
                      setNewCategory('shopping');
                      setIsAddModalOpen(true);
                    }}
                    onCompleteItem={handleOpenCompletionModal}
                    triggerToast={triggerToast}
                  />
                </ModuleWidgetContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ITEMS LIST (FOR ACTIVE TAB)                           */}
      {/* ======================================================== */}
      {activeTab === 'fuel_mileage' && !isEditMode && (
        <FuelMileageView
          onOpenLogModal={() => setIsFuelModalOpen(true)}
          onRefresh={onRefresh}
          onToast={triggerToast}
          currencyLabel={state.settings.currency_label || 'DA'}
        />
      )}

      {activeTab !== 'overview' && activeTab !== 'fuel_mileage' && !isEditMode && (
        <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-2">
            <Wrench className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-40" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">No reminders in this category</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Tap "+ Add" to schedule haircuts, car maintenance or things to buy.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const dueStatus = getItemDueStatus(item);
            const monthlyEst = calculateItemMonthlyEstimate(item);

            return (
              <div 
                key={item.id}
                className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]  space-y-3 transition-all hover:border-[var(--color-accent)]/30"
              >
                {/* Top Row: Name, Priority, Due Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[var(--color-text-primary)] tracking-tight">
                        {item.name}
                      </h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold  border ${getPriorityBadgeClass(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {item.notes || 'Scheduled recurring routine'}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${
                    dueStatus.isOverdue
                      ? 'bg-[#D97979]/15 text-[#D97979] border border-[#D97979]/30'
                      : dueStatus.isDueToday
                      ? 'bg-[#D6AD68]/20 text-[#D6AD68] border border-[#D6AD68]/30'
                      : dueStatus.isSoon
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                  }`}>
                    {dueStatus.badgeText}
                  </span>
                </div>

                {/* Middle Info: Frequency & Cost */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)] text-xs">
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)] block">Recurrence Cycle</span>
                    <span className="font-medium text-[var(--color-text-primary)] text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--color-accent)]" />
                      {item.recurrence_type === 'days' && `Every ${item.recurrence_interval} days`}
                      {item.recurrence_type === 'weeks' && `Every ${item.recurrence_interval} weeks`}
                      {item.recurrence_type === 'months' && `Every ${item.recurrence_interval} months`}
                      {item.recurrence_type === 'mileage' && `Every ${item.next_reminder_mileage_km?.toLocaleString()} km`}
                      {item.recurrence_type === 'as_needed' && 'As needed / One-off'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[var(--color-text-muted)] block">Estimated Cost</span>
                    <span className="font-semibold text-[var(--color-accent)] text-xs">
                      {formatCurrency(item.estimated_cost_minor, state.settings.currency_label)}
                      {monthlyEst > 0 && (
                        <span className="text-xs text-[var(--color-text-secondary)] font-normal ms-1">
                          (~{formatCurrency(monthlyEst, state.settings.currency_label)}/mo)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Car specific odometer if applicable */}
                {item.category === 'car_maintenance' && item.current_odometer_km && (
                  <div className="p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      <span className="text-xs text-[var(--color-text-secondary)]">Current Odometer:</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      {item.current_odometer_km.toLocaleString()} km
                    </span>
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {item.last_service_date ? `Last: ${item.last_service_date}` : 'Not done yet'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] transition-all"
                      title="Edit item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 rounded-xl bg-[var(--color-surface-subtle)] text-[#D97979]/70 hover:text-[#D97979] border border-[var(--color-border)] transition-all"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenCompletionModal(item)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#222C24] hover:bg-[#2A342C] text-[var(--color-accent)] text-xs font-bold border border-[var(--color-border)] transition-all tap-feedback"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{item.category === 'shopping' ? 'Purchased' : 'Done'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. COMPLETION & FINANCE CONFIRMATION MODAL               */}
      {/* ======================================================== */}
      {selectedItemForCompletion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60  animate-fade-in p-2 sm:p-4">
          <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl p-5  border border-[var(--color-border)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Confirm {selectedItemForCompletion.category === 'shopping' ? 'Purchase' : 'Maintenance'}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">{selectedItemForCompletion.name}</p>
              </div>
              <button
                onClick={() => setSelectedItemForCompletion(null)}
                className="p-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Date */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Completion Date</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                />
              </div>

              {/* Actual Cost */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">
                  Actual Cost Paid ({state.settings.currency_label})
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={completionCost}
                  onChange={(e) => setCompletionCost(Number(e.target.value) || 0)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                />
              </div>

              {/* Odometer for Car */}
              {selectedItemForCompletion.category === 'car_maintenance' && (
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">
                    Current Vehicle Odometer (km)
                  </label>
                  <input
                    type="number"
                    value={completionOdometer}
                    onChange={(e) => setCompletionOdometer(Number(e.target.value) || 0)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  />
                </div>
              )}

              {/* Finance Sync Checkbox */}
              <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordInFinance}
                    onChange={(e) => setRecordInFinance(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--color-accent)] bg-[var(--color-bg)] border-[var(--color-border)] focus:ring-[#A6D96A]"
                  />
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Record expense in Finance module
                  </span>
                </label>
                <p className="text-xs text-[var(--color-text-muted)] ps-6">
                  Automatically adds a non-duplicate expense transaction to your monthly budget ledger.
                </p>
              </div>

              {/* Recurrence Next Date Note */}
              <div className="p-2.5 rounded-xl bg-[#222C24] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-accent)]">Next Cycle: </span>
                {selectedItemForCompletion.recurrence_type === 'as_needed'
                  ? 'Will be marked as completed in your shopping history.'
                  : `Next reminder will be auto-calculated starting from ${completionDate}.`}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setSelectedItemForCompletion(null)}
                className="flex-1 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[#222C24] text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                className="flex-1 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[#b8e482] text-xs font-bold text-[var(--color-accent-contrast)]  tap-feedback"
              >
                Confirm & Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. ADD NEW REMINDER MODAL                                */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60  animate-fade-in p-2 sm:p-4">
          <form 
            onSubmit={handleCreateNewItem}
            className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl p-5  border border-[var(--color-border)] space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">New Maintenance Reminder</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haircut, Buy Gym Shoes, Brake Pads"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MaintenanceCategory)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  >
                    <option value="personal_care">Personal Care</option>
                    <option value="shopping">Shopping / Buy</option>
                    <option value="car_maintenance">Car Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ItemPriority)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">
                    Estimated Cost ({state.settings.currency_label})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newCostMajor}
                    onChange={(e) => setNewCostMajor(Number(e.target.value) || 0)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Recurrence Type</label>
                  <select
                    value={newRecurrenceType}
                    onChange={(e) => setNewRecurrenceType(e.target.value as RecurrenceType)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  >
                    <option value="days">Every N Days</option>
                    <option value="weeks">Every N Weeks</option>
                    <option value="months">Every N Months</option>
                    <option value="mileage">By Mileage (km)</option>
                    <option value="as_needed">As Needed / One-off</option>
                  </select>
                </div>
              </div>

              {newRecurrenceType !== 'as_needed' && (
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">
                    Interval ({newRecurrenceType === 'days' ? 'Days' : newRecurrenceType === 'weeks' ? 'Weeks' : 'Months'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newInterval}
                    onChange={(e) => setNewInterval(Number(e.target.value) || 1)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Notes & Details</label>
                <input
                  type="text"
                  placeholder="e.g. Barber Studio, 5W-40 Synthetic oil, size 42"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1 placeholder-[#707B71]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[#222C24] text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[#b8e482] text-xs font-bold text-[var(--color-accent-contrast)]  tap-feedback"
              >
                Create Reminder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. EDIT REMINDER MODAL                                   */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60  animate-fade-in p-2 sm:p-4">
          <form 
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl p-5  border border-[var(--color-border)] space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Edit Maintenance Item</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Item Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Cost ({state.settings.currency_label})</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editCostMajor}
                    onChange={(e) => setEditCostMajor(Number(e.target.value) || 0)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Interval ({editingItem.recurrence_type})</label>
                  <input
                    type="number"
                    min="1"
                    value={editInterval}
                    onChange={(e) => setEditInterval(Number(e.target.value) || 1)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as ItemPriority)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
                >
                  <option value="high">High (Urgent)</option>
                  <option value="medium">Medium (Regular)</option>
                  <option value="low">Low (Discretionary)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium block">Notes & Specifications</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1 placeholder-[#707B71]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[#222C24] text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[#b8e482] text-xs font-bold text-[var(--color-accent-contrast)]  tap-feedback"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Module Customization Add Widget & Preset Modals */}
      <ModuleAddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        moduleId="maintenance"
        moduleTitle="Personal Maintenance"
        currentWidgets={isEditMode ? draftWidgets : layout.widgets}
        onAddWidget={handleAddWidget}
      />

      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="maintenance"
        moduleTitle="Personal Maintenance"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />

      {/* Quick Odometer Synchronizer Modal */}
      <UpdateOdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        onSuccess={(msg) => {
          triggerToast(msg);
          onRefresh();
        }}
      />

      {/* Fuel Fill-Up & Efficiency Modal */}
      <FuelLogModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        onRefresh={onRefresh}
        onToast={triggerToast}
        
        currencyLabel={state.settings.currency_label || 'DA'}
      />

      {/* Vehicle Service & Parts Desk Modal */}
      <VehicleServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />
    </div>
  );
};
