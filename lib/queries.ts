import { runQuery } from "./bigquery";

const PROJECT = process.env.BIGQUERY_PROJECT_ID!;

// ─── FORMATTING HELPERS ────────────────────────────────────────────────────────

/** BigQuery DATE → "YYYY-MM-DD" */
function formatBQDate(val: unknown): string {
  if (!val) return "–";
  if (typeof val === "object" && val !== null && "value" in val) {
    return String((val as { value: string }).value);
  }
  return String(val).split("T")[0];
}

/** BigQuery DATETIME → "YYYY-MM-DD HH:MM" */
function formatBQDateTime(val: unknown): string {
  if (!val) return "–";
  const s = typeof val === "object" && val !== null && "value" in val
    ? String((val as { value: string }).value)
    : String(val);
  // "2026-03-15T10:30:00" → "2026-03-15 10:30"
  return s.replace("T", " ").slice(0, 16);
}

function formatCurrency(val: unknown): string {
  if (val == null || val === "") return "–";
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function str(val: unknown): string {
  return val != null && val !== "" ? String(val) : "–";
}
const DATASET = process.env.BIGQUERY_DATASET!;

/** Build a fully-qualified table reference. Pass a dataset override when the table lives outside the default dataset. */
function tbl(table: string, dataset?: string) {
  return `\`${PROJECT}.${dataset ?? DATASET}.${table}\``;
}

/** Build a WHERE clause based on the current view filter.
 *  Pass field name overrides if the table uses non-standard names. */
function whereClause(
  filter: ViewFilter,
  opts: { stateField?: string; sisterField?: string } = {}
): string {
  const sf = opts.stateField  ?? "facility_state";
  const sid = opts.sisterField ?? "SisterFacilityID";
  if (filter.sister !== undefined) return `WHERE ${sid} = ${filter.sister}`;
  if (filter.state)               return `WHERE ${sf} = '${filter.state}'`;
  return "";
}

export interface ViewFilter {
  view?: string;   // "company"
  state?: string;  // e.g. "TX"
  sister?: number; // e.g. 34
}

// ─── TILE VALUE QUERIES ────────────────────────────────────────────────────────

/**
 * TILE 1 — Held Claims
 * Metric: COUNT DISTINCT patient_id
 */
export async function getHeldClaimsCount(filter: ViewFilter): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("daily_held_claims")}
    ${whereClause(filter)}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

// ─── DETAIL TABLE QUERIES ──────────────────────────────────────────────────────

export interface DetailResult {
  headers: string[];
  rows: string[][];
  total: number;
  rowHighlights?: boolean[];    // true = red highlight
  orangeHighlights?: boolean[]; // true = orange highlight
  wideColumns?: number[];       // column indices that should wrap text
  linkColumns?: number[];       // column indices whose cell value is a URL — rendered as "Edit Link"
}

/** Fields that should never appear in any detail view */
const HIDDEN_FIELDS = new Set(["query_run_time", "update_datetime"]);

/**
 * TILE 1 — Held Claims detail rows
 */
