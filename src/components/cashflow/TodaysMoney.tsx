import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, TrendingUp, Calendar, Plus, Trash2, AlertTriangle, CheckCircle2, ShieldAlert, ChevronRight,
} from "lucide-react";
import { formatMoney, daysUntil } from "@/lib/cashflow-types";
import type { CashFlow } from "@/hooks/useCashFlow";
import {
  buildTimeline, firstOverdraft, billsThisMonth, spendingThisMonth, calcSafeToSpend,
} from "@/lib/cashflow-engine";
import { todaysInsights } from "@/lib/ai-insights";
import { InsightList } from "@/components/ai/InsightCard";
import { fireEvent } from "@/lib/integrations";

type Freq = "once" | "weekly" | "biweekly" | "monthly";

export default function TodaysMoney({ cf }: { cf: CashFlow }) {
  const totalCash = cf.accounts.reduce((s, a) => s + a.balance, 0);

  const timeline = useMemo(
    () => buildTimeline(totalCash, cf.income, cf.bills, cf.expenses, 30),
    [totalCash, cf.income, cf.bills, cf.expenses],
  );
  const overdraft = useMemo(() => firstOverdraft(timeline), [timeline]);
  const monthBills = useMemo(() => billsThisMonth(cf.bills), [cf.bills]);
  const monthSpend = useMemo(() => spendingThisMonth(cf.expenses), [cf.expenses]);

  const nextPaycheck = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const future = cf.income
      .map(i => ({ name: i.name, amount: i.amount, date: i.next_date }))
      .filter(i => new Date(i.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return future ?? null;
  }, [cf.income]);

  const safe = useMemo(
    () => calcSafeToSpend(totalCash, cf.income, cf.bills, 0, 0),
    [totalCash, cf.income, cf.bills],
  );

  const insights = useMemo(
    () => todaysInsights({ totalCash, income: cf.income, bills: cf.bills, expenses: cf.expenses }),
    [totalCash, cf.income, cf.bills, cf.expenses],
  );

  return (
    <div className="space-y-4">
      {/* SNAPSHOT */}
      <Card className="border-2 overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cash on hand</p>
            <p className="text-4xl font-bold font-heading">{formatMoney(totalCash)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Next paycheck" value={nextPaycheck ? `+${formatMoney(nextPaycheck.amount)}` : "—"}
                  hint={nextPaycheck ? `in ${daysUntil(nextPaycheck.date)}d` : "Add income"} positive />
            <Stat label="Upcoming bill" value={cf.bills.length ? formatMoney([...cf.bills].sort((a,b)=>daysUntil(a.due_date)-daysUntil(b.due_date))[0].amount) : "—"}
                  hint={cf.bills.length ? [...cf.bills].sort((a,b)=>daysUntil(a.due_date)-daysUntil(b.due_date))[0].name : "Add bills"} />
            <Stat label="Bills this month" value={formatMoney(monthBills)} />
            <Stat label="Spending this month" value={formatMoney(monthSpend)} />
          </div>
        </CardContent>
      </Card>

      <InsightList insights={insights} />

      {/* SAFE TO SPEND */}
      <SafeToSpendCard safe={safe} />

      {/* OVERDRAFT WARNING */}
      {overdraft && (
        <Card className="border-2 border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Overdraft warning</p>
              <p className="text-sm">
                You may hit <span className="font-bold">{formatMoney(overdraft.ending)}</span> on{" "}
                <span className="font-medium">{new Date(overdraft.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <CashCard cf={cf} />
      <PaycheckPlanner cf={cf} />
      <BillPlanner cf={cf} />
      <Timeline timeline={timeline} />
    </div>
  );
}

function Stat({ label, value, hint, positive }: { label: string; value: string; hint?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${positive ? "text-success" : ""}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SafeToSpendCard({ safe }: { safe: ReturnType<typeof calcSafeToSpend> }) {
  const tone =
    safe.amount < 0 ? { ring: "border-destructive bg-destructive/10 text-destructive", icon: AlertTriangle, label: "Don't spend more" }
    : safe.amount < 50 ? { ring: "border-warning bg-warning/15 text-warning", icon: AlertTriangle, label: "Be careful" }
    : { ring: "border-success bg-success/10 text-success", icon: CheckCircle2, label: "You're good" };
  const Icon = tone.icon;
  return (
    <Card className={`border-2 ${tone.ring}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium opacity-80"><Icon className="h-4 w-4"/>Safe to spend</div>
        <p className="text-5xl font-bold font-heading mt-1">{formatMoney(safe.amount)}</p>
        <p className="text-sm mt-1 opacity-80">
          Until {safe.nextPaycheckDate ? new Date(safe.nextPaycheckDate).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }) : "next 30 days"} · {tone.label}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-foreground/80">
          <div className="rounded bg-background/70 p-2"><div className="opacity-70">Cash now</div><div className="font-semibold">{formatMoney(safe.currentBalance)}</div></div>
          <div className="rounded bg-background/70 p-2"><div className="opacity-70">Bills before payday</div><div className="font-semibold">-{formatMoney(safe.billsBeforeNextPaycheck)}</div></div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashCard({ cf }: { cf: CashFlow }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4"/>Accounts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {cf.accounts.map(a => (
          <div key={a.id} className="flex items-center gap-2">
            <Label className="flex-1 text-sm">{a.name}</Label>
            <Input
              type="number" inputMode="decimal" value={a.balance}
              onChange={e => cf.updateAccount(a.id, { balance: parseFloat(e.target.value) || 0 })}
              className="h-9 w-28"
            />
            <Button size="icon" variant="ghost" onClick={() => cf.removeAccount(a.id)}><Trash2 className="h-4 w-4"/></Button>
          </div>
        ))}
        <div className="flex gap-2 pt-2 border-t">
          <Input placeholder="Account name" value={name} onChange={e => setName(e.target.value)} className="h-9"/>
          <Input placeholder="$" type="number" value={balance} onChange={e => setBalance(e.target.value)} className="h-9 w-24"/>
          <Button size="sm" onClick={() => {
            if (!name) return;
            cf.addAccount({ name, balance: parseFloat(balance) || 0 });
            setName(""); setBalance("");
          }}><Plus className="h-4 w-4"/></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FreqSelect({ value, onChange }: { value: Freq; onChange: (v: Freq) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as Freq)}
      className="h-10 rounded-md border border-input bg-background px-2 text-sm">
      <option value="once">One-time</option>
      <option value="weekly">Weekly</option>
      <option value="biweekly">Bi-weekly</option>
      <option value="monthly">Monthly</option>
    </select>
  );
}

function PaycheckPlanner({ cf }: { cf: CashFlow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [freq, setFreq] = useState<Freq>("biweekly");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4"/>Paychecks</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {cf.income.length === 0 && <p className="text-sm text-muted-foreground">No paychecks yet.</p>}
        {cf.income.map(i => {
          const d = daysUntil(i.next_date);
          return (
            <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.frequency} · {d === 0 ? "today" : d > 0 ? `in ${d}d` : `${-d}d ago`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-success">+{formatMoney(i.amount)}</span>
                <Button size="icon" variant="ghost" onClick={() => cf.removeIncome(i.id)}><Trash2 className="h-4 w-4"/></Button>
              </div>
            </div>
          );
        })}
        {open ? (
          <div className="space-y-2 pt-2 border-t">
            <Input placeholder="Paycheck name (e.g. Job)" value={name} onChange={e=>setName(e.target.value)}/>
            <div className="flex gap-2">
              <Input placeholder="Amount" type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
              <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <FreqSelect value={freq} onChange={setFreq} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => {
                if (!name || !amount) return;
                cf.addIncome({ name, amount: parseFloat(amount), frequency: freq, next_date: date });
                setName(""); setAmount(""); setOpen(false);
              }}>Add paycheck</Button>
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add paycheck</Button>
        )}
      </CardContent>
    </Card>
  );
}

function BillPlanner({ cf }: { cf: CashFlow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [freq, setFreq] = useState<Freq>("monthly");
  const [essential, setEssential] = useState(true);
  const sorted = [...cf.bills].sort((a,b)=>daysUntil(a.due_date)-daysUntil(b.due_date));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4"/>Bills</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {sorted.map(b => {
          const d = daysUntil(b.due_date);
          const urgent = d <= 3 && !b.paid;
          return (
            <div key={b.id} className={`flex items-center justify-between rounded-lg border p-3 ${urgent ? "border-destructive/40 bg-destructive/5" : ""} ${b.paid ? "opacity-60" : ""}`}>
              <button
                onClick={() => cf.updateBill(b.id, { paid: !b.paid })}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-2 shrink-0 ${b.paid ? "bg-success border-success text-success-foreground" : "border-muted-foreground/40"}`}
                aria-label="Mark paid"
              >
                {b.paid && <CheckCircle2 className="h-4 w-4"/>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium truncate ${b.paid ? "line-through" : ""}`}>{b.name}</p>
                  {!b.is_essential && <Badge variant="outline" className="text-[10px]">optional</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{b.frequency} · {d === 0 ? "Due today" : d < 0 ? `${-d}d overdue` : `Due in ${d}d`}</p>
              </div>
              <span className="font-semibold mr-1">{formatMoney(b.amount)}</span>
              <Button size="icon" variant="ghost" onClick={() => cf.removeBill(b.id)}><Trash2 className="h-4 w-4"/></Button>
            </div>
          );
        })}
        {open ? (
          <div className="space-y-2 pt-2 border-t">
            <Input placeholder="Bill name" value={name} onChange={e=>setName(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Amount" type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
              <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <FreqSelect value={freq} onChange={setFreq} />
            <div className="flex items-center gap-2 text-sm">
              <input id="ess" type="checkbox" checked={essential} onChange={e=>setEssential(e.target.checked)} />
              <Label htmlFor="ess">Essential</Label>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => {
                if (!name || !amount) return;
                cf.addBill({ name, amount: parseFloat(amount), due_date: date, frequency: freq, is_essential: essential });
                setName(""); setAmount(""); setOpen(false);
              }}>Add bill</Button>
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add bill</Button>
        )}
      </CardContent>
    </Card>
  );
}

function Timeline({ timeline }: { timeline: ReturnType<typeof buildTimeline> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">30-day cash flow</CardTitle>
        <p className="text-xs text-muted-foreground">Tap a day to see details. Red = below zero.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {timeline.map(d => {
            const negative = d.ending < 0;
            const hasActivity = d.paychecks.length || d.bills.length || d.transactions.length;
            const open = expanded === d.date;
            const dt = new Date(d.date);
            return (
              <div key={d.date}>
                <button
                  onClick={() => setExpanded(open ? null : d.date)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${negative ? "bg-destructive/10" : ""}`}
                >
                  <div className="w-12 shrink-0">
                    <p className="text-[10px] uppercase text-muted-foreground leading-none">{dt.toLocaleDateString("en",{weekday:"short"})}</p>
                    <p className="text-base font-bold leading-tight">{dt.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    {d.paychecks.map((p, i) => <Badge key={i} className="bg-success/15 text-success border-success/30 hover:bg-success/15">+{formatMoney(p.amount)}</Badge>)}
                    {d.bills.map((b, i) => <Badge key={i} variant="outline" className="border-destructive/40 text-destructive">-{formatMoney(b.amount)} {b.name}</Badge>)}
                    {d.transactions.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">-{formatMoney(t.amount)}</Badge>)}
                    {!hasActivity && <span className="text-xs text-muted-foreground">No activity</span>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${negative ? "text-destructive" : ""}`}>{formatMoney(d.ending)}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
                {open && (
                  <div className="bg-muted/40 px-4 py-3 text-xs space-y-1">
                    <div className="flex justify-between"><span>Starting balance</span><span className="font-medium">{formatMoney(d.starting)}</span></div>
                    {d.paychecks.map((p,i)=>(<div key={i} className="flex justify-between text-success"><span>+ {p.name}</span><span>+{formatMoney(p.amount)}</span></div>))}
                    {d.bills.map((b,i)=>(<div key={i} className="flex justify-between text-destructive"><span>- {b.name}</span><span>-{formatMoney(b.amount)}</span></div>))}
                    {d.transactions.map((t,i)=>(<div key={i} className="flex justify-between"><span>- {t.description}</span><span>-{formatMoney(t.amount)}</span></div>))}
                    <div className="flex justify-between border-t pt-1 mt-1 font-semibold"><span>Ending balance</span><span className={negative ? "text-destructive" : ""}>{formatMoney(d.ending)}</span></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
