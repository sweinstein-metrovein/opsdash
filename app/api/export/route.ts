import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TILE_MAP } from "@/lib/tiles";
import {
  ViewFilter,
  getHeldClaimsDetail, getMissingOrdersDetail, getMissingNpovDetail,
  getAlertsDetail, getIntakeFormsDetail, getEligibilityDetail,
  getMissingStatusesDetail, getOutstandingPosDetail, getMissedCopaysDetail,
  getCBErrorsDetail,
} from "@/lib/queries";

/** Map tile id → detail query function */
async function getDetail(tile: string, filter: ViewFilter) {
  switch (tile) {
    case "held-claims":       return getHeldClaimsDetail(filter);
    case "missing-orders":    return getMissingOrdersDetail(filter);
    case "missing-npov":      return getMissingNpovDetail(filter);
    case "alerts":            return getAlertsDetail(filter);
    case "intake-forms":      return getIntakeFormsDetail(filter);
    case "eligibility":       return getEligibilityDetail(filter);
    case "missing-statuses":  return getMissingStatusesDetail(filter);
    case "outstanding-pos":   return getOutstandingPosDetail(filter);
    case "missed-copays":     return getMissedCopaysDetail(filter);
    case "cb-errors":         return getCBErrorsDetail(filter);
    default: return null;
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accessToken = (session as unknown as Record<string, unknown>).access_token as string | undefined;
  if (!accessToken) {
    return NextResponse.json(
      { error: "no_token", message: "Google Drive access not granted. Please sign out and sign back in." },
      { status: 403 }
    );
  }

  // Parse request
  const { tile, state, sister, view } = await req.json() as {
    tile: string;
    state?: string;
    sister?: number;
    view?: string;
  };

  const filter: ViewFilter = { state, sister, view };
  const tileConfig = TILE_MAP[tile];

  // Run detail query
  const data = await getDetail(tile, filter);
  if (!data) {
    return NextResponse.json({ error: "Unknown tile" }, { status: 400 });
  }

  // Build sheet title
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const title = `OpsDash – ${tileConfig?.label ?? tile} – ${dateStr}`;

  // Build row data for Sheets API
  const headerRow = {
    values: ["#", ...data.headers].map(h => ({
      userEnteredValue: { stringValue: h },
      userEnteredFormat: {
        backgroundColor: { red: 0.11, green: 0.11, blue: 0.11 },
        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
      },
    })),
  };

  const dataRows = data.rows.map((row, i) => ({
    values: [
      { userEnteredValue: { numberValue: i + 1 } },
      ...row.map(cell => ({ userEnteredValue: { stringValue: cell } })),
    ],
  }));

  // Call Google Sheets API
  const sheetsRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{
        properties: { title: "Data", gridProperties: { frozenRowCount: 1 } },
        data: [{ startRow: 0, startColumn: 0, rowData: [headerRow, ...dataRows] }],
      }],
    }),
  });

  if (!sheetsRes.ok) {
    const err = await sheetsRes.json().catch(() => ({}));
    console.error("[export] Sheets API error:", err);
    return NextResponse.json(
      { error: err?.error?.message ?? "Failed to create Google Sheet" },
      { status: 500 }
    );
  }

  const sheet = await sheetsRes.json();
  const url = `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`;
  return NextResponse.json({ url, title });
}
