import Database from "@tauri-apps/plugin-sql";
import type { Scenario } from "./types";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:decision_engine.db");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at_iso TEXT NOT NULL
    );
  `);
  return db;
}

export async function listScenarios(): Promise<{ id: string; name: string; updatedAtISO: string }[]> {
  const d = await getDb();
  const rows = await d.select<any[]>("SELECT id, name, updated_at_iso as updatedAtISO FROM scenarios ORDER BY updated_at_iso DESC;");
  return rows as any;
}

export async function loadScenario(id: string): Promise<Scenario | null> {
  const d = await getDb();
  const rows = await d.select<any[]>("SELECT data_json FROM scenarios WHERE id = ? LIMIT 1;", [id]);
  if (!rows.length) return null;
  return JSON.parse(rows[0].data_json) as Scenario;
}

export async function saveScenario(s: Scenario): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO scenarios (id, name, data_json, updated_at_iso)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       data_json=excluded.data_json,
       updated_at_iso=excluded.updated_at_iso;`,
    [s.id, s.name, JSON.stringify(s), s.updatedAtISO]
  );
}

export async function deleteScenario(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM scenarios WHERE id = ?;", [id]);
}
