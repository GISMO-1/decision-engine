import React, { useEffect, useMemo, useState } from "react";
import type { Scenario, Projection, OneTimeItem } from "../types";
import { uuid, currency, round2 } from "../util";
import { projectScenario } from "../engine/projection";
import { deleteScenario, listScenarios, loadScenario, saveScenario } from "../db";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

function nowISO(): string {
  return new Date().toISOString();
}


function monthLabel(startDateISO: string, monthIndex: number): string {
  const [y, m] = startDateISO.split("-").map(Number);
  const d = new Date(Date.UTC(y || 1970, (m || 1) - 1 + monthIndex, 1));
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}

function monthOptionLabel(startDateISO: string, monthIndex: number): string {
  const [y, m] = startDateISO.split("-").map(Number);
  const d = new Date(Date.UTC(y || 1970, (m || 1) - 1 + monthIndex, 1));
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `Month ${monthIndex + 1} (${d.getUTCFullYear()}-${month})`;
}

function defaultScenario(): Scenario {
  const id = uuid();
  const start = new Date();
  const y = start.getUTCFullYear();
  const m = String(start.getUTCMonth() + 1).padStart(2, "0");
  return {
    id,
    name: "Base Scenario",
    incomes: [
      { id: uuid(), name: "Paycheck", amount: 4000 }
    ],
    expenses: [
      { id: uuid(), name: "Rent/Mortgage", amount: 1200, type: "fixed" },
      { id: uuid(), name: "Utilities", amount: 250, type: "fixed" },
      { id: uuid(), name: "Food", amount: 600, type: "variable" },
      { id: uuid(), name: "Gas", amount: 200, type: "variable" }
    ],
    oneTimeItems: [],
    debts: [
      { id: uuid(), name: "Credit Card", balance: 4500, apr: 0.2499, minPayment: 150 }
    ],
    strategy: { method: "avalanche", extraPayment: 200 },
    settings: {
      startDateISO: `${y}-${m}-01`,
      months: 36,
      cashBuffer: 1000,
      startingCash: 500
    },
    createdAtISO: nowISO(),
    updatedAtISO: nowISO()
  };
}

type SavedRow = { id: string; name: string; updatedAtISO: string };

