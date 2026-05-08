import { useMemo, useState, useDeferredValue } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { PiggyBank, Target, Sparkles, TrendingUp } from "lucide-react";
import { formatCurrency, calcProjectionData } from "@/lib/financial-calculations";

// 2025 IRS Roth IRA contribution limits
const ROTH_LIMIT_UNDER_50 = 7000;
const ROTH_LIMIT_50_PLUS = 8000; // includes $1,000 catch-up

interface Inputs {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  desiredMonthlyIncome: number;
  expectedReturn: number;
  inflationRate: number;
  currentRothMonthly: number;
}

const defaults: Inputs = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 25000,
  desiredMonthlyIncome: 8000,
  expectedReturn: 9,
  inflationRate: 3,
  currentRothMonthly: 300,
};

function requiredMonthly(target: number, present: number, annualRate: number, years: number): number {
  const months = Math.max(years * 12, 1);
  const r = annualRate / 100 / 12;
  const growth = Math.pow(1 + r, months);
  const fvOfPresent = present * growth;
  const need = target - fvOfPresent;
  if (need <= 0) return 0;
  if (r === 0) return need / months;
  return (need * r) / (growth - 1);
}

function yearsToTarget(target: number, present: number, monthly: number, annualRate: number): number {
  const r = annualRate / 100 / 12;
  if (monthly <= 0 && present >= target) return 0;
  if (monthly <= 0) return Infinity;
  // Iterate month by month (cheap, max ~600)
  let bal = present;
  for (let m = 1; m <= 12 * 80; m++) {
    bal = bal * (1 + r) + monthly;
    if (bal >= target) return m / 12;
  }
  return Infinity;
}

