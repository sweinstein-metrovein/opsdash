# BigQuery Configuration Template
# Fill out every section below, then share this file back.
# Leave any field as "?" if you're unsure — we can figure it out together.

---

## DATASET INFO

BigQuery Project ID:   business-operations-325420
BigQuery Dataset Name: ?   ← e.g. "ops_dashboard" or "clinic_data"


---
## HOW TO FILL OUT EACH TILE

Each tile needs 4 things:
  TABLE       → the BigQuery table name (just the table name, not project/dataset)
  METRIC      → how the tile number is calculated:
                  "COUNT_ROWS"         = count of all rows in the table (most tiles)
                  "SUM: field_name"    = sum of a specific field
                  "SINGLE_VALUE: field_name" = the table has 1 row; use this field's value
  FILTER_BY   → the field name(s) used to filter rows by facility / region / state
                  e.g. "facility_id" or "facility_name" or "clinic_id"
  DETAIL_COLS → the columns to show on the drill-down detail page, in order
                  format: field_name AS "Display Label", field_name AS "Display Label", ...

---

## TILE 1 — Held Claims

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "Appointment Date"
    ? AS "Insurance"
    ? AS "Hold Reason"
    ? AS "Days Held"


## TILE 2 — Missing Orders

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 3 — Home Location / Missing NPOV

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 4 — Outstanding Alerts / Flags

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 5 — Intake Forms

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 6 — Insurance Eligibility

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 7 — Missing Appt Statuses

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 8 — Schedule Updates

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 9 — Missing Documents

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 10 — First Treatment Calls

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 11 — Voicemails

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 12 — Outstanding POs

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "PO Number"
    ? AS "Vendor"
    ? AS "..."


## TILE 13 — Incomplete Consents

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 14 — Flagged C&B Errors

  TABLE:       ?
  METRIC:      COUNT_ROWS
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 15 — Missed Copays

  TABLE:       ?
  METRIC:      COUNT_ROWS   ← or "SUM: field_name" if you want a dollar total
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Patient Name"
    ? AS "Patient ID"
    ? AS "..."


## TILE 16 — POS Copay Collections (%)

  TABLE:       ?
  METRIC:      SINGLE_VALUE: ?   ← field name that holds the pre-calculated % value
  FILTER_BY:   ?   ← field used to pick the right row (facility / region / company)
  DETAIL_COLS:
    ? AS "..."   ← or "NONE" if this tile has no drill-down table


## TILE 17 — Stockings Collections ($)

  TABLE:       ?
  METRIC:      SINGLE_VALUE: ?   ← field name that holds the dollar amount
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "..."   ← or "NONE"


## TILE 18 — Five Star Reviews

  TABLE:       ?
  METRIC:      COUNT_ROWS   ← or "SINGLE_VALUE: field_name" if pre-calculated
  FILTER_BY:   ?
  DETAIL_COLS:
    ? AS "Reviewer"
    ? AS "Date"
    ? AS "..."


---

## FACILITY / REGION / STATE MAPPING
# How are facilities identified in your tables?

  Facility field values look like:  ?   ← e.g. "Coppell", "COPPELL", clinic ID number
  Region field values look like:    ?   ← e.g. "North Texas", "TX-North"
  State field values look like:     ?   ← e.g. "TX", "Texas"

# If you have a separate clinics/facilities reference table, fill this in:
  Clinics table name:  ?
  Facility ID field:   ?
  Facility name field: ?
  Region field:        ?
  State field:         ?
