# Decision Engine

Local-first Windows desktop financial simulation engine.

Decision Engine models monthly cashflow, debt payoff strategies, liquidity risk, and scenario comparisons — all running natively on your machine.

No accounts.  
No cloud sync.  
No data leaving your computer.

---

## Overview

Decision Engine is not a budgeting app.

It is a deterministic financial simulator built to answer one core question:

> If I make this decision, what happens to my financial stability over time?

The system projects forward month-by-month and exposes where risk appears — not just where balances end up.

---

## Features

### Monthly Cashflow Projection
Projects:

- Income
- Expenses
- Minimum debt payments
- Extra debt payments
- Interest accrued
- Net monthly change
- Ending cash
- Remaining total debt

### Debt Strategy Modeling

Supports:

- Avalanche (highest APR first)
- Snowball (smallest balance first)
- Custom targeted payoff
- Adjustable extra monthly payments

### Liquidity Risk Signals

Automatically identifies:

- First month cash goes negative
- First month cash drops below buffer
- Worst cash position
- Debt-free month (if achieved)

### Scenario Management

- Save scenarios locally using SQLite
- Load and modify previous scenarios
- Compare two scenarios side-by-side
- Measure interest differences and outcome deltas

All data is stored locally.

---

## Tech Stack

- Tauri (native Windows shell)
- React + TypeScript (UI + simulation engine)
- SQLite (local persistence)
- Rust (Tauri backend)
- Recharts (visualization)

No external APIs. No remote storage.

---

## Installation (Development)

Clone the repository:

```bash
git clone https://github.com/GISMO-1/decision-engine.git
cd decision-engine
```

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run tauri:dev
```

---

## Requirements

- Rust toolchain
- Windows C++ Build Tools
- Microsoft Edge WebView2 runtime
- Node.js 18+

---

## Build Production Installer

```bash
npm run tauri:build
```

This produces a native Windows installer.

---

## Model Assumptions

- Monthly time buckets
- Interest = APR / 12
- Deterministic cashflow (no stochastic modeling yet)
- No tax modeling (planned)
- No investment return modeling (planned)

This version focuses on liquidity stability and debt payoff dynamics.

---

## Roadmap

Planned upgrades:

- One-time expense modeling (shock simulation)
- Income disruption modeling
- Monte Carlo risk simulation
- Investment growth module
- Safe spending calculator
- Objective-based optimization engine

---

## Philosophy

Markets are uncertain.

Liquidity, leverage, and timing are controllable.

Decision Engine focuses on what you can actually manage.

---

## License

MIT
