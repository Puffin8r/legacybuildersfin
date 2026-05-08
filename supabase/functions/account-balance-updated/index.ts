// Account-balance update webhook. Called by Plaid (or a manual sync job)
// whenever a connected account's current/available balance changes.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface BalanceUpdateBody {
  plaid_account_id: string;
  current_balance: number;
  available_balance: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as BalanceUpdateBody;
    if (!body.plaid_account_id) {
      return new Response(JSON.stringify({ ok: false, error: "plaid_account_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: UPDATE public.bank_accounts SET current_balance = ..., available_balance = ...,
    //       last_synced_at = now() WHERE plaid_account_id = body.plaid_account_id

    return new Response(JSON.stringify({ ok: true, updated: body.plaid_account_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
