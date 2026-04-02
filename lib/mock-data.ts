/**
 * Mock data — used while BigQuery is not yet connected.
 * Each key matches a tile id. Values will be replaced by real BQ queries.
 */

export const MOCK_TILE_VALUES: Record<string, number> = {
  "held-claims":          1,
  "missing-orders":       0,
  "missing-npov":         0,
  "alerts":               16,
  "intake-forms":         30,
  "eligibility":          1,
  "missing-statuses":     1,
  "schedule-updates":     1,
  "missing-docs":         152,
  "first-tx-calls":       143,
  "voicemails":           135,
  "outstanding-pos":      11,
  "incomplete-consents":  152,
  "cb-errors":            1,
  "missed-copays":        40,
  "pos-copay":            86,
  "stockings":            738,
  "five-stars":           3,
};

export const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    time: "12:15 PM",
    note: "New Voicemail – White Rock-Coppell Sisters",
    detail: "(972) 834-7613",
    patientId: "362177",
  },
  {
    id: "2",
    time: "11:42 AM",
    note: "Held Claim requires review – Anthem BCBS",
    detail: "Claim #94201",
    patientId: "358904",
  },
  {
    id: "3",
    time: "10:08 AM",
    note: "Outstanding Alert flagged – eligibility issue",
    detail: "Appt 3/31",
    patientId: "361002",
  },
];

export const MOCK_REFERENCES = [
  { id: "1", label: "Master Facility Resource", icon: "📁", url: "https://docs.google.com/spreadsheets/d/1rlHx_UQlN157G8VYS40XZhl7U-39vvt8RupUZImBUSY/edit?usp=sharing" },
  { id: "2", label: "Digital Intake Forms",     icon: "📋", url: "https://docs.google.com/spreadsheets/d/1PKBzMXexSR8Dpp0J0j3qHcSUZfiKmRhfirtiE1rkThc/edit?usp=sharing" },
  { id: "3", label: "Accepted Insurance Lookup", icon: "🔍", url: "https://mvc-apt-finder-846153420097.us-central1.run.app/" },
  { id: "4", label: "POS Tracker",               icon: "📊", url: "https://docs.google.com/spreadsheets/d/18VQbL8kjUpcI6AImxPU4WBWUMph0QY_QYWOrqion9zg/edit?usp=sharing" },
];

export const MOCK_CLINICS = [
  { id: "coppell",    name: "Coppell",    region: "North Texas" },
  { id: "whiterock",  name: "White Rock", region: "North Texas" },
  { id: "plano",      name: "Plano",      region: "North Texas" },
  { id: "frisco",     name: "Frisco",     region: "North Texas" },
  { id: "allen",      name: "Allen",      region: "North Texas" },
];

export const MOCK_DRILL_DATA: Record<string, { headers: string[]; rows: string[][] }> = {
  "held-claims": {
    headers: ["Patient", "Patient ID", "Appt Date", "Insurance", "Held Reason", "Days Held"],
    rows: [
      ["Sarah Johnson", "362177", "3/28/2026", "Anthem BCBS", "Missing Auth", "3 days"],
    ],
  },
  "missing-docs": {
    headers: ["Patient", "Patient ID", "Provider", "Appt Date", "Missing Item", "Status"],
    rows: [
      ["Maria Torres",  "359001", "Dr. Smith", "3/31/2026", "Consent Form",  "Pending"],
      ["James Lee",     "358774", "Dr. Patel", "3/30/2026", "Photo ID",      "Pending"],
      ["Linda Chen",    "358512", "Dr. Smith", "3/29/2026", "Insurance Card","Sent to Patient"],
      ["Robert Kim",    "357988", "Dr. Jones", "3/28/2026", "Consent Form",  "Pending"],
      ["Emily Davis",   "357122", "Dr. Patel", "3/27/2026", "Referral",      "Pending"],
    ],
  },
  "outstanding-pos": {
    headers: ["PO #", "Vendor", "Item", "Amount", "Date Ordered", "Status"],
    rows: [
      ["PO-1042", "Medline",         "Compression Stockings", "$245.00", "3/20/2026", "In Transit"],
      ["PO-1038", "Cardinal Health", "Procedure Supplies",    "$892.50", "3/18/2026", "Backordered"],
      ["PO-1031", "Medline",         "Gauze Bandages",        "$118.00", "3/14/2026", "Delivered"],
    ],
  },
  "voicemails": {
    headers: ["Time", "Phone", "Patient", "Patient ID", "Note"],
    rows: [
      ["12:15 PM", "(972) 834-7613", "Unknown",      "362177", "White Rock-Coppell Sisters"],
      ["11:30 AM", "(214) 555-0192", "Mark Allen",   "361450", "Callback re: appointment"],
      ["10:45 AM", "(972) 555-8847", "Patricia Wu",  "360882", "Insurance question"],
    ],
  },
  "alerts": {
    headers: ["Patient", "Patient ID", "Alert Type", "Appt Date", "Provider", "Priority"],
    rows: [
      ["Tom Bradley", "361002", "Eligibility Issue",  "3/31/2026", "Dr. Smith", "High"],
      ["Ana Reyes",   "360741", "Missing Referral",   "4/1/2026",  "Dr. Patel", "Medium"],
      ["Kevin Park",  "360555", "Insurance Mismatch", "4/2/2026",  "Dr. Jones", "High"],
    ],
  },
};
