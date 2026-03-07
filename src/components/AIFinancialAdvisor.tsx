import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PersonalInputs } from "@/lib/financial-calculations";
import { formatCurrency, calcFutureValue } from "@/lib/financial-calculations";
import {
  Brain, Lightbulb, Target, TrendingUp, Heart, Sparkles, ChevronDown, ChevronUp,
  ArrowUpRight, Clock, PiggyBank, Shield, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  inputs: PersonalInputs;
  projectedNetWorth: number;
  fin: number;
  monthlyRetirementIncome: number;
  totalCurrentNetWorth: number;
}

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function AIFinancialAdvisor({
  inputs, projectedNetWorth, fin, monthlyRetirementIncome, totalCurrentNetWorth,
}: Props) {
  const [showScenarios, setShowScenarios] = useState(false);
  const yearsToRetirement = Math.max(inputs.retirementAge - inputs.age, 1);
  const shortfall = fin - projectedNetWorth;
  const onTrack = projectedNetWorth >= fin;
  const savingsRate = inputs.monthlyIncome > 0 ? (inputs.monthlyContributions / inputs.monthlyIncome) * 100 : 0;

  // Calculate required monthly to hit FIN
  const requiredMonthly = useMemo(() => {
    const r = inputs.expectedReturn / 100 / 12;
    const months = yearsToRetirement * 12;
    const fvExisting = totalCurrentNetWorth * Math.pow(1 + r, months);
    const needed = fin - fvExisting;
    if (needed <= 0) return 0;
    return r > 0 ? needed / ((Math.pow(1 + r, months) - 1) / r) : needed / months;
  }, [fin, totalCurrentNetWorth, inputs.expectedReturn, yearsToRetirement]);

  // Financial freedom age
  const freedomAge = useMemo(() => {
    const r = inputs.expectedReturn / 100 / 12;
    let balance = totalCurrentNetWorth;
    for (let m = 0; m < 600; m++) {
      if (balance >= fin) return inputs.age + Math.floor(m / 12);
      balance = balance * (1 + r) + inputs.monthlyContributions;
    }
    return inputs.age + 50;
  }, [totalCurrentNetWorth, fin, inputs]);

  // Success probability (simplified Monte Carlo-ish heuristic)
  const successProbability = useMemo(() => {
    const ratio = projectedNetWorth / fin;
    if (ratio >= 1.3) return 95;
    if (ratio >= 1.0) return 80 + (ratio - 1.0) * 50;
    return Math.max(20, ratio * 75);
  }, [projectedNetWorth, fin]);

  // Improve My Plan scenarios
  const scenarios = useMemo(() => {
    const increaseContrib = inputs.monthlyContributions * 1.3;
    const s1Value = calcFutureValue(totalCurrentNetWorth, increaseContrib, inputs.expectedReturn, yearsToRetirement);

    const delayYears = yearsToRetirement + 2;
    const s2Value = calcFutureValue(totalCurrentNetWorth, inputs.monthlyContributions, inputs.expectedReturn, delayYears);

    const higherReturn = inputs.expectedReturn + 1;
    const s3Value = calcFutureValue(totalCurrentNetWorth, inputs.monthlyContributions, higherReturn, yearsToRetirement);

    return [
      { title: "Increase contributions by 30%", icon: PiggyBank, newMonthly: increaseContrib, projected: s1Value, improvement: s1Value - projectedNetWorth },
      { title: "Delay retirement by 2 years", icon: Clock, projected: s2Value, improvement: s2Value - projectedNetWorth },
      { title: `Increase return to ${higherReturn}%`, icon: TrendingUp, projected: s3Value, improvement: s3Value - projectedNetWorth },
    ];
  }, [inputs, totalCurrentNetWorth, yearsToRetirement, projectedNetWorth]);

  // Recommendations
  const recommendations = useMemo(() => {
    const recs: { text: string; icon: typeof Lightbulb }[] = [];
    if (!onTrack) {
      recs.push({ text: `Increase monthly savings to ${formatCurrency(Math.ceil(requiredMonthly / 10) * 10)} to reach your FIN by age ${inputs.retirementAge}.`, icon: ArrowUpRight });
    }
    if (savingsRate < 15) {
      recs.push({ text: `Your savings rate is ${savingsRate.toFixed(0)}%. Aim for at least 15-20% of income.`, icon: PiggyBank });
    }
    if (inputs.expectedReturn < 7) {
      recs.push({ text: `Consider diversified index funds averaging 7-8% to boost your projected return from ${inputs.expectedReturn}%.`, icon: TrendingUp });
    }
    const earlyRetireContrib = inputs.monthlyContributions + 200;
    const earlyValue = calcFutureValue(totalCurrentNetWorth, earlyRetireContrib, inputs.expectedReturn, yearsToRetirement - 3);
    if (earlyValue >= fin && yearsToRetirement > 5) {
      recs.push({ text: `Adding $200/month could let you retire ${3} years earlier.`, icon: Zap });
    }
    const higherReturnValue = calcFutureValue(totalCurrentNetWorth, inputs.monthlyContributions, inputs.expectedReturn + 1, yearsToRetirement);
    recs.push({ text: `Increasing your return by 1% would add ${formatCurrency(higherReturnValue - projectedNetWorth)} to your retirement balance.`, icon: Sparkles });
    return recs.slice(0, 5);
  }, [onTrack, requiredMonthly, savingsRate, inputs, totalCurrentNetWorth, yearsToRetirement, fin, projectedNetWorth]);

  // Health insights
  const insights = useMemo(() => {
    const items: { label: string; detail: string; status: "good" | "warning" | "alert" }[] = [];
    items.push({
      label: "Savings Strength",
      detail: savingsRate >= 20 ? "Excellent! Your savings rate is above average." : savingsRate >= 10 ? "Good savings rate, but aim for 20%+." : "Your savings rate needs improvement. Target 15-20%.",
      status: savingsRate >= 20 ? "good" : savingsRate >= 10 ? "warning" : "alert",
    });
    items.push({
      label: "Retirement Readiness",
      detail: onTrack ? "You are on track to achieve financial independence!" : `You're projected to fall short by ${formatCurrency(shortfall)}.`,
      status: onTrack ? "good" : "alert",
    });
    items.push({
      label: "Success Probability",
      detail: `Your retirement plan has a ${successProbability.toFixed(0)}% success probability.${successProbability < 75 ? ` Increasing savings by $200/month could improve this significantly.` : ""}`,
      status: successProbability >= 80 ? "good" : successProbability >= 60 ? "warning" : "alert",
    });
    return items;
  }, [savingsRate, onTrack, shortfall, successProbability]);

  const statusColor = { good: "text-success", warning: "text-warning", alert: "text-destructive" };
  const statusBg = { good: "bg-success/10", warning: "bg-warning/10", alert: "bg-destructive/10" };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-heading">AI Financial Advisor</h2>
          <p className="text-sm text-muted-foreground">Personalized analysis powered by your financial data</p>
        </div>
      </div>

      {/* Feature 1: Financial Plan Analysis */}
      <motion.div {...fadeIn} className="metric-card space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Your Financial Plan Analysis
        </h3>
        <div className="space-y-2 text-sm leading-relaxed">
          <p>You are currently saving <strong>{formatCurrency(inputs.monthlyContributions)}</strong> per month.</p>
          <p>At your current savings rate, your projected retirement balance is <strong>{formatCurrency(projectedNetWorth)}</strong>.</p>
          <p>Your Financial Independence Number is <strong>{formatCurrency(fin)}</strong>.</p>
          {onTrack ? (
            <p className="text-success font-semibold">🎉 You are on track to exceed your FIN by {formatCurrency(projectedNetWorth - fin)}!</p>
          ) : (
            <p className="text-destructive font-semibold">You are currently projected to fall short by {formatCurrency(shortfall)}.</p>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Financial Freedom Age</p>
              <p className="text-xl font-bold font-heading text-primary">{freedomAge}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Success Probability</p>
              <p className="text-xl font-bold font-heading text-primary">{successProbability.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feature 2: Recommended Actions */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="metric-card space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-accent" />
          Recommended Actions
        </h3>
        <div className="space-y-2">
          {recommendations.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-sm">{r.text}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Feature 3: Retirement Strategy */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="metric-card space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <Shield className="h-5 w-5 text-secondary" />
          Your Personalized Retirement Strategy
        </h3>
        <p className="text-sm text-muted-foreground">
          To reach financial independence by age <strong className="text-foreground">{inputs.retirementAge}</strong> you should:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Target Monthly Savings", value: formatCurrency(Math.max(requiredMonthly, inputs.monthlyContributions)) },
            { label: "Target Retirement Age", value: `${inputs.retirementAge}` },
            { label: "Estimated Retirement Income", value: `${formatCurrency(monthlyRetirementIncome)}/mo` },
            { label: "Investment Strategy", value: `${inputs.expectedReturn}% annual return` },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold font-heading">{item.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature 4: Future Financial Summary */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="rounded-xl bg-primary p-6 text-primary-foreground">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5" />
          <h3 className="text-lg font-bold font-heading">Your Financial Future</h3>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          If you continue investing <strong>{formatCurrency(inputs.monthlyContributions)}</strong> per month,
          your portfolio could grow to <strong>{formatCurrency(projectedNetWorth)}</strong> by age {inputs.retirementAge}.
        </p>
        <p className="text-sm opacity-90 mt-2">
          This could provide approximately <strong className="text-2xl">{formatCurrency(monthlyRetirementIncome)}</strong> per month in retirement income.
        </p>
      </motion.div>

      {/* Feature 5: Financial Health Insights */}
      <motion.div {...fadeIn} transition={{ delay: 0.25 }} className="metric-card space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" />
          Financial Health Insights
        </h3>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-lg p-4 ${statusBg[insight.status]}`}>
              <p className={`text-sm font-semibold ${statusColor[insight.status]}`}>{insight.label}</p>
              <p className="text-sm mt-1">{insight.detail}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature 6: Improve My Plan */}
      <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="metric-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Improve My Plan
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScenarios(!showScenarios)}
            className="gap-1"
          >
            {showScenarios ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showScenarios ? "Hide" : "Show"} Scenarios
          </Button>
        </div>
        <AnimatePresence>
          {showScenarios && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {scenarios.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold">{s.title}</p>
                      </div>
                      <p className="text-xl font-bold font-heading text-primary">{formatCurrency(s.projected)}</p>
                      <p className="text-xs text-success font-medium">
                        +{formatCurrency(s.improvement)} improvement
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
