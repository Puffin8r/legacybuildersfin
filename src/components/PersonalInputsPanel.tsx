import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { PersonalInputs } from "@/lib/financial-calculations";
import { User, DollarSign, TrendingUp, Shield } from "lucide-react";

interface Props {
  inputs: PersonalInputs;
  onChange: (inputs: PersonalInputs) => void;
}

const fields: {
  key: keyof PersonalInputs;
  label: string;
  icon: typeof User;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}[] = [
  { key: "age", label: "Age", icon: User, min: 18, max: 80, step: 1 },
  { key: "retirementAge", label: "Retirement Age", icon: User, min: 30, max: 90, step: 1 },
  { key: "monthlyIncome", label: "Monthly Income", icon: DollarSign, min: 0, max: 50000, step: 500, prefix: "$" },
  { key: "currentSavings", label: "Current Savings", icon: DollarSign, min: 0, max: 2000000, step: 5000, prefix: "$" },
  { key: "monthlyContributions", label: "Monthly Contributions", icon: DollarSign, min: 0, max: 10000, step: 100, prefix: "$" },
  { key: "expectedReturn", label: "Expected Annual Return", icon: TrendingUp, min: 0, max: 20, step: 0.5, suffix: "%" },
  { key: "inflationRate", label: "Inflation Rate", icon: TrendingUp, min: 0, max: 10, step: 0.5, suffix: "%" },
  { key: "yearsIncomeProtection", label: "Years of Income Protection", icon: Shield, min: 1, max: 30, step: 1 },
];

export default function PersonalInputsPanel({ inputs, onChange }: Props) {
  const update = (key: keyof PersonalInputs, value: number) => {
    onChange({ ...inputs, [key]: value });
  };

  return (
    <div className="metric-card space-y-5">
      <h2 className="section-title flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Personal Financial Inputs
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={inputs[f.key]}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  className="font-medium"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                />
                <span className="text-xs text-muted-foreground w-6 shrink-0">
                  {f.suffix || ""}
                </span>
              </div>
              <Slider
                value={[inputs[f.key]]}
                min={f.min}
                max={f.max}
                step={f.step}
                onValueChange={([v]) => update(f.key, v)}
                className="pt-1"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
