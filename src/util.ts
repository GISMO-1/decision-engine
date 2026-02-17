export function uuid(): string {
  // good-enough local UUID
  return crypto.randomUUID();
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function addMonthsISO(startISO: string, monthsToAdd: number): string {
  const d = new Date(startISO);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date ISO");
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-based
  const next = new Date(Date.UTC(year, month + monthsToAdd, 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function currency(n: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}
