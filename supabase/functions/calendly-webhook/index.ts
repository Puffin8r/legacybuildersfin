// Public webhook endpoint that receives Calendly events
// (invitee.created, invitee.canceled, invitee_no_show.created)
// and stores them in the calendly_events table so the app can
// surface a reschedule banner for missed appointments.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, calendly-webhook-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_KEY = Deno.env.get("CALENDLY_WEBHOOK_SIGNING_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Verify Calendly webhook signature header: "t=...,v1=..."
async function verifySignature(rawBody: string, header: string | null) {
  if (!SIGNING_KEY) return true; // signing optional during initial setup
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=").map((s) => s.trim())),
  ) as Record<string, string>;
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === v1;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();
  return data?.user_id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const raw = await req.text();
  const ok = await verifySignature(raw, req.headers.get("calendly-webhook-signature"));
  if (!ok) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = body?.event as string;
  const payload = body?.payload ?? {};

  try {
    if (event === "invitee.created") {
      const inviteeUri = payload.uri;
      const eventUri = payload.scheduled_event?.uri ?? payload.event ?? "";
      const email = payload.email ?? "";
      const userId = await findUserIdByEmail(email);

      await supabase.from("calendly_events").upsert({
        user_id: userId,
        invitee_email: email,
        invitee_name: payload.name ?? null,
        event_uri: eventUri,
        invitee_uri: inviteeUri,
        reschedule_url: payload.reschedule_url ?? null,
        cancel_url: payload.cancel_url ?? null,
        scheduled_start: payload.scheduled_event?.start_time,
        scheduled_end: payload.scheduled_event?.end_time ?? null,
        status: "scheduled",
        raw_payload: payload,
      }, { onConflict: "invitee_uri" });
    } else if (event === "invitee.canceled") {
      await supabase
        .from("calendly_events")
        .update({ status: "canceled", raw_payload: payload })
        .eq("invitee_uri", payload.uri);
    } else if (event === "invitee_no_show.created") {
      // payload.invitee.uri is the invitee that was marked no-show
      const inviteeUri = payload.invitee?.uri ?? payload.uri;
      await supabase
        .from("calendly_events")
        .update({
          status: "no_show",
          no_show_at: new Date().toISOString(),
          raw_payload: payload,
        })
        .eq("invitee_uri", inviteeUri);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("calendly-webhook error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
