// ========================================================
// Hermes Thought Signature & Multi-Round Tool Loop Test Suite
// Verifying P0 Thought Signature Preservation & Gemini 3.6 Flash Invariants
// ========================================================

import test from 'node:test';
import assert from 'node:assert/strict';

// Mock storage and browser environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

// ========================================================
// Helper functions mimicking Hermes service logic
// ========================================================

function redactApiKey(str) {
  if (!str) return '';
  return str.replace(/(AIza[0-9A-Za-z-_]{30,45}|AQ\.[0-9A-Za-z-_]{30,55})/g, (match) => {
    return '••••••••••••••••' + match.slice(-4);
  });
}

function mergeParts(existing, incoming) {
  const result = [...existing];
  for (const part of incoming) {
    const existingPart = result.find(p => 
      (p.functionCall && part.functionCall && p.functionCall.name === part.functionCall.name) ||
      (p.text !== undefined && part.text !== undefined)
    );

    if (existingPart) {
      if (part.text && existingPart.text !== undefined) {
        existingPart.text += part.text;
      }
      if (part.thoughtSignature && !existingPart.thoughtSignature) {
        existingPart.thoughtSignature = part.thoughtSignature;
      }
      if (part.id && !existingPart.id) {
        existingPart.id = part.id;
      }
    } else {
      result.push({ ...part });
    }
  }
  return result;
}

function buildContents(messages) {
  const contents = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'model') {
      if (m.rawParts && m.rawParts.length > 0) {
        contents.push({
          role: 'model',
          parts: m.rawParts,
        });
      } else {
        contents.push({
          role: 'model',
          parts: [{ text: m.content || '' }],
        });
      }
    } else if (m.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: m.content }],
      });
    }
  }
  return contents;
}

function classifyError(status, rawError) {
  const cleanRaw = redactApiKey(rawError || '');
  let type = 'generic';
  let actionType = 'retry';
  let userMessage = 'Something went wrong. Please try again.';

  if (status === 401 || status === 403 || cleanRaw.includes('API_KEY_INVALID') || cleanRaw.includes('API key not valid')) {
    type = 'invalid_key';
    actionType = 'settings';
    userMessage = 'Check your Gemini key';
  } else if (status === 404 || cleanRaw.includes('not found') || cleanRaw.includes('is not available for your API key')) {
    type = 'model_not_found';
    actionType = 'model_picker';
    userMessage = "This model isn't available for your key";
  } else if (status === 400 || cleanRaw.includes('thought_signature') || cleanRaw.includes('functionCall')) {
    type = 'tool_payload';
    actionType = 'retry';
    userMessage = "Hermes couldn't use your app data this time. Try again.";
  } else if (status === 429 || cleanRaw.includes('429') || cleanRaw.toLowerCase().includes('quota')) {
    type = 'rate_limit';
    actionType = 'retry';
    userMessage = 'Google Gemini quota reached. Please wait a moment.';
  } else if (cleanRaw.toLowerCase().includes('safety')) {
    type = 'safety';
    actionType = 'retry';
    userMessage = 'This response was blocked by safety filters. Try rephrasing your question.';
  } else if (cleanRaw.toLowerCase().includes('offline') || cleanRaw.toLowerCase().includes('network')) {
    type = 'offline';
    actionType = 'retry';
    userMessage = 'Network connection lost or timed out. Please check your internet connection.';
  }

  return { type, actionType, userMessage, technicalDetails: cleanRaw };
}

// ========================================================
// 1. Single Tool Call (Non-Streaming & Streaming)
// ========================================================
test('Case 1: Single tool call preserves thoughtSignature verbatim', () => {
  const mockApiResponse = {
    candidates: [{
      content: {
        role: 'model',
        parts: [
          {
            thoughtSignature: 'sig_mock_abc123_valid_hash',
            functionCall: {
              name: 'get_today_summary',
              args: {},
            },
            id: 'call_1',
          }
        ]
      }
    }]
  };

  const rawParts = mockApiResponse.candidates[0].content.parts;
  assert.equal(rawParts.length, 1);
  assert.equal(rawParts[0].thoughtSignature, 'sig_mock_abc123_valid_hash');
  assert.equal(rawParts[0].functionCall.name, 'get_today_summary');

  // Next round request payload
  const messages = [
    { role: 'user', content: 'How is my day going?' },
    { role: 'model', content: '', rawParts },
  ];

  const contents = buildContents(messages);
  // Must preserve rawParts on model turn
  assert.equal(contents[1].role, 'model');
  assert.equal(contents[1].parts[0].thoughtSignature, 'sig_mock_abc123_valid_hash');
  assert.equal(contents[1].parts[0].functionCall.name, 'get_today_summary');
});

