import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Calendar, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMoney, daysUntil } from "@/lib/cashflow-types";
import type { CashFlow } from "@/hooks/useCashFlow";

export default function TodaysMoney({ cf }: { cf: CashFlow }) {
  const totalCash = cf.accounts.reduce((s, a) => s + a.balance, 0);
  const upcoming = [...cf.bills]
    .filter(b => !b.paid)
    .sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));
  const next7Bills = upcoming.filter(b => daysUntil(b.due_date) <= 7);
  const next7Total = next7Bills.reduce((s, b) => s + b.amount, 0);
  const next7Income = cf.income
    .filter(i => daysUntil(i.next_date) <= 7 && daysUntil(i.next_date) >= 0)
    .reduce((s, i) => s + i.amount, 0);
  const safeToSpend = totalCash + next7Income - next7Total;

  const status =
    safeToSpend < 0 ? { label: "Overdraft risk", color: "destructive" as const, icon: AlertTriangle }
    : safeToSpend < 50 ? { label: "Tight week", color: "warning" as const, icon: AlertTriangle }
    : { label: "You're okay", color: "success" as const, icon: CheckCircle2 };

  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <Card className="border-2">
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Cash on hand</p>
            <p className="text-4xl font-bold font-heading">{formatMoney(totalCash)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Coming in (7d)</p>
              <p className="text-lg font-semibold text-success">+{formatMoney(next7Income)}</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Going out (7d)</p>
              <p className="text-lg font-semibold text-destructive">-{formatMoney(next7Total)}</p>
            </div>
          </div>
          <div className={`rounded-lg p-4 flex items-center gap-3 ${
            status.color === "destructive" ? "bg-destructive/10 text-destructive"
            : status.color === "warning" ? "bg-warning/15 text-warning"
            : "bg-success/10 text-success"}`}>
            <StatusIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">Safe to spend this week</p>
              <p className="text-2xl font-bold">{formatMoney(safeToSpend)}</p>
              <p className="text-xs opacity-80">{status.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AccountsCard cf={cf} />
      <IncomeCard cf={cf} />
      <UpcomingBillsCard cf={cf} bills={upcoming} />
    </div>
  );
}

function AccountsCard({ cf }: { cf: CashFlow }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5"/>Accounts</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {cf.accounts.map(a => (
          <div key={a.id} className="flex items-center gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{a.name}</p>
              <Input
                type="number" inputMode="decimal" value={a.balance}
                onChange={e => cf.updateAccount(a.id, { balance: parseFloat(e.target.value) || 0 })}
                className="h-9 mt-1"
              />
            </div>
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

function IncomeCard({ cf }: { cf: CashFlow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5"/>Income</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {cf.income.map(i => {
          const d = daysUntil(i.next_date);
          return (
            <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{i.name}</p>
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
            <Input placeholder="Income name" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => {
                if (!name || !amount) return;
                cf.addIncome({ name, amount: parseFloat(amount), frequency: "biweekly", next_date: date });
                setName(""); setAmount(""); setOpen(false);
              }}>Add</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add income</Button>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingBillsCard({ cf, bills }: { cf: CashFlow; bills: ReturnType<typeof Array.prototype.slice> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [essential, setEssential] = useState(true);
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5"/>Upcoming bills</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {bills.length === 0 && <p className="text-sm text-muted-foreground">No bills tracked yet.</p>}
        {bills.map((b: any) => {
          const d = daysUntil(b.due_date);
          const urgent = d <= 3;
          return (
            <div key={b.id} className={`flex items-center justify-between rounded-lg border p-3 ${urgent ? "border-destructive/40 bg-destructive/5" : ""}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{b.name}</p>
                  {!b.is_essential && <Badge variant="outline" className="text-[10px]">optional</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {d === 0 ? "Due today" : d < 0 ? `${-d}d overdue` : `Due in ${d}d`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatMoney(b.amount)}</span>
                <Button size="icon" variant="ghost" onClick={() => cf.removeBill(b.id)}><Trash2 className="h-4 w-4"/></Button>
              </div>
            </div>
          );
        })}
        {open ? (
          <div className="space-y-2 pt-2 border-t">
            <Input placeholder="Bill name" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input id="ess" type="checkbox" checked={essential} onChange={e => setEssential(e.target.checked)} />
              <Label htmlFor="ess">Essential bill</Label>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => {
                if (!name || !amount) return;
                cf.addBill({ name, amount: parseFloat(amount), due_date: date, frequency: "monthly", is_essential: essential });
                setName(""); setAmount(""); setOpen(false);
              }}>Add</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add bill</Button>
        )}
      </CardContent>
    </Card>
  );
}