export async function getHeldClaimsDetail(filter: ViewFilter): Promise<DetailResult> {
  const sql = `
    SELECT
      facility_state,
      facility_name,
      doctor_name,
      date_of_service,
      patient_id,
      carrier,
      total_charge,
      insurance_balance,
      patient_balance,
      description,
      ticket_number
    FROM ${tbl("daily_held_claims")}
    ${whereClause(filter)}
    ORDER BY date_of_service DESC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Doctor Name", "Date of Service", "Patient ID",
    "Ins Carrier", "Total Charge", "Insurance Balance",
    "Patient Balance", "Description", "Ticket Number",
  ];

  const formatted = rows.map(r => [
    str(r.facility_state),
    str(r.facility_name),
    str(r.doctor_name),
    formatBQDate(r.date_of_service),
    str(r.patient_id),
    str(r.carrier),
    formatCurrency(r.total_charge),
    formatCurrency(r.insurance_balance),
    formatCurrency(r.patient_balance),
    str(r.description),
    str(r.ticket_number),
  ]);

  return { headers, rows: formatted, total: rows.length };
}

// ─── TILE 2 — MISSING ORDERS ───────────────────────────────────────────────────

export async function getMissingOrdersCount(filter: ViewFilter): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("missing_orders")}
    ${whereClause(filter, { stateField: "FacilityState" })}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getMissingOrdersDetail(filter: ViewFilter): Promise<DetailResult> {
  // Build WHERE using this table's field names
  let where = "";
  if (filter.sister !== undefined) {
    where = `WHERE SisterFacilityID = ${filter.sister}`;
  } else if (filter.state) {
    where = `WHERE FacilityState = '${filter.state}'`;
  }

  const sql = `
    SELECT
      FacilityState,
      FacilityName,
      CONCAT(PatientFirst, ' ', PatientLast) AS PatientName,
      PatientID,
      AppointmentRespProvider,
      AppointmentType,
      AppointmentStartDate,
      MostRecentOrderDate,
      OutstandingReason
    FROM ${tbl("missing_orders")}
    ${where}
    ORDER BY AppointmentStartDate DESC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Patient Name", "Patient ID",
    "Provider", "Appt Type", "Appt Date",
    "Last Order Date", "Reason",
  ];

  const formatted = rows.map(r => [
    str(r.FacilityState),
    str(r.FacilityName),
    str(r.PatientName),
    str(r.PatientID),
    str(r.AppointmentRespProvider),
    str(r.AppointmentType),
    formatBQDateTime(r.AppointmentStartDate),
    formatBQDateTime(r.MostRecentOrderDate),
    str(r.OutstandingReason),
  ]);

  return { headers, rows: formatted, total: rows.length };
}

// ─── TILE 4 — OUTSTANDING ALERTS / FLAGS ──────────────────────────────────────

export async function getAlertsCount(filter: ViewFilter): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("outstanding_alerts_flags")}
    ${whereClause(filter, { stateField: "HomeState", sisterField: "SisterFacility_ID" })}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getAlertsDetail(filter: ViewFilter): Promise<DetailResult> {
  const sql = `
    SELECT
      HomeState,
      FacilityName,
      Employee,
      from_user,
      QueueGroup,
      FlagCategory,
      HomeState AS HomeStateCopy,
      JobTitle,
      SUBJECT,
      MESSAGE
    FROM ${tbl("outstanding_alerts_flags")}
    ${whereClause(filter, { stateField: "HomeState", sisterField: "SisterFacility_ID" })}
    ORDER BY FacilityName, Employee
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  // Column 9 (index 9, MESSAGE) is wide + wrapping
  const headers = [
    "State", "Clinic", "Employee", "From",
    "Queue Group", "Flag Category", "Home State",
    "Job Title", "Subject", "Message",
  ];

  const formatted = rows.map(r => [
    str(r.HomeState),
    str(r.FacilityName),
    str(r.Employee),
    str(r.from_user),
    str(r.QueueGroup),
    str(r.FlagCategory),
    str(r.HomeStateCopy),
    str(r.JobTitle),
    str(r.SUBJECT),
    str(r.MESSAGE),
  ]);

  return { headers, rows: formatted, total: rows.length, wideColumns: [9] };
}

// ─── TILE 3 — HOME LOCATION / MISSING NPOV ────────────────────────────────────

export async function getMissingNpovCount(filter: ViewFilter): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("home_location_missing_npov")}
    ${whereClause(filter, { stateField: "FacilityState", sisterField: "SistersID" })}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getMissingNpovDetail(filter: ViewFilter): Promise<DetailResult> {
  const sql = `
    SELECT
      FacilityState,
      Facility,
      CONCAT(PatientFirst, ' ', PatientLast) AS PatientName,
      PatientID,
      Date,
      OutstandingReason
    FROM ${tbl("home_location_missing_npov")}
    ${whereClause(filter, { stateField: "FacilityState", sisterField: "SistersID" })}
    ORDER BY Date ASC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Patient Name", "Patient ID",
    "Date", "Reason",
  ];

  // Highlight rows where Date is strictly BEFORE yesterday (yesterday itself is fine)
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
  })();

  const formatted = rows.map(r => [
    str(r.FacilityState),
    str(r.Facility),
    str(r.PatientName),
    str(r.PatientID),
    formatBQDate(r.Date),
    str(r.OutstandingReason),
  ]);

  const rowHighlights = rows.map(r => {
    const d = formatBQDate(r.Date);
    if (d === "–") return false;
    return d < yesterdayStr; // string compare works perfectly for YYYY-MM-DD
  });

  return { headers, rows: formatted, total: rows.length, rowHighlights };
}

