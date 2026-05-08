import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Sparkles, TrendingUp, AlertTriangle, LineChart as LineChartIcon, Banknote } from "lucide-react";
import { formatMoney, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/cashflow-types";
import type { CashFlow } from "@/hooks/useCashFlow";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceDot } from "recharts";
import {
  loadSubscriptions, saveSubscriptions, upsertFromPlaidRecurring, demoRecurringStreams,
  type Subscription, type SubscriptionUsage as Usage, type SubscriptionStatus as CancelStatus,
} from "@/lib/subscription-service";
import { loadAccounts as loadBankAccounts } from "@/lib/bank-service";
import CancelDialog from "./CancelDialog";
import { fireEvent } from "@/lib/integrations";

/* ============================================================
   Cancel & Invest
   - Subscription detector (manual + CSV + auto-detect from expenses + Plaid recurring sync)
   - Suggests cancellations ranked by usage, cost, duplicates, etc.
   - Shows what canceled $ would grow into at 9% annually
   ============================================================ */

const RETURN_RATE = 0.09;
const NON_ESSENTIAL: ExpenseCategory[] = ["Subscriptions", "Entertainment", "Shopping", "Food"];

/** Future-value of a monthly contribution at 9% APR for N years. */
function futureValue(monthly: number, years: number, rate = RETURN_RATE): number {
  const n = years * 12;
  const r = rate / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

/** Rank score — higher = more likely to cancel. */
function rankScore(s: Subscription, all: Subscription[]): number {
  let score = 0;
  if (s.usage === "Never") score += 100;
  if (s.usage === "Rarely") score += 60;
  if (s.usage === "Sometimes") score += 10;
  score += Math.min(50, s.monthly_amount); // higher cost = higher rank
  const dupes = all.filter(x => x.category === s.category && x.id !== s.id).length;
  if (dupes > 0) score += 20 * dupes;
  if (NON_ESSENTIAL.includes(s.category)) score += 15;
  if (s.prev_amount && s.monthly_amount > s.prev_amount) score += 25;
  return score;
}

function suggestionFor(s: Subscription, all: Subscription[]): string {
  if (s.usage === "Never") return "You never use this — easy cancel.";
  if (s.usage === "Rarely") return "Rarely used. Cancel and reinvest.";
  const dupes = all.filter(x => x.category === s.category && x.id !== s.id);
  if (dupes.length > 0) return `Duplicate ${s.category}: keep one, cut the rest.`;
  if (s.prev_amount && s.monthly_amount > s.prev_amount) return "Price went up. Reconsider value.";
  if (s.monthly_amount >= 30 && NON_ESSENTIAL.includes(s.category)) return "High-cost non-essential — review it.";
  return "Worth keeping if you use it weekly.";
}

export default function CancelAndInvest({ cf }: { cf: CashFlow }) {
  const [subs, setSubs] = useState<Subscription[]>(loadSubscriptions);
  useEffect(() => saveSubscriptions(subs), [subs]);

  // ---- Auto-detect from expense history ----
  const detectedFromExpenses = useMemo(() => {
    const byMerchant = new Map<string, { dates: string[]; amounts: number[]; cat: ExpenseCategory }>();
    cf.expenses.forEach(e => {
      const m = (e.merchant || e.description || "").trim().toLowerCase();
      if (!m) return;
      const entry = byMerchant.get(m) ?? { dates: [], amounts: [], cat: e.category };
      entry.dates.push(e.date);
      entry.amounts.push(e.amount);
      byMerchant.set(m, entry);
    });
    const found: Subscription[] = [];
    for (const [merchant, info] of byMerchant) {
      if (info.amounts.length < 2) continue;
      const avg = info.amounts.reduce((s, a) => s + a, 0) / info.amounts.length;
      const allClose = info.amounts.every(a => Math.abs(a - avg) / avg <= 0.15);
      if (!allClose) continue;
      const lastDate = info.dates.sort().slice(-1)[0];
      const exists = subs.some(s => s.merchant.toLowerCase() === merchant);
      if (exists) continue;
      found.push({
        id: `detect-${merchant}`,
        merchant: merchant.replace(/\b\w/g, c => c.toUpperCase()),
        monthly_amount: +avg.toFixed(2),
        frequency: "monthly",
        last_charged: lastDate,
        category: info.cat,
        usage: "Sometimes",
        status: "Keep",
        source: "detected",
      });
    }
    return found;
  }, [cf.expenses, subs]);

  function importDetected() {
    if (detectedFromExpenses.length === 0) {
      toast.info("No new recurring charges detected.");
      return;
    }
    setSubs(prev => [...prev, ...detectedFromExpenses]);
    toast.success(`Added ${detectedFromExpenses.length} possible subscription${detectedFromExpenses.length === 1 ? "" : "s"}`);
    detectedFromExpenses.forEach(s => fireEvent("subscription_detected", {
      source: "expense_history",
      merchant: s.merchant, monthly_amount: s.monthly_amount, category: s.category, last_charged: s.last_charged,
    }));
  }

  /** Pull Plaid recurring streams (demo until live) and merge into subs.
   *  Real flow: server calls /transactions/recurring/get → POSTs streams here. */
  async function syncFromBank() {
    const accounts = loadBankAccounts().filter(a => a.is_active);
    if (accounts.length === 0) {
      toast.error("Connect a bank account first to sync recurring charges.");
      return;
    }
    const streams = demoRecurringStreams();
    const { next, result } = upsertFromPlaidRecurring(subs, streams);
    setSubs(next);
    const parts = [
      result.added.length    && `${result.added.length} added`,
      result.updated.length  && `${result.updated.length} price-changed`,
      result.removed         && `${result.removed} canceled`,
      result.unchanged       && `${result.unchanged} unchanged`,
    ].filter(Boolean);
    toast.success(`Synced from bank: ${parts.join(" · ") || "nothing new"}`);
    result.added.forEach(s => fireEvent("subscription_detected", {
      source: "plaid_recurring",
      merchant: s.merchant, monthly_amount: s.monthly_amount, category: s.category,
      plaid_stream_id: s.plaid_stream_id, last_charged: s.last_charged,
    }));
  }

  function handleCSV(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { toast.error("CSV looks empty."); return; }
      const header = lines[0].toLowerCase().split(",").map(h => h.trim());
      const idx = (n: string) => header.findIndex(h => h.includes(n));
      const mIdx = idx("merchant") >= 0 ? idx("merchant") : idx("description");
      const aIdx = idx("amount");
      const dIdx = idx("date");
      const cIdx = idx("category");
      if (mIdx < 0 || aIdx < 0) { toast.error("CSV needs merchant and amount columns."); return; }
      const added: Subscription[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        const merchant = cols[mIdx];
        const amount = Math.abs(parseFloat(cols[aIdx])) || 0;
        if (!merchant || amount === 0) continue;
        const cat = (cols[cIdx] || "Subscriptions") as ExpenseCategory;
        added.push({
          id: crypto.randomUUID(),
          merchant,
          monthly_amount: amount,
          frequency: "monthly",
          last_charged: cols[dIdx] || new Date().toISOString().slice(0, 10),
          category: EXPENSE_CATEGORIES.includes(cat) ? cat : "Subscriptions",
          usage: "Sometimes",
          status: "Keep",
          source: "csv",
        });
      }
      if (added.length === 0) { toast.error("No valid rows found."); return; }
      setSubs(prev => [...prev, ...added]);
      toast.success(`Imported ${added.length} subscription${added.length === 1 ? "" : "s"}`);
    };
    reader.readAsText(file);
  }

  // ---- Ranked list ----
  const ranked = useMemo(
    () => [...subs].sort((a, b) => rankScore(b, subs) - rankScore(a, subs)),
    [subs],
  );

  // ---- Total cancel-able ----
  const cancelable = subs.filter(s => s.status === "Maybe Cancel" || s.status === "Cancel Requested" || s.status === "Canceled");
  const monthlySaved = cancelable.reduce((s, x) => s + x.monthly_amount, 0);
  const yearlySaved  = monthlySaved * 12;
  const fv5  = futureValue(monthlySaved, 5);
  const fv10 = futureValue(monthlySaved, 10);
  const fv20 = futureValue(monthlySaved, 20);
  const fv30 = futureValue(monthlySaved, 30);

  // Yearly projection points for the chart (year 0..30)
  const chartData = useMemo(() => {
    if (monthlySaved <= 0) return [];
    const pts: { year: number; value: number; contrib: number }[] = [];
    for (let y = 0; y <= 30; y++) {
      pts.push({
        year: y,
        value: Math.round(futureValue(monthlySaved, y)),
        contrib: Math.round(monthlySaved * 12 * y),
      });
    }
    return pts;
  }, [monthlySaved]);

  function update(id: string, patch: Partial<Subscription>) {
    setSubs(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next = { ...s, ...patch };
      // Fire status-change events for n8n
      if (patch.status && patch.status !== s.status) {
        const base = { id: next.id, merchant: next.merchant, monthly_amount: next.monthly_amount, category: next.category };
        if (patch.status === "Maybe Cancel" || patch.status === "Cancel Requested") {
          fireEvent("subscription_marked_cancel", { ...base, status: patch.status });
        }
        if (patch.status === "Canceled") {
          fireEvent("subscription_canceled", { ...base, method: next.cancellation_method ?? "manual" });
        }
      }
      return next;
    }));
  }
  function remove(id: string) {
    setSubs(prev => prev.filter(s => s.id !== id));
  }

  function investThisInstead(s: Subscription) {
    update(s.id, { status: "Cancel Requested" });
    const fv = futureValue(s.monthly_amount, 30);
    toast.success(`If invested at 9%, ${formatMoney(s.monthly_amount)}/mo grows to ${formatMoney(fv)} in 30 years.`);
    fireEvent("invest_savings_projection_created", {
      source: "single_subscription",
      merchant: s.merchant,
      monthly_amount: s.monthly_amount,
      projection_30yr: Math.round(fv),
      rate: RETURN_RATE,
    });
  }

  // Fire a debounced "projection updated" event when total cancelable savings change.
  useEffect(() => {
    if (monthlySaved <= 0) return;
    const t = setTimeout(() => {
      fireEvent("invest_savings_projection_created", {
        source: "summary",
        monthly_savings: +monthlySaved.toFixed(2),
        yearly_savings: +(monthlySaved * 12).toFixed(2),
        fv_5yr:  Math.round(fv5),
        fv_10yr: Math.round(fv10),
        fv_20yr: Math.round(fv20),
        fv_30yr: Math.round(fv30),
        rate: RETURN_RATE,
        canceled_count: cancelable.length,
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [monthlySaved, fv5, fv10, fv20, fv30, cancelable.length]);

  return (
    <div className="space-y-3">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-success/10 to-primary/10 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary shrink-0 mt-0.5"/>
          <div>
            <p className="font-heading text-lg font-semibold leading-tight">Cancel & Invest</p>
            <p className="text-sm text-muted-foreground">
              Find subscriptions you don't need. See what they'd grow to if invested instead.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary + chart */}
      {monthlySaved > 0 && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-success"/>What Canceling Could Build
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Monthly savings" value={formatMoney(monthlySaved)} accent/>
              <StatTile label="Yearly savings"  value={formatMoney(yearlySaved)} accent/>
              <StatTile label="10-yr invested"  value={formatMoney(fv10)}/>
              <StatTile label="30-yr invested"  value={formatMoney(fv30)}/>
            </div>

            <div className="h-44 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.45}/>
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={v => `${v}y`}/>
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={40}/>
                  <Tooltip
                    formatter={(v: number) => formatMoney(v)}
                    labelFormatter={l => `Year ${l}`}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#fvFill)" isAnimationActive={false}/>
                  <ReferenceDot x={5}  y={fv5}  r={3} fill="hsl(var(--primary))" stroke="none"/>
                  <ReferenceDot x={10} y={fv10} r={3} fill="hsl(var(--primary))" stroke="none"/>
                  <ReferenceDot x={20} y={fv20} r={3} fill="hsl(var(--primary))" stroke="none"/>
                  <ReferenceDot x={30} y={fv30} r={3} fill="hsl(var(--primary))" stroke="none"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              <FvCell label="5 yrs"  value={fv5}/>
              <FvCell label="10 yrs" value={fv10}/>
              <FvCell label="20 yrs" value={fv20}/>
              <FvCell label="30 yrs" value={fv30}/>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Projected at 9% annual return, compounded monthly. For illustration only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import actions */}
      <Card>
        <CardContent className="p-3 grid grid-cols-3 gap-2">
          <Button variant="outline" className="w-full text-xs px-2" onClick={syncFromBank}>
            <Banknote className="h-4 w-4 mr-1"/>Sync bank
          </Button>
          <Button variant="outline" className="w-full text-xs px-2" onClick={importDetected}>
            <Sparkles className="h-4 w-4 mr-1"/>Detect ({detectedFromExpenses.length})
          </Button>
          <label className="w-full">
            <input
              type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCSV(f); e.target.value = ""; }}
            />
            <Button variant="outline" className="w-full text-xs px-2" asChild>
              <span><Upload className="h-4 w-4 mr-1"/>CSV</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground px-1">
        Bank-detected subscriptions update automatically as Plaid finds new charges. Bank data may take several hours to refresh.
      </p>

      <AddSubscription onAdd={s => setSubs(prev => [...prev, s])}/>

      {/* List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Subscriptions You Might Cancel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranked.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No subscriptions yet. Add one, upload a CSV, or detect from your spending.
            </p>
          )}
          {ranked.map(s => (
            <SubCard
              key={s.id}
              sub={s}
              suggestion={suggestionFor(s, subs)}
              onUpdate={p => update(s.id, p)}
              onRemove={() => remove(s.id)}
              onInvestInstead={() => investThisInstead(s)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${accent ? "bg-success/10 border-success/30" : "bg-background/60"}`}>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className={`text-lg font-bold font-heading ${accent ? "text-success" : ""}`}>{value}</p>
    </div>
  );
}

function FvCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="text-base font-bold font-heading">{formatMoney(value)}</p>
    </div>
  );
}

function SubCard({
  sub, suggestion, onUpdate, onRemove, onInvestInstead,
}: {
  sub: Subscription;
  suggestion: string;
  onUpdate: (p: Partial<Subscription>) => void;
  onRemove: () => void;
  onInvestInstead: () => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const yearly = sub.monthly_amount * 12;
  const isCanceled = sub.status === "Canceled" || sub.status === "Cancel Requested";

  const statusColor =
    sub.status === "Canceled" ? "bg-success/15 text-success" :
    sub.status === "Cancel Requested" ? "bg-warning/15 text-warning-foreground" :
    sub.status === "Maybe Cancel" ? "bg-primary/10 text-primary" :
    "bg-muted text-muted-foreground";

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isCanceled ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{sub.merchant}</p>
            <Badge variant="outline" className="text-[10px]">{sub.category}</Badge>
            {sub.source === "detected" && <Badge variant="secondary" className="text-[10px]">detected</Badge>}
            {sub.prev_amount && sub.monthly_amount > sub.prev_amount && (
              <Badge className="text-[10px] bg-destructive/15 text-destructive hover:bg-destructive/15">
                <AlertTriangle className="h-3 w-3 mr-0.5"/>price up
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatMoney(sub.monthly_amount)}/mo · {formatMoney(yearly)}/yr · last {new Date(sub.last_charged).toLocaleDateString()}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="h-4 w-4"/></Button>
      </div>

      <p className="text-xs italic text-muted-foreground">💡 {suggestion}</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Usage</Label>
          <select
            value={sub.usage}
            onChange={e => onUpdate({ usage: e.target.value as Usage })}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option>Use Often</option><option>Sometimes</option><option>Rarely</option><option>Never</option>
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Status</Label>
          <span className={`inline-block w-full text-center text-xs font-medium rounded-md py-1.5 ${statusColor}`}>
            {sub.status}
          </span>
        </div>
      </div>

      {sub.cancellation_progress && sub.cancellation_progress !== "Not Started" && (
        <p className="text-[11px] text-muted-foreground">
          Cancellation: <span className="font-medium">{sub.cancellation_progress}</span>
          {sub.cancellation_method && <> · via {sub.cancellation_method}</>}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button size="sm" variant={sub.status === "Keep" ? "secondary" : "outline"} onClick={() => onUpdate({ status: "Keep" })}>Keep</Button>
        <Button size="sm" variant={sub.status === "Maybe Cancel" ? "secondary" : "outline"} onClick={() => onUpdate({ status: "Maybe Cancel" })}>Maybe</Button>
        <Button size="sm" variant={isCanceled ? "destructive" : "outline"} onClick={() => setCancelOpen(true)}>Cancel…</Button>
        <Button size="sm" variant="default" onClick={onInvestInstead}>
          <TrendingUp className="h-3 w-3 mr-1"/>Invest instead
        </Button>
      </div>

      <CancelDialog sub={sub} open={cancelOpen} onOpenChange={setCancelOpen} onUpdate={onUpdate}/>
    </div>
  );
}

function AddSubscription({ onAdd }: { onAdd: (s: Subscription) => void }) {
  const [open, setOpen] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<ExpenseCategory>("Subscriptions");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (!open) return <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add subscription</Button>;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Input placeholder="Merchant (e.g. Netflix)" value={merchant} onChange={e => setMerchant(e.target.value)} maxLength={60}/>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Monthly $</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)}/></div>
          <div><Label className="text-xs">Last charged</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <select value={cat} onChange={e => setCat(e.target.value as ExpenseCategory)}
            className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => {
            if (!merchant || !amount) return;
            onAdd({
              id: crypto.randomUUID(),
              merchant,
              monthly_amount: parseFloat(amount) || 0,
              frequency: "monthly",
              last_charged: date,
              category: cat,
              usage: "Sometimes",
              status: "Keep",
              source: "manual",
            });
            setOpen(false); setMerchant(""); setAmount("");
          }}>Save</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
