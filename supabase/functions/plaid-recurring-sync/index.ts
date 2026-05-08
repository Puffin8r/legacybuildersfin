// Plaid recurring-transactions sync receiver.
//
// Two modes:
//   1. Plaid `RECURRING_TRANSACTIONS_UPDATE` webhook → fetch streams server-side.
//   2. n8n / external pipeline POST → forward an array of streams as-is.
//
// In both cases the response shape is `{ ok, streams }` so the client can
// hand the streams to `upsertFromPlaidRecurring()` from subscription-service.ts.
//
// To wire Plaid for real:
//   - Validate the `Plaid-Verification` JWT header.
//   - On RECURRING_TRANSACTIONS_UPDATE, look up access_token via item_id and
//     call /transactions/recurring/get, then return its inflow/outflow streams.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface PlaidRecurringStream {
  stream_id: string;
  merchant_name?: string;
  description?: string;
  category?: string[];
  frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "SEMI_MONTHLY" | "ANNUALLY" | "UNKNOWN";
  last_amount?: { amount: number; iso_currency_code?: string };
  average_amount?: { amount: number };
  last_date?: string;
  is_active?: boolean;
  status?: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
}

interface InboundBody {
  // Plaid webhook fields
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  // Direct stream push (n8n / our own server)
  streams?: PlaidRecurringStream[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as InboundBody;

    // Plaid webhook path — for now, just acknowledge.
    if (body.webhook_type === "TRANSACTIONS" && body.webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
      // TODO: look up item access_token, call /transactions/recurring/get,
      // store streams in a `recurring_streams` table, and return them.
      return new Response(JSON.stringify({ ok: true, received: body.webhook_code, item_id: body.item_id, streams: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct push path — validate and echo streams back.
    const streams = Array.isArray(body.streams) ? body.streams : [];
    const cleaned = streams
      .filter(s => typeof s?.stream_id === "string")
      .map(s => ({
        stream_id: s.stream_id,
        merchant_name: s.merchant_name,
        description: s.description,
        category: Array.isArray(s.category) ? s.category : undefined,
        frequency: s.frequency,
        last_amount: s.last_amount,
        average_amount: s.average_amount,
        last_date: s.last_date,
        is_active: s.is_active,
        status: s.status,
      }));

    return new Response(JSON.stringify({ ok: true, count: cleaned.length, streams: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
