import { useState, useMemo, useDeferredValue } from "react";
import type { PersonalInputs, InvestmentAccount } from "@/lib/financial-calculations";
import {
  calcIPN, calcFIN, calcRuleOf72, calcFutureValue, calcProjectionData,
} from "@/lib/financial-calculations";
import DashboardMetrics from "@/components/DashboardMetrics";
import PersonalInputsPanel from "@/components/PersonalInputsPanel";
import ProgressTracker from "@/components/ProgressTracker";
import InvestmentAccounts from "@/components/InvestmentAccounts";
import FinancialCharts from "@/components/FinancialCharts";
import RiskAnalysis from "@/components/RiskAnalysis";
import FinancialSummary from "@/components/FinancialSummary";
import AIFinancialAdvisor from "@/components/AIFinancialAdvisor";
import LifetimeCompounding from "@/components/LifetimeCompounding";
import DollarImpactVisualizer from "@/components/DollarImpactVisualizer";
import StartNowVsLater from "@/components/StartNowVsLater";
import WealthMountain from "@/components/WealthMountain";
import FutureYouDisplay from "@/components/FutureYouDisplay";
import ShareCard from "@/components/ShareCard";

const defaultInputs: PersonalInputs = {
  age: 30, retirementAge: 65, monthlyIncome: 5833, currentSavings: 50000,
  monthlyContributions: 1000, expectedReturn: 8, inflationRate: 3, yearsIncomeProtection: 12,
};

const defaultAccounts: InvestmentAccount[] = [
  { id: "1", name: "401(k)", balance: 30000, interestRate: 8 },
  { id: "2", name: "Roth IRA", balance: 15000, interestRate: 8 },
];

export default function FutureBlueprint() {
  const [inputs, setInputs] = useState<PersonalInputs>(defaultInputs);
  const [accounts, setAccounts] = useState<InvestmentAccount[]>(defaultAccounts);

  const deferredInputs = useDeferredValue(inputs);
  const deferredAccounts = useDeferredValue(accounts);
  const yearsToRetirement = Math.max(deferredInputs.retirementAge - deferredInputs.age, 1);

  const ipn = useMemo(() => calcIPN(deferredInputs.monthlyIncome, deferredInputs.yearsIncomeProtection), [deferredInputs.monthlyIncome, deferredInputs.yearsIncomeProtection]);
  const fin = useMemo(() => calcFIN(deferredInputs.monthlyIncome), [deferredInputs.monthlyIncome]);
  const ruleOf72 = useMemo(() => calcRuleOf72(deferredInputs.expectedReturn), [deferredInputs.expectedReturn]);

  const projectedNetWorth = useMemo(() => {
    const main = calcFutureValue(deferredInputs.currentSavings, deferredInputs.monthlyContributions, deferredInputs.expectedReturn, yearsToRetirement);
    const acc = deferredAccounts.reduce((s, a) => s + calcFutureValue(a.balance, 0, a.interestRate, yearsToRetirement), 0);
    return main + acc;
  }, [deferredInputs, deferredAccounts, yearsToRetirement]);

  const monthlyRetirementIncome = projectedNetWorth * 0.04 / 12;
  const projectionData = useMemo(
    () => calcProjectionData(deferredInputs.currentSavings, deferredInputs.monthlyContributions, deferredInputs.expectedReturn, yearsToRetirement),
    [deferredInputs, yearsToRetirement]
  );
  const totalCurrentNetWorth = deferredInputs.currentSavings + deferredAccounts.reduce((s, a) => s + a.balance, 0);
  const progress = fin > 0 ? (totalCurrentNetWorth / fin) * 100 : 0;

  const freedomAge = useMemo(() => {
    const r = deferredInputs.expectedReturn / 100 / 12;
    let balance = totalCurrentNetWorth;
    for (let m = 0; m < 600; m++) {
      if (balance >= fin) return deferredInputs.age + Math.floor(m / 12);
      balance = balance * (1 + r) + deferredInputs.monthlyContributions;
    }
    return deferredInputs.age + 50;
  }, [totalCurrentNetWorth, fin, deferredInputs]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 p-4">
        <p className="text-xs uppercase tracking-wide text-primary font-semibold">Long-term planner</p>
        <h2 className="text-xl font-bold font-heading mt-1">Future Blueprint</h2>
        <p className="text-sm text-muted-foreground">Plan retirement, financial independence and compounding wealth.</p>
        <p className="text-xs text-muted-foreground mt-2">Rule of 72: <strong>{ruleOf72 === Infinity ? "—" : `${ruleOf72.toFixed(1)} yrs`}</strong> · Years to retire: <strong>{yearsToRetirement}</strong></p>
      </div>

      <DashboardMetrics fin={fin} ipn={ipn} projectedNetWorth={projectedNetWorth} monthlyRetirementIncome={monthlyRetirementIncome}/>
      <ProgressTracker currentNetWorth={totalCurrentNetWorth} fin={fin}/>
      <FutureYouDisplay projectedNetWorth={projectedNetWorth} monthlyRetirementIncome={monthlyRetirementIncome} retirementAge={inputs.retirementAge} freedomAge={freedomAge}/>
      <RiskAnalysis projectedNetWorth={projectedNetWorth} fin={fin} monthlyContributions={inputs.monthlyContributions}/>
      <AIFinancialAdvisor inputs={deferredInputs} projectedNetWorth={projectedNetWorth} fin={fin} monthlyRetirementIncome={monthlyRetirementIncome} totalCurrentNetWorth={totalCurrentNetWorth}/>
      <div className="grid gap-6 lg:grid-cols-2">
        <PersonalInputsPanel inputs={inputs} onChange={setInputs}/>
        <InvestmentAccounts accounts={accounts} onChange={setAccounts} yearsToRetirement={yearsToRetirement}/>
      </div>
      <WealthMountain age={deferredInputs.age} retirementAge={deferredInputs.retirementAge} currentSavings={deferredInputs.currentSavings} monthlyContributions={deferredInputs.monthlyContributions} expectedReturn={deferredInputs.expectedReturn} fin={fin}/>
      <FinancialCharts projectionData={projectionData} currentSavings={inputs.currentSavings} expectedReturn={inputs.expectedReturn} yearsToRetirement={yearsToRetirement} projectedNetWorth={projectedNetWorth}/>
      <div className="grid gap-6 lg:grid-cols-2">
        <LifetimeCompounding age={deferredInputs.age} retirementAge={deferredInputs.retirementAge} expectedReturn={deferredInputs.expectedReturn}/>
        <DollarImpactVisualizer expectedReturn={deferredInputs.expectedReturn} yearsToRetirement={yearsToRetirement} currentSavings={deferredInputs.currentSavings}/>
      </div>
      <StartNowVsLater monthlyContribution={deferredInputs.monthlyContributions} expectedReturn={deferredInputs.expectedReturn} age={deferredInputs.age} retirementAge={deferredInputs.retirementAge}/>
      <ShareCard projectedNetWorth={projectedNetWorth} monthlyRetirementIncome={monthlyRetirementIncome} freedomAge={freedomAge} retirementAge={inputs.retirementAge}/>
      <FinancialSummary ipn={ipn} fin={fin} projectedNetWorth={projectedNetWorth} monthlyRetirementIncome={monthlyRetirementIncome} progress={progress}/>
    </div>
  );
}
