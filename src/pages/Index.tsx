import { useState, useMemo, useDeferredValue } from "react";
import type { PersonalInputs, InvestmentAccount } from "@/lib/financial-calculations";
import {
  calcIPN, calcFIN, calcRuleOf72, calcFutureValue, calcProjectionData, formatCurrency,
} from "@/lib/financial-calculations";
import DashboardMetrics from "@/components/DashboardMetrics";
import PersonalInputsPanel from "@/components/PersonalInputsPanel";
import ProgressTracker from "@/components/ProgressTracker";
import InvestmentAccounts from "@/components/InvestmentAccounts";
import FinancialCharts from "@/components/FinancialCharts";
import RiskAnalysis from "@/components/RiskAnalysis";
import FinancialSummary from "@/components/FinancialSummary";
import { Landmark } from "lucide-react";

const defaultInputs: PersonalInputs = {
  age: 30,
  retirementAge: 65,
  monthlyIncome: 5833,
  currentSavings: 50000,
  monthlyContributions: 1000,
  expectedReturn: 8,
  inflationRate: 3,
  yearsIncomeProtection: 12,
};

const defaultAccounts: InvestmentAccount[] = [
  { id: "1", name: "401(k)", balance: 30000, interestRate: 8 },
  { id: "2", name: "Roth IRA", balance: 15000, interestRate: 8 },
  { id: "3", name: "Brokerage", balance: 5000, interestRate: 7 },
];

export default function Index() {
  const [inputs, setInputs] = useState<PersonalInputs>(defaultInputs);
  const [accounts, setAccounts] = useState<InvestmentAccount[]>(defaultAccounts);

  const deferredInputs = useDeferredValue(inputs);
  const deferredAccounts = useDeferredValue(accounts);

  const yearsToRetirement = Math.max(deferredInputs.retirementAge - deferredInputs.age, 1);

  const ipn = useMemo(() => calcIPN(deferredInputs.monthlyIncome, deferredInputs.yearsIncomeProtection), [deferredInputs.monthlyIncome, deferredInputs.yearsIncomeProtection]);
  const fin = useMemo(() => calcFIN(deferredInputs.monthlyIncome), [deferredInputs.monthlyIncome]);
  const ruleOf72 = useMemo(() => calcRuleOf72(deferredInputs.expectedReturn), [deferredInputs.expectedReturn]);

  const projectedNetWorth = useMemo(() => {
    const mainProjection = calcFutureValue(inputs.currentSavings, inputs.monthlyContributions, inputs.expectedReturn, yearsToRetirement);
    const accountsProjection = accounts.reduce((sum, a) => sum + calcFutureValue(a.balance, 0, a.interestRate, yearsToRetirement), 0);
    return mainProjection + accountsProjection;
  }, [inputs, accounts, yearsToRetirement]);

  const monthlyRetirementIncome = projectedNetWorth * 0.04 / 12;

  const projectionData = useMemo(
    () => calcProjectionData(inputs.currentSavings, inputs.monthlyContributions, inputs.expectedReturn, yearsToRetirement),
    [inputs.currentSavings, inputs.monthlyContributions, inputs.expectedReturn, yearsToRetirement]
  );

  const totalCurrentNetWorth = inputs.currentSavings + accounts.reduce((s, a) => s + a.balance, 0);
  const progress = fin > 0 ? (totalCurrentNetWorth / fin) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">Financial Blueprint</h1>
              <p className="text-xs text-muted-foreground">Visualize Your Path to Financial Independence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span>Rule of 72: <strong className="text-foreground">{ruleOf72 === Infinity ? "—" : `${ruleOf72.toFixed(1)} yrs`}</strong></span>
            <span className="text-border">|</span>
            <span>Years to Retire: <strong className="text-foreground">{yearsToRetirement}</strong></span>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Metrics */}
        <DashboardMetrics
          fin={fin}
          ipn={ipn}
          projectedNetWorth={projectedNetWorth}
          monthlyRetirementIncome={monthlyRetirementIncome}
        />

        {/* Progress */}
        <ProgressTracker currentNetWorth={totalCurrentNetWorth} fin={fin} />

        {/* Risk */}
        <RiskAnalysis
          projectedNetWorth={projectedNetWorth}
          fin={fin}
          monthlyContributions={inputs.monthlyContributions}
        />

        {/* Inputs + Accounts */}
        <div className="grid gap-8 lg:grid-cols-2">
          <PersonalInputsPanel inputs={inputs} onChange={setInputs} />
          <InvestmentAccounts
            accounts={accounts}
            onChange={setAccounts}
            yearsToRetirement={yearsToRetirement}
          />
        </div>

        {/* Charts */}
        <FinancialCharts
          projectionData={projectionData}
          currentSavings={inputs.currentSavings}
          expectedReturn={inputs.expectedReturn}
          yearsToRetirement={yearsToRetirement}
          projectedNetWorth={projectedNetWorth}
        />

        {/* Summary */}
        <FinancialSummary
          ipn={ipn}
          fin={fin}
          projectedNetWorth={projectedNetWorth}
          monthlyRetirementIncome={monthlyRetirementIncome}
          progress={progress}
        />
      </main>
    </div>
  );
}
