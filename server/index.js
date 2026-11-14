// GreenDream Secure AI Backend Proxy (Google Gemini Integration)
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Security: Middleware, CORS & Sanitized Request Handling
// ---------------------------------------------------------------------------
app.use(cors({
  origin: '*', // Allow Capacitor mobile app, localhost, and custom web origins
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-greendream-client', 'x-user-id']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb', type: ['text/plain', 'application/json'] }));

// Request Sanitizer: NEVER log sensitive API keys or Authorization headers
app.use((req, res, next) => {
  const start = Date.now();
  const safeHeaders = { ...req.headers };
  delete safeHeaders.authorization;
  delete safeHeaders['x-api-key'];

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/ai')) {
      console.log(`[GEMINI-PROXY] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ---------------------------------------------------------------------------
// Rate Limiter & Abuse Protection
// ---------------------------------------------------------------------------
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min per client

function rateLimiter(req, res, next) {
  const clientKey = req.headers['x-user-id'] || req.ip || 'anonymous';
  const now = Date.now();

  const clientData = rateLimitMap.get(clientKey) || { count: 0, startTime: now };

  if (now - clientData.startTime > RATE_LIMIT_WINDOW_MS) {
    clientData.count = 1;
    clientData.startTime = now;
  } else {
    clientData.count++;
  }

  rateLimitMap.set(clientKey, clientData);

  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please wait a moment before sending more requests.',
      code: 'rate_limit_exceeded'
    });
  }

  next();
}

app.use('/api/ai', rateLimiter);

// ---------------------------------------------------------------------------
// Security: AES-256-GCM Server-Side Encryption at Rest
// ---------------------------------------------------------------------------
const VAULT_KEY_PATH = path.join(__dirname, '.vault.key');
const VAULT_DATA_PATH = path.join(__dirname, '.vault_keys.json');

function getMasterKey() {
  if (process.env.GREENDREAM_SECRET_KEY) {
    return crypto.createHash('sha256').update(process.env.GREENDREAM_SECRET_KEY).digest();
  }
  if (!fs.existsSync(VAULT_KEY_PATH)) {
    const newKey = crypto.randomBytes(32);
    fs.writeFileSync(VAULT_KEY_PATH, newKey.toString('hex'), { mode: 0o600 });
    return newKey;
  }
  const keyHex = fs.readFileSync(VAULT_KEY_PATH, 'utf8').trim();
  return Buffer.from(keyHex, 'hex');
}

const MASTER_KEY = getMasterKey();

function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    authTag,
    encryptedData: encrypted
  };
}

function decryptSecret(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    MASTER_KEY,
    Buffer.from(encryptedObj.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function readVault() {
  try {
    if (fs.existsSync(VAULT_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(VAULT_DATA_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('[VAULT] Error reading vault:', err.message);
  }
  return {};
}

function writeVault(data) {
  fs.writeFileSync(VAULT_DATA_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 8) return '••••••••';
  const prefix = key.startsWith('AIzaSy') ? 'AIzaSy••••••••••••••••' : '••••••••••••••••';
  return prefix + key.slice(-4);
}

// ---------------------------------------------------------------------------
// Eligible Google Gemini Free-Tier Models Registry
// ---------------------------------------------------------------------------
const GEMINI_FREE_TIER_MODELS = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast, high-efficiency multimodal model on Google AI Studio Free Tier (15 RPM / 1,500 RPD).',
    availability: 'Free Tier Eligible',
    cost: '100% Free Tier (Google AI Studio)',
    recommended: true
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Next-generation low-latency model with advanced tool handling and speed.',
    availability: 'Free Preview Eligible',
    cost: 'Free Experimental / Preview Tier',
    recommended: false
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Deep analytical reasoning with 2M token context window (2 RPM free tier).',
    availability: 'Free Tier (2 RPM)',
    cost: 'Free Tier (Google AI Studio)',
    recommended: false
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash-8B',
    description: 'Compact high-speed model optimized for quick chat and minimal latency.',
    availability: 'Free Tier Eligible',
    cost: '100% Free Tier (Google AI Studio)',
    recommended: false
  }
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// 1. Health & Status Check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'GreenDream Gemini AI Proxy',
    provider: 'Google Gemini',
    version: '1.3.1',
    timestamp: Date.now()
  });
});

// 2. Models Catalog (Dynamically fetched or fallback)
app.get('/api/ai/models', async (req, res) => {
  res.json({
    success: true,
    provider: 'Google Gemini',
    models: GEMINI_FREE_TIER_MODELS,
    defaultModel: 'gemini-1.5-flash',
    freeTierNotice: 'Free tier provided by Google AI Studio (15 RPM, 1M TPM, 1,500 requests/day for Gemini 1.5 Flash).'
  });
});

// 3. Configure API Key (Encrypted at Rest with AES-256-GCM)
app.post('/api/ai/configure-key', (req, res) => {
  const { userId, apiKey, model } = req.body;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 20) {
    return res.status(400).json({ success: false, error: 'A valid Google Gemini API key is required (e.g. from aistudio.google.com/apikey).' });
  }

  const cleanKey = apiKey.trim();
  const encrypted = encryptSecret(cleanKey);

  const vault = readVault();
  vault[userId] = {
    ...encrypted,
    provider: 'gemini',
    model: model || 'gemini-1.5-flash',
    updatedAt: Date.now()
  };
  writeVault(vault);

  res.json({
    success: true,
    provider: 'Google Gemini',
    maskedKey: maskApiKey(cleanKey),
    model: model || 'gemini-1.5-flash',
    message: 'Google Gemini API key encrypted and stored securely on backend vault.'
  });
});

// 4. Revoke / Remove Key
app.delete('/api/ai/revoke-key', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const vault = readVault();
  if (vault[userId]) {
    delete vault[userId];
    writeVault(vault);
  }

  res.json({
    success: true,
    message: 'Google Gemini API key revoked and deleted from backend vault.'
  });
});

// 5. Test Connection with Google Gemini API
app.post('/api/ai/test-connection', async (req, res) => {
  const { userId, apiKey, model } = req.body;
  const testModel = model || 'gemini-1.5-flash';

  let keyToUse = null;

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 15) {
    keyToUse = apiKey.trim();
  } else if (userId) {
    const vault = readVault();
    if (vault[userId]) {
      try {
        keyToUse = decryptSecret(vault[userId]);
      } catch (err) {
        return res.status(500).json({
          success: false,
          error: 'Failed to decrypt credentials on server. Please re-enter your Gemini key.',
          code: 'decryption_error'
        });
      }
    }
  }

  if (!keyToUse) {
    return res.status(400).json({
      success: false,
      error: 'No Gemini API key provided or found in vault. Obtain one at aistudio.google.com/apikey.',
      code: 'missing_key'
    });
  }

  const startTime = Date.now();

  try {
    // Send a lightweight test generation to Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${encodeURIComponent(keyToUse)}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Connection test. Reply with OK.' }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 5,
          temperature: 0.1
        }
      })
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      const err = data.error || {};
      let userFriendlyMessage = err.message || 'Google Gemini API rejected the request.';
      let errorCode = err.status || 'api_error';

      if (response.status === 400 && (err.message?.includes('API key') || err.status === 'INVALID_ARGUMENT')) {
        userFriendlyMessage = 'Invalid Google Gemini API key. Please generate a new free key at aistudio.google.com/apikey.';
        errorCode = 'invalid_api_key';
      } else if (response.status === 403) {
        userFriendlyMessage = 'Google Gemini API access forbidden. Check if your API key has Generative Language API enabled in Google AI Studio.';
        errorCode = 'forbidden';
      } else if (response.status === 429 || err.status === 'RESOURCE_EXHAUSTED') {
        userFriendlyMessage = 'Google Gemini free-tier rate limit or daily quota exhausted (15 requests/minute). Please wait a moment for the free quota to reset.';
        errorCode = 'quota_exhausted';
      } else if (response.status === 404) {
        userFriendlyMessage = `Model "${testModel}" is not available on Google's API. Please choose Gemini 1.5 Flash.`;
        errorCode = 'model_not_found';
      }

      return res.status(response.status).json({
        success: false,
        error: userFriendlyMessage,
        code: errorCode,
        latencyMs
      });
    }

    res.json({
      success: true,
      provider: 'Google Gemini',
      model: testModel,
      latencyMs,
      freeTierEligible: true,
      message: 'Connection verified successfully with Google Gemini Free Tier.'
    });

  } catch (err) {
    const latencyMs = Date.now() - startTime;
    res.status(502).json({
      success: false,
      error: `Network error connecting to Google Gemini: ${err.message}`,
      code: 'network_error',
      latencyMs
    });
  }
});

