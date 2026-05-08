import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CashFlow } from "@/hooks/useCashFlow";
import {
  todaysInsights, whereInsights, fixInsights, futureInsights, type MoneyInsight,
} from "@/lib/ai-insights";
import { calcFIN, calcFutureValue } from "@/lib/financial-calculations";

type Msg = { role: "user" | "assistant"; content: string };
export type CoachTab = "today" | "where" | "fix" | "future";

const TAB_LABEL: Record<CoachTab, string> = {
  today: "Today's Money",
  where: "Where It Went",
  fix: "Fix My Money",
  future: "Future Blueprint",
};

const SUGGESTED: Record<CoachTab, string[]> = {
  today: [
    "Will I run out of money before my next paycheck?",
    "What's safe for me to spend right now?",
    "Which bill should I pay first?",
  ],
  where: [
    "Where am I leaking money this month?",
    "Which category should I cut?",
    "How much am I spending on subscriptions?",
  ],
  fix: [
    "Which debt should I pay first?",
    "Snowball or avalanche for my debts?",
    "Am I on track with my emergency fund?",
  ],
  future: [
    "Am I on track to hit my FIN?",
    "How much more should I contribute monthly?",
    "When can I retire if I keep saving this much?",
  ],
};

// Follow-up question pool per tab. Keywords trigger context-aware replies
// based on what the assistant just said.
type FollowUp = { q: string; match?: RegExp };
const FOLLOWUPS: Record<CoachTab, FollowUp[]> = {
  today: [
    { q: "How can I avoid that overdraft?", match: /overdraft|negative|run out|short/i },
    { q: "What bills should I delay?", match: /bill|due|pay/i },
    { q: "How much can I safely spend today?", match: /safe|spend|cash|balance/i },
    { q: "When does my next paycheck land?", match: /paycheck|income|deposit/i },
    { q: "Show me my next 7 days", match: /week|days|upcoming|timeline/i },
    { q: "What's a quick way to boost my buffer?" },
  ],
  where: [
    { q: "How do I cut that category by 25%?", match: /category|food|dining|shopping|coffee|subscription/i },
    { q: "Which subscriptions should I cancel?", match: /subscription|recurring|netflix|spotify/i },
    { q: "Are there any duplicate charges?", match: /duplicate|charge|fee/i },
    { q: "What's a realistic spending cap?", match: /cap|budget|limit|cut/i },
    { q: "Compare this month to last month" },
    { q: "What's my single biggest leak?" },
  ],
  fix: [
    { q: "How fast can I be debt-free?", match: /debt|payoff|free|months|years/i },
    { q: "Should I do snowball or avalanche?", match: /snowball|avalanche|method|order/i },
    { q: "How much extra should I throw at it?", match: /extra|payment|minimum|pay more/i },
    { q: "How big should my emergency fund be?", match: /emergency|fund|buffer|cushion/i },
    { q: "What if I add $50/mo to savings?", match: /save|saving|goal|fund/i },
    { q: "What's the smallest win I can grab this week?" },
  ],
  future: [
    { q: "What if I retire 5 years earlier?", match: /retire|age|years|early/i },
    { q: "How much more do I need monthly?", match: /contribut|monthly|save|invest/i },
    { q: "What return rate am I assuming?", match: /return|rate|growth|compound/i },
    { q: "How does inflation change this?", match: /inflation|real|today's dollars/i },
    { q: "What's my FIN in plain English?", match: /fin|financial independence|number/i },
    { q: "Show me a more aggressive plan" },
  ],
};

function pickFollowUps(reply: string, tab: CoachTab, asked: Set<string>): string[] {
  const pool = FOLLOWUPS[tab];
  const matched = pool.filter(f => f.match && f.match.test(reply) && !asked.has(f.q));
  const fallback = pool.filter(f => !asked.has(f.q));
  const out: string[] = [];
  for (const f of matched) { if (out.length < 3) out.push(f.q); }
  for (const f of fallback) { if (out.length < 3 && !out.includes(f.q)) out.push(f.q); }
  return out;
}

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/money-coach-chat`;

export default function MoneyCoachChat({
  cf, tab, open: openProp, onOpenChange, hideFab, initialPrompt, onPromptConsumed,
}: {
  cf: CashFlow;
  tab: CoachTab;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFab?: boolean;
  initialPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => { onOpenChange ? onOpenChange(v) : setInternalOpen(v); };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset chat when switching tabs so context stays focused.
  useEffect(() => { setMessages([]); }, [tab]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Pre-compute insight bundles for every tab, plus a key summary.
  const bundles = useMemo(() => {
    const totalCash = cf.accounts.reduce((s, a) => s + a.balance, 0);
    const monthlyExpenses = cf.bills.filter(b => b.frequency === "monthly").reduce((s, b) => s + b.amount, 0) || 4000;
    const fin = calcFIN(monthlyExpenses);
    const projected = calcFutureValue(0, 500, 8, 30);
    return {
      today: todaysInsights({ totalCash, income: cf.income, bills: cf.bills, expenses: cf.expenses }),
      where: whereInsights(cf.expenses),
      fix: fixInsights({ debts: cf.debts, goals: cf.goals }),
      future: futureInsights({
        fin, currentInvestments: 0, projected, monthlyContribution: 500, yearsToRetire: 30,
      }),
    } as Record<CoachTab, MoneyInsight[]>;
  }, [cf]);

  // Pick the most relevant tab for a free-form question by keyword matching.
  const pickTopic = (q: string): CoachTab => {
    const t = q.toLowerCase();
    if (/debt|credit card|loan|interest|snowball|avalanche|payoff|emergency fund|savings? goal/.test(t)) return "fix";
    if (/retire|fin |financial independence|invest|compound|future|projection|contribute/.test(t)) return "future";
    if (/spend|category|leak|subscription|food|restaurant|coffee|shopping|merchant|where/.test(t)) return "where";
    if (/paycheck|safe to spend|today|tomorrow|overdraft|bill|due|cash on hand|balance/.test(t)) return "today";
    return tab;
  };

  const flat = (insights: MoneyInsight[]) =>
    insights.map(i => `- [${i.tone}] ${i.title} | Why: ${i.why} | Next: ${i.action} | Impact: ${i.impact}`).join("\n") || "(no insights)";

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    const focus = pickTopic(text);
    const totalCash = cf.accounts.reduce((s, a) => s + a.balance, 0);

    const context = {
      active_tab: tab,
      tab_label: TAB_LABEL[tab],
      focus_topic: focus,
      focus_topic_label: TAB_LABEL[focus],
      summary: {
        cash_on_hand: totalCash,
        paychecks: cf.income.length,
        upcoming_bills: cf.bills.length,
        recent_transactions: cf.expenses.length,
        debts: cf.debts.length,
        savings_goals: cf.goals.length,
      },
      // Always include the insights for the active tab AND the inferred focus tab.
      insights_active_tab: bundles[tab],
      insights_focus_tab: bundles[focus],
      insights_summary_text:
        `ACTIVE TAB (${TAB_LABEL[tab]}):\n${flat(bundles[tab])}\n\n` +
        (focus !== tab ? `MOST RELEVANT TAB (${TAB_LABEL[focus]}):\n${flat(bundles[focus])}\n\n` : ``),
      // Raw data for deeper questions.
      accounts: cf.accounts,
      income: cf.income,
      bills: cf.bills,
      recent_expenses: cf.expenses.slice(0, 30),
      debts: cf.debts,
      goals: cf.goals,
    };

    try {
      const resp = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, context }),
      });
      if (resp.status === 429) { toast.error("Too many requests. Try again in a minute."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add credits in workspace settings."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      setMessages(m => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const c = JSON.parse(data).choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, content: acc } : msg));
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach the coach. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabSuggestions = SUGGESTED[tab];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideFab && (
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-20 right-4 z-40 h-14 rounded-full shadow-lg gap-2 px-5 bg-gradient-to-r from-primary to-secondary"
          >
            <Sparkles className="h-5 w-5" />
            <span className="hidden sm:inline">Ask AI Money Coach</span>
            <span className="sm:hidden">Coach</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md p-0 gap-0 h-[85vh] flex flex-col">
        <DialogTitle className="sr-only">AI Money Coach</DialogTitle>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold leading-tight">AI Money Coach</p>
              <p className="text-[11px] text-muted-foreground">Focused on {TAB_LABEL[tab]}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          <div ref={scrollRef} className="space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">Context: {TAB_LABEL[tab]}</Badge>
                  <span className="text-[11px] text-muted-foreground">{bundles[tab].length} active insight{bundles[tab].length === 1 ? "" : "s"}</span>
                </div>
                <p className="text-sm text-muted-foreground">Ask about this tab — or anything money-related:</p>
                <div className="grid gap-2">
                  {tabSuggestions.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-sm rounded-lg border p-3 hover:bg-accent transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const showFollowups =
                isLast && m.role === "assistant" && !!m.content && !loading;
              const askedSet = new Set(messages.filter(x => x.role === "user").map(x => x.content));
              const followups = showFollowups ? pickFollowUps(m.content, tab, askedSet) : [];
              return (
                <div key={i} className="space-y-2">
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {m.content || <span className="opacity-60">Thinking…</span>}
                    </div>
                  </div>
                  {showFollowups && followups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {followups.map(q => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="text-xs rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground px-3 py-1.5 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t p-3 space-y-2">
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask about ${TAB_LABEL[tab]}…`}
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center leading-tight">
            This is educational guidance only, not professional financial advice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
