import { BigQuery } from "@google-cloud/bigquery";
import path from "path";

let _client: BigQuery | null = null;

export function getBigQueryClient(): BigQuery {
  if (_client) return _client;

  // Production (Vercel): credentials are passed as a JSON string in env var.
  // Local dev: fall back to the service-account.json file.
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (keyJson) {
    _client = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: JSON.parse(keyJson),
    });
  } else {
    _client = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      keyFilename: path.resolve(process.cwd(), "service-account.json"),
    });
  }

  return _client;
}

/** Run a query and return rows */
export async function runQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const bq = getBigQueryClient();
  const [rows] = await bq.query({ query: sql, location: "US" });
  return rows as T[];
}
