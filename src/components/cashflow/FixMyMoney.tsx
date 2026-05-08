import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Trash2, Trophy, Target, Calendar, Repeat, Flame, Snowflake, ChevronRight, AlertTriangle, TrendingUp, TrendingDown,
  Sparkles, CheckCircle2,
} from "lucide-react";
import {
  formatMoney, daysUntil, SAVINGS_GOAL_TYPES, type SavingsGoalType,
  type Debt, type SavingsGoal,
} from "@/lib/cashflow-types";
import { calcSafeToSpend, billsThisMonth, spendingThisMonth, buildTimeline, firstOverdraft } from "@/lib/cashflow-engine";
import type { CashFlow } from "@/hooks/useCashFlow";
import { fixInsights } from "@/lib/ai-insights";
import { InsightList } from "@/components/ai/InsightCard";
import { fireEvent } from "@/lib/integrations";
import { toast } from "sonner";
import { InfoTip } from "@/components/ui/info-tip";
import CancelAndInvest from "./CancelAndInvest";

export default function FixMyMoney({ cf }: { cf: CashFlow }) {
  const insights = useMemo(() => fixInsights({ debts: cf.debts, goals: cf.goals }), [cf.debts, cf.goals]);
  return (
    <div className="space-y-4">
      <InsightList insights={insights} />
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary shrink-0 mt-0.5"/>
          <div>
            <p className="font-heading text-lg font-semibold leading-tight">Fix My Money</p>
            <p className="text-sm text-muted-foreground">Pay off debt, build savings, and reset every month.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="debt" className="w-full">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="debt" className="text-xs px-1 py-2">Debt</TabsTrigger>
          <TabsTrigger value="save" className="text-xs px-1 py-2">Save</TabsTrigger>
          <TabsTrigger value="cancel" className="text-xs px-1 py-2">Cancel</TabsTrigger>
          <TabsTrigger value="week" className="text-xs px-1 py-2">Week</TabsTrigger>
          <TabsTrigger value="reset" className="text-xs px-1 py-2">Reset</TabsTrigger>
          <TabsTrigger value="next" className="text-xs px-1 py-2">Next</TabsTrigger>
        </TabsList>

        <TabsContent value="debt" className="space-y-3 mt-3"><DebtFreedomMap cf={cf}/></TabsContent>
        <TabsContent value="save" className="space-y-3 mt-3"><SavingsBuilder cf={cf}/></TabsContent>
        <TabsContent value="cancel" className="space-y-3 mt-3"><CancelAndInvest cf={cf}/></TabsContent>
        <TabsContent value="week" className="space-y-3 mt-3"><WeeklyCheckIn cf={cf}/></TabsContent>
        <TabsContent value="reset" className="space-y-3 mt-3"><MonthlyReset cf={cf}/></TabsContent>
        <TabsContent value="next" className="space-y-3 mt-3"><NextMonthStrategy cf={cf}/></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   1. DEBT FREEDOM MAP
   ============================================================ */

function DebtFreedomMap({ cf }: { cf: CashFlow }) {
  const totalBalance = cf.debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = cf.debts.reduce((s, d) => s + d.min_payment, 0);

  const snowball = useMemo(() => [...cf.debts].sort((a, b) => a.balance - b.balance), [cf.debts]);
  const avalanche = useMemo(() => [...cf.debts].sort((a, b) => b.interest_rate - a.interest_rate), [cf.debts]);

  // Recommendation: avalanche if highest APR > 10 and spread > 5pts; otherwise snowball
  const recommendation = useMemo(() => {
    if (cf.debts.length < 2) return "snowball";
    const rates = cf.debts.map(d => d.interest_rate);
    const max = Math.max(...rates), min = Math.min(...rates);
    if (max >= 10 && (max - min) >= 5) return "avalanche";
    return "snowball";
  }, [cf.debts]);

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wide">Total debt</p>
          <p className="text-3xl font-bold font-heading">{formatMoney(totalBalance)}</p>
          <p className="text-sm text-muted-foreground">Minimums: {formatMoney(totalMin)}/mo</p>
        </CardContent>
      </Card>

      {cf.debts.length >= 1 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold">
                We recommend the <span className="text-primary">{recommendation === "avalanche" ? "Avalanche" : "Snowball"}</span> method
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {recommendation === "avalanche"
                  ? "You have high-interest debt. Killing the highest rate first saves the most money."
                  : "Quick wins keep you motivated. Knocking out small balances first builds momentum."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PayoffOrderCard
          title="Snowball" subtitle="Smallest balance first"
          icon={Snowflake} list={snowball} highlight={recommendation === "snowball"}
        />
        <PayoffOrderCard
          title="Avalanche" subtitle="Highest interest first"
          icon={Flame} list={avalanche} highlight={recommendation === "avalanche"}
        />
      </div>

      <DebtList cf={cf}/>
      <AddDebt cf={cf}/>
    </>
  );
}

function PayoffOrderCard({
  title, subtitle, icon: Icon, list, highlight,
}: { title: string; subtitle: string; icon: typeof Flame; list: Debt[]; highlight: boolean }) {
  return (
    <Card className={highlight ? "border-2 border-primary" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4"/>{title}
          <InfoTip tip={title.toLowerCase() === "snowball" ? "snowball" : "avalanche"} />
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {list.length === 0 && <p className="text-xs text-muted-foreground">Add a debt to see order.</p>}
        {list.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2 text-xs">
            <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center font-semibold">{i + 1}</span>
            <span className="flex-1 truncate">{d.name}</span>
            <span className="text-muted-foreground">{d.interest_rate}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DebtList({ cf }: { cf: CashFlow }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Your debts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {cf.debts.length === 0 && <p className="text-sm text-muted-foreground">No debts yet. You're free!</p>}
        {cf.debts.map(d => {
          const due = daysUntil(d.due_date);
          return (
            <div key={d.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{d.name}</p>
                <Button size="icon" variant="ghost" onClick={() => cf.removeDebt(d.id)}><Trash2 className="h-4 w-4"/></Button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-1">
                <span className="text-muted-foreground">Balance</span><span className="text-right font-medium">{formatMoney(d.balance)}</span>
                <span className="text-muted-foreground">Min payment</span><span className="text-right font-medium">{formatMoney(d.min_payment)}</span>
                <span className="text-muted-foreground">Interest</span><span className="text-right font-medium">{d.interest_rate}% APR</span>
                <span className="text-muted-foreground">Due</span><span className="text-right font-medium">{due === 0 ? "today" : due > 0 ? `in ${due}d` : `${-due}d ago`}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AddDebt({ cf }: { cf: CashFlow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [minPay, setMinPay] = useState("");
  const [apr, setApr] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const reset = () => { setName(""); setBalance(""); setMinPay(""); setApr(""); };

  if (!open) return <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add debt</Button>;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Input placeholder="Debt name (e.g. Visa)" value={name} onChange={e => setName(e.target.value)} maxLength={60}/>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Balance</Label><Input type="number" value={balance} onChange={e => setBalance(e.target.value)}/></div>
          <div><Label className="text-xs">Min payment</Label><Input type="number" value={minPay} onChange={e => setMinPay(e.target.value)}/></div>
          <div><Label className="text-xs">Interest %</Label><Input type="number" value={apr} onChange={e => setApr(e.target.value)}/></div>
          <div><Label className="text-xs">Due date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => {
            if (!name || !balance) return;
            cf.addDebt({
              name, balance: parseFloat(balance) || 0,
              min_payment: parseFloat(minPay) || 0,
              interest_rate: parseFloat(apr) || 0,
              due_date: date,
            });
            reset(); setOpen(false);
          }}>Save debt</Button>
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   2. SAVINGS PURPOSE BUILDER
   ============================================================ */

function SavingsBuilder({ cf }: { cf: CashFlow }) {
  const totalSaved = cf.goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = cf.goals.reduce((s, g) => s + g.target_amount, 0);
  return (
    <>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wide">Saved across all goals</p>
          <p className="text-3xl font-bold font-heading">{formatMoney(totalSaved)}</p>
          <p className="text-sm text-muted-foreground">of {formatMoney(totalTarget)} targeted</p>
        </CardContent>
      </Card>

      {cf.goals.map(g => <GoalCard key={g.id} goal={g} cf={cf}/>)}
      <AddGoal cf={cf}/>
    </>
  );
}

function GoalCard({ goal, cf }: { goal: SavingsGoal; cf: CashFlow }) {
  const pct = Math.min(100, goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const monthsToGoal = goal.monthly_contribution > 0 ? Math.ceil(remaining / goal.monthly_contribution) : Infinity;
  const dDays = daysUntil(goal.target_date);
  const onTrack = monthsToGoal !== Infinity && monthsToGoal * 30 <= dDays;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="text-[10px]">{goal.type}</Badge>
            <p className="font-semibold mt-1">{goal.name}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => cf.removeGoal(goal.id)}><Trash2 className="h-4 w-4"/></Button>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-bold">{formatMoney(goal.current_amount)}</span>
          <span className="text-muted-foreground">/ {formatMoney(goal.target_amount)}</span>
        </div>
        <Progress value={pct} className="h-2"/>
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div>
            <Label className="text-[10px] text-muted-foreground">Saving / month</Label>
            <Input type="number" value={goal.monthly_contribution} className="h-8"
              onChange={e => cf.updateGoal(goal.id, { monthly_contribution: parseFloat(e.target.value) || 0 })}/>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Add to saved</Label>
            <Input type="number" value={goal.current_amount} className="h-8"
              onChange={e => cf.updateGoal(goal.id, { current_amount: parseFloat(e.target.value) || 0 })}/>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3"/>
          Target: {new Date(goal.target_date).toLocaleDateString()} ·{" "}
          {monthsToGoal === Infinity
            ? "Set a monthly amount"
            : <>At this pace: {monthsToGoal} mo {onTrack
                ? <span className="text-success font-medium">· On track</span>
                : <span className="text-destructive font-medium">· Behind</span>}</>}
        </p>
      </CardContent>
    </Card>
  );
}

function AddGoal({ cf }: { cf: CashFlow }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SavingsGoalType>("Emergency fund");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));

  if (!open) return <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add savings goal</Button>;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Label className="text-xs">Purpose</Label>
        <select value={type} onChange={e => setType(e.target.value as SavingsGoalType)}
          className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
          {SAVINGS_GOAL_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <Input placeholder={type === "Custom" ? "Goal name" : "Nickname (optional)"} value={name} onChange={e => setName(e.target.value)} maxLength={60}/>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Target</Label><Input type="number" value={target} onChange={e => setTarget(e.target.value)}/></div>
          <div><Label className="text-xs">Saved</Label><Input type="number" value={current} onChange={e => setCurrent(e.target.value)}/></div>
          <div><Label className="text-xs">Monthly</Label><Input type="number" value={monthly} onChange={e => setMonthly(e.target.value)}/></div>
          <div><Label className="text-xs">Target date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => {
            if (!target) return;
            cf.addGoal({
              name: name || type,
              type,
              target_amount: parseFloat(target) || 0,
              current_amount: parseFloat(current) || 0,
              monthly_contribution: parseFloat(monthly) || 0,
              target_date: date,
            });
            setOpen(false); setName(""); setTarget(""); setCurrent(""); setMonthly("");
          }}>Save goal</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   3. WEEKLY CHECK-IN
   ============================================================ */

function WeeklyCheckIn({ cf }: { cf: CashFlow }) {
  const cash = cf.accounts.reduce((s, a) => s + a.balance, 0);

  const last7Expenses = cf.expenses.filter(e => Date.now() - new Date(e.date).getTime() <= 7 * 86400000);
  const totalOut7 = last7Expenses.reduce((s, e) => s + e.amount, 0);

  const totalIn7 = cf.income
    .filter(i => { const d = daysUntil(i.next_date); return d >= -7 && d <= 0; })
    .reduce((s, i) => s + i.amount, 0);

  const nextBills = [...cf.bills]
    .filter(b => !b.paid && daysUntil(b.due_date) >= 0 && daysUntil(b.due_date) <= 7)
    .sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));

  const safe = calcSafeToSpend(cash, cf.income, cf.bills, 0, 0);

  // top leak in last 30 days
  const cutoff = Date.now() - 30 * 86400000;
  const byCat = new Map<string, number>();
  cf.expenses.filter(e => new Date(e.date).getTime() >= cutoff).forEach(e =>
    byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount));
  const topLeak = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4"/>Weekly check-in</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <CheckInRow icon={TrendingUp} label="What came in?" value={`+${formatMoney(totalIn7)}`} positive/>
          <CheckInRow icon={TrendingDown} label="What went out?" value={`-${formatMoney(totalOut7)}`} negative/>
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Bills coming up (7d)</p>
            {nextBills.length === 0
              ? <p className="text-sm text-muted-foreground">None this week.</p>
              : nextBills.map(b => (
                <div key={b.id} className="flex justify-between text-sm py-0.5">
                  <span>{b.name} <span className="text-muted-foreground text-xs">in {daysUntil(b.due_date)}d</span></span>
                  <span className="font-medium">{formatMoney(b.amount)}</span>
                </div>
              ))}
          </div>
          <CheckInRow icon={Target} label="Safe to spend" tipKey="safeToSpend" value={formatMoney(safe.amount)}
            positive={safe.amount >= 0} negative={safe.amount < 0}/>
          <div className="rounded-lg border bg-warning/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Repeat className="h-4 w-4"/>Money leak to fix</div>
            <p className="text-sm mt-1">
              {topLeak
                ? <>Your biggest category was <span className="font-semibold">{topLeak[0]}</span> at <span className="font-semibold">{formatMoney(topLeak[1])}</span>. Aim to cut it 25% next week.</>
                : "No spending logged yet."}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function CheckInRow({ icon: Icon, label, value, positive, negative, tipKey }: { icon: typeof Target; label: string; value: string; positive?: boolean; negative?: boolean; tipKey?: "safeToSpend" | "overdraft" | "snowball" | "avalanche" | "ruleOf72" | "fin" }) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-muted-foreground"/>{label}{tipKey && <InfoTip tip={tipKey} />}</div>
      <span className={`font-bold ${positive ? "text-success" : ""} ${negative ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

/* ============================================================
   4. MONTHLY RESET
   ============================================================ */

function MonthlyReset({ cf }: { cf: CashFlow }) {
  const now = new Date();
  const inThisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Income this month: occurrences of paychecks falling in current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const totalIncome = cf.income.reduce((sum, i) => {
    // approximate based on frequency
    const per = i.frequency === "weekly" ? 4 : i.frequency === "biweekly" ? 2 : i.frequency === "monthly" ? 1 : 0;
    if (i.frequency === "once" || i.frequency === "one-time") {
      const d = new Date(i.next_date);
      return d >= monthStart && d <= monthEnd ? sum + i.amount : sum;
    }
    return sum + per * i.amount;
  }, 0);

  const totalBills = billsThisMonth(cf.bills);
  const totalSpending = spendingThisMonth(cf.expenses);
  // savings: sum of monthly_contributions for goals
  const totalSaved = cf.goals.reduce((s, g) => s + g.monthly_contribution, 0);

  // biggest leak
  const monthExpenses = cf.expenses.filter(e => inThisMonth(e.date));
  const byCat = new Map<string, number>();
  monthExpenses.forEach(e => byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount));
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const biggestLeak = sorted[0];

  // biggest win: paid bills, no overdraft, or growing savings
  const cash = cf.accounts.reduce((s, a) => s + a.balance, 0);
  const timeline = buildTimeline(cash, cf.income, cf.bills, cf.expenses, 30);
  const overdraft = firstOverdraft(timeline);
  const win = !overdraft
    ? "No overdraft predicted in the next 30 days. Keep going!"
    : totalSaved > 0
      ? `You set aside ${formatMoney(totalSaved)} this month for your goals.`
      : "You logged your money — that's the first win.";

  const focus = biggestLeak
    ? `Trim ${biggestLeak[0]} by 25% next month (~${formatMoney(biggestLeak[1] * 0.25)} saved).`
    : "Keep tracking every transaction next month.";

  const net = totalIncome - totalBills - totalSpending - totalSaved;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{now.toLocaleDateString("en", { month: "long", year: "numeric" })} reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Total income" value={`+${formatMoney(totalIncome)}`} tone="pos"/>
          <Row label="Total bills" value={`-${formatMoney(totalBills)}`} tone="neg"/>
          <Row label="Total spending" value={`-${formatMoney(totalSpending)}`} tone="neg"/>
          <Row label="Total saved" value={`+${formatMoney(totalSaved)}`} tone="pos"/>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Net for the month</span>
            <span className={net >= 0 ? "text-success" : "text-destructive"}>{net >= 0 ? "+" : "-"}{formatMoney(Math.abs(net))}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning"/>Biggest money leak</div>
          <p className="mt-1 text-sm">
            {biggestLeak ? <>{biggestLeak[0]} — <span className="font-bold">{formatMoney(biggestLeak[1])}</span></> : "Nothing logged this month."}
          </p>
        </CardContent>
      </Card>

      <Card className="border-success/40 bg-success/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-success"/>Biggest win</div>
          <p className="mt-1 text-sm">{win}</p>
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary"/>Next month's focus</div>
          <p className="mt-1 text-sm">{focus}</p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={() => {
          void fireEvent("monthly.reset", {
            month: now.toLocaleDateString("en", { month: "long", year: "numeric" }),
            total_income: totalIncome,
            total_bills: totalBills,
            total_spending: totalSpending,
            total_saved: totalSaved,
            net: net,
            biggest_leak: biggestLeak ? { category: biggestLeak[0], amount: biggestLeak[1] } : null,
            next_focus: focus,
          });
          toast.success("Monthly reset complete!");
        }}
      >
        <CheckCircle2 className="h-4 w-4 mr-1"/>Mark month complete
      </Button>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

/* ============================================================
   5. NEXT MONTH STRATEGY
   ============================================================ */

function NextMonthStrategy({ cf }: { cf: CashFlow }) {
  const goals = useMemo(() => {
    const out: { title: string; reason: string }[] = [];

    // Goal 1: cap top spending category
    const cutoff = Date.now() - 30 * 86400000;
    const byCat = new Map<string, number>();
    cf.expenses.filter(e => new Date(e.date).getTime() >= cutoff).forEach(e =>
      byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount));
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const cap = Math.floor((top[1] * 0.75) / 10) * 10;
      out.push({
        title: `Keep ${top[0]} spending under ${formatMoney(cap)}`,
        reason: `You spent ${formatMoney(top[1])} on ${top[0]} last month. A 25% trim gets you here.`,
      });
    }

    // Goal 2: cancel an unused subscription
    const subs = cf.expenses.filter(e => e.category === "Subscriptions" && new Date(e.date).getTime() >= cutoff);
    if (subs.length > 0) {
      const subTotal = subs.reduce((s, e) => s + e.amount, 0);
      out.push({
        title: "Cancel one unused subscription",
        reason: `${subs.length} subscriptions cost you ${formatMoney(subTotal)} this month. Pick one you barely use.`,
      });
    }

    // Goal 3: highest-interest debt
    const worstDebt = [...cf.debts].sort((a, b) => b.interest_rate - a.interest_rate)[0];
    if (worstDebt && worstDebt.interest_rate > 0) {
      out.push({
        title: `Pay an extra $50 toward ${worstDebt.name}`,
        reason: `${worstDebt.name} is your highest rate at ${worstDebt.interest_rate}% APR. Extra payments crush it fastest.`,
      });
    }

    // Fallback / additional goals
    if (out.length < 3) {
      const cash = cf.accounts.reduce((s, a) => s + a.balance, 0);
      const safe = calcSafeToSpend(cash, cf.income, cf.bills, 0, 0);
      if (safe.amount < 100) {
        out.push({
          title: "Build a $100 mini buffer",
          reason: "A small buffer prevents overdraft fees that drain you each month.",
        });
      }
    }
    if (out.length < 3) {
      out.push({
        title: "Log every transaction for 7 days straight",
        reason: "Awareness is the easiest way to cut spending without budgeting.",
      });
    }
    if (out.length < 3) {
      out.push({
        title: "Move $25 to savings on payday",
        reason: "Automating a tiny transfer turns into hundreds over a year.",
      });
    }

    return out.slice(0, 3);
  }, [cf]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4"/>Next month strategy</CardTitle>
        <p className="text-xs text-muted-foreground">3 simple goals based on your numbers.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((g, i) => (
          <div key={i} className="rounded-lg border p-3 flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{i + 1}</div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{g.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.reason}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0 self-center"/>
          </div>
        ))}
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          Powered by your last 30 days of activity <ChevronRight className="h-3 w-3"/>
        </p>
      </CardContent>
    </Card>
  );
}