// ─── TILE 5 — INTAKE FORMS ────────────────────────────────────────────────────
// Dataset: luma (different from default opsdash_app)

/** Count-only filter for tile 5: no completed form + appt date is today through next 7 days */
const INTAKE_FILTER = `
  AND completed_at IS NULL
  AND DATE(earliest_scheduled_consult_start_datetime) >= CURRENT_DATE()
  AND DATE(earliest_scheduled_consult_start_datetime) <= DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
`;

export async function getIntakeFormsCount(filter: ViewFilter): Promise<number> {
  const base = whereClause(filter, { stateField: "FacilityState", sisterField: "sisterfacilityid" });
  // If no base WHERE, start one; otherwise append AND conditions
  const where = base ? `${base} ${INTAKE_FILTER}` : `WHERE 1=1 ${INTAKE_FILTER}`;
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("upcoming_intake_form_status_tablev2", "luma")}
    ${where}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getIntakeFormsDetail(filter: ViewFilter): Promise<DetailResult> {
  const where = whereClause(filter, { stateField: "FacilityState", sisterField: "sisterfacilityid" });
  const sql = `
    SELECT
      FacilityState,
      FacilityName,
      CONCAT(PatientFirst, ' ', PatientLast) AS PatientName,
      PatientID,
      PatientPhone1,
      earliest_scheduled_consult_start_datetime,
      AppointmentType,
      AppointmentStatus,
      form_status,
      completed_at
    FROM ${tbl("upcoming_intake_form_status_tablev2", "luma")}
    ${where}
    ORDER BY earliest_scheduled_consult_start_datetime ASC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Patient Name", "Patient ID",
    "Phone", "Appt Date", "Appt Type",
    "Appt Status", "Form Status", "Completed At",
  ];

  const formatted = rows.map(r => [
    str(r.FacilityState),
    str(r.FacilityName),
    str(r.PatientName),
    str(r.PatientID),
    str(r.PatientPhone1),
    formatBQDateTime(r.earliest_scheduled_consult_start_datetime),
    str(r.AppointmentType),
    str(r.AppointmentStatus),
    str(r.form_status),
    r.completed_at ? formatBQDateTime(r.completed_at) : "–",
  ]);

  // Orange highlight: form_status = 'Incomplete' AND appointment falls within the current Mon–Sun week
  const now       = new Date();
  const dow       = now.getDay(); // 0 = Sun
  const monday    = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday    = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const mondayStr = monday.toISOString().split("T")[0];
  const sundayStr = sunday.toISOString().split("T")[0];

  const orangeHighlights = rows.map(r => {
    if (str(r.form_status) !== "Incomplete") return false;
    const apptDate = formatBQDateTime(r.earliest_scheduled_consult_start_datetime).split(" ")[0];
    return apptDate >= mondayStr && apptDate <= sundayStr;
  });

  return { headers, rows: formatted, total: rows.length, orangeHighlights };
}

// ─── TILE 6 — INSURANCE ELIGIBILITY ───────────────────────────────────────────

/** Filter: today's appointments where insurance is not yet confirmed active */
const ELIGIBILITY_FILTER = `
  AND DATE(AppointmentStartDate) = CURRENT_DATE()
  AND InsuranceStatus <> 'Active Coverage'
`;

export async function getEligibilityCount(filter: ViewFilter): Promise<number> {
  const base = whereClause(filter);
  const where = base ? `${base} ${ELIGIBILITY_FILTER}` : `WHERE 1=1 ${ELIGIBILITY_FILTER}`;
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("appointmnet_ins_eligibility")}
    ${where}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getEligibilityDetail(filter: ViewFilter): Promise<DetailResult> {
  const where = whereClause(filter);
  const sql = `
    SELECT
      FacilityState,
      FacilityName,
      PatientID,
      PatientFirst,
      PatientLast,
      PatientPhone,
      AppointmentType,
      AppointmentStatus,
      AppointmentStartDate,
      InsuranceStatus,
      InsuranceName,
      EligibilityVerifiedDate,
      EligibilityVerifiedBy
    FROM ${tbl("appointmnet_ins_eligibility")}
    ${where}
    ORDER BY AppointmentStartDate ASC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Patient ID", "Patient First", "Patient Last",
    "Patient Phone", "Appt Type", "Appt Status", "Appt Start Date",
    "Insurance Status", "Insurance Name", "Eligibility Verified Date", "Eligibility Verified By",
  ];

  const formatted = rows.map(r => [
    str(r.FacilityState),
    str(r.FacilityName),
    str(r.PatientID),
    str(r.PatientFirst),
    str(r.PatientLast),
    str(r.PatientPhone),
    str(r.AppointmentType),
    str(r.AppointmentStatus),
    formatBQDateTime(r.AppointmentStartDate),
    str(r.InsuranceStatus),
    str(r.InsuranceName),
    r.EligibilityVerifiedDate ? formatBQDateTime(r.EligibilityVerifiedDate) : "–",
    str(r.EligibilityVerifiedBy),
  ]);

  return { headers, rows: formatted, total: rows.length };
}

