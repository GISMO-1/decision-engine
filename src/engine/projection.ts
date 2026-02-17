import type { Projection, Scenario } from "../types";
import { addMonthsISO, round2 } from "../util";
import { initializeDebts, stepDebtsOneMonth, totalDebt } from "./debt";

export function projectScenario(s: Scenario): Projection {
  const months = Math.max(1, Math.min(600, s.settings.months));
  let cash = round2(s.settings.startingCash);

  const baseIncome = round2(s.incomes.reduce((sum, i) => sum + i.amount, 0));
  const baseExpenses = round2(s.expenses.reduce((sum, e) => sum + e.amount, 0));

  let debts = initializeDebts(s.debts);

  const rows = [];
  let totalInterestPaid = 0;
  let totalOneTimeIncome = 0;
  let totalOneTimeExpense = 0;
  let debtFreeMonthIndex: number | null = null;
  let worstCash = cash;

  let firstBelowBufferMonthIndex: number | null = null;
  let firstNegativeCashMonthIndex: number | null = null;

  for (let m = 0; m < months; m++) {
    const dateISO = addMonthsISO(s.settings.startDateISO, m);

    const step = stepDebtsOneMonth(debts, s.strategy);
    debts = step.debts;

    let oneTimeIncome = 0;
    let oneTimeExpense = 0;
    for (const item of s.oneTimeItems ?? []) {
      if (!Number.isFinite(item.amount) || item.amount < 0) continue;
      if (!Number.isFinite(item.monthIndex)) continue;
      const monthIndex = Math.floor(item.monthIndex);
      if (monthIndex < 0 || monthIndex >= months || monthIndex !== m) continue;
      if (item.kind === "income") oneTimeIncome += item.amount;
      if (item.kind === "expense") oneTimeExpense += item.amount;
    }
    oneTimeIncome = round2(oneTimeIncome);
    oneTimeExpense = round2(oneTimeExpense);

    const income = round2(baseIncome + oneTimeIncome);
    const expenses = round2(baseExpenses + oneTimeExpense);

    totalOneTimeIncome = round2(totalOneTimeIncome + oneTimeIncome);
    totalOneTimeExpense = round2(totalOneTimeExpense + oneTimeExpense);

    const netChange = round2(income - expenses - step.minPaid - step.extraPaid);
    cash = round2(cash + netChange);

    totalInterestPaid = round2(totalInterestPaid + step.interestPaid);
    const debtEnd = totalDebt(debts);

    if (debtFreeMonthIndex === null && debtEnd <= 0) debtFreeMonthIndex = m;
    worstCash = Math.min(worstCash, cash);

    if (firstBelowBufferMonthIndex === null && cash < s.settings.cashBuffer) {
      firstBelowBufferMonthIndex = m;
    }
    if (firstNegativeCashMonthIndex === null && cash < 0) {
      firstNegativeCashMonthIndex = m;
    }

    rows.push({
      monthIndex: m,
      dateISO,
      income,
      oneTimeIncome,
      expenses,
      oneTimeExpense,
      debtMinPayments: step.minPaid,
      debtExtraPayment: step.extraPaid,
      interestPaid: step.interestPaid,
      principalPaid: round2(step.principalPaid),
      netChange,
      cashEnd: cash,
      totalDebtEnd: debtEnd
    });
  }

  return {
    rows,
    summary: {
      endCash: rows.at(-1)?.cashEnd ?? cash,
      endDebt: rows.at(-1)?.totalDebtEnd ?? totalDebt(debts),
      totalInterestPaid,
      totalOneTimeIncome,
      totalOneTimeExpense,
      debtFreeMonthIndex,
      worstCash,
      firstBelowBufferMonthIndex,
      firstNegativeCashMonthIndex
    }
  };
}
