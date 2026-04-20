import "server-only";
import { getDb } from "./client";

export function readConfig<T>(key: string): T | null {
  const row = getDb()
    .prepare("SELECT value_json FROM app_config WHERE key = ?")
    .get(key) as { value_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

export function writeConfig<T>(key: string, value: T): void {
  getDb()
    .prepare(
      `INSERT INTO app_config (key, value_json) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
                                        updated_at = datetime('now')`,
    )
    .run(key, JSON.stringify(value));
}