// ─── TILE 7 — MISSING APPT STATUSES ──────────────────────────────────────────

export async function getMissingStatusesCount(filter: ViewFilter): Promise<number> {
  const where = whereClause(filter);
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("scheduled_procedure_statuses")}
    ${where}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getMissingStatusesDetail(filter: ViewFilter): Promise<DetailResult> {
  const where = whereClause(filter);
  const sql = `
    SELECT
      FacilityState,
      FacilityName,
      PatientID,
      PatientFirst,
      PatientLast,
      PatientPhone,
      PatientInsuranceID,
      AppointmentID,
      AppointmentType,
      AppointmentStatus,
      AppointmentStartDate
    FROM ${tbl("scheduled_procedure_statuses")}
    ${where}
    ORDER BY AppointmentStartDate ASC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Patient ID", "Patient First", "Patient Last",
    "Patient Phone", "Insurance ID", "Appointment ID",
    "Appt Type", "Appt Status", "Appt Start Date",
  ];

  const formatted = rows.map(r => [
    str(r.FacilityState),
    str(r.FacilityName),
    str(r.PatientID),
    str(r.PatientFirst),
    str(r.PatientLast),
    str(r.PatientPhone),
    str(r.PatientInsuranceID),
    str(r.AppointmentID),
    str(r.AppointmentType),
    str(r.AppointmentStatus),
    formatBQDateTime(r.AppointmentStartDate),
  ]);

  return { headers, rows: formatted, total: rows.length };
}

// ─── TILE 12 — OUTSTANDING POs ────────────────────────────────────────────────
// Note: this table uses spaces in field names — all refs must be backtick-quoted

export async function getOutstandingPosCount(filter: ViewFilter): Promise<number> {
  const where = whereClause(filter, {
    stateField: "`Facility State`",
    sisterField: "SisterFacilityID",
  });
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("outstanding_pos")}
    ${where}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getOutstandingPosDetail(filter: ViewFilter): Promise<DetailResult> {
  const where = whereClause(filter, {
    stateField: "`Facility State`",
    sisterField: "SisterFacilityID",
  });
  const sql = `
    SELECT
      \`Facility State\`,
      \`Facility Name\`,
      \`PO Number\`,
      \`PO Status\`,
      \`Order Date\`,
      \`Vendor Name\`,
      \`Vendor Item Number\`,
      \`Inventory Number\`,
      \`Inventory Description\`,
      \`Order UOM\`,
      \`Order Quantity\`,
      \`Days Outstanding\`
    FROM ${tbl("outstanding_pos")}
    ${where}
    ORDER BY \`Days Outstanding\` DESC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "PO Number", "PO Status", "Order Date",
    "Vendor Name", "Vendor Item #", "Inventory #",
    "Inventory Description", "UOM", "Qty", "Days Outstanding",
  ];

  const formatted = rows.map(r => [
    str(r["Facility State"]),
    str(r["Facility Name"]),
    str(r["PO Number"]),
    str(r["PO Status"]),
    formatBQDateTime(r["Order Date"]),
    str(r["Vendor Name"]),
    str(r["Vendor Item Number"]),
    str(r["Inventory Number"]),
    str(r["Inventory Description"]),
    str(r["Order UOM"]),
    str(r["Order Quantity"]),
    str(r["Days Outstanding"]),
  ]);

  return { headers, rows: formatted, total: rows.length };
}

// ─── TILE 15 — MISSED COPAYS ──────────────────────────────────────────────────
// sisterfacilityid is STRING in this table — cast to INT64 for sister filter

export async function getMissedCopaysCount(filter: ViewFilter): Promise<number> {
  const where = whereClause(filter, {
    stateField: "facilitystate",
    sisterField: "CAST(sisterfacilityid AS INT64)",
  });
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("missed_copays")}
    ${where}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getMissedCopaysDetail(filter: ViewFilter): Promise<DetailResult> {
  const where = whereClause(filter, {
    stateField: "facilitystate",
    sisterField: "CAST(sisterfacilityid AS INT64)",
  });
  const sql = `
    SELECT
      facilitystate,
      FacilityName,
      PatientID,
      AttendedAppointmentDate
    FROM ${tbl("missed_copays")}
    ${where}
    ORDER BY AttendedAppointmentDate DESC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = ["State", "Clinic", "Patient ID", "Appointment Date"];

  const formatted = rows.map(r => [
    str(r.facilitystate),
    str(r.FacilityName),
    str(r.PatientID),
    formatBQDate(r.AttendedAppointmentDate),
  ]);

  return { headers, rows: formatted, total: rows.length };
}

