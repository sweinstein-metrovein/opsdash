/**
 * ── USER ROLE LOOKUP ─────────────────────────────────────────────────────────
 *
 * Roles are stored in BigQuery: opsdash_app.user_roles
 * Schema:
 *   UserEmail       STRING  — employee's @metroveincenters.com address
 *   UserRole        STRING  — 'ADMIN' | 'REGIONAL' | 'CLINIC'
 *   UserFullName    STRING  — display name
 *   FacilityState   STRING  — state code (e.g. "MI") — used for REGIONAL
 *   SisterFacilityID INTEGER — sister group ID        — used for CLINIC
 *
 * The JWT callback caches the role for 24 hours. When the token is more than
 * 24 hours old, it re-queries BigQuery so that staff changes (new hires,
 * terminations, role changes) take effect automatically within one day.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { runQuery } from "./bigquery";

export type UserRole = "admin" | "regional" | "sister";

export interface UserAccess {
  role: UserRole;
  state?: string;
  sister?: number;
  name?: string;
}

interface BQUserRow {
  UserRole: string;
  FacilityState: string | null;
  SisterFacilityID: number | null;
  UserFullName: string | null;
}

const PROJECT = process.env.BIGQUERY_PROJECT_ID!;
const DATASET = process.env.BIGQUERY_DATASET!;

/**
 * Look up a user's role from BigQuery.
 * Returns null if the email is not found (blocks login).
 */
export async function fetchUserAccess(email: string): Promise<UserAccess | null> {
  try {
    const sql = `
      SELECT UserRole, FacilityState, SisterFacilityID, UserFullName
      FROM \`${PROJECT}.${DATASET}.user_roles\`
      WHERE LOWER(UserEmail) = LOWER('${email.replace(/'/g, "\\'")}')
      LIMIT 1
    `;
    const rows = await runQuery<BQUserRow>(sql);
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    const bqRole = (row.UserRole ?? "").toUpperCase();

    if (bqRole === "ADMIN") {
      return {
        role: "admin",
        name: row.UserFullName ?? undefined,
      };
    }

    if (bqRole === "REGIONAL") {
      return {
        role: "regional",
        state: row.FacilityState ?? undefined,
        name: row.UserFullName ?? undefined,
      };
    }

    if (bqRole === "CLINIC") {
      return {
        role: "sister",
        state: row.FacilityState ?? undefined,
        sister: row.SisterFacilityID !== null ? Number(row.SisterFacilityID) : undefined,
        name: row.UserFullName ?? undefined,
      };
    }

    // Unknown role — deny access
    return null;
  } catch (err) {
    console.error("[user-roles] BigQuery lookup failed:", err);
    return null;
  }
}

/** How long (ms) to cache the role in the JWT before re-fetching */
export const ROLE_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours
