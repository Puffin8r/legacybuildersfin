export interface PersonalInputs {
  age: number;
  retirementAge: number;
  monthlyIncome: number;
  currentSavings: number;
  monthlyContributions: number;
  expectedReturn: number;
  inflationRate: number;
  yearsIncomeProtection: number;
}

export interface InvestmentAccount {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
}

export function calcIPN(monthlyIncome: number, years: number): number {
  return monthlyIncome * 12 * years;
}

export function calcFIN(monthlyIncome: number): number {
  return (monthlyIncome * 12) / 0.04;
}

export function calcRuleOf72(rate: number): number {
  if (rate <= 0) return Infinity;
  return 72 / rate;
}

export function calcFutureValue(
  currentBalance: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const r = annualRate / 100;
  const monthlyRate = r / 12;
  const months = years * 12;

  const fvLump = currentBalance * Math.pow(1 + monthlyRate, months);
  const fvContributions =
    monthlyRate > 0
      ? monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : monthlyContribution * months;

  return fvLump + fvContributions;
}

export function calcProjectionData(
  currentBalance: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): { year: number; value: number }[] {
  const data: { year: number; value: number }[] = [];
  for (let y = 0; y <= years; y++) {
    data.push({
      year: y,
      value: calcFutureValue(currentBalance, monthlyContribution, annualRate, y),
    });
  }
  return data;
}

export function calcAccountProjection(
  account: InvestmentAccount,
  years: number
): { year: number; value: number }[] {
  const data: { year: number; value: number }[] = [];
  for (let y = 0; y <= years; y++) {
    data.push({
      year: y,
      value: account.balance * Math.pow(1 + account.interestRate / 100, y),
    });
  }
  return data;
}

export function calcDoublingMilestones(
  initialAmount: number,
  rate: number,
  maxYears: number
): { year: number; value: number }[] {
  const yearsToDouble = calcRuleOf72(rate);
  if (yearsToDouble === Infinity) return [];
  const milestones: { year: number; value: number }[] = [];
  let current = initialAmount;
  let year = 0;
  while (year <= maxYears) {
    milestones.push({ year: Math.round(year), value: Math.round(current) });
    current *= 2;
    year += yearsToDouble;
  }
  return milestones;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
