import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders, isRateLimited, log } from "../_shared/utils.ts";

type UpdateUserRequest = {
  userId: string;
  adminRole: "super_admin" | "client_admin" | "user";
  canSwitchClients: boolean;
  clientId?: string;
};

const updateUserSchema = z.object({
  userId: z.string(),
  adminRole: z.enum(["super_admin", "client_admin", "user"]),
  canSwitchClients: z.boolean(),
  clientId: z.string().optional(),
});

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (!corsHeaders) return new Response('Forbidden', { status: 403 });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get('x-forwarded-for') ?? '';
  if (isRateLimited(ip)) {
    return new Response('Too Many Requests', { status: 429, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    log('info', 'update-user-permissions called', { ip });
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      log('error', 'Missing Supabase environment variables', { ip });
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller client (for auth and RLS-aware reads)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client (bypasses RLS for updates)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser();
    if (callerErr || !caller) {
      log('error', 'Unauthorized - caller error', { ip, error: callerErr });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log('info', 'Caller ID', { ip, callerId: caller.id });

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("admin_role")
      .eq("id", caller.id)
      .single();

    log('info', 'Caller profile', { ip, profile, profErr });

    if (profErr || !profile || profile.admin_role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyJson = await req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(bodyJson);
    if (!parsed.success) {
      log('error', 'Invalid payload', { ip, errors: parsed.error.flatten() });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, adminRole, canSwitchClients, clientId } = parsed.data;

    const updateData: Record<string, unknown> = {
      admin_role: adminRole,
      can_switch_clients: !!canSwitchClients,
    };
    if (clientId) updateData.client_id = clientId;

    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (updateError) {
      log('error', 'Update error', { ip, error: updateError });
      return new Response(JSON.stringify({ error: "Failed to update user permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (adminRole !== "user" && canSwitchClients) {
      const { error: delErr } = await admin
        .from("admin_client_access")
        .delete()
        .eq("admin_user_id", userId);
      if (delErr) log('warn', 'Failed to clear client access', { ip, error: delErr });

      const { data: clients, error: clientsErr } = await admin.from("clients").select("id");
      if (!clientsErr && clients && clients.length > 0) {
        const accessRecords = clients.map((c) => ({ admin_user_id: userId, client_id: c.id }));
        const { error: insErr } = await admin.from("admin_client_access").insert(accessRecords);
        if (insErr) log('warn', 'Failed to grant client access', { ip, error: insErr });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "User permissions updated successfully", user: updatedProfile }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log('error', 'Unexpected error', { ip, error });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
