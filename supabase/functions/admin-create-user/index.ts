import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { getCorsHeaders, isRateLimited, log } from '../_shared/utils.ts';

const URL = Deno.env.get('SUPABASE_URL');
// Prefer ANON key (available by default), fallback to PUBLISHABLE if provided
const PK = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const payloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  clientId: z.string(),
  adminRole: z.enum(['user', 'client_admin', 'super_admin']).default('user'),
  canSwitchClients: z.boolean().optional().default(false),
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) return new Response('Forbidden', { status: 403 });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get('x-forwarded-for') ?? '';
  if (isRateLimited(ip)) {
    return new Response('Too Many Requests', { status: 429, headers: corsHeaders });
  }

  try {
    if (!URL) {
      return new Response(JSON.stringify({ error: 'supabaseUrl is required.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!PK) {
      return new Response(JSON.stringify({ error: 'supabaseKey is required.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!SRK) {
      return new Response(JSON.stringify({ error: 'serviceRoleKey is required.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    log('info', 'admin-create-user called', { ip });

    const json = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      log('error', 'Invalid payload', { ip, errors: parsed.error.flatten() });
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, clientId, adminRole, canSwitchClients } = parsed.data;

    const authHeader = req.headers.get('Authorization') ?? '';
    const supa = createClient(URL, PK, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(URL, SRK);

    const { data: { user: caller } } = await supa.auth.getUser();
    if (!caller) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: me, error: meErr } = await supa
      .from('profiles').select('admin_role').eq('id', caller.id).single();
    if (meErr || !me || !['super_admin', 'client_admin'].includes(me.admin_role)) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const { data: cu, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (cErr) {
      log('error', 'Error creating auth user', { ip, error: cErr.message });
      return new Response(JSON.stringify({ error: cErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = cu.user?.id!;

    const { error: upErr } = await admin.from('profiles').upsert({
      id: userId,
      admin_role: adminRole,
      client_id: clientId,
      active_client_id: clientId,
      can_switch_clients: canSwitchClients,
    }, { onConflict: 'id' });

    if (upErr) {
      log('error', 'Error creating profile', { ip, error: upErr.message });
      throw upErr;
    }

    log('info', 'User created', { ip, userId });
    return new Response(JSON.stringify({ ok: true, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    log('error', 'Unexpected error', { ip, error: String(e) });
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