// ─── TILE 15 (secondary) — POS COPAY COLLECTION % ────────────────────────────
// One row per sister per month. sisterfacilityid is STRING — cast for filter.
// Sister view: one row, so the calculation is exact.
// State/company view: SUM(collected) / SUM(opportunity) across all rows.

export async function getCopayPctCount(filter: ViewFilter): Promise<number> {
  const where = whereClause(filter, {
    stateField: "FacilityState",
    sisterField: "CAST(sisterfacilityid AS INT64)",
  });
  const sql = `
    SELECT
      SAFE_DIVIDE(SUM(copay_collected_dollars), SUM(copay_opportunity_dollars)) * 100 AS pct
    FROM ${tbl("copay_collections")}
    ${where}
  `;
  const rows = await runQuery<{ pct: unknown }>(sql);
  return Number(rows[0]?.pct ?? 0);
}

// ─── TILE 17 — STOCKINGS COLLECTIONS ─────────────────────────────────────────
// One row per sister group; metric = SUM(TotalPmnt) for the filtered aggregate.
// SisterFacilityID is STRING — cast for comparison.
// No detail page — tile click redirects externally via externalUrl in tiles.ts.

export async function getStockingsCount(filter: ViewFilter): Promise<number> {
  const where = whereClause(filter, {
    stateField: "state",
    sisterField: "CAST(SisterFacilityID AS INT64)",
  });
  const sql = `
    SELECT SUM(TotalPmnt) AS total
    FROM ${tbl("stocking_dollars")}
    ${where}
  `;
  const rows = await runQuery<{ total: unknown }>(sql);
  return Number(rows[0]?.total ?? 0);
}

// ─── TILE 18 — FIVE STAR REVIEWS ─────────────────────────────────────────────
// One row per sister per month. Metric = SUM(ReviewCount) for the filtered aggregate.
// No detail page — tile is display-only.

