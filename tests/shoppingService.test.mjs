import test from 'node:test';
import assert from 'node:assert/strict';

// Mock storage state and service logic for isolated unit testing
function createMockStore() {
  const state = {
    version: 1,
    settings: { currency_label: 'DA' },
    categories: [
      { id: 'cat-groceries', name: 'Food & Groceries', type: 'expense' },
      { id: 'cat-car', name: 'Vehicle & Transport', type: 'expense' }
    ],
    transactions: [],
    shoppingItems: []
  };

  return {
    state,
    addItem(params) {
      const item = {
        id: 'shop-' + Math.random().toString(36).substring(2, 9),
        name: params.name.trim(),
        category: params.category,
        estimated_price: Math.max(0, Number(params.estimated_price) || 0),
        quantity: Math.max(1, Number(params.quantity) || 1),
        unit: params.unit || 'pcs',
        is_completed: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      };
      state.shoppingItems.unshift(item);
      return item;
    },
    toggleItem(id) {
      const item = state.shoppingItems.find(i => i.id === id);
      if (item) {
        item.is_completed = !item.is_completed;
        item.completed_at = item.is_completed ? Date.now() : null;
      }
    },
    recordToFinance(itemsToRecord) {
      const completed = itemsToRecord || state.shoppingItems.filter(i => i.is_completed && !i.deleted_at);
      const totalAmount = completed.reduce((sum, item) => sum + (item.estimated_price * item.quantity), 0);
      const names = completed.map(i => i.name).join(', ');
      
      const tx = {
        id: 'tx-' + Math.random().toString(36).substring(2, 9),
        type: 'expense',
        amount_minor: Math.round(totalAmount * 100),
        category_id: state.categories[0].id,
        note: `Shopping Run: ${names}`,
        local_date: '2026-11-09',
        created_at: Date.now(),
      };
      state.transactions.unshift(tx);
      return tx;
    },
    generateShareableText(items) {
      if (items.length === 0) return 'Shopping list is empty.';
      const total = items.reduce((s, i) => s + (i.estimated_price * i.quantity), 0);
      let out = `🛒 SHOPPING LIST - Total: ${total} DA\n`;
      items.forEach(i => {
        out += `[${i.is_completed ? 'x' : ' '}] ${i.name} (${i.quantity} ${i.unit}) ~${i.estimated_price * i.quantity} DA\n`;
      });
      return out;
    }
  };
}

test('Shopping Service - Add items with quantity and estimated price', () => {
  const store = createMockStore();
  const item1 = store.addItem({ name: 'Chicken Breast', category: 'fitness', estimated_price: 1600, quantity: 2, unit: 'kg' });
  const item2 = store.addItem({ name: 'Eggs 30-pack', category: 'groceries', estimated_price: 550, quantity: 1, unit: 'pack' });

  assert.equal(store.state.shoppingItems.length, 2);
  assert.equal(item1.name, 'Chicken Breast');
  assert.equal(item1.quantity, 2);
  assert.equal(item1.estimated_price * item1.quantity, 3200);
  assert.equal(item2.estimated_price * item2.quantity, 550);
});

test('Shopping Service - Toggle item marks completed and sets timestamp', () => {
  const store = createMockStore();
  const item = store.addItem({ name: 'Milk 6L', category: 'groceries', estimated_price: 720, quantity: 1 });
  assert.equal(item.is_completed, false);
  assert.equal(item.completed_at, undefined);

  store.toggleItem(item.id);
  assert.equal(item.is_completed, true);
  assert.ok(item.completed_at > 0);

  store.toggleItem(item.id);
  assert.equal(item.is_completed, false);
  assert.equal(item.completed_at, null);
});

test('Shopping Service - Auto-records completed trip to Finance ledger', () => {
  const store = createMockStore();
  const item1 = store.addItem({ name: 'Oats 1kg', category: 'fitness', estimated_price: 350, quantity: 2 }); // 700
  const item2 = store.addItem({ name: 'Peanut Butter', category: 'fitness', estimated_price: 500, quantity: 1 }); // 500
  const item3 = store.addItem({ name: 'Olive Oil 1L', category: 'groceries', estimated_price: 1200, quantity: 1 }); // 1200 (not completed)

  // Mark item1 and item2 as completed
  store.toggleItem(item1.id);
  store.toggleItem(item2.id);

  const tx = store.recordToFinance();

  assert.equal(store.state.transactions.length, 1);
  assert.equal(tx.amount_minor, 120000); // (700 + 500) * 100 minor units
  assert.equal(tx.type, 'expense');
  assert.ok(tx.note.includes('Oats 1kg'));
  assert.ok(tx.note.includes('Peanut Butter'));
  assert.ok(!tx.note.includes('Olive Oil'));
});

test('Shopping Service - Shareable text export produces clean readable format', () => {
  const store = createMockStore();
  store.addItem({ name: 'Bananas', category: 'groceries', estimated_price: 300, quantity: 2, unit: 'kg' });
  const text = store.generateShareableText(store.state.shoppingItems);

  assert.ok(text.includes('SHOPPING LIST'));
  assert.ok(text.includes('Bananas'));
  assert.ok(text.includes('600 DA'));
});
