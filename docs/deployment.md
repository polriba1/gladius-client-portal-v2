# Deployment and Secrets Management

This project relies on Supabase for authentication and storage. **Never** commit Supabase keys or other secrets to the repository. Instead, store them in a secrets manager such as [Supabase Vault](https://supabase.com/docs/guides/platform/vault) or Docker secrets and provide them at runtime.

## Required secrets

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL used by the front‑end. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key for client‑side access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service‑role key used by Edge Functions. |
| `ALLOWED_ORIGINS` | Comma‑separated list of allowed Origins for Edge Functions CORS (e.g., `https://app.example.com,https://admin.example.com`). |

## Injecting secrets

CI/CD pipelines and local development environments must inject the above variables at runtime. For example:

```bash
# GitHub Actions example
- name: Build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    ALLOWED_ORIGINS: ${{ secrets.ALLOWED_ORIGINS }}
  run: npm run build
```

Never bake keys into the Docker image or bundle; reference them only via environment variables.

## Rotating keys

1. Generate a new key in the Supabase dashboard.
2. Update the secret in your secrets manager.
3. Redeploy the application so the new key is picked up at runtime.
4. Invalidate the old key after confirming the deployment succeeds.

Keeping secrets external to the repository allows rotations without code changes and reduces the risk of accidental exposure.

## Authentication cookies and security

Supabase sessions are now stored in cookies instead of `localStorage`. Production hosts must configure these cookies with security attributes:

- **Secure** – only transmit over HTTPS.
- **SameSite=Lax** – limit cross‑site requests.
- **HttpOnly** – prevent access from client‑side scripts.

Set these flags at the web server or reverse proxy layer. Update your `Content-Security-Policy` to only allow connections to your Supabase project and avoid inline scripts, for example:

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://<your-supabase-project>.supabase.co; frame-ancestors 'none';
```

These headers help mitigate XSS and CSRF risks when using cookie‑based authentication.

## SPA hosting and router fallback

This is a single‑page application using `react-router`. Configure your hosting/CDN to serve `index.html` for any unknown path so deep links resolve client‑side. Examples:

- Netlify: add `_redirects` with `/* /index.html 200`.
- Vercel: add `rewrites` to `vercel.json` for `/(.*)` -> `/index.html`.
- S3/CloudFront: Set the error document to `index.html`.

Also set production security headers at the CDN/reverse proxy (CSP, HSTS, X‑Content‑Type‑Options, Referrer‑Policy) in addition to CORS via `ALLOWED_ORIGINS` for Edge Functions.

## Admin / Sensitive Supabase Edge Functions Proxy Pattern

Edge Functions that require privileged access (service role, user creation, permission mutations, full user listings) MUST NOT be invoked directly from the browser. Instead, we proxy them through internal serverless API routes (Vercel `/api/*`). This ensures:

1. Service role key stays server side only
2. Centralized auth & role validation
3. Simplified CORS (browser only talks to same origin)
4. Room for rate limiting / auditing / input validation

### Current Proxied Functions

| Function | API Route | Purpose |
|----------|-----------|---------|
| `admin-create-user` | `POST /api/admin-create-user` | Create auth user + profile (client bound) |
| `create-user-with-permissions` | `POST /api/admin-user-invite` | Invite user and preconfigure profile |
| `update-user-permissions` | `POST /api/admin-user-permissions-update` | Modify roles/switch permissions |
| `get-users-with-emails` | `GET /api/admin-users-list` | Enumerate users with metadata |

All of these use the `SUPABASE_SERVICE_ROLE_KEY` internally while forwarding the caller's session token via `Authorization: Bearer <access_token>` for role validation inside the Edge Function.

### Frontend Usage Pattern

Obtain the current session token from Supabase Auth and call the internal route:

```ts
const { data: session } = await supabase.auth.getSession();
const token = session.session?.access_token;
const resp = await fetch('/api/admin-users-list', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Environment Variables Required (Server Side)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Base URL for Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret (never prefixed with `NEXT_PUBLIC_`) |

Ensure these are set in Vercel Project Settings → Environment Variables and locally in `.env.local` for development.

### Adding a New Admin Function

1. Create the Edge Function in `supabase/functions/<name>/index.ts`.
2. Create a Vercel route: `api/<name>.ts` (or group logically under an existing file) that:
   - Validates HTTP method
   - Extracts `Authorization` header and forwards it
   - Uses a service role Supabase client (`createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`)
   - Invokes the Edge Function via `supabase.functions.invoke('<name>', { body, headers: { Authorization } })`
3. Update docs and optionally add tests.

### Auditing / Hardening Ideas

- Add structured JSON logging per route (user id, action, target user id)
- Introduce simple in-memory or external rate limiting per IP / user
- Add an HMAC signature header generated server-side for particularly sensitive operations (defense-in-depth)
- Centralize role checks in helper (e.g. `lib/server/auth.ts`)

This proxy layer is now considered REQUIRED for any future operation that either writes to auth/users tables or enumerates privileged data.