// 6. Conversational Chat & Streaming Endpoint (Gemini streamGenerateContent)
app.post('/api/ai/chat', async (req, res) => {
  const { userId, messages, model, stream, systemContext } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: 'Messages array is required.' });
  }

  // Resolve API Key from Vault
  let keyToUse = null;
  const vault = readVault();
  if (userId && vault[userId]) {
    try {
      keyToUse = decryptSecret(vault[userId]);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to decrypt credentials. Please re-enter your Gemini API key in Settings.',
        code: 'decryption_error'
      });
    }
  }

  if (!keyToUse) {
    return res.status(401).json({
      success: false,
      error: 'Google Gemini API key not configured. Please configure your free key in Settings → AI Assistant.',
      code: 'missing_key'
    });
  }

  const chosenModel = model || (userId && vault[userId]?.model) || 'gemini-1.5-flash';

  // System Prompt with GreenDream Persona & Honest Records
  const systemPrompt = `You are GreenDream Assistant, an authentic, high-intelligence personal life management assistant powered by Google Gemini.
You help the user optimize their daily habits, gym training, personal finances, prayers, and life maintenance.

Core Principles:
1. Honest Numbers & Real Records: Only answer using facts provided in the current user context or query. Never fabricate or invent financial figures, bank balances, or personal records. If data is not provided, state that it is not recorded yet.
2. Multilingual Fluency: Fluent in English, French, and Arabic. Always reply in the same language the user speaks or writes, unless explicitly instructed otherwise. For Arabic responses, write clean, natural Arabic without unnecessary clutter.
3. Natural & Concise: Avoid robotic boilerplate. Be proactive, warm, and structured (use bullet points and bold highlights).
4. Action Proposals: When the user asks you to log an expense, add a task, schedule a workout, record bodyweight, or record a loan, provide a concise explanation and include an action command block at the end in this exact JSON format:
<<<PROPOSAL:{"action_type":"<action>","payload":{...}}>>>
Supported actions:
- create_expense: {"amount_minor": number, "category_id": string, "note": string, "local_date": string}
- create_task: {"title": string, "due_date": string, "due_time": string}
- lend_money: {"borrower_name": string, "amount_minor": number, "notes": string}
- log_bodyweight: {"weight_kg": number, "local_date": string}
- create_journal: {"title": string, "body": string, "tags": string[]}
The user must approve the proposal before anything is saved.

User Context & Real Data:
${systemContext || 'No additional records requested.'}
`;

  // Format messages into Google Gemini's schema (role: "user" | "model", parts: [{ text: ... }])
  const geminiContents = messages.map(m => ({
    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.text || m.content || '' }]
  }));

  // Ensure first message is user and consecutive roles alternate
  const cleanContents = [];
  for (let i = 0; i < geminiContents.length; i++) {
    const cur = geminiContents[i];
    if (i === 0 && cur.role !== 'user') {
      cleanContents.push({ role: 'user', parts: [{ text: 'Hello.' }] });
    }
    const last = cleanContents[cleanContents.length - 1];
    if (last && last.role === cur.role) {
      last.parts[0].text += `\n${cur.parts[0].text}`;
    } else {
      cleanContents.push(cur);
    }
  }

  const geminiPayload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: cleanContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  };

  try {
    if (stream) {
      // Server-Sent Events (SSE) Streaming from Gemini streamGenerateContent
      const geminiStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(keyToUse)}`;
      
      const geminiRes = await fetch(geminiStreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiPayload)
      });

      if (!geminiRes.ok) {
        const errorData = await geminiRes.json().catch(() => ({}));
        let errMessage = errorData.error?.message || `Gemini returned HTTP ${geminiRes.status}`;
        if (geminiRes.status === 429) {
          errMessage = 'Google Gemini free-tier quota exhausted. Please wait a moment for the limit to reset.';
        }
        return res.status(geminiRes.status).json({
          success: false,
          error: errMessage,
          code: errorData.error?.status || 'gemini_error'
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = geminiRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
      res.end();

    } else {
      // Standard Non-Streaming JSON Response
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${encodeURIComponent(keyToUse)}`;

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiPayload)
      });

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        const err = data.error || {};
        let msg = err.message || 'Gemini error';
        if (geminiRes.status === 429) {
          msg = 'Google Gemini free-tier quota exhausted. Please wait a moment for the rate limit to reset.';
        }
        return res.status(geminiRes.status).json({
          success: false,
          error: msg,
          code: err.status || 'gemini_error'
        });
      }

      const candidate = data.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text || '';
      const usageMetadata = data.usageMetadata || {};

      res.json({
        success: true,
        text: replyText,
        model: chosenModel,
        provider: 'Google Gemini',
        usage: {
          prompt_tokens: usageMetadata.promptTokenCount || 0,
          completion_tokens: usageMetadata.candidatesTokenCount || 0,
          total_tokens: usageMetadata.totalTokenCount || 0
        }
      });
    }

  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Gemini Proxy error: ${err.message}`,
      code: 'proxy_internal_error'
    });
  }
});

// ---------------------------------------------------------------------------
// Real Persistent Store: In-Memory Cache + Rock-Solid Disk Sync (/api/state)
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE_PATH = path.join(DATA_DIR, 'greendream_state.json');
const BAK_FILE_PATH = path.join(DATA_DIR, 'greendream_state.bak.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory hot cache primed from disk
let cachedState = null;
try {
  if (fs.existsSync(STATE_FILE_PATH)) {
    cachedState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
  } else if (fs.existsSync(BAK_FILE_PATH)) {
    cachedState = JSON.parse(fs.readFileSync(BAK_FILE_PATH, 'utf8'));
  }
} catch (e) {
  console.warn('[SERVER] Could not prime state cache from disk:', e.message);
}

let isWriting = false;
let pendingDiskState = null;

async function flushToDisk() {
  if (isWriting || !pendingDiskState) return;
  isWriting = true;
  const stateToPersist = pendingDiskState;
  pendingDiskState = null;

  const content = JSON.stringify(stateToPersist, null, 2);
  const tempFilePath = `${STATE_FILE_PATH}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;

  try {
    // 1. Write temp file
    await fs.promises.writeFile(tempFilePath, content, 'utf8');

    // 2. Backup current state if it exists
    if (fs.existsSync(STATE_FILE_PATH)) {
      try {
        await fs.promises.copyFile(STATE_FILE_PATH, BAK_FILE_PATH);
      } catch (e) {}
    }

    // 3. Robust atomic rename with retry loop for Windows OneDrive file locks
    let renamed = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        if (fs.existsSync(STATE_FILE_PATH)) {
          try { await fs.promises.unlink(STATE_FILE_PATH); } catch (e) {}
        }
        await fs.promises.rename(tempFilePath, STATE_FILE_PATH);
        renamed = true;
        break;
      } catch (err) {
        await new Promise(r => setTimeout(r, 40 * (attempt + 1)));
      }
    }

    if (!renamed) {
      // Direct write fallback
      await fs.promises.writeFile(STATE_FILE_PATH, content, 'utf8');
    }
  } catch (err) {
    console.error('[SERVER] Disk persistence warning (state safe in-memory cache):', err.message);
  } finally {
    try { await fs.promises.unlink(tempFilePath); } catch (e) {}
    isWriting = false;
    // If newer state arrived while writing, flush again
    if (pendingDiskState) {
      setImmediate(flushToDisk);
    }
  }
}

