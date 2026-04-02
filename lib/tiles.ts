export type TileSection =
  | "billing"
  | "scheduling"
  | "followup"
  | "collections";

export interface TileConfig {
  id: string;
  label: string;
  section: TileSection;
  sub?: string;
  format?: "number" | "percent" | "dollar";
  drilldownTable?: string;
  externalUrl?: string;        // If set, tile click opens this URL instead of detail page
  noLink?: boolean;            // If true, tile is display-only (no click/navigation)
  secondaryTileId?: string;    // If set, tile shows a second metric from this API key
  secondaryFormat?: "number" | "percent" | "dollar";
  primaryLabel?: string;       // Small label under primary value
  secondaryLabel?: string;     // Small label under secondary value
}

export const SECTIONS: Record<TileSection, string> = {
  billing: "Billing & Claims",
  scheduling: "Scheduling & Intake",
  followup: "Patient Follow-Up",
  collections: "Collections & Performance",
};

export const TILES: TileConfig[] = [
  // Billing & Claims
  { id: "held-claims",       label: "Held Claims",              section: "billing",     sub: "Active Holds",       format: "number" },
  { id: "missing-orders",    label: "Missing Orders",           section: "billing",     sub: "Outstanding",        format: "number" },
  { id: "missing-npov",      label: "Home Loc / Missing NPOV",  section: "billing",     sub: "Outstanding",        format: "number" },
  { id: "alerts",            label: "Outstanding Alerts/Flags", section: "billing",     sub: "Require Attention",  format: "number" },

  // Scheduling & Intake
  { id: "intake-forms",      label: "Intake Forms",             section: "scheduling",  sub: "Next 7 Days",        format: "number" },
  { id: "eligibility",       label: "Insurance Eligibility",    section: "scheduling",  sub: "Unverified · Today", format: "number" },
  { id: "missing-statuses",  label: "Missing Appt Statuses",    section: "scheduling",  sub: "Outstanding",        format: "number" },
  { id: "schedule-updates",  label: "Schedule Updates",         section: "scheduling",  sub: "Pending Action",     format: "number" },

  // Patient Follow-Up
  { id: "missing-docs",      label: "Missing Documents",        section: "followup",    sub: "Outstanding",        format: "number" },
  { id: "first-tx-calls",    label: "First Treatment Calls",    section: "followup",    sub: "Not Yet Called",     format: "number" },
  { id: "voicemails",        label: "Voicemails",               section: "followup",    sub: "Unreturned",         format: "number" },
  { id: "outstanding-pos",   label: "Outstanding POs",          section: "followup",    sub: "Open Orders",        format: "number" },
  { id: "incomplete-consents", label: "Incomplete Consents",    section: "followup",    sub: "Outstanding",        format: "number" },

  // Collections & Performance
  { id: "cb-errors",         label: "Flagged C&B Errors",       section: "collections", sub: "Flagged Rows",       format: "number" },
  {
    id: "missed-copays",     label: "POS Copay Collections",    section: "collections", sub: "{month}",            format: "number",
    primaryLabel: "Missed",  secondaryTileId: "copay-pct",      secondaryFormat: "percent", secondaryLabel: "Collected",
  },
  { id: "stockings",         label: "Stockings Collections",    section: "collections", sub: "{month}",            format: "dollar", externalUrl: "https://docs.google.com/spreadsheets/d/18VQbL8kjUpcI6AImxPU4WBWUMph0QY_QYWOrqion9zg/edit?gid=1361181479#gid=1361181479&range=C1:N1" },
  { id: "five-stars",        label: "Five ★ Reviews",           section: "collections", sub: "{month} Reviews",    format: "number", noLink: true },
];

export const TILE_MAP = Object.fromEntries(TILES.map((t) => [t.id, t]));

/** Format a raw number into the tile's display string */
export function formatValue(value: number, format?: TileConfig["format"]): string {
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "dollar")  return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}