export async function getFiveStarsCount(filter: ViewFilter): Promise<number> {
  const where = whereClause(filter, {
    stateField: "State",
    sisterField: "SisterFacilityID",
  });
  const sql = `
    SELECT SUM(ReviewCount) AS total
    FROM ${tbl("five_star_reviews")}
    ${where}
  `;
  const rows = await runQuery<{ total: unknown }>(sql);
  return Number(rows[0]?.total ?? 0);
}

// ─── TILE 14 — FLAGGED C&B ERRORS ────────────────────────────────────────────
// Count: rows WHERE FlagType IS NOT NULL per aggregate.
// Detail: ALL rows ordered by appointmentDate DESC; flagged rows highlighted red.
// EditFormCustomLink (col index 2) rendered as hyperlink.

export async function getCBErrorsCount(filter: ViewFilter): Promise<number> {
  const base = whereClause(filter, { stateField: "state" });
  const where = base
    ? `${base} AND FlagType IS NOT NULL`
    : `WHERE FlagType IS NOT NULL`;
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM ${tbl("checks_and_balances")}
    ${where}
  `;
  const rows = await runQuery<{ cnt: bigint | number }>(sql);
  return Number(rows[0]?.cnt ?? 0);
}

export async function getCBErrorsDetail(filter: ViewFilter): Promise<DetailResult> {
  const where = whereClause(filter, { stateField: "state" });
  const sql = `
    SELECT
      state,
      facility,
      EditFormCustomLink,
      FlagType,
      appointmentDate,
      patientId,
      patientName,
      totalCollection,
      appointmentType,
      appointmentStatus,
      appointmentTime,
      copayDue,
      balanceDue,
      copayPaid,
      balancePaid,
      preCollectPaid,
      selfPayProcedureType,
      selfPayProcedurePaid,
      stockingQty,
      dermakaQty,
      productsPurchased,
      paymentCreditCard,
      paymentACH,
      paymentCareCredit,
      paymentCash,
      remainingBalance,
      staffInitials,
      WalkinFlag,
      notes
    FROM ${tbl("checks_and_balances")}
    ${where}
    ORDER BY appointmentDate DESC
    LIMIT 10000
  `;

  const rows = await runQuery<Record<string, unknown>>(sql);

  const headers = [
    "State", "Clinic", "Edit", "Flag Type", "Date",
    "Patient ID", "Patient Name", "Total Collection",
    "Appt Type", "Appt Status", "Appt Time",
    "Copay Due", "Balance Due", "Copay Paid", "Balance Paid", "Pre-Collect Paid",
    "Self-Pay Type", "Self-Pay Paid", "Stocking Qty", "Dermaka Qty", "Products",
    "CC Payment", "ACH", "CareCredit", "Cash", "Remaining Balance",
    "Staff", "Walk-in", "Notes",
  ];

  const formatted = rows.map(r => [
    str(r.state),
    str(r.facility),
    str(r.EditFormCustomLink),        // col 2 — rendered as hyperlink
    str(r.FlagType),
    formatBQDate(r.appointmentDate),
    str(r.patientId),
    str(r.patientName),
    formatCurrency(r.totalCollection),
    str(r.appointmentType),
    str(r.appointmentStatus),
    str(r.appointmentTime),
    formatCurrency(r.copayDue),
    formatCurrency(r.balanceDue),
    formatCurrency(r.copayPaid),
    formatCurrency(r.balancePaid),
    formatCurrency(r.preCollectPaid),
    str(r.selfPayProcedureType),
    formatCurrency(r.selfPayProcedurePaid),
    str(r.stockingQty),
    str(r.dermakaQty),
    str(r.productsPurchased),
    formatCurrency(r.paymentCreditCard),
    formatCurrency(r.paymentACH),
    formatCurrency(r.paymentCareCredit),
    formatCurrency(r.paymentCash),
    formatCurrency(r.remainingBalance),
    str(r.staffInitials),
    str(r.WalkinFlag),
    str(r.notes),
  ]);

  const rowHighlights = rows.map(r => r.FlagType !== null && r.FlagType !== undefined);

  return {
    headers,
    rows: formatted,
    total: rows.length,
    rowHighlights,
    linkColumns: [2],   // EditFormCustomLink
    wideColumns: [28],  // notes
  };
}
