import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, Plus, Wallet, Banknote, Receipt, ShoppingBag, RotateCcw, Sparkles } from "lucide-react";
import type { CashFlow } from "@/hooks/useCashFlow";
import { markOnboardingDone } from "@/components/onboarding/OnboardingDialog";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};

export default function ManageDataSheet({
  open, onOpenChange, cf, onReplay,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cf: CashFlow;
  onReplay: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto p-0">
        <SheetHeader className="p-4 border-b sticky top-0 bg-card z-10">
          <SheetTitle className="text-lg font-heading">Manage my money</SheetTitle>
          <SheetDescription className="text-xs">Edit or remove anything you entered.</SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <Tabs defaultValue="cash">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="cash" className="text-xs"><Wallet className="h-3.5 w-3.5 mr-1" />Cash</TabsTrigger>
              <TabsTrigger value="income" className="text-xs"><Banknote className="h-3.5 w-3.5 mr-1" />Pay</TabsTrigger>
              <TabsTrigger value="bills" className="text-xs"><Receipt className="h-3.5 w-3.5 mr-1" />Bills</TabsTrigger>
              <TabsTrigger value="spend" className="text-xs"><ShoppingBag className="h-3.5 w-3.5 mr-1" />Spend</TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="mt-4 space-y-3">
              <CashEditor cf={cf} />
            </TabsContent>
            <TabsContent value="income" className="mt-4 space-y-3">
              <IncomeEditor cf={cf} />
            </TabsContent>
            <TabsContent value="bills" className="mt-4 space-y-3">
              <BillsEditor cf={cf} />
            </TabsContent>
            <TabsContent value="spend" className="mt-4 space-y-3">
              <SpendEditor cf={cf} />
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => { onOpenChange(false); onReplay(); }}>
              <Sparkles className="h-4 w-4 mr-2" /> Replay 5-step setup
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Clear all your money data? This cannot be undone.")) {
                  cf.clearAll();
                  markOnboardingDone();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Clear everything
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                if (confirm("Reset to demo data?")) cf.resetAll();
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reset to demo data
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border p-3 bg-card space-y-2">{children}</div>;
}

function CashEditor({ cf }: { cf: CashFlow }) {
  const [name, setName] = useState("Savings");
  const [bal, setBal] = useState("");
  return (
    <>
      {cf.accounts.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet.</p>}
      {cf.accounts.map(a => (
        <Row key={a.id}>
          <div className="flex items-center gap-2">
            <Input value={a.name} onChange={e => cf.updateAccount(a.id, { name: e.target.value })} className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => cf.removeAccount(a.id)} aria-label="Remove">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div>
            <Label className="text-xs">Balance ($)</Label>
            <Input type="number" inputMode="decimal" value={a.balance}
              onChange={e => cf.updateAccount(a.id, { balance: parseFloat(e.target.value) || 0 })} />
          </div>
        </Row>
      ))}
      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <Label className="text-xs">Add account</Label>
        <Input placeholder="Name (e.g. Savings)" value={name} onChange={e => setName(e.target.value)} />
        <Input type="number" inputMode="decimal" placeholder="Starting balance" value={bal} onChange={e => setBal(e.target.value)} />
        <Button size="sm" className="w-full" onClick={() => {
          if (!bal && !name) return;
          cf.addAccount({ name: name || "Account", balance: parseFloat(bal) || 0 });
          setName("Savings"); setBal("");
        }}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </>
  );
}

function IncomeEditor({ cf }: { cf: CashFlow }) {
  const [name, setName] = useState("Paycheck");
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState(inDays(7));
  return (
    <>
      {cf.income.length === 0 && <p className="text-sm text-muted-foreground">No income added.</p>}
      {cf.income.map(i => (
        <Row key={i.id}>
          <div className="flex items-center gap-2">
            <Input value={i.name} onChange={e => cf.updateIncome(i.id, { name: e.target.value })} className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => cf.removeIncome(i.id)} aria-label="Remove">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" inputMode="decimal" value={i.amount}
                onChange={e => cf.updateIncome(i.id, { amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Next date</Label>
              <Input type="date" value={i.next_date}
                onChange={e => cf.updateIncome(i.id, { next_date: e.target.value })} />
            </div>
          </div>
        </Row>
      ))}
      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <Label className="text-xs">Add paycheck</Label>
        <Input placeholder="Source" value={name} onChange={e => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="decimal" placeholder="Amount" value={amt} onChange={e => setAmt(e.target.value)} />
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <Button size="sm" className="w-full" onClick={() => {
          if (!amt) return;
          cf.addIncome({ name: name || "Paycheck", amount: parseFloat(amt) || 0, frequency: "biweekly", next_date: date });
          setAmt("");
        }}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </>
  );
}

function BillsEditor({ cf }: { cf: CashFlow }) {
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState(inDays(10));
  return (
    <>
      {cf.bills.length === 0 && <p className="text-sm text-muted-foreground">No bills added.</p>}
      {cf.bills.map(b => (
        <Row key={b.id}>
          <div className="flex items-center gap-2">
            <Input value={b.name} onChange={e => cf.updateBill(b.id, { name: e.target.value })} className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => cf.removeBill(b.id)} aria-label="Remove">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" inputMode="decimal" value={b.amount}
                onChange={e => cf.updateBill(b.id, { amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={b.due_date}
                onChange={e => cf.updateBill(b.id, { due_date: e.target.value })} />
            </div>
          </div>
        </Row>
      ))}
      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <Label className="text-xs">Add bill</Label>
        <Input placeholder="Name (e.g. Rent)" value={name} onChange={e => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="decimal" placeholder="Amount" value={amt} onChange={e => setAmt(e.target.value)} />
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <Button size="sm" className="w-full" onClick={() => {
          if (!amt) return;
          cf.addBill({ name: name || "Bill", amount: parseFloat(amt) || 0, due_date: date, frequency: "monthly", is_essential: true });
          setName(""); setAmt("");
        }}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </>
  );
}

function SpendEditor({ cf }: { cf: CashFlow }) {
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  return (
    <>
      {cf.expenses.length === 0 && <p className="text-sm text-muted-foreground">No spending recorded.</p>}
      {cf.expenses.map(e => (
        <Row key={e.id}>
          <div className="flex items-center gap-2">
            <Input value={e.description} onChange={ev => cf.updateExpense(e.id, { description: ev.target.value, merchant: ev.target.value })} className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => cf.removeExpense(e.id)} aria-label="Remove">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" inputMode="decimal" value={e.amount}
                onChange={ev => cf.updateExpense(e.id, { amount: parseFloat(ev.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={e.date}
                onChange={ev => cf.updateExpense(e.id, { date: ev.target.value })} />
            </div>
          </div>
        </Row>
      ))}
      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <Label className="text-xs">Add purchase</Label>
        <Input placeholder="What was it? (e.g. Groceries)" value={desc} onChange={e => setDesc(e.target.value)} />
        <Input type="number" inputMode="decimal" placeholder="Amount" value={amt} onChange={e => setAmt(e.target.value)} />
        <Button size="sm" className="w-full" onClick={() => {
          if (!amt) return;
          cf.addExpense({ description: desc || "Purchase", merchant: desc || "Purchase", amount: parseFloat(amt) || 0, category: "Food", date: today() });
          setDesc(""); setAmt("");
        }}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </>
  );
}
