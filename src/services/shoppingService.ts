import { db, generateUUID, getTodayLocalDate } from './storage';
import { ShoppingItem, ShoppingCategory, Transaction } from '../types';

export const SHOPPING_PRESETS: Array<{
  name: string;
  category: ShoppingCategory;
  estimated_price: number;
  unit: string;
}> = [
  // Fitness & High Protein
  { name: 'Chicken Breast 2kg', category: 'fitness', estimated_price: 1600, unit: 'kg' },
  { name: 'Fresh Eggs 30-pack', category: 'groceries', estimated_price: 550, unit: 'pack' },
  { name: 'Ground Beef 1kg', category: 'fitness', estimated_price: 2200, unit: 'kg' },
  { name: 'Rolled Oats 1kg', category: 'fitness', estimated_price: 350, unit: 'pack' },
  { name: 'Whey Protein 2kg', category: 'fitness', estimated_price: 6500, unit: 'tub' },
  { name: 'Peanut Butter 500g', category: 'fitness', estimated_price: 500, unit: 'jar' },
  
  // Groceries & Staples
  { name: 'Whole Milk 6L', category: 'groceries', estimated_price: 720, unit: 'L' },
  { name: 'Fresh Baguettes / Bread', category: 'groceries', estimated_price: 100, unit: 'pcs' },
  { name: 'Extra Virgin Olive Oil 1L', category: 'groceries', estimated_price: 1200, unit: 'L' },
  { name: 'Bananas 1.5kg', category: 'groceries', estimated_price: 450, unit: 'kg' },
  { name: 'Basmati Rice 2kg', category: 'groceries', estimated_price: 480, unit: 'kg' },
  { name: 'Ground Coffee 250g', category: 'groceries', estimated_price: 400, unit: 'pack' },
  { name: 'Canned Tuna 3x', category: 'groceries', estimated_price: 450, unit: 'pack' },
  { name: 'Mineral Water Pack (6x1.5L)', category: 'groceries', estimated_price: 240, unit: 'pack' },

  // Household & Cleaning
  { name: 'Laundry Detergent Liquid', category: 'household', estimated_price: 1100, unit: 'bottle' },
  { name: 'Dishwashing Soap', category: 'household', estimated_price: 320, unit: 'bottle' },
  { name: 'Paper Towels (6 Rolls)', category: 'household', estimated_price: 450, unit: 'pack' },
  { name: 'Heavy Duty Trash Bags', category: 'household', estimated_price: 280, unit: 'pack' },

  // Automotive Care
  { name: 'Windshield Washer Fluid 5L', category: 'automotive', estimated_price: 400, unit: 'can' },
  { name: 'Microfiber Detailing Towels 3x', category: 'automotive', estimated_price: 650, unit: 'pack' },
  { name: 'Engine Coolant 5L (-25C)', category: 'automotive', estimated_price: 1500, unit: 'can' },
];

export class ShoppingService {
  static getItems(): ShoppingItem[] {
    const state = db.getState();
    return (state.shoppingItems || []).filter(item => !item.deleted_at);
  }

  static addItem(params: {
    name: string;
    category: ShoppingCategory;
    estimated_price: number;
    quantity: number;
    unit?: string;
    notes?: string;
  }): ShoppingItem {
    const now = Date.now();
    const newItem: ShoppingItem = {
      id: generateUUID(),
      name: params.name.trim(),
      category: params.category,
      estimated_price: Math.max(0, Number(params.estimated_price) || 0),
      quantity: Math.max(1, Number(params.quantity) || 1),
      unit: params.unit || 'pcs',
      is_completed: false,
      notes: params.notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(state => {
      if (!state.shoppingItems) state.shoppingItems = [];
      state.shoppingItems.unshift(newItem);
    });

    return newItem;
  }

  static toggleItem(id: string): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.shoppingItems) return;
      const target = state.shoppingItems.find(i => i.id === id);
      if (target) {
        target.is_completed = !target.is_completed;
        target.completed_at = target.is_completed ? now : null;
        target.updated_at = now;
      }
    });
  }

  static updateItem(id: string, updates: Partial<ShoppingItem>): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.shoppingItems) return;
      const target = state.shoppingItems.find(i => i.id === id);
      if (target) {
        Object.assign(target, updates);
        target.updated_at = now;
      }
    });
  }

  static deleteItem(id: string): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.shoppingItems) return;
      const target = state.shoppingItems.find(i => i.id === id);
      if (target) {
        target.deleted_at = now;
      }
    });
  }

  static clearCompleted(): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.shoppingItems) return;
      state.shoppingItems.forEach(i => {
        if (i.is_completed && !i.deleted_at) {
          i.deleted_at = now;
        }
      });
    });
  }

  static clearAll(): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.shoppingItems) return;
      state.shoppingItems.forEach(i => {
        i.deleted_at = now;
      });
    });
  }

  /**
   * Records completed shopping items into the Finance ledger as an Expense
   */
  static recordShoppingRunToFinance(params: {
    itemsToRecord?: ShoppingItem[];
    customTotalAmount?: number;
    categoryId?: string;
    notePrefix?: string;
  }): Transaction {
    const items = params.itemsToRecord || this.getItems().filter(i => i.is_completed);
    const today = getTodayLocalDate();
    const now = Date.now();
    const state = db.getState();

    const calculatedTotal = items.reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
    const finalAmount = params.customTotalAmount !== undefined ? params.customTotalAmount : calculatedTotal;

    // Pick appropriate category
    const defaultCategory = state.categories.find(c => 
      c.name.toLowerCase().includes('food') || 
      c.name.toLowerCase().includes('grocer') ||
      c.name.toLowerCase().includes('shopping')
    ) || state.categories[0];

    const categoryId = params.categoryId || defaultCategory?.id || 'cat-food';

    const itemNames = items.slice(0, 5).map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ');
    const moreCount = items.length > 5 ? ` +${items.length - 5} more` : '';
    const note = `${params.notePrefix || 'Shopping Run'}: ${itemNames}${moreCount}`;

    const tx: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount_minor: Math.round(finalAmount * 100),
      local_date: today,
      category_id: categoryId,
      note,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(s => {
      s.transactions.unshift(tx);
    });

    return tx;
  }

  /**
   * Generates a clean markdown / printable text list for copying to SMS, WhatsApp, or Notes
   */
  static generateShareableText(items: ShoppingItem[], currencyLabel: string = 'DA'): string {
    if (items.length === 0) return 'Shopping list is empty.';

    const totalEst = items.reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
    const pendingItems = items.filter(i => !i.is_completed);
    const doneItems = items.filter(i => i.is_completed);

    let text = `🛒 GREEN DREAM SHOPPING LIST (${getTodayLocalDate()})\n`;
    text += `💰 Estimated Total: ${totalEst.toLocaleString()} ${currencyLabel}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (pendingItems.length > 0) {
      text += `📋 TO BUY (${pendingItems.length}):\n`;
      pendingItems.forEach(i => {
        const priceStr = i.estimated_price > 0 ? ` (~${(i.estimated_price * i.quantity).toLocaleString()} ${currencyLabel})` : '';
        text += ` [ ] ${i.name} - ${i.quantity} ${i.unit || 'pcs'}${priceStr}\n`;
      });
      text += `\n`;
    }

    if (doneItems.length > 0) {
      text += `✅ PURCHASED (${doneItems.length}):\n`;
      doneItems.forEach(i => {
        text += ` [x] ${i.name} - ${i.quantity} ${i.unit || 'pcs'}\n`;
      });
    }

    return text;
  }
}
