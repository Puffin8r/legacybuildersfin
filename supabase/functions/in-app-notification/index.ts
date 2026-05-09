// POST /functions/v1/in-app-notification
// Auth: Authorization: Bearer <N8N_API_TOKEN>
// Body: { user_id?: uuid, email?: string, title: string, body?: string,
//         type?: string, link?: string, data?: object }
// Either user_id or email must be provided. Email is matched against profiles.

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

function unauthorized(msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("N8N_API_TOKEN");
  if (!expected) return unauthorized("Server token not configured");
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${expected}`) return unauthorized();

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { user_id, email, title, body: text, type, link, data } = body ?? {};
  if (!title || (!user_id && !email)) {
    return new Response(JSON.stringify({ error: "title and (user_id or email) are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let resolvedUserId = user_id as string | undefined;
  if (!resolvedUserId && email) {
    const { data: profile } = await supabase
      .from("profiles").select("user_id").ilike("email", email).maybeSingle();
    if (!profile?.user_id) {
      return new Response(JSON.stringify({ error: "No user found for email" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    resolvedUserId = profile.user_id;
  }

  const { data: inserted, error } = await supabase
    .from("notifications")
    .insert({
      user_id: resolvedUserId,
      title,
      body: text ?? null,
      type: type ?? "general",
      link: link ?? null,
      data: data ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("notification insert failed", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, id: inserted.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
