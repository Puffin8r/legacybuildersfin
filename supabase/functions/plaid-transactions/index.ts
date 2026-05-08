// Plaid → CashFlow Blueprint webhook receiver.
// Forwards normalized transactions to the user's n8n webhook (if configured).
// In production, validate Plaid's `Plaid-Verification` JWT before trusting the body.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface PlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  item_id?: string;
  new_transactions?: number;
  removed_transactions?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as PlaidWebhookBody;

    // Only act on transaction webhooks for now.
    if (body.webhook_type !== "TRANSACTIONS") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO when Plaid is wired:
    //   1. Look up access_token from public.bank_accounts where plaid_item_id = body.item_id
    //   2. Call Plaid /transactions/sync with cursor
    //   3. Insert new rows into public.transactions with plaid_transaction_id (deduped via unique index)
    //   4. Recompute safe-to-spend / overdraft / leak detection server-side or via DB triggers

    return new Response(JSON.stringify({
      ok: true,
      received: body.webhook_code,
      item_id: body.item_id,
      new_transactions: body.new_transactions ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
