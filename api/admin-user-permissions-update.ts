import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
  if (!SUPABASE_URL) {
    return res.status(500).json({ error: 'Server misconfiguration: SUPABASE_URL missing' });
  }

  const userJwt = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  if (!userJwt) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const body = (req as any).body || {};
  if (!body.userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const url = `${SUPABASE_URL}/functions/v1/update-user-permissions`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userJwt}`,
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', detail: String(e?.message || e) });
  }
}

