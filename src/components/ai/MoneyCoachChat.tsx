import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { CashFlow } from "@/hooks/useCashFlow";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED = [
  "Where am I leaking money?",
  "Can I afford to spend $100 today?",
  "Which debt should I pay first?",
  "Am I on track for retirement?",
];

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/money-coach-chat`;

export default function MoneyCoachChat({ cf }: { cf: CashFlow }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    const context = {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 z-40 h-14 rounded-full shadow-lg gap-2 px-5 bg-gradient-to-r from-primary to-secondary"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Ask AI Money Coach</span>
          <span className="sm:hidden">Coach</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 gap-0 h-[85vh] flex flex-col">
        <DialogTitle className="sr-only">AI Money Coach</DialogTitle>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold leading-tight">AI Money Coach</p>
              <p className="text-[11px] text-muted-foreground">Plain-language money help</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          <div ref={scrollRef} className="space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">Ask anything about your money. Try:</p>
                <div className="grid gap-2">
                  {SUGGESTED.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-sm rounded-lg border p-3 hover:bg-accent transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {m.content || <span className="opacity-60">Thinking…</span>}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-3 space-y-2">
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your money…"
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
