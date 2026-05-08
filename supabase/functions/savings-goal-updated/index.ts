// Savings-goal update webhook. Triggered when a deposit lands in a linked
// savings account, so external tools (n8n → email, GHL, Calendar) can react.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface GoalUpdateBody {
  goal_id: string;
  current_amount: number;
  target_amount: number;
  delta?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as GoalUpdateBody;
    if (!body.goal_id) {
      return new Response(JSON.stringify({ ok: false, error: "goal_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: UPDATE public.savings_goals SET current_saved = body.current_amount WHERE id = body.goal_id

    const progress = body.target_amount > 0
      ? Math.min(100, Math.round((body.current_amount / body.target_amount) * 100))
      : 0;

    return new Response(JSON.stringify({ ok: true, goal_id: body.goal_id, progress }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
