import type { OneTimeItem, Scenario } from "../types";
import { round2 } from "../util";
import { projectScenario } from "./projection";

const DEFAULT_HIGH_CAP = 200000;

function buildInjectedExpense(amount: number, monthIndex: number): OneTimeItem {
  return {
    id: "safe-spend-test",
    name: "Safe Spend Test",
    amount,
    monthIndex,
    kind: "expense"
  };
}

export function maxOneTimeExpenseWithoutBufferBreach(
  scenario: Scenario,
  monthIndex: number,
  bufferOverride?: number
): number {
  const months = Math.max(1, Math.floor(Number(scenario.settings.months) || 1));
  const clampedMonthIndex = Math.max(0, Math.min(months - 1, Math.floor(Number(monthIndex) || 0)));
  const buffer = Number.isFinite(bufferOverride) ? round2(bufferOverride!) : round2(scenario.settings.cashBuffer);

  const isSafe = (amountCents: number): boolean => {
    const testScenario: Scenario = {
      ...scenario,
      oneTimeItems: [...scenario.oneTimeItems, buildInjectedExpense(amountCents / 100, clampedMonthIndex)]
    };
    return projectScenario(testScenario).summary.worstCash >= buffer;
  };

  if (!isSafe(0)) return 0;

  let low = 0;
  let high = DEFAULT_HIGH_CAP * 100;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (isSafe(mid)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return round2(low / 100);
}
