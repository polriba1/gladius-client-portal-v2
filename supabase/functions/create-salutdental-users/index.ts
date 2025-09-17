// Supabase Edge Function: create-salutdental-users
// Creates users and assigns them to the Salutdental client with restricted access
// Only callable by super_admin users

import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders, isRateLimited, log } from "../_shared/utils.ts";

type Payload = {
  emails: string[]; // emails to create
  tempPassword?: string; // optional temporary password override
};

const payloadSchema = z.object({
  emails: z.array(z.string().email()),
  tempPassword: z.string().optional(),
});

type Result = {
  email: string;
  status: "created" | "updated_profile" | "exists_error" | "error";
  user_id?: string;
  message?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SERVICE_ROLE_KEY) {
  log('error', 'Missing Supabase environment variables');
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
    log('info', 'create-salutdental-users called', { ip });
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated client (caller identity)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await supabase.auth.getUser();
      if (callerErr || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    // Check caller is super_admin
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("admin_role")
      .eq("id", caller.id)
      .single();
      if (profErr || !profile || profile.admin_role !== "super_admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    const json = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      log('error', 'Invalid payload', { ip, errors: parsed.error.flatten() });
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const body = parsed.data;

    // Optional base password; if absent, a random password will be generated per user
    const passwordTemplate = body.tempPassword || Deno.env.get("TEMP_USER_PASSWORD");

    // Service role client (bypasses RLS, can create users)
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    // Fetch Salutdental client id
    const { data: salutClient, error: clientErr } = await admin
      .from("clients")
      .select("id")
      .eq("nom", "Salutdental")
      .single();
    if (clientErr || !salutClient) {
        return new Response(
          JSON.stringify({ error: "Salutdental client not found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Helper to find an existing user by email via admin.listUsers
    async function findUserIdByEmail(email: string): Promise<string | null> {
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) return null;
        const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return found.id;
        if (data.users.length < perPage) break; // last page
        page += 1;
      }
      return null;
    }

    const results: Result[] = [];

    for (const emailRaw of body.emails) {
      const email = String(emailRaw || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email: String(emailRaw), status: "error", message: "Invalid email" });
        continue;
      }

      const password = passwordTemplate || crypto.randomUUID();

      // Try to create the user
      let userId: string | undefined;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // allow immediate login with the temp password
      });

      if (createErr) {
        // If user exists, try to find id and just upsert profile
        const existingId = await findUserIdByEmail(email);
        if (!existingId) {
          results.push({ email, status: "exists_error", message: createErr.message });
          continue;
        }
        userId = existingId;
      } else {
        userId = created.user?.id;
      }

      if (!userId) {
        results.push({ email, status: "error", message: "Could not determine user id" });
        continue;
      }

      // Upsert profile with Salutdental client and restricted permissions
      const { error: upsertErr } = await admin.from("profiles").upsert(
        {
          id: userId,
          client_id: salutClient.id,
          admin_role: "user",
          can_switch_clients: false,
          active_client_id: null,
        },
        { onConflict: "id" }
      );

      if (upsertErr) {
        results.push({ email, status: "error", user_id: userId, message: upsertErr.message });
        continue;
      }

      results.push({ email, status: createErr ? "updated_profile" : "created", user_id: userId });
    }

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      log('error', 'Internal error', { ip, error: e });
      return new Response(JSON.stringify({ error: "Internal error", detail: String(e) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
});
