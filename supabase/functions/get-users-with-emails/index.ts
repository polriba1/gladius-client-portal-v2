// Supabase Edge Function: get-users-with-emails
// Returns all users with their emails for super_admin users
// Only callable by super_admin users

import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, isRateLimited, log } from "../_shared/utils.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const devMode = Deno.env.get('ENV') !== 'production';
const devLog = (...args: unknown[]) => {
  if (devMode) console.log(...args);
};

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

serve(async (req: Request) => {
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
    log('info', 'get-users-with-emails called', { ip, method: req.method });

    if (req.method !== "GET") {
      log('error', 'Method not allowed', { ip, method: req.method });
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('error', 'Missing Authorization header', { ip });
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated client (caller identity)
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await supabase.auth.getUser();

    if (callerErr || !caller) {
      log('error', 'Unauthorized', { ip, error: callerErr?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log('info', 'Caller ID', { ip, callerId: caller.id });

    // Check caller is super_admin
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("admin_role")
      .eq("id", caller.id)
      .single();

    log('info', 'Profile check', { ip, adminRole: profile?.admin_role, error: profErr?.message });

    if (profErr || !profile || profile.admin_role !== "super_admin") {
      log('error', 'Forbidden - not super admin', { ip, role: profile?.admin_role });
      return new Response(JSON.stringify({
        error: "Forbidden - requires super_admin role",
        current_role: profile?.admin_role || "none"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SERVICE_ROLE_KEY) {
      log('error', 'Service role key not configured', { ip });
      return new Response(
        JSON.stringify({ error: "Service role key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client (bypasses RLS, can access auth users)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get all profiles with client information
    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select(`
        id,
        admin_role,
        can_switch_clients,
        client_id,
        active_client_id,
        clients!profiles_client_id_fkey (nom),
        active_client:clients!profiles_active_client_id_fkey (nom)
      `);

    if (profilesErr) {
      log('error', 'Error fetching profiles', { ip, error: profilesErr.message });
      return new Response(
        JSON.stringify({ error: "Error fetching profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log('info', 'Found profiles', { ip, count: profiles?.length });

    // Get emails for all users
    const enrichedUsers = [];

    if (profiles && Array.isArray(profiles)) {
      for (const profile of profiles) {
        try {
          const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(profile.id);

          if (authErr) {
            log('warn', `Could not fetch auth data for user ${profile.id}`, { ip, error: authErr.message });
          }

          enrichedUsers.push({
            id: profile.id,
            email: authUser?.user?.email || `user-${profile.id.substring(0, 8)}`,
            client_name: (profile.clients as any)?.nom || 'No client',
            admin_role: profile.admin_role || 'user',
            can_switch_clients: profile.can_switch_clients || false,
            created_at: authUser?.user?.created_at || new Date().toISOString(),
            active_client_name: (profile.active_client as any)?.nom || null,
            client_id: profile.client_id,
            active_client_id: profile.active_client_id
          });
        } catch (err) {
          log('warn', `Exception fetching user ${profile.id}`, { ip, error: String(err) });
          enrichedUsers.push({
            id: profile.id,
            email: `user-${profile.id.substring(0, 8)}`,
            client_name: (profile.clients as any)?.nom || 'No client',
            admin_role: profile.admin_role || 'user',
            can_switch_clients: profile.can_switch_clients || false,
            created_at: new Date().toISOString(),
            active_client_name: (profile.active_client as any)?.nom || null,
            client_id: profile.client_id,
            active_client_id: profile.active_client_id
          });
        }
      }
    }

    log('info', 'Returning users', { ip, count: enrichedUsers.length });

    return new Response(
      JSON.stringify({
        success: true,
        users: enrichedUsers
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (e) {
    log('error', 'Error', { ip, error: String(e) });
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