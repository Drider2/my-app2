export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-greendream-client, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ok',
    service: 'GreenDream Serverless API',
    provider: 'Vercel / Cloud Functions',
    version: '1.3.1',
    timestamp: Date.now()
  });
}
