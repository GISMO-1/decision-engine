import type { Debt, Strategy, UUID } from "../types";
import { round2 } from "../util";

export type DebtState = {
  id: UUID;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
};

export type DebtStepResult = {
  interestPaid: number;
  principalPaid: number;
  minPaid: number;
  extraPaid: number;
  debts: DebtState[];
};

function monthlyRate(apr: number): number {
  return apr / 12;
}

function sortDebtIds(strategy: Strategy, debts: DebtState[]): UUID[] {
  if (strategy.method === "custom" && strategy.customTargetDebtId) {
    const ids = debts.map(d => d.id);
    // custom target first; others by avalanche fallback
    return [
      strategy.customTargetDebtId,
      ...ids.filter(id => id !== strategy.customTargetDebtId)
        .sort((a, b) => {
          const da = debts.find(d => d.id === a)!;
          const db = debts.find(d => d.id === b)!;
          return db.apr - da.apr;
        })
    ].filter((v, i, arr) => arr.indexOf(v) === i);
  }

  if (strategy.method === "snowball") {
    return [...debts]
      .sort((a, b) => a.balance - b.balance || b.apr - a.apr)
      .map(d => d.id);
  }

  // avalanche default
  return [...debts].sort((a, b) => b.apr - a.apr || a.balance - b.balance).map(d => d.id);
}

export function initializeDebts(debts: Debt[]): DebtState[] {
  return debts.map(d => ({
    id: d.id,
    name: d.name,
    balance: round2(Math.max(0, d.balance)),
    apr: Math.max(0, d.apr),
    minPayment: round2(Math.max(0, d.minPayment))
  }));
}

export function stepDebtsOneMonth(
  debts: DebtState[],
  strategy: Strategy
): DebtStepResult {
  // 1) accrue interest
  let interestPaid = 0;
  const nextDebts: DebtState[] = debts.map(d => {
    if (d.balance <= 0) return { ...d, balance: 0 };
    const interest = round2(d.balance * monthlyRate(d.apr));
    interestPaid += interest;
    return { ...d, balance: round2(d.balance + interest) };
  });

  // 2) pay minimums
  let minPaid = 0;
  let principalPaid = 0;

  for (const d of nextDebts) {
    if (d.balance <= 0) continue;
    const pay = Math.min(d.minPayment, d.balance);
    minPaid += pay;
    d.balance = round2(d.balance - pay);
    principalPaid += pay; // includes any interest portion already capitalized; simplified accounting
  }

  // 3) allocate extra payment
  let extraPaid = 0;
  let extra = round2(Math.max(0, strategy.extraPayment));

  const order = sortDebtIds(strategy, nextDebts);
  for (const id of order) {
    if (extra <= 0) break;
    const d = nextDebts.find(x => x.id === id);
    if (!d || d.balance <= 0) continue;

    const pay = Math.min(extra, d.balance);
    extraPaid += pay;
    d.balance = round2(d.balance - pay);
    principalPaid += pay;
    extra = round2(extra - pay);
  }

  // clean tiny negatives
  for (const d of nextDebts) {
    if (d.balance < 0.01) d.balance = 0;
  }

  return { interestPaid: round2(interestPaid), principalPaid: round2(principalPaid), minPaid: round2(minPaid), extraPaid: round2(extraPaid), debts: nextDebts };
}

export function totalDebt(debts: DebtState[]): number {
  return round2(debts.reduce((s, d) => s + d.balance, 0));
}
