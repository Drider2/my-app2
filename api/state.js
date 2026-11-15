import fs from 'fs';
import path from 'path';

// Global cache in serverless warm instance
let serverlessCachedState = null;

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const STATE_FILE = path.join(DATA_DIR, 'greendream_state.json');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-greendream-client, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET /api/state
  if (req.method === 'GET') {
    try {
      // Check cloud storage if configured via environment (e.g. Supabase, Upstash KV)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          const fetchRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/app_state?select=data&id=eq.default`, {
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            }
          });
          if (fetchRes.ok) {
            const rows = await fetchRes.json();
            if (rows && rows.length > 0 && rows[0].data) {
              return res.status(200).json({ success: true, state: rows[0].data });
            }
          }
        } catch (cloudErr) {
          console.warn('[SERVERLESS] Supabase fetch error, falling back:', cloudErr.message);
        }
      }

      if (serverlessCachedState) {
        return res.status(200).json({ success: true, state: serverlessCachedState });
      }

      if (fs.existsSync(STATE_FILE)) {
        const content = fs.readFileSync(STATE_FILE, 'utf8');
        serverlessCachedState = JSON.parse(content);
        return res.status(200).json({ success: true, state: serverlessCachedState });
      }

      return res.status(200).json({ success: true, state: null });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. POST /api/state
  if (req.method === 'POST') {
    try {
      let state = req.body?.state;
      if (!state && typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          state = parsed.state;
        } catch (e) {}
      }

      if (!state) {
        return res.status(400).json({ success: false, error: 'No state payload provided' });
      }

      // Update warm memory cache
      serverlessCachedState = state;

      // Sync to cloud if configured
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/app_state`, {
            method: 'POST',
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ id: 'default', data: state, updated_at: new Date().toISOString() })
          });
        } catch (cloudErr) {
          console.warn('[SERVERLESS] Supabase save error:', cloudErr.message);
        }
      }

      // Try local file persistence if directory is writable (sandbox / local server)
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
      } catch (fsErr) {
        // Ephemeral serverless filesystem read-only warning
      }

      return res.status(200).json({ success: true, savedAt: Date.now() });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
