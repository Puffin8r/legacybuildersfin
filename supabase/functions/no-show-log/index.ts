// POST /functions/v1/no-show-log
// Auth: Authorization: Bearer <N8N_API_TOKEN>
// Body: { invitee_email?: string, invitee_name?: string,
//         scheduled_start?: ISO8601, event_uri?: string,
//         source?: string, metadata?: object }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("N8N_API_TOKEN");
  if (!expected || req.headers.get("Authorization") !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { invitee_email, invitee_name, scheduled_start, event_uri, source, metadata } = body ?? {};

  // Best-effort link to a known user via email
  let userId: string | null = null;
  if (invitee_email) {
    const { data: profile } = await supabase
      .from("profiles").select("user_id").ilike("email", invitee_email).maybeSingle();
    userId = profile?.user_id ?? null;
  }

  const { data: inserted, error } = await supabase
    .from("no_show_logs")
    .insert({
      user_id: userId,
      invitee_email: invitee_email ?? null,
      invitee_name: invitee_name ?? null,
      scheduled_start: scheduled_start ?? null,
      event_uri: event_uri ?? null,
      source: source ?? "n8n",
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("no_show_log insert failed", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, id: inserted.id, linked_user: !!userId }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
