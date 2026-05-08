import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Wallet, Banknote, Receipt, ShoppingBag, LineChart, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import type { CashFlow } from "@/hooks/useCashFlow";

const KEY = "cashflow-onboarding-v1";

export function shouldShowOnboarding() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "done";
}
export function markOnboardingDone() {
  try { localStorage.setItem(KEY, "done"); } catch { /* ignore */ }
}

const STEPS = [
  { icon: Wallet,     title: "Money on hand",     subtitle: "Step 1 of 5" },
  { icon: Banknote,   title: "Money coming in",   subtitle: "Step 2 of 5" },
  { icon: Receipt,    title: "Money going out",   subtitle: "Step 3 of 5" },
  { icon: ShoppingBag,title: "Recent spending",   subtitle: "Step 4 of 5" },
  { icon: LineChart,  title: "Your 30-day flow",  subtitle: "Step 5 of 5" },
];

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};

export default function OnboardingDialog({
  open, onClose, cf, onFinish,
}: { open: boolean; onClose: () => void; cf: CashFlow; onFinish: () => void }) {
  const [step, setStep] = useState(0);

  // Step 1
  const [cash, setCash] = useState("");

  // Step 2
  const [payName, setPayName] = useState("Paycheck");
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(inDays(7));

  // Step 3
  const [billName, setBillName] = useState("Rent");
  const [billAmt, setBillAmt] = useState("");
  const [billDate, setBillDate] = useState(inDays(10));

  // Step 4
  const [spendDesc, setSpendDesc] = useState("Groceries");
  const [spendAmt, setSpendAmt] = useState("");

  const Icon = STEPS[step].icon;

  const next = () => {
    if (step === 0 && cash) {
      // Replace any existing demo "Checking" balance, or add one.
      const checking = cf.accounts.find(a => a.name.toLowerCase().includes("check"));
      if (checking) cf.updateAccount(checking.id, { balance: parseFloat(cash) || 0 });
      else cf.addAccount({ name: "Checking", balance: parseFloat(cash) || 0 });
    }
    if (step === 1 && payAmt) {
      cf.addIncome({ name: payName || "Paycheck", amount: parseFloat(payAmt) || 0, frequency: "biweekly", next_date: payDate });
    }
    if (step === 2 && billAmt) {
      cf.addBill({ name: billName || "Bill", amount: parseFloat(billAmt) || 0, due_date: billDate, frequency: "monthly", is_essential: true });
    }
    if (step === 3 && spendAmt) {
      cf.addExpense({
        description: spendDesc || "Spending", merchant: spendDesc, amount: parseFloat(spendAmt) || 0,
        category: "Food", date: today(),
      });
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const skip = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const finish = () => {
    markOnboardingDone();
    onFinish();
    onClose();
  };

  const back = () => setStep(s => Math.max(0, s - 1));
  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Get started</DialogTitle>
        <DialogDescription className="sr-only">Set up your money in 5 quick steps.</DialogDescription>

        <div className="p-5 pb-3 bg-gradient-to-br from-primary/10 to-secondary/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-card flex items-center justify-center shadow-sm">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{STEPS[step].subtitle}</p>
              <h2 className="text-lg font-bold font-heading leading-tight">{STEPS[step].title}</h2>
            </div>
          </div>
          <Progress value={pct} className="h-1.5 mt-4" />
        </div>

        <div className="p-5 space-y-4 min-h-[220px]">
          {step === 0 && (
            <>
              <p className="text-sm text-muted-foreground">How much cash do you have right now across your checking accounts?</p>
              <div>
                <Label className="text-xs">Current balance</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">$</span>
                  <Input type="number" inputMode="decimal" placeholder="420" value={cash}
                    onChange={e => setCash(e.target.value)} className="pl-8 text-2xl h-14 font-bold font-heading" autoFocus />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Don't worry about being exact — you can update this anytime.</p>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">When does your next paycheck arrive, and how much is it?</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Source</Label>
                  <Input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Paycheck" />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" inputMode="decimal" placeholder="1450" value={payAmt} onChange={e => setPayAmt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Next date</Label>
                  <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">We'll repeat it every 2 weeks. You can change frequency later.</p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Add one upcoming bill so we can predict your safe-to-spend.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Bill name</Label>
                  <Input value={billName} onChange={e => setBillName(e.target.value)} placeholder="Rent" />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" inputMode="decimal" placeholder="950" value={billAmt} onChange={e => setBillAmt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Due date</Label>
                  <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Examples: Rent, Electric, Phone, Car payment.</p>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Add one recent purchase. We'll show you where your money goes.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">What was it?</Label>
                  <Input value={spendDesc} onChange={e => setSpendDesc(e.target.value)} placeholder="Groceries" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" inputMode="decimal" placeholder="64" value={spendAmt} onChange={e => setSpendAmt(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Examples: Groceries $64, Gas $38, Coffee $6.</p>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-semibold">You're all set!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We've built your 30-day cash flow. You'll see paychecks, bills, and your <span className="font-medium text-foreground">safe-to-spend</span> day by day.
              </p>
              <ul className="text-sm space-y-1.5">
                <li className="flex gap-2"><span className="text-primary">•</span><span><b>Today</b> — money in, money out, danger days</span></li>
                <li className="flex gap-2"><span className="text-primary">•</span><span><b>Spending</b> — where it went</span></li>
                <li className="flex gap-2"><span className="text-primary">•</span><span><b>Fix</b> — fix my money</span></li>
                <li className="flex gap-2"><span className="text-primary">•</span><span><b>Future</b> — long-term plan</span></li>
                <li className="flex gap-2"><span className="text-primary">•</span><span><b>Coach</b> — ask anything in plain English</span></li>
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={back} disabled={step === 0} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 && (
              <Button variant="outline" size="sm" onClick={skip}>Skip</Button>
            )}
            <Button size="sm" onClick={next}>
              {step === STEPS.length - 1 ? "View my 30-day flow" : "Next"}
              {step < STEPS.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