app.get('/api/state', async (req, res) => {
  try {
    if (cachedState) {
      return res.json({ success: true, state: cachedState });
    }
    if (fs.existsSync(STATE_FILE_PATH)) {
      try {
        const stateContent = await fs.promises.readFile(STATE_FILE_PATH, 'utf8');
        cachedState = JSON.parse(stateContent);
        return res.json({ success: true, state: cachedState });
      } catch (readErr) {
        if (fs.existsSync(BAK_FILE_PATH)) {
          const bakContent = await fs.promises.readFile(BAK_FILE_PATH, 'utf8');
          cachedState = JSON.parse(bakContent);
          return res.json({ success: true, state: cachedState });
        }
      }
    }
    return res.json({ success: true, state: null });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/state', (req, res) => {
  let state = req.body?.state;
  if (!state && typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      state = parsed.state;
    } catch {}
  }
  if (!state) {
    return res.status(400).json({ success: false, error: 'No state payload provided' });
  }

  // 1. Immediately update in-memory hot cache (guarantees instantaneous consistency)
  cachedState = state;

  // 2. Queue asynchronous background disk persistence
  pendingDiskState = state;
  flushToDisk();

  // 3. Immediately return 200 Success
  return res.json({ success: true, savedAt: Date.now() });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`GreenDream Secure Google Gemini AI Backend Proxy`);
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`Accessible to Android on: http://10.0.2.2:${PORT}`);
  console.log(`Free Tier Focus: Gemini 1.5 Flash / 2.0 Flash`);
  console.log(`AES-256-GCM Vault initialized`);
  console.log(`=================================================`);
});
