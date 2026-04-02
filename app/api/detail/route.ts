import { NextRequest, NextResponse } from "next/server";
import { ViewFilter, getHeldClaimsDetail, getMissingOrdersDetail, getMissingNpovDetail, getAlertsDetail, getIntakeFormsDetail, getEligibilityDetail, getMissingStatusesDetail, getOutstandingPosDetail, getMissedCopaysDetail, getCBErrorsDetail } from "@/lib/queries";
import { MOCK_DRILL_DATA } from "@/lib/mock-data";

function getFilter(req: NextRequest): ViewFilter {
  const s = req.nextUrl.searchParams;
  const sister = s.get("sister");
  const state = s.get("state");
  const view = s.get("view");
  return {
    view: view ?? undefined,
    state: state ?? undefined,
    sister: sister ? Number(sister) : undefined,
  };
}

export async function GET(req: NextRequest) {
  const tile = req.nextUrl.searchParams.get("tile");
  const filter = getFilter(req);

  try {
    // Live tiles
    if (tile === "held-claims") {
      const data = await getHeldClaimsDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "missing-orders") {
      const data = await getMissingOrdersDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "missing-npov") {
      const data = await getMissingNpovDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "alerts") {
      const data = await getAlertsDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "intake-forms") {
      const data = await getIntakeFormsDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "eligibility") {
      const data = await getEligibilityDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "missing-statuses") {
      const data = await getMissingStatusesDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "outstanding-pos") {
      const data = await getOutstandingPosDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "missed-copays") {
      const data = await getMissedCopaysDetail(filter);
      return NextResponse.json(data);
    }
    if (tile === "cb-errors") {
      const data = await getCBErrorsDetail(filter);
      return NextResponse.json(data);
    }

    // Mock fallback for tiles not yet connected
    const mock = MOCK_DRILL_DATA[tile ?? ""];
    if (mock) {
      return NextResponse.json({ ...mock, total: mock.rows.length });
    }

    return NextResponse.json({
      headers: ["Note"],
      rows: [["Detail data for this tile will appear once connected to BigQuery."]],
      total: 0,
    });
  } catch (err) {
    console.error("Detail fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch detail data" }, { status: 500 });
  }
}
