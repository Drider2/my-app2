import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShoppingCart, 
  X, 
  Check, 
  Plus, 
  Trash2, 
  Share2, 
  Copy, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  PackageCheck,
  Beef,
  Apple,
  Sparkle,
  Wrench,
  Layers,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { ShoppingItem, ShoppingCategory } from '../../types';
import { ShoppingService, SHOPPING_PRESETS } from '../../services/shoppingService';
import { db, formatCurrency } from '../../services/storage';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onShowToast?: (message: string) => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | ShoppingCategory; label: string; icon: string; color: string }> = [
  { id: 'all', label: 'All', icon: '🛒', color: 'text-zinc-300' },
  { id: 'groceries', label: 'Groceries', icon: '🥦', color: 'text-emerald-400' },
  { id: 'fitness', label: 'Fitness & Food', icon: '🥩', color: 'text-orange-400' },
  { id: 'household', label: 'Household', icon: '🧼', color: 'text-cyan-400' },
  { id: 'automotive', label: 'Vehicle', icon: '🚗', color: 'text-blue-400' },
  { id: 'other', label: 'Other', icon: '📦', color: 'text-purple-400' },
];

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | ShoppingCategory>('all');
  const [itemsVersion, setItemsVersion] = useState(0);
  
  // New item inputs
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnit, setItemUnit] = useState('pcs');
  const [itemCategory, setItemCategory] = useState<ShoppingCategory>('groceries');
  const [showPresets, setShowPresets] = useState(false);
  const [recordConfirmOpen, setRecordConfirmOpen] = useState(false);

  // Read items from db state
  const state = db.getState();
  const currency = state.settings.currency_label || 'DA';
  const allItems: ShoppingItem[] = useMemo(() => {
    return ShoppingService.getItems();
  }, [itemsVersion]);

  const filteredItems = useMemo(() => {
    if (selectedCategoryTab === 'all') return allItems;
    return allItems.filter(i => i.category === selectedCategoryTab);
  }, [allItems, selectedCategoryTab]);

  const pendingItems = useMemo(() => filteredItems.filter(i => !i.is_completed), [filteredItems]);
  const completedItems = useMemo(() => filteredItems.filter(i => i.is_completed), [filteredItems]);

  // Calculations
  const totalCost = useMemo(() => {
    return allItems.reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
  }, [allItems]);

  const completedCost = useMemo(() => {
    return allItems
      .filter(i => i.is_completed)
      .reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
  }, [allItems]);

  const remainingCost = Math.max(0, totalCost - completedCost);
  const progressPercent = allItems.length > 0 ? (allItems.filter(i => i.is_completed).length / allItems.length) * 100 : 0;

  if (!isOpen) return null;

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    ShoppingService.addItem({
      name: itemName.trim(),
      category: itemCategory,
      estimated_price: parseFloat(itemPrice) || 0,
      quantity: Math.max(1, itemQuantity),
      unit: itemUnit,
    });

    setItemName('');
    setItemPrice('');
    setItemQuantity(1);
    setItemsVersion(v => v + 1);
    if (onShowToast) onShowToast(`Added "${itemName.trim()}" to shopping list`);
  };

  const handleAddPreset = (preset: typeof SHOPPING_PRESETS[0]) => {
    ShoppingService.addItem({
      name: preset.name,
      category: preset.category,
      estimated_price: preset.estimated_price,
      quantity: 1,
      unit: preset.unit,
    });
    setItemsVersion(v => v + 1);
    if (onShowToast) onShowToast(`Added "${preset.name}" (${preset.estimated_price.toLocaleString()} ${currency})`);
  };

  const handleToggle = (id: string) => {
    ShoppingService.toggleItem(id);
    setItemsVersion(v => v + 1);
  };

  const handleDelete = (id: string) => {
    ShoppingService.deleteItem(id);
    setItemsVersion(v => v + 1);
  };

  const handleClearCompleted = () => {
    ShoppingService.clearCompleted();
    setItemsVersion(v => v + 1);
    if (onShowToast) onShowToast('Cleared all completed shopping items');
  };

  const handleCopyList = () => {
    const text = ShoppingService.generateShareableText(allItems, currency);
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('📋 Shopping list copied to clipboard!');
  };

  const handleRecordToFinance = () => {
    const completed = allItems.filter(i => i.is_completed);
    if (completed.length === 0) {
      if (onShowToast) onShowToast('Check off at least 1 purchased item first');
      return;
    }

    const tx = ShoppingService.recordShoppingRunToFinance({
      itemsToRecord: completed,
      customTotalAmount: completedCost,
    });

    ShoppingService.clearCompleted();
    setRecordConfirmOpen(false);
    setItemsVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) {
      onShowToast(`✓ Recorded expense of ${(completedCost).toLocaleString()} ${currency} in Finance!`);
    }
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--hairline)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)] bg-[var(--surface)]/90 ">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-1)] flex items-center gap-2">
                Smart Shopping Checklist
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">
                  {allItems.length} items
                </span>
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Estimate cart cost, check off items in-store & auto-record to Finance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyList}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
              title="Copy checklist as text / markdown"
              aria-label="Copy checklist"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Live Budget & Progress Banner */}
          <div className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--hairline)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-0.5">
                  Total Estimated
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[var(--text-1)]">
                  {totalCost.toLocaleString()} <span className="text-[10px] text-[var(--text-3)]">{currency}</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/90 block mb-0.5">
                  Purchased
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                  {completedCost.toLocaleString()} <span className="text-[10px] text-emerald-500/70">{currency}</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--hairline)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-0.5">
                  Remaining
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-400">
                  {remainingCost.toLocaleString()} <span className="text-[10px] text-amber-500/70">{currency}</span>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-2)] font-medium">
                <span>Cart Completion</span>
                <span className="font-mono text-emerald-400">
                  {allItems.filter(i => i.is_completed).length} of {allItems.length} bought ({Math.round(progressPercent)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--hairline)]">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Presets Toggle & Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs font-semibold text-[var(--text-2)] hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showPresets ? 'Hide Fast Presets' : 'Quick Add Popular Items'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`} />
              </button>
              {allItems.some(i => i.is_completed) && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-xs text-[var(--text-3)] hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear bought</span>
                </button>
              )}
            </div>

            {showPresets && (
              <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {SHOPPING_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-2.5 py-1 text-xs rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-[var(--text-2)] hover:border-emerald-500/40 hover:text-emerald-400 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{preset.name}</span>
                      <span className="text-[10px] text-[var(--text-3)]">~{preset.estimated_price} {currency}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add Item Input Form */}
          <form onSubmit={handleAddItem} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="Add item (e.g. Chicken breast, Eggs, Milk...)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <div className="w-28 relative">
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value)}
                    placeholder="Price DA"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1 bg-[var(--surface-muted)] border border-[var(--hairline)] rounded-xl px-2">
                  <button
                    type="button"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs text-[var(--text-2)] hover:bg-[var(--surface)]"
                  >
                    -
                  </button>
                  <span className="text-xs font-mono font-bold w-5 text-center text-[var(--text-1)]">
                    {itemQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs text-[var(--text-2)] hover:bg-[var(--surface)]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['groceries', 'fitness', 'household', 'automotive', 'other'] as ShoppingCategory[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setItemCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      itemCategory === cat 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-[var(--surface-muted)] text-[var(--text-3)] hover:text-[var(--text-2)] border border-[var(--hairline)]'
                    }`}
                  >
                    {cat === 'fitness' ? 'Fitness Food' : cat}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!itemName.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </form>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategoryTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategoryTab === tab.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'bg-[var(--surface-muted)] text-[var(--text-3)] hover:text-[var(--text-2)] border border-[var(--hairline)]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-60 font-mono">
                  {tab.id === 'all' 
                    ? allItems.length 
                    : allItems.filter(i => i.category === tab.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Checklist Area */}
          <div className="space-y-4">
            {/* Pending Items */}
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-3)] px-1 block">
                To Buy ({pendingItems.length})
              </span>
              {pendingItems.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[var(--surface-muted)] border border-dashed border-[var(--hairline)] text-center text-[var(--text-3)] text-xs">
                  {allItems.length === 0 
                    ? 'Your shopping list is empty. Add items above or use the quick presets!' 
                    : 'All items in this category are purchased! 🎉'}
                </div>
              ) : (
                pendingItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className="w-5 h-5 rounded-lg border border-[var(--hairline)] bg-[var(--surface-muted)] flex items-center justify-center text-transparent hover:border-emerald-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                        title="Mark as bought"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-1)] truncate flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-muted)] text-[var(--text-3)] font-mono">
                              x{item.quantity} {item.unit || ''}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--text-3)] capitalize">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.estimated_price > 0 && (
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {(item.estimated_price * item.quantity).toLocaleString()} {currency}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-[var(--text-3)] hover:text-rose-400 rounded-lg hover:bg-[var(--surface-muted)] transition-colors opacity-60 group-hover:opacity-100"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Completed / Purchased Items */}
            {completedItems.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-500/70 px-1 block">
                  Purchased ({completedItems.length})
                </span>
                {completedItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[var(--surface-muted)]/50 border border-[var(--hairline)] flex items-center justify-between gap-3 opacity-70 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className="w-5 h-5 rounded-lg border border-emerald-500 bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0"
                        title="Unmark item"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <div className="min-w-0">
                        <span className="text-sm text-[var(--text-3)] line-through truncate block">
                          {item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.estimated_price > 0 && (
                        <span className="text-xs font-mono text-[var(--text-3)] line-through">
                          {(item.estimated_price * item.quantity).toLocaleString()} {currency}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-[var(--text-3)] hover:text-rose-400 rounded-lg hover:bg-[var(--surface-muted)] transition-colors opacity-60 group-hover:opacity-100"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with One-Click Record to Finance */}
        <div className="p-4 sm:p-5 border-t border-[var(--hairline)] bg-[var(--surface)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-3)] text-center sm:text-left">
            {completedItems.length > 0 ? (
              <span>
                <strong className="text-emerald-400 font-mono">{completedCost.toLocaleString()} {currency}</strong> ready to log in Finance
              </span>
            ) : (
              <span>Check off items as you buy them to record them as an expense</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRecordToFinance}
              disabled={completedItems.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all tap-feedback"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Record Trip to Finance ({completedCost.toLocaleString()} {currency})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
