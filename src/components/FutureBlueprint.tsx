import { useState, useMemo, useDeferredValue } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { TrendingUp, Target, Clock, Coins, CalendarCheck } from "lucide-react";
import { calcFIN, calcRuleOf72, calcFutureValue, calcProjectionData, formatCurrency } from "@/lib/financial-calculations";
import { toast } from "sonner";

interface SimpleInputs {
  currentAge: number;
  retirementAge: number;
  monthlyExpenses: number;
  currentInvestments: number;
  monthlyContribution: number;
  expectedReturn: number;
}

const defaults: SimpleInputs = {
  currentAge: 30,
  retirementAge: 65,
  monthlyExpenses: 4000,
  currentInvestments: 25000,
  monthlyContribution: 500,
  expectedReturn: 8,
};

export default function FutureBlueprint() {
  const [inputs, setInputs] = useState<SimpleInputs>(defaults);
  const deferred = useDeferredValue(inputs);

  const yearsToRetire = Math.max(deferred.retirementAge - deferred.currentAge, 1);
  const annualExpenses = deferred.monthlyExpenses * 12;
  const fin = useMemo(() => calcFIN(deferred.monthlyExpenses), [deferred.monthlyExpenses]);
  const ruleOf72 = useMemo(() => calcRuleOf72(deferred.expectedReturn), [deferred.expectedReturn]);
  const projected = useMemo(
    () => calcFutureValue(deferred.currentInvestments, deferred.monthlyContribution, deferred.expectedReturn, yearsToRetire),
    [deferred, yearsToRetire],
  );
  const monthlyRetirementIncome = (projected * 0.04) / 12;
  const progress = fin > 0 ? Math.min(100, (deferred.currentInvestments / fin) * 100) : 0;

  const projectionData = useMemo(
    () => calcProjectionData(deferred.currentInvestments, deferred.monthlyContribution, deferred.expectedReturn, yearsToRetire),
    [deferred, yearsToRetire],
  );

  const set = <K extends keyof SimpleInputs>(k: K, v: number) => setInputs(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Intro */}
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Long-term planner</p>
          <h2 className="text-xl font-bold font-heading mt-1">Future Blueprint</h2>
          <p className="text-sm text-muted-foreground">A simple look at your retirement number and future income.</p>
        </CardContent>
      </Card>

      {/* Inputs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Your numbers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current age" value={inputs.currentAge} onChange={v => set("currentAge", v)} />
            <Field label="Retirement age" value={inputs.retirementAge} onChange={v => set("retirementAge", v)} />
            <Field label="Monthly expenses" value={inputs.monthlyExpenses} onChange={v => set("monthlyExpenses", v)} prefix="$" />
            <Field label="Current investments" value={inputs.currentInvestments} onChange={v => set("currentInvestments", v)} prefix="$" />
            <Field label="Monthly contribution" value={inputs.monthlyContribution} onChange={v => set("monthlyContribution", v)} prefix="$" />
            <Field label="Expected return" value={inputs.expectedReturn} onChange={v => set("expectedReturn", v)} suffix="%" />
          </div>
        </CardContent>
      </Card>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={Target} label="FIN (your number)" value={formatCurrency(fin)} hint={`${formatCurrency(annualExpenses)}/yr ÷ 4%`}/>
        <Metric icon={Clock} label="Years to double" value={ruleOf72 === Infinity ? "—" : `${ruleOf72.toFixed(1)} yrs`} hint="Rule of 72"/>
        <Metric icon={Coins} label="Monthly income at retirement" value={formatCurrency(monthlyRetirementIncome)} hint="At 4% withdrawal"/>
        <Metric icon={TrendingUp} label="Projected at retirement" value={formatCurrency(projected)} hint={`In ${yearsToRetire} years`}/>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Progress toward FIN</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold">{formatCurrency(deferred.currentInvestments)}</span>
            <span className="text-muted-foreground">/ {formatCurrency(fin)}</span>
          </div>
          <Progress value={progress} className="h-3"/>
          <p className="text-xs text-muted-foreground">{progress.toFixed(1)}% of the way there</p>
        </CardContent>
      </Card>

      {/* Single projection chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Future projection</CardTitle>
          <p className="text-xs text-muted-foreground">Growth from today until retirement.</p>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="fp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={y => `${deferred.currentAge + y}`} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={50}/>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={y => `Age ${deferred.currentAge + Number(y)}`}
                />
                <ReferenceLine y={fin} stroke="hsl(var(--accent))" strokeDasharray="4 4"
                  label={{ value: "FIN", position: "right", fill: "hsl(var(--accent))", fontSize: 10 }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#fp)"
                  strokeWidth={2} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Book CTA */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="p-5 text-center space-y-2">
          <CalendarCheck className="h-8 w-8 text-primary mx-auto"/>
          <p className="font-heading text-lg font-bold">Want help making this real?</p>
          <p className="text-sm text-muted-foreground">A 30-minute review can simplify your plan and save years.</p>
          <Button size="lg" className="w-full" onClick={() => toast.success("Thanks! We'll reach out to schedule.")}>
            Book a Financial Review
          </Button>
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
          className={prefix ? "pl-6" : suffix ? "pr-7" : ""}/>
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Target; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5"/>{label}</div>
        <p className="text-lg font-bold font-heading mt-1 leading-tight">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}
