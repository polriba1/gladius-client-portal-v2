import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
  if (!SUPABASE_URL) {
    return res.status(500).json({ error: 'Server misconfiguration: SUPABASE_URL missing' });
  }

  const userJwt = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  if (!userJwt) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    const url = `${SUPABASE_URL}/functions/v1/get-users-with-emails`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userJwt}`,
      }
    });

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', detail: String(e?.message || e) });
  }
}

