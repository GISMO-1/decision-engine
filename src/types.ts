export type UUID = string;

export type Income = {
  id: UUID;
  name: string;
  amount: number; // monthly
};

export type Expense = {
  id: UUID;
  name: string;
  amount: number; // monthly
  type: "fixed" | "variable";
};

export type Debt = {
  id: UUID;
  name: string;
  balance: number;
  apr: number; // e.g. 0.2499
  minPayment: number; // monthly
};

export type OneTimeItem = {
  id: UUID;
  name: string;
  amount: number;
  monthIndex: number; // 0-based index from scenario start month
  kind: "income" | "expense";
};

export type Strategy = {
  method: "avalanche" | "snowball" | "custom";
  customTargetDebtId?: UUID;
  extraPayment: number; // extra beyond mins
};

export type Settings = {
  startDateISO: string; // YYYY-MM-01 recommended
  months: number;       // projection length
  cashBuffer: number;   // emergency floor
  startingCash: number; // cash on hand at start
};

export type Scenario = {
  id: UUID;
  name: string;
  incomes: Income[];
  expenses: Expense[];
  oneTimeItems: OneTimeItem[];
  debts: Debt[];
  strategy: Strategy;
  settings: Settings;
  createdAtISO: string;
  updatedAtISO: string;
};

export type MonthRow = {
  monthIndex: number;
  dateISO: string;
  income: number;
  oneTimeIncome: number;
  expenses: number;
  oneTimeExpense: number;
  debtMinPayments: number;
  debtExtraPayment: number;
  interestPaid: number;
  principalPaid: number;
  netChange: number;
  cashEnd: number;
  totalDebtEnd: number;
};

export type Projection = {
  rows: MonthRow[];
  summary: {
    endCash: number;
    endDebt: number;
    totalInterestPaid: number;
    totalOneTimeIncome: number;
    totalOneTimeExpense: number;
    debtFreeMonthIndex: number | null;
    worstCash: number;
    firstBelowBufferMonthIndex: number | null;
    firstNegativeCashMonthIndex: number | null;
  };
};
