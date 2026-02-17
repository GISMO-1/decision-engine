import type { MonthRow } from "../types";

const CSV_HEADERS = [
  "Month (YYYY-MM)",
  "Income (base)",
  "One-time income",
  "Expenses (base)",
  "One-time expense",
  "Debt min",
  "Debt extra",
  "Interest paid",
  "Net change",
  "Cash end",
  "Total debt end"
] as const;

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function sanitizeFileName(name: string): string {
  const base = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[\\/:*?"<>|]/g, "");
  return base || "projection";
}

export function projectionRowsToCsv(rows: MonthRow[]): string {
  const csvRows = rows.map(row => [
    row.dateISO.slice(0, 7),
    row.income,
    row.oneTimeIncome,
    row.expenses,
    row.oneTimeExpense,
    row.debtMinPayments,
    row.debtExtraPayment,
    row.interestPaid,
    row.netChange,
    row.cashEnd,
    row.totalDebtEnd
  ]);

  return [CSV_HEADERS, ...csvRows].map(line => line.map(csvCell).join(",")).join("\n");
}

function browserDownload(csv: string, fileName: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFileName(fileName)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function saveWithTauri(csv: string, fileName: string): Promise<boolean> {
  try {
    const dialogPkg = "@tauri-apps/plugin-dialog";
    const fsPkg = "@tauri-apps/plugin-fs";
    const dialogModule = await import(/* @vite-ignore */ dialogPkg);
    const fsModule = await import(/* @vite-ignore */ fsPkg);

    if (typeof dialogModule.save !== "function" || typeof fsModule.writeTextFile !== "function") {
      return false;
    }

    const filePath = await dialogModule.save({
      defaultPath: `${sanitizeFileName(fileName)}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });

    if (!filePath) return true;
    await fsModule.writeTextFile(filePath, csv);
    return true;
  } catch {
    return false;
  }
}

export async function exportProjectionRowsCsv(rows: MonthRow[], fileName: string): Promise<void> {
  const csv = projectionRowsToCsv(rows);
  const tauriSaved = await saveWithTauri(csv, fileName);
  if (!tauriSaved) browserDownload(csv, fileName);
}