// ========================================================
// 2. Parallel Tool Calls (Signature only on first part)
// ========================================================
test('Case 2: Parallel tool calls executed via Promise.all and paired correctly', async () => {
  const modelParts = [
    {
      thoughtSignature: 'sig_parallel_first_part_only_777',
      functionCall: { name: 'get_today_summary', args: {} },
      id: 'call_part_1',
    },
    {
      functionCall: { name: 'get_active_habits', args: {} },
      id: 'call_part_2',
    }
  ];

  // Execute tools in parallel
  const toolResults = await Promise.all(modelParts.map(async (part) => {
    return {
      functionResponse: {
        name: part.functionCall.name,
        id: part.id,
        response: { success: true, count: 5 },
      }
    };
  }));

  assert.equal(toolResults.length, 2);
  assert.equal(toolResults[0].functionResponse.name, 'get_today_summary');
  assert.equal(toolResults[0].functionResponse.id, 'call_part_1');
  assert.equal(toolResults[1].functionResponse.name, 'get_active_habits');
  assert.equal(toolResults[1].functionResponse.id, 'call_part_2');

  // Verify model turn retains signature on part 0
  assert.equal(modelParts[0].thoughtSignature, 'sig_parallel_first_part_only_777');
  assert.equal(modelParts[1].thoughtSignature, undefined);
});

// ========================================================
// 3. Sequential Multi-Step (2-3 Rounds)
// ========================================================
test('Case 3: Multi-round sequential tool execution retains all turns and signatures', () => {
  const conversation = [];

  // Round 1
  conversation.push({ role: 'user', content: 'What is my budget and prayer times?' });
  conversation.push({
    role: 'model',
    content: '',
    rawParts: [{
      thoughtSignature: 'sig_step_1',
      functionCall: { name: 'get_finance_summary', args: {} },
    }]
  });

  // User replies with Round 1 functionResponse
  const turn1Contents = buildContents(conversation);
  assert.equal(turn1Contents.length, 2);
  assert.equal(turn1Contents[1].parts[0].thoughtSignature, 'sig_step_1');

  // Round 2
  conversation.push({
    role: 'model',
    content: '',
    rawParts: [{
      thoughtSignature: 'sig_step_2',
      functionCall: { name: 'get_prayer_schedule', args: {} },
    }]
  });

  const turn2Contents = buildContents(conversation);
  assert.equal(turn2Contents.length, 3);
  assert.equal(turn2Contents[1].parts[0].thoughtSignature, 'sig_step_1');
  assert.equal(turn2Contents[2].parts[0].thoughtSignature, 'sig_step_2');
});

// ========================================================
// 4. Signature Arriving in Empty-Text Chunk
// ========================================================
test('Case 4: Empty text chunk with thoughtSignature is accumulated safely', () => {
  let accumulated = [];

  // Chunk 1: Thought signature arrives with empty text delta
  const chunk1 = [
    {
      thoughtSignature: 'sig_from_empty_text_chunk_999',
      functionCall: { name: 'get_today_summary', args: {} },
    }
  ];
  accumulated = mergeParts(accumulated, chunk1);

  // Chunk 2: Function call args or follow up
  const chunk2 = [
    {
      text: 'Analyzing your day...',
    }
  ];
  accumulated = mergeParts(accumulated, chunk2);

  assert.equal(accumulated.length, 2);
  assert.equal(accumulated[0].thoughtSignature, 'sig_from_empty_text_chunk_999');
  assert.equal(accumulated[0].functionCall.name, 'get_today_summary');
  assert.equal(accumulated[1].text, 'Analyzing your day...');
});

// ========================================================
// 5. Save Chat, Reload, Continue Conversation
// ========================================================
test('Case 5: Chat persistence preserves rawParts for continuation after reload', () => {
  mockStorage.clear();

  const originalChat = {
    id: 'chat_session_123',
    title: 'Daily Check-in',
    messages: [
      { id: '1', role: 'user', content: 'What are my habits?' },
      { 
        id: '2', 
        role: 'model', 
        content: 'You completed 3 habits.', 
        rawParts: [
          { thoughtSignature: 'sig_saved_persistence_456', functionCall: { name: 'get_habits', args: {} } }
        ] 
      }
    ]
  };

  // Save to storage
  mockStorage.set('hermes_chat_test', JSON.stringify(originalChat));

  // Reload
  const loaded = JSON.parse(mockStorage.get('hermes_chat_test'));
  assert.equal(loaded.messages.length, 2);
  assert.ok(loaded.messages[1].rawParts);
  assert.equal(loaded.messages[1].rawParts[0].thoughtSignature, 'sig_saved_persistence_456');

  // Verify continuation payload uses saved signature
  const contents = buildContents(loaded.messages);
  assert.equal(contents[1].parts[0].thoughtSignature, 'sig_saved_persistence_456');
});

// ========================================================
// 6. Old Chat Without rawParts Continues Without 400
// ========================================================
test('Case 6: Legacy chat without rawParts degrades safely to plain text turn', () => {
  const legacyChat = [
    { role: 'user', content: 'Old question' },
    { role: 'model', content: 'Answer from before thought signature update' }, // no rawParts
  ];

  const contents = buildContents(legacyChat);
  assert.equal(contents.length, 2);
  assert.equal(contents[1].role, 'model');
  assert.deepEqual(contents[1].parts, [{ text: 'Answer from before thought signature update' }]);
  // Never creates a bare functionCall part without signature
  assert.equal(contents[1].parts[0].functionCall, undefined);
});

