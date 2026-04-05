import { runQuery } from "./bigquery";

const PROJECT = process.env.BIGQUERY_PROJECT_ID!;
const DATASET  = process.env.BIGQUERY_DATASET!;
const TBL      = `\`${PROJECT}.${DATASET}.announcements\``;

/** Escape single quotes for BigQuery string literals */
function safe(s: string): string {
  return String(s ?? "").replace(/'/g, "''");
}

/** Format ISO datetime string for BigQuery TIMESTAMP, or return NULL */
function tsOrNull(v?: string | null): string {
  if (!v) return "NULL";
  // "2026-04-05T12:00" → "2026-04-05 12:00:00"
  const clean = v.replace("T", " ").replace("Z", "").padEnd(19, ":00");
  return `TIMESTAMP('${safe(clean)}')`;
}

function boolStr(v?: boolean | null): string {
  return v ? "true" : "false";
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Announcement {
  id:            string;
  dept:          string;
  priority:      string;   // 'info' | 'normal' | 'urgent'
  title:         string;
  body:          string;
  createdBy:     string;
  createdAt:     string;
  updatedAt?:    string;
  publishStart?: string;
  publishEnd?:   string;
  audienceType:  string;   // 'company' | 'state' | 'sister'
  audienceValue?: string;  // comma-separated states or sister IDs
  isActive:      boolean;
  isPinned:      boolean;
}

export interface AnnouncementInput {
  dept:           string;
  priority:       string;
  title:          string;
  body:           string;
  publishStart?:  string | null;
  publishEnd?:    string | null;
  audienceType:   string;
  audienceValue?: string | null;
  isActive:       boolean;
  isPinned:       boolean;
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Announcement {
  function ts(v: unknown): string | undefined {
    if (!v) return undefined;
    const s = typeof v === "object" && v !== null && "value" in v
      ? String((v as { value: string }).value)
      : String(v);
    return s || undefined;
  }
  return {
    id:           String(row.id ?? ""),
    dept:         String(row.dept ?? ""),
    priority:     String(row.priority ?? "normal"),
    title:        String(row.title ?? ""),
    body:         String(row.body ?? ""),
    createdBy:    String(row.created_by ?? ""),
    createdAt:    ts(row.created_at) ?? "",
    updatedAt:    ts(row.updated_at),
    publishStart: ts(row.publish_start),
    publishEnd:   ts(row.publish_end),
    audienceType: String(row.audience_type ?? "company"),
    audienceValue:row.audience_value ? String(row.audience_value) : undefined,
    isActive:     Boolean(row.is_active),
    isPinned:     Boolean(row.is_pinned),
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Active announcements visible to the current user based on their audience */
export async function getActiveAnnouncements(opts: {
  state?:  string | null;
  sister?: number | null;
  view?:   string | null;
}): Promise<Announcement[]> {
  const stateClause  = opts.state  ? `OR (audience_type = 'state'  AND REGEXP_CONTAINS(IFNULL(audience_value,''), r'(^|,)${safe(opts.state)}(,|$)'))` : "";
  const sisterClause = opts.sister != null ? `OR (audience_type = 'sister' AND REGEXP_CONTAINS(IFNULL(audience_value,''), r'(^|,)${Number(opts.sister)}(,|$)'))` : "";

  const rows = await runQuery<Record<string, unknown>>(`
    SELECT * FROM ${TBL}
    WHERE deleted_at IS NULL
      AND is_active = true
      AND (publish_start IS NULL OR publish_start <= CURRENT_TIMESTAMP())
      AND (publish_end   IS NULL OR publish_end   >  CURRENT_TIMESTAMP())
      AND (
        audience_type = 'company'
        ${stateClause}
        ${sisterClause}
      )
    ORDER BY is_pinned DESC, created_at DESC
    LIMIT 30
  `);
  return rows.map(mapRow);
}

/** All announcements (including inactive/expired) for admin view */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const rows = await runQuery<Record<string, unknown>>(`
    SELECT * FROM ${TBL}
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 500
  `);
  return rows.map(mapRow);
}

/** Create a new announcement; returns the generated ID */
export async function createAnnouncement(
  data: AnnouncementInput,
  createdBy: string,
): Promise<string> {
  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await runQuery(`
    INSERT INTO ${TBL}
      (id, dept, priority, title, body, created_by, created_at,
       publish_start, publish_end, audience_type, audience_value,
       is_active, is_pinned)
    VALUES (
      '${safe(id)}',
      '${safe(data.dept)}',
      '${safe(data.priority)}',
      '${safe(data.title)}',
      '${safe(data.body)}',
      '${safe(createdBy)}',
      CURRENT_TIMESTAMP(),
      ${tsOrNull(data.publishStart)},
      ${tsOrNull(data.publishEnd)},
      '${safe(data.audienceType)}',
      ${data.audienceValue ? `'${safe(data.audienceValue)}'` : "NULL"},
      ${boolStr(data.isActive)},
      ${boolStr(data.isPinned)}
    )
  `);
  return id;
}

/** Update fields on an existing announcement */
export async function updateAnnouncement(
  id: string,
  data: Partial<AnnouncementInput>,
): Promise<void> {
  const sets: string[] = ["updated_at = CURRENT_TIMESTAMP()"];
  if (data.dept          !== undefined) sets.push(`dept = '${safe(data.dept)}'`);
  if (data.priority      !== undefined) sets.push(`priority = '${safe(data.priority)}'`);
  if (data.title         !== undefined) sets.push(`title = '${safe(data.title)}'`);
  if (data.body          !== undefined) sets.push(`body = '${safe(data.body)}'`);
  if (data.audienceType  !== undefined) sets.push(`audience_type = '${safe(data.audienceType)}'`);
  if ("audienceValue"    in data)       sets.push(`audience_value = ${data.audienceValue ? `'${safe(data.audienceValue!)}'` : "NULL"}`);
  if (data.isActive      !== undefined) sets.push(`is_active = ${boolStr(data.isActive)}`);
  if (data.isPinned      !== undefined) sets.push(`is_pinned = ${boolStr(data.isPinned)}`);
  if ("publishStart"     in data)       sets.push(`publish_start = ${tsOrNull(data.publishStart)}`);
  if ("publishEnd"       in data)       sets.push(`publish_end = ${tsOrNull(data.publishEnd)}`);

  await runQuery(`UPDATE ${TBL} SET ${sets.join(", ")} WHERE id = '${safe(id)}'`);
}

/** Soft-delete an announcement */
export async function deleteAnnouncement(id: string): Promise<void> {
  await runQuery(`UPDATE ${TBL} SET deleted_at = CURRENT_TIMESTAMP() WHERE id = '${safe(id)}'`);
}
