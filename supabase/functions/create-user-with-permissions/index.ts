// Supabase Edge Function: create-user-with-permissions
// Creates a user with specific client and permission settings
// Only callable by super_admin users

import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isRateLimited, log } from "../_shared/utils.ts";

type Payload = {
  email: string;
  clientId: string;
  adminRole: 'user' | 'client_admin' | 'super_admin';
  canSwitchClients: boolean;
  activeClientId?: string | null;
};

const URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ORIG = (Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173').replace(/\/$/, '');

if (!URL || !ANON_KEY || !SRK) {
  throw new Error('Missing Supabase environment variables');
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403 });
  }

  log("info", "Edge function called", { method: req.method, url: req.url });

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  if (isRateLimited(ip)) {
    log("warn", "Rate limit exceeded", { ip });
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (req.method !== "POST") {
      log("warn", "Method not allowed", { method: req.method });
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log("warn", "Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated client (caller identity)
    const supabase = createClient(URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await supabase.auth.getUser();
    
    if (callerErr || !caller) {
      log('error', 'Unauthorized - caller error', { callerErr });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log('info', 'Caller ID', { id: caller.id });

    // Check caller is super_admin
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("admin_role")
      .eq("id", caller.id)
      .single();

    log('info', 'Profile check', { profile, profErr });

    if (profErr || !profile || profile.admin_role !== "super_admin") {
      log('warn', 'Forbidden - not super admin', { role: profile?.admin_role });
      return new Response(JSON.stringify({
        error: "Forbidden - requires super_admin role",
        current_role: profile?.admin_role || "none"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => null)) as Payload | null;
    log('info', 'Request body', { body });

    if (!body || !body.email || !body.clientId) {
      log('warn', 'Invalid payload', { body });
      return new Response(
        JSON.stringify({ error: "Invalid payload. Email and clientId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SRK) {
      log('error', 'Service role key not configured');
      return new Response(
        JSON.stringify({ error: "Service role key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client (bypasses RLS, can create users)
    const admin = createClient(URL, SRK);

    // Verify client exists
    const { data: client, error: clientErr } = await admin
      .from("clients")
      .select("id, nom")
      .eq("id", body.clientId)
      .single();

    log('info', 'Client lookup', { client, clientErr });

    if (clientErr || !client) {
      log('warn', 'Client not found', { clientId: body.clientId });
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log('info', 'Inviting user', { email: body.email });

    // Build redirect to our app route
    const redirectTo = `${ORIG}/accept-invite`;

    const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
      options: { redirectTo }
    });

    log('info', 'User invitation result', { invited: !!inv?.user, invErr });

    if (invErr) {
      log('error', 'User invitation failed', { message: invErr.message });
      return new Response(
        JSON.stringify({
          success: false,
          message: invErr.message
        }),
        {
          status: 422, // Use 422 for validation errors like email already exists
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const userId = inv.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Could not determine user ID" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Persist profile with preconfigured access (single client + no switching)
    const { error: upsertErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        client_id: body.clientId,             // base client
        admin_role: body.adminRole ?? 'user',
        active_client_id: body.clientId,      // start in this client
        can_switch_clients: false,            // lock
      },
      { onConflict: "id" }
    );

    if (upsertErr) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `User created but profile setup failed: ${upsertErr.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User invited successfully for ${client.nom}`,
        user_id: userId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (e) {
    log('error', 'Error', { error: e });
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal error",
        detail: String(e)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});