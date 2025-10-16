# STEL Events Function - Test Instructions

## Testing the Edge Function

### 1. Deploy the function first:
```bash
npx supabase login
npx supabase functions deploy stel-events
```

### 2. Set environment variable in Supabase:
Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions
Add: `STEL_API_KEY = your_stel_order_api_key`

### 3. Test with curl:
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/stel-events' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "utc-last-modification-date": "2025-10-01T00:00:00+0000",
    "limit": 10
  }'
```

### 4. Test OPTIONS preflight:
```bash
curl -X OPTIONS 'https://YOUR_PROJECT.supabase.co/functions/v1/stel-events' \
  -H 'Origin: http://localhost:8081' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type' \
  -v
```

Should return 200 with CORS headers.

### 5. Check function logs:
```bash
npx supabase functions logs stel-events
```