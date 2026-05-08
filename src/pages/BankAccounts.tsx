import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, RefreshCw, Plus, Trash2, AlertCircle, Link2, CheckCircle2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCashFlow } from "@/hooks/useCashFlow";
import {
  loadAccounts, saveAccounts, connectAccount, removeAccount,
  syncAccount, applyPlaidTransactions,
} from "@/lib/bank-service";
import { ACCOUNT_TYPE_LABEL, type BankAccount, type BankAccountSubtype } from "@/lib/bank-types";
import { formatMoney } from "@/lib/cashflow-types";
import { fireEvent } from "@/lib/integrations";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function timeAgo(iso?: string) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>(() => loadAccounts());
  const [syncing, setSyncing] = useState(false);
  const cf = useCashFlow();

  const lastSync = useMemo(() => {
    const dates = accounts.map(a => a.last_synced_at).filter(Boolean) as string[];
    if (!dates.length) return undefined;
    return dates.sort().reverse()[0];
  }, [accounts]);

  const refreshAll = async () => {
    if (!accounts.length) { toast.info("Connect an account first"); return; }
    setSyncing(true);
    let totalAdded = 0;
    const updated: BankAccount[] = [];
    for (const a of accounts) {
      const { account, txns } = syncAccount(a);
      updated.push(account);
      const res = applyPlaidTransactions(
        txns, [account], cf.goals as any,
        (e) => cf.addExpense(e),
        (goalId, amount) => {
          const g = cf.goals.find(x => x.id === goalId);
          if (g) cf.updateGoal(goalId, { current_amount: g.current_amount + amount });
        },
      );
      totalAdded += res.added;
      if (res.savingsDeposits.length) {
        fireEvent("transaction.added", { kind: "savings_deposit", deposits: res.savingsDeposits });
      }
    }
    setAccounts(updated);
    setSyncing(false);
    toast.success(`Synced ${updated.length} account${updated.length > 1 ? "s" : ""} · ${totalAdded} new transaction${totalAdded === 1 ? "" : "s"}`);
  };

  const onConnected = (a: BankAccount) => {
    setAccounts(loadAccounts());
    toast.success(`Connected ${a.institution_name} · ${a.account_name}`);
  };

  const onRemove = (id: string) => {
    removeAccount(id);
    setAccounts(loadAccounts());
    toast.success("Account removed");
  };

  const linkGoalToAccount = (goalId: string, bankAccountId: string | null) => {
    cf.updateGoal(goalId, { linked_bank_account_id: bankAccountId ?? undefined } as any);
    toast.success(bankAccountId ? "Goal linked to account" : "Goal unlinked");
  };

  const savingsAccounts = accounts.filter(a => a.account_subtype === "savings");

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b">
        <div className="px-4 py-4 max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 rounded-md hover:bg-accent text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold font-heading leading-tight">Bank Accounts</h1>
            <p className="text-xs text-muted-foreground truncate">Last updated: {timeAgo(lastSync)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={refreshAll} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto space-y-4">
        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Bank data may not update instantly. Some banks take several hours or up to a day to show finalized transactions.</p>
        </div>

        <ConnectDialog onConnected={onConnected} />

        {accounts.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-semibold">No accounts connected</p>
              <p className="text-xs text-muted-foreground">
                You can still add transactions manually or upload a CSV from <Link to="/settings" className="underline">Settings</Link>.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {accounts.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight truncate">{a.account_name}</p>
                    <p className="text-xs text-muted-foreground">{a.institution_name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{ACCOUNT_TYPE_LABEL[a.account_subtype]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Current</p>
                    <p className="text-lg font-bold tabular-nums">{formatMoney(a.current_balance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Available</p>
                    <p className="text-lg font-bold tabular-nums">{formatMoney(a.available_balance)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground">Synced {timeAgo(a.last_synced_at)}</p>
                  <Button variant="ghost" size="sm" onClick={() => onRemove(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {cf.goals.length > 0 && savingsAccounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Link savings goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">When money is deposited into a linked savings account, the goal progress updates automatically.</p>
              {cf.goals.map(g => {
                const linkedId = (g as any).linked_bank_account_id as string | undefined;
                const acct = savingsAccounts.find(a => a.id === linkedId);
                const progress = acct
                  ? Math.min(100, Math.round((acct.current_balance / g.target_amount) * 100))
                  : Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                return (
                  <div key={g.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{g.name}</p>
                      <p className="text-xs tabular-nums">{progress}% · {formatMoney(acct?.current_balance ?? g.current_amount)} / {formatMoney(g.target_amount)}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <Select value={linkedId ?? "none"} onValueChange={v => linkGoalToAccount(g.id, v === "none" ? null : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Link account" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not linked</SelectItem>
                        {savingsAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.institution_name} · {a.account_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> No bank? No problem.</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>If you skip the bank connection, you can still:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Add transactions by hand on the Spending tab</li>
              <li>Upload a CSV file from <Link to="/settings" className="underline">Settings → Bank Connection</Link></li>
              <li>Use Demo data to explore every feature</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/* ---------------- Connect dialog ---------------- */

function ConnectDialog({ onConnected }: { onConnected: (a: BankAccount) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    institution_name: string;
    account_name: string;
    subtype: BankAccountSubtype;
    current_balance: string;
  }>({ institution_name: "", account_name: "", subtype: "checking", current_balance: "" });

  const submit = () => {
    if (!form.institution_name || !form.account_name) {
      toast.error("Institution and account name are required"); return;
    }
    const a = connectAccount({
      institution_name: form.institution_name,
      account_name: form.account_name,
      subtype: form.subtype,
      current_balance: parseFloat(form.current_balance) || 0,
    });
    onConnected(a);
    setOpen(false);
    setForm({ institution_name: "", account_name: "", subtype: "checking", current_balance: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full"><Plus className="h-4 w-4 mr-1" /> Connect bank account</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect an account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 text-xs flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p>Plaid Link will replace this form once enabled. The same data shape is stored either way.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Institution</Label>
            <Input placeholder="Chase, Ally, Capital One…" value={form.institution_name}
              onChange={e => setForm({ ...form, institution_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account name</Label>
            <Input placeholder="Everyday Checking" value={form.account_name}
              onChange={e => setForm({ ...form, account_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={form.subtype} onValueChange={(v: BankAccountSubtype) => setForm({ ...form, subtype: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="credit card">Credit card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Current balance</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={form.current_balance}
              onChange={e => setForm({ ...form, current_balance: e.target.value })} />
          </div>
          <Button className="w-full" onClick={submit}>Connect</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