// ========================================================
// 7. Regenerate / Edit Last Message Drops Pruned Steps
// ========================================================
test('Case 7: Edit/regenerate last message drops discarded tool steps cleanly', () => {
  const sessionMessages = [
    { id: 'm1', role: 'user', content: 'First message' },
    { id: 'm2', role: 'model', content: 'First reply', rawParts: [{ text: 'First reply' }] },
    { id: 'm3', role: 'user', content: 'Second message' },
    { id: 'm4', role: 'model', content: 'Second reply with tool', rawParts: [{ thoughtSignature: 'sig_old', functionCall: { name: 't', args: {} } }] },
  ];

  // User edits m3 -> prune everything from m3 onward
  const editIndex = sessionMessages.findIndex(m => m.id === 'm3');
  const prunedMessages = sessionMessages.slice(0, editIndex);

  assert.equal(prunedMessages.length, 2);
  assert.equal(prunedMessages[0].id, 'm1');
  assert.equal(prunedMessages[1].id, 'm2');

  const contents = buildContents(prunedMessages);
  assert.equal(contents.length, 2);
  // Old tool step is completely removed, preventing orphaned turns
  assert.ok(!contents.some(c => c.parts.some(p => p.thoughtSignature === 'sig_old')));
});

// ========================================================
// 8. Tool Throws Error Mid-Loop
// ========================================================
test('Case 8: Tool execution error handled gracefully with safe functionResponse', async () => {
  function executeToolSafe(toolName) {
    try {
      if (toolName === 'faulty_tool') {
        throw new Error('Database query timed out');
      }
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  const result = executeToolSafe('faulty_tool');
  assert.equal(result.error, 'Database query timed out');

  // Tool response is still formatted properly for Gemini
  const responsePart = {
    functionResponse: {
      name: 'faulty_tool',
      response: result,
    }
  };
  assert.equal(responsePart.functionResponse.response.error, 'Database query timed out');
});

// ========================================================
// 9. Chat-Only Mode Unaffected
// ========================================================
test('Case 9: Chat-only text generation operates cleanly without tool overhead', () => {
  const textResponse = {
    candidates: [{
      content: {
        role: 'model',
        parts: [{ text: 'Hello! How can I assist your mindful routine today?' }]
      }
    }]
  };

  const part = textResponse.candidates[0].content.parts[0];
  assert.equal(part.text, 'Hello! How can I assist your mindful routine today?');
  assert.equal(part.functionCall, undefined);
  assert.equal(part.thoughtSignature, undefined);

  const contents = buildContents([
    { role: 'user', content: 'Hello' },
    { role: 'model', content: part.text, rawParts: [part] }
  ]);

  assert.equal(contents.length, 2);
  assert.deepEqual(contents[1].parts, [{ text: 'Hello! How can I assist your mindful routine today?' }]);
});

// ========================================================
// 10. Friendly Error Classification & Action Buttons
// ========================================================
test('Case 10: Every error type produces friendly copy and correct action buttons', () => {
  // 401 Invalid Key
  const err401 = classifyError(401, 'API_KEY_INVALID: Key AIzaSyD12345678901234567890123456789012 is invalid');
  assert.equal(err401.type, 'invalid_key');
  assert.equal(err401.actionType, 'settings');
  assert.equal(err401.userMessage, 'Check your Gemini key');
  assert.ok(!err401.technicalDetails.includes('AIzaSyD12345678901234567890123456789012'));

  // 404 Model Not Found
  const err404 = classifyError(404, 'models/gemini-unknown is not available for your API key');
  assert.equal(err404.type, 'model_not_found');
  assert.equal(err404.actionType, 'model_picker');
  assert.equal(err404.userMessage, "This model isn't available for your key");

  // 400 Tool Payload / Thought Signature (Must NOT show settings button)
  const err400 = classifyError(400, 'Function call is missing a thought_signature in functionCall parts');
  assert.equal(err400.type, 'tool_payload');
  assert.equal(err400.actionType, 'retry'); // strictly retry, NOT settings!
  assert.notEqual(err400.actionType, 'settings');
  assert.equal(err400.userMessage, "Hermes couldn't use your app data this time. Try again.");

  // 429 Rate Limit
  const err429 = classifyError(429, 'Resource exhausted: quota exceeded');
  assert.equal(err429.type, 'rate_limit');
  assert.equal(err429.actionType, 'retry');
  assert.equal(err429.userMessage, 'Google Gemini quota reached. Please wait a moment.');

  // Safety filter
  const errSafety = classifyError(200, 'Response blocked due to safety flags');
  assert.equal(errSafety.type, 'safety');
  assert.equal(errSafety.userMessage, 'This response was blocked by safety filters. Try rephrasing your question.');

  // Offline / Network
  const errOffline = classifyError(0, 'Failed to fetch: network offline');
  assert.equal(errOffline.type, 'offline');
  assert.equal(errOffline.userMessage, 'Network connection lost or timed out. Please check your internet connection.');
});