export default function App() {
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [compareId, setCompareId] = useState<string>("");
  const [compareScenario, setCompareScenario] = useState<Scenario | null>(null);

  const projection: Projection = useMemo(() => projectScenario(scenario), [scenario]);
  const compareProjection: Projection | null = useMemo(
    () => (compareScenario ? projectScenario(compareScenario) : null),
    [compareScenario]
  );
  const monthCount = Math.max(1, Math.floor(Number(scenario.settings.months) || 1));

  useEffect(() => {
    (async () => {
      try {
        setSaved(await listScenarios());
      } catch {
        // ignore for now
      }
    })();
  }, []);

  async function refreshSaved() {
    setSaved(await listScenarios());
  }

  function patchScenario(p: Partial<Scenario>) {
    setScenario(s => ({ ...s, ...p, updatedAtISO: nowISO() }));
  }

  function updateIncome(idx: number, field: "name" | "amount", value: string) {
    patchScenario({
      incomes: scenario.incomes.map((x, i) => {
        if (i !== idx) return x;
        return field === "amount" ? { ...x, amount: round2(Number(value) || 0) } : { ...x, name: value };
      })
    });
  }

  function updateExpense(idx: number, field: "name" | "amount" | "type", value: string) {
    patchScenario({
      expenses: scenario.expenses.map((x, i) => {
        if (i !== idx) return x;
        if (field === "amount") return { ...x, amount: round2(Number(value) || 0) };
        if (field === "type") return { ...x, type: value as any };
        return { ...x, name: value };
      })
    });
  }

  function updateDebt(idx: number, field: "name" | "balance" | "apr" | "minPayment", value: string) {
    patchScenario({
      debts: scenario.debts.map((x, i) => {
        if (i !== idx) return x;
        const n = round2(Number(value) || 0);
        if (field === "balance") return { ...x, balance: Math.max(0, n) };
        if (field === "apr") return { ...x, apr: Math.max(0, (Number(value) || 0)) };
        if (field === "minPayment") return { ...x, minPayment: Math.max(0, n) };
        return { ...x, name: value };
      })
    });
  }


  function updateOneTimeItem(idx: number, field: keyof OneTimeItem, value: string) {
    patchScenario({
      oneTimeItems: scenario.oneTimeItems.map((x, i) => {
        if (i !== idx) return x;
        if (field === "amount") {
          const n = Number(value);
          return { ...x, amount: Number.isFinite(n) && n >= 0 ? round2(n) : 0 };
        }
        if (field === "monthIndex") {
          const n = Number(value);
          const monthIndex = Number.isFinite(n) ? Math.floor(n) : 0;
          return { ...x, monthIndex: Math.max(0, Math.min(monthCount - 1, monthIndex)) };
        }
        if (field === "kind") return { ...x, kind: value as OneTimeItem["kind"] };
        if (field === "name") return { ...x, name: value };
        return x;
      })
    });
  }

  async function onSave() {
    await saveScenario({ ...scenario, updatedAtISO: nowISO() });
    await refreshSaved();
  }

  async function onLoad(id: string) {
    const s = await loadScenario(id);
    if (s) setScenario(s);
  }

  async function onDelete(id: string) {
    await deleteScenario(id);
    await refreshSaved();
    if (scenario.id === id) setScenario(defaultScenario());
  }

  async function loadCompare(id: string) {
    setCompareId(id);
    if (!id) {
      setCompareScenario(null);
      return;
    }
    const s = await loadScenario(id);
    setCompareScenario(s);
  }

  const warnBelowBuffer =
    projection.summary.firstBelowBufferMonthIndex !== null
      ? `Cash drops below buffer on month #${projection.summary.firstBelowBufferMonthIndex + 1} (${projection.rows[projection.summary.firstBelowBufferMonthIndex].dateISO})`
      : null;

  const warnNegative =
    projection.summary.firstNegativeCashMonthIndex !== null
      ? `Cash goes negative on month #${projection.summary.firstNegativeCashMonthIndex + 1} (${projection.rows[projection.summary.firstNegativeCashMonthIndex].dateISO})`
      : null;

  const chartData = projection.rows.map(r => ({
    date: r.dateISO.slice(0, 7),
    cash: r.cashEnd,
    debt: r.totalDebtEnd
  }));

  const compareStats = compareProjection
    ? {
        endCashDelta: round2(projection.summary.endCash - compareProjection.summary.endCash),
        endDebtDelta: round2(projection.summary.endDebt - compareProjection.summary.endDebt),
        interestDelta: round2(projection.summary.totalInterestPaid - compareProjection.summary.totalInterestPaid)
      }
    : null;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, Segoe UI, Arial", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Decision Engine</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScenario(defaultScenario())}>New</button>
          <button onClick={onSave}>Save</button>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Scenario</h2>

          <label style={{ display: "block", marginBottom: 8 }}>
            Name
            <input
              style={{ width: "100%" }}
              value={scenario.name}
              onChange={e => patchScenario({ name: e.target.value })}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <label>
              Start Date (YYYY-MM-01)
              <input
                value={scenario.settings.startDateISO}
                onChange={e => patchScenario({ settings: { ...scenario.settings, startDateISO: e.target.value } })}
              />
            </label>
            <label>
              Months
              <input
                type="number"
                value={scenario.settings.months}
                onChange={e => patchScenario({ settings: { ...scenario.settings, months: Number(e.target.value) || 1 } })}
              />
            </label>
            <label>
              Starting Cash
              <input
                type="number"
                value={scenario.settings.startingCash}
                onChange={e => patchScenario({ settings: { ...scenario.settings, startingCash: Number(e.target.value) || 0 } })}
              />
            </label>
            <label>
              Cash Buffer
              <input
                type="number"
                value={scenario.settings.cashBuffer}
                onChange={e => patchScenario({ settings: { ...scenario.settings, cashBuffer: Number(e.target.value) || 0 } })}
              />
            </label>
          </div>

          <hr />

          <h3>Income (monthly)</h3>
          {scenario.incomes.map((inc, idx) => (
            <div key={inc.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 6 }}>
              <input value={inc.name} onChange={e => updateIncome(idx, "name", e.target.value)} />
              <input type="number" value={inc.amount} onChange={e => updateIncome(idx, "amount", e.target.value)} />
              <button
                onClick={() => patchScenario({ incomes: scenario.incomes.filter((_, i) => i !== idx) })}
                disabled={scenario.incomes.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
          <button onClick={() => patchScenario({ incomes: [...scenario.incomes, { id: uuid(), name: "New Income", amount: 0 }] })}>
            + Add Income
          </button>

          <hr />

          <h3>Expenses (monthly)</h3>
          {scenario.expenses.map((ex, idx) => (
            <div key={ex.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 6 }}>
              <input value={ex.name} onChange={e => updateExpense(idx, "name", e.target.value)} />
              <input type="number" value={ex.amount} onChange={e => updateExpense(idx, "amount", e.target.value)} />
              <select value={ex.type} onChange={e => updateExpense(idx, "type", e.target.value)}>
                <option value="fixed">fixed</option>
                <option value="variable">variable</option>
              </select>
              <button onClick={() => patchScenario({ expenses: scenario.expenses.filter((_, i) => i !== idx) })}>✕</button>
            </div>
          ))}
          <button onClick={() => patchScenario({ expenses: [...scenario.expenses, { id: uuid(), name: "New Expense", amount: 0, type: "fixed" }] })}>
            + Add Expense
          </button>

          <h4 style={{ marginBottom: 8 }}>One-time items</h4>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
            One-time items apply once in the selected month.
          </div>
          {scenario.oneTimeItems.map((item, idx) => {
            const clampedMonthIndex = Math.max(0, Math.min(monthCount - 1, Math.floor(Number(item.monthIndex) || 0)));
            return (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 6 }}>
                <input value={item.name} onChange={e => updateOneTimeItem(idx, "name", e.target.value)} />
                <input type="number" min={0} step="0.01" value={item.amount} onChange={e => updateOneTimeItem(idx, "amount", e.target.value)} />
                <select value={clampedMonthIndex} onChange={e => updateOneTimeItem(idx, "monthIndex", e.target.value)}>
                  {Array.from({ length: monthCount }, (_, monthIndex) => (
                    <option key={monthIndex} value={monthIndex}>{monthOptionLabel(scenario.settings.startDateISO, monthIndex)}</option>
                  ))}
                </select>
                <select value={item.kind} onChange={e => updateOneTimeItem(idx, "kind", e.target.value)}>
                  <option value="expense">expense</option>
                  <option value="income">income</option>
                </select>
                <button onClick={() => patchScenario({ oneTimeItems: scenario.oneTimeItems.filter((_, i) => i !== idx) })}>✕</button>
                <div style={{ gridColumn: "1 / span 5", fontSize: 12, opacity: 0.75 }}>
                  {monthOptionLabel(scenario.settings.startDateISO, clampedMonthIndex)}: {monthLabel(scenario.settings.startDateISO, clampedMonthIndex)}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => patchScenario({ oneTimeItems: [...scenario.oneTimeItems, { id: uuid(), name: "One-time item", amount: 0, monthIndex: 0, kind: "expense" }] })}
          >
            + Add One-time Item
          </button>

          <hr />

          <h3>Debts</h3>
          {scenario.debts.map((d, idx) => (
            <div key={d.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8 }}>
                <input value={d.name} onChange={e => updateDebt(idx, "name", e.target.value)} />
                <label>
                  Balance
                  <input type="number" value={d.balance} onChange={e => updateDebt(idx, "balance", e.target.value)} />
                </label>
                <label>
                  APR (0.2499)
                  <input type="number" step="0.0001" value={d.apr} onChange={e => updateDebt(idx, "apr", e.target.value)} />
                </label>
                <label>
                  Min
                  <input type="number" value={d.minPayment} onChange={e => updateDebt(idx, "minPayment", e.target.value)} />
                </label>
                <button onClick={() => patchScenario({ debts: scenario.debts.filter((_, i) => i !== idx) })}>✕</button>
              </div>
            </div>
          ))}
          <button onClick={() => patchScenario({ debts: [...scenario.debts, { id: uuid(), name: "New Debt", balance: 0, apr: 0.2, minPayment: 0 }] })}>
            + Add Debt
          </button>

          <hr />

          <h3>Strategy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <label>
              Method
              <select
                value={scenario.strategy.method}
                onChange={e => patchScenario({ strategy: { ...scenario.strategy, method: e.target.value as any } })}
              >
                <option value="avalanche">avalanche</option>
                <option value="snowball">snowball</option>
                <option value="custom">custom</option>
              </select>
            </label>

            <label>
              Extra Payment (monthly)
              <input
                type="number"
                value={scenario.strategy.extraPayment}
                onChange={e => patchScenario({ strategy: { ...scenario.strategy, extraPayment: Number(e.target.value) || 0 } })}
              />
            </label>

            <label>
              Custom Target
              <select
                value={scenario.strategy.customTargetDebtId ?? ""}
                onChange={e => patchScenario({ strategy: { ...scenario.strategy, customTargetDebtId: e.target.value || undefined } })}
                disabled={scenario.strategy.method !== "custom"}
              >
                <option value="">(none)</option>
                {scenario.debts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Results</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
              <div><b>End Cash:</b> {currency(projection.summary.endCash)}</div>
              <div><b>End Debt:</b> {currency(projection.summary.endDebt)}</div>
              <div><b>Total Interest:</b> {currency(projection.summary.totalInterestPaid)}</div>
              <div><b>Total One-time Income:</b> {currency(projection.summary.totalOneTimeIncome)}</div>
              <div><b>Total One-time Expense:</b> {currency(projection.summary.totalOneTimeExpense)}</div>
              <div><b>Worst Cash:</b> {currency(projection.summary.worstCash)}</div>
              <div>
                <b>Debt-Free:</b>{" "}
                {projection.summary.debtFreeMonthIndex === null
                  ? "not within horizon"
                  : `month #${projection.summary.debtFreeMonthIndex + 1} (${projection.rows[projection.summary.debtFreeMonthIndex].dateISO})`}
              </div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
              <div style={{ marginBottom: 8 }}><b>Warnings</b></div>
              <div style={{ color: warnNegative ? "crimson" : "inherit" }}>{warnNegative ?? "No negative-cash months."}</div>
              <div style={{ color: warnBelowBuffer ? "darkorange" : "inherit", marginTop: 6 }}>{warnBelowBuffer ?? "Buffer never breached."}</div>
            </div>
          </div>

          <div style={{ height: 320, marginTop: 14, border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v: any) => currency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="cash" dot={false} />
                <Line type="monotone" dataKey="debt" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <hr />

          <h3>Saved Scenarios</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>Name</div>
            <div style={{ fontWeight: 600 }}>Load</div>
            <div style={{ fontWeight: 600 }}>Compare</div>
            <div style={{ fontWeight: 600 }}>Delete</div>

            {saved.map(r => (
              <React.Fragment key={r.id}>
                <div>{r.name}</div>
                <button onClick={() => onLoad(r.id)}>Load</button>
                <button onClick={() => loadCompare(r.id)}>Compare</button>
                <button onClick={() => onDelete(r.id)}>Delete</button>
              </React.Fragment>
            ))}
          </div>

          {compareProjection && compareStats && (
            <>
              <hr />
              <h3>Comparison vs: {saved.find(x => x.id === compareId)?.name ?? "Scenario"}</h3>
              <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                <div><b>End Cash Δ:</b> {currency(compareStats.endCashDelta)} (positive = current better)</div>
                <div><b>End Debt Δ:</b> {currency(compareStats.endDebtDelta)} (negative = current better)</div>
                <div><b>Interest Δ:</b> {currency(compareStats.interestDelta)} (negative = current better)</div>
              </div>
            </>
          )}
        </section>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Local-first. SQLite. No cloud. No login. This MVP assumes monthly buckets (good enough for decisions).
      </div>
    </div>
  );
}
