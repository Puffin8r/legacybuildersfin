import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { InvestmentAccount } from "@/lib/financial-calculations";
import { formatCurrency, calcFutureValue } from "@/lib/financial-calculations";
import { Plus, Trash2, Briefcase } from "lucide-react";

interface Props {
  accounts: InvestmentAccount[];
  onChange: (accounts: InvestmentAccount[]) => void;
  yearsToRetirement: number;
}

export default function InvestmentAccounts({ accounts, onChange, yearsToRetirement }: Props) {
  const [newName, setNewName] = useState("");

  const addAccount = () => {
    const name = newName.trim() || "New Account";
    onChange([
      ...accounts,
      { id: crypto.randomUUID(), name, balance: 0, interestRate: 8 },
    ]);
    setNewName("");
  };

  const removeAccount = (id: string) => onChange(accounts.filter((a) => a.id !== id));

  const updateAccount = (id: string, field: keyof InvestmentAccount, value: string | number) => {
    onChange(accounts.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  return (
    <div className="metric-card space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Investment Accounts
      </h2>
      <div className="space-y-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Input
                value={a.name}
                onChange={(e) => updateAccount(a.id, "name", e.target.value)}
                className="font-semibold max-w-[200px] border-none bg-transparent p-0 h-auto text-base"
              />
              <Button variant="ghost" size="icon" onClick={() => removeAccount(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Balance</Label>
                <Input
                  type="number"
                  value={a.balance}
                  onChange={(e) => updateAccount(a.id, "balance", Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={a.interestRate}
                  onChange={(e) => updateAccount(a.id, "interestRate", Number(e.target.value))}
                  min={0}
                  max={30}
                  step={0.5}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Projected in {yearsToRetirement} yrs:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(calcFutureValue(a.balance, 0, a.interestRate, yearsToRetirement))}
              </span>
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Account name (e.g. 401k)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAccount()}
        />
        <Button onClick={addAccount} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
