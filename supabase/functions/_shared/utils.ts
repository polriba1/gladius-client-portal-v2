const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o.length);

export function getCorsHeaders(origin: string | null) {
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin ?? ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

const rateMap = new Map<string, { count: number; time: number }>();
export function isRateLimited(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.time > windowMs) {
    rateMap.set(key, { count: 1, time: now });
    return false;
  }
  entry.count += 1;
  if (entry.count > limit) return true;
  rateMap.set(key, entry);
  return false;
}

const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'email'];
function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = SENSITIVE_FIELDS.includes(k.toLowerCase()) ? '[REDACTED]' : redact(v);
  }
  return result;
}

export function log(level: 'info' | 'error' | 'warn', message: string, meta?: Record<string, unknown>) {
  const entry: Record<string, unknown> = { level, message };
  if (meta) entry.meta = redact(meta);
  console[level](JSON.stringify(entry));
}