export default function RetirementIncomePlanner() {
  const [inputs, setInputs] = useState<Inputs>(defaults);
  const deferred = useDeferredValue(inputs);
  const set = <K extends keyof Inputs>(k: K, v: number) => setInputs(p => ({ ...p, [k]: v }));

  const yearsToRetire = Math.max(deferred.retirementAge - deferred.currentAge, 1);
  const desiredAnnual = deferred.desiredMonthlyIncome * 12;

  // Inflation: desired income is in today's dollars. Future nominal target grows with inflation.
  const inflationRate = Math.max(deferred.inflationRate, 0);
  const inflationFactor = Math.pow(1 + inflationRate / 100, yearsToRetire);
  const requiredPortfolioToday = desiredAnnual / 0.04;
  const requiredPortfolio = requiredPortfolioToday * inflationFactor; // nominal target at retirement

  const monthlyNeeded = useMemo(
    () => requiredMonthly(requiredPortfolio, deferred.currentSavings, deferred.expectedReturn, yearsToRetire),
    [requiredPortfolio, deferred.currentSavings, deferred.expectedReturn, yearsToRetire],
  );
  const roundedNeeded = Math.ceil(monthlyNeeded / 5) * 5;

  const progressPct = requiredPortfolio > 0
    ? Math.min(100, (deferred.currentSavings / requiredPortfolio) * 100) : 0;
  const remaining = Math.max(requiredPortfolio - deferred.currentSavings, 0);

  // Slider for "what if I contribute X/month"
  const [whatIf, setWhatIf] = useState(roundedNeeded || 500);
  const projectionRaw = useMemo(
    () => calcProjectionData(deferred.currentSavings, whatIf, deferred.expectedReturn, yearsToRetire),
    [deferred.currentSavings, whatIf, deferred.expectedReturn, yearsToRetire],
  );
  // Add today's-dollar (real) value alongside nominal
  const projection = useMemo(
    () => projectionRaw.map(p => ({
      ...p,
      real: p.value / Math.pow(1 + inflationRate / 100, p.year),
    })),
    [projectionRaw, inflationRate],
  );
  const projectedFinal = projection[projection.length - 1]?.value ?? 0;
  const projectedFinalReal = projection[projection.length - 1]?.real ?? 0;
  const projectedMonthlyIncome = (projectedFinal * 0.04) / 12;
  const projectedMonthlyIncomeReal = (projectedFinalReal * 0.04) / 12;

  // Milestones at fixed ages between current and retirement
  const milestoneAges = useMemo(() => {
    const ages: number[] = [];
    const start = deferred.currentAge;
    const end = deferred.retirementAge;
    [35, 45, 55, 65].forEach(a => { if (a > start && a <= end) ages.push(a); });
    if (!ages.includes(end)) ages.push(end);
    return ages;
  }, [deferred.currentAge, deferred.retirementAge]);

  const milestones = milestoneAges.map(age => {
    const yrs = age - deferred.currentAge;
    const idx = Math.min(yrs, projection.length - 1);
    return {
      age,
      value: projection[idx]?.value ?? 0,
      real: projection[idx]?.real ?? 0,
    };
  });

  // Roth IRA helper — limit depends on age
  const rothLimit = deferred.currentAge >= 50 ? ROTH_LIMIT_50_PLUS : ROTH_LIMIT_UNDER_50;
  const recommendedRothMonthly = Math.round(rothLimit / 12);
  const currentRothAnnual = Math.max(deferred.currentRothMonthly, 0) * 12;
  const cappedRothAnnual = Math.min(currentRothAnnual, rothLimit);
  const rothPct = rothLimit > 0 ? Math.min(100, (cappedRothAnnual / rothLimit) * 100) : 0;
  const remainingRothAnnual = Math.max(rothLimit - currentRothAnnual, 0);
  const remainingRothMonthly = Math.max(0, Math.round((remainingRothAnnual / 12) * 100) / 100);
  const overageAnnual = Math.max(currentRothAnnual - rothLimit, 0);
  const isMaxingRoth = currentRothAnnual >= rothLimit && currentRothAnnual <= rothLimit + 1;
  const isOverContributing = currentRothAnnual > rothLimit;

  // Insights
  const yearsAtBoosted = yearsToTarget(requiredPortfolio, deferred.currentSavings, whatIf + 150, deferred.expectedReturn);
  const yearsEarlier = Math.max(0, yearsToRetire - yearsAtBoosted);

  const insights: string[] = [];
  insights.push(`You are currently ${progressPct.toFixed(1)}% toward your retirement target.`);
  if (yearsEarlier > 0.5 && Number.isFinite(yearsAtBoosted)) {
    insights.push(`Increasing contributions by $150/month could allow you to retire ${yearsEarlier.toFixed(1)} years earlier.`);
  }
  insights.push(`At a ${deferred.expectedReturn}% return, your investments could generate approximately ${formatCurrency(projectedMonthlyIncome)}/month (about ${formatCurrency(projectedMonthlyIncomeReal)}/mo in today's dollars after ${inflationRate}% inflation).`);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
        <CardContent className="p-5 text-center space-y-1">
          <p className="text-xs uppercase tracking-wide text-accent font-semibold">Retirement Income Planner</p>
          <p className="text-sm text-muted-foreground">Your investments could pay you</p>
          <p className="text-4xl font-bold font-heading">
            {formatCurrency(projectedMonthlyIncome)}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-xs text-muted-foreground">
            in retirement at {deferred.expectedReturn}% return, contributing {formatCurrency(whatIf)}/mo.
          </p>
          {inflationRate > 0 && (
            <p className="text-xs text-accent font-medium">
              ≈ {formatCurrency(projectedMonthlyIncomeReal)}/mo in today's dollars (after {inflationRate}% inflation)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Inputs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Your retirement inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current age" value={inputs.currentAge} onChange={v => set("currentAge", v)} />
            <Field label="Retirement age" value={inputs.retirementAge} onChange={v => set("retirementAge", v)} />
            <Field label="Current savings" value={inputs.currentSavings} onChange={v => set("currentSavings", v)} prefix="$" />
            <Field label="Desired monthly income" value={inputs.desiredMonthlyIncome} onChange={v => set("desiredMonthlyIncome", v)} prefix="$" />
            <Field label="Expected return" value={inputs.expectedReturn} onChange={v => set("expectedReturn", v)} suffix="%" />
            <Field label="Inflation (optional)" value={inputs.inflationRate} onChange={v => set("inflationRate", v)} suffix="%" />
          </div>
        </CardContent>
      </Card>

      {/* Required portfolio + monthly */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5"/>Required portfolio</div>
            <p className="text-lg font-bold font-heading mt-1 leading-tight">{formatCurrency(requiredPortfolio)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatCurrency(desiredAnnual)}/yr ÷ 4%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5"/>Required monthly</div>
            <p className="text-lg font-bold font-heading mt-1 leading-tight">{formatCurrency(roundedNeeded)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Until age {deferred.retirementAge}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-accent/5 border-accent/30">
        <CardContent className="p-4 text-sm">
          To generate approximately <strong>{formatCurrency(deferred.desiredMonthlyIncome)}/month</strong> in retirement income,
          you would need an estimated portfolio of <strong>{formatCurrency(requiredPortfolio)}</strong>.
          Assuming a {deferred.expectedReturn}% annual return, you would need to invest approximately{" "}
          <strong>{formatCurrency(roundedNeeded)}/month</strong> until age {deferred.retirementAge}.
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Progress toward retirement goal</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold">{formatCurrency(deferred.currentSavings)}</span>
            <span className="text-muted-foreground">/ {formatCurrency(requiredPortfolio)}</span>
          </div>
          <Progress value={progressPct} className="h-3"/>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPct.toFixed(1)}% complete</span>
            <span>{formatCurrency(remaining)} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Contribution slider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly contribution impact</CardTitle>
          <p className="text-xs text-muted-foreground">Slide to see how contributions change your retirement income.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold font-heading">{formatCurrency(whatIf)}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
            <span className="text-sm text-muted-foreground">→ {formatCurrency(projectedMonthlyIncome)}/mo income</span>
          </div>
          <Slider
            value={[whatIf]}
            onValueChange={([v]) => setWhatIf(v)}
            min={0}
            max={Math.max(3000, roundedNeeded * 2)}
            step={25}
          />
        </CardContent>
      </Card>

      {/* Growth projection chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Retirement growth projection</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="rip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={y => `${deferred.currentAge + Number(y)}`} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={50}/>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={y => `Age ${deferred.currentAge + Number(y)}`}
                />
                <ReferenceLine y={requiredPortfolio} stroke="hsl(var(--primary))" strokeDasharray="4 4"
                  label={{ value: "Goal", position: "right", fill: "hsl(var(--primary))", fontSize: 10 }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fill="url(#rip)"
                  strokeWidth={2} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Timeline milestones</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {milestones.map(m => (
              <div key={m.age} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Age {m.age}</p>
                <p className="text-base font-bold font-heading">{formatCurrency(m.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-primary/5 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary"/>Coach insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.map((i, idx) => (
            <p key={idx} className="text-sm">• {i}</p>
          ))}
        </CardContent>
      </Card>

      {/* Roth IRA helper */}
      <Card className="border-accent/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><PiggyBank className="h-4 w-4 text-accent"/>Roth IRA helper</CardTitle>
          <p className="text-xs text-muted-foreground">
            2025 yearly limit ({deferred.currentAge >= 50 ? "age 50+" : "under 50"}): {formatCurrency(rothLimit)}
            {deferred.currentAge >= 50 && <span className="ml-1">(includes $1,000 catch-up)</span>}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your Roth contribution" value={inputs.currentRothMonthly} onChange={v => set("currentRothMonthly", v)} prefix="$" suffix="/mo" />
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Recommended (max)</p>
              <p className="text-base font-bold font-heading">{formatCurrency(recommendedRothMonthly)}/mo</p>
            </div>
          </div>
          <Progress value={rothPct} className="h-2" />
          <div className="rounded-lg bg-background/70 border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currently contributing</span>
              <span className="font-semibold">{formatCurrency(deferred.currentRothMonthly)}/mo ({formatCurrency(currentRothAnnual)}/yr)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-semibold ${isOverContributing ? "text-destructive" : isMaxingRoth ? "text-success" : "text-accent"}`}>
                {isOverContributing
                  ? `Over by ${formatCurrency(overageAnnual)}/yr`
                  : isMaxingRoth
                    ? "Maxing it out 🎉"
                    : `${rothPct.toFixed(0)}% of limit`}
              </span>
            </div>
            {!isMaxingRoth && !isOverContributing && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Additional room</span>
                <span className="font-semibold">{formatCurrency(remainingRothMonthly)}/mo ({formatCurrency(remainingRothAnnual)}/yr)</span>
              </div>
            )}
            {isOverContributing && (
              <p className="text-xs text-destructive pt-1">
                You're contributing over the IRS limit — excess contributions may incur a 6% penalty per year until withdrawn.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, prefix, suffix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`${prefix ? "pl-6" : ""} ${suffix ? "pr-10" : ""}`}/>
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
