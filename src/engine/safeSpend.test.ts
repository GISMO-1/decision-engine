import type { Scenario } from "../types";
import { maxOneTimeExpenseWithoutBufferBreach } from "./safeSpend";

function baseScenario(overrides?: Partial<Scenario>): Scenario {
  const scenario: Scenario = {
    id: "s1",
    name: "Test",
    incomes: [{ id: "i1", name: "Income", amount: 1000 }],
    expenses: [{ id: "e1", name: "Expense", amount: 900, type: "fixed" }],
    oneTimeItems: [],
    debts: [],
    strategy: { method: "avalanche", extraPayment: 0 },
    settings: {
      startDateISO: "2026-01-01",
      months: 3,
      cashBuffer: 100,
      startingCash: 100
    },
    createdAtISO: "2026-01-01T00:00:00.000Z",
    updatedAtISO: "2026-01-01T00:00:00.000Z"
  };

  return { ...scenario, ...overrides };
}

function testSimpleKnownResult() {
  const scenario = baseScenario();
  const result = maxOneTimeExpenseWithoutBufferBreach(scenario, 1);
  if (result !== 200) throw new Error(`expected 200, got ${result}`);
}

function testWithDebtPayments() {
  const scenario = baseScenario({
    expenses: [{ id: "e1", name: "Expense", amount: 600, type: "fixed" }],
    debts: [{ id: "d1", name: "Debt", balance: 1000, apr: 0, minPayment: 300 }],
    settings: {
      startDateISO: "2026-01-01",
      months: 4,
      cashBuffer: 100,
      startingCash: 500
    }
  });

  const result = maxOneTimeExpenseWithoutBufferBreach(scenario, 0);
  if (result !== 500) throw new Error(`expected 500, got ${result}`);
}

testSimpleKnownResult();
testWithDebtPayments();
console.log("safeSpend tests passed");
