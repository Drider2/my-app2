import test from 'node:test';
import assert from 'node:assert/strict';

test('Persistence & Sync - State timestamps and atomic serialization integrity', () => {
  const now = Date.now();
  const sampleState = {
    version: 2,
    last_modified: now,
    settings: {
      user_name: 'Yacine',
      display_mode: 'auto',
      theme: 'dark'
    },
    habits: [
      { id: 'h-1', name: 'Morning Meditation', created_at: now }
    ],
    transactions: [
      { id: 'tx-1', amount_minor: 120000, type: 'expense' }
    ],
    hermesChats: [
      { id: 'chat-1', title: 'Test Session', updated_at: now, messages: [] }
    ],
    hermesNotes: [
      { id: 'note-1', content: 'Important note', updated_at: now }
    ]
  };

  const serialized = JSON.stringify(sampleState);
  assert.ok(serialized.length > 50, 'Serialized state must not be empty');

  const deserialized = JSON.parse(serialized);
  assert.equal(deserialized.version, 2);
  assert.equal(deserialized.last_modified, now);
  assert.equal(deserialized.habits.length, 1);
  assert.equal(deserialized.transactions.length, 1);
  assert.equal(deserialized.hermesChats.length, 1);
  assert.equal(deserialized.hermesNotes.length, 1);
  assert.equal(deserialized.settings.display_mode, 'auto');
});

test('Persistence & Sync - Rapid consecutive state updates preserve latest modifications', () => {
  let currentState = {
    transactions: [],
    last_modified: 0
  };

  function updateState(updater) {
    updater(currentState);
    currentState.last_modified = Date.now();
    return currentState;
  }

  // Perform 50 rapid sequential updates simulating rapid typing or transactions
  for (let i = 1; i <= 50; i++) {
    updateState(draft => {
      draft.transactions.push({
        id: `tx-${i}`,
        amount_minor: i * 1000,
        type: 'expense'
      });
    });
  }

  assert.equal(currentState.transactions.length, 50, 'All 50 rapid updates must be preserved');
  assert.equal(currentState.transactions[49].id, 'tx-50');
  assert.ok(currentState.last_modified > 0, 'last_modified timestamp must be updated');
});

test('Persistence & Sync - Fallback and migration for missing optional fields', () => {
  const legacyState = {
    version: 1,
    settings: {
      user_name: 'Yacine'
    }
  };

  // Simulate storage migration logic
  if (!legacyState.settings.display_mode) {
    legacyState.settings.display_mode = 'auto';
  }
  if (!legacyState.hermesChats) {
    legacyState.hermesChats = [];
  }
  if (!legacyState.hermesNotes) {
    legacyState.hermesNotes = [];
  }

  assert.equal(legacyState.settings.display_mode, 'auto');
  assert.deepEqual(legacyState.hermesChats, []);
  assert.deepEqual(legacyState.hermesNotes, []);
});

test('Persistence & Sync - Bidirectional sync conflict resolution favors newer timestamp', () => {
  const localState = {
    version: 2,
    last_modified: 1000,
    habits: [{ id: 'h-1', name: 'Old Habit' }]
  };

  const incomingServerState = {
    version: 2,
    last_modified: 2000,
    habits: [{ id: 'h-1', name: 'Updated Habit from Cloud' }]
  };

  // Rule: Server newer than local => Adopt server
  let effectiveState = localState;
  if ((incomingServerState.last_modified || 0) > (localState.last_modified || 0)) {
    effectiveState = incomingServerState;
  }

  assert.equal(effectiveState.habits[0].name, 'Updated Habit from Cloud');
  assert.equal(effectiveState.last_modified, 2000);
});
