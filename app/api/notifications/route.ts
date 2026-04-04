import { NextRequest, NextResponse } from "next/server";
import { ViewFilter, getTodayVoicemailNotifications, getTodaySameDayBookingNotifications } from "@/lib/queries";

function getFilter(req: NextRequest): ViewFilter {
  const s = req.nextUrl.searchParams;
  const sister = s.get("sister");
  const state  = s.get("state");
  return {
    state:  state  ?? undefined,
    sister: sister ? Number(sister) : undefined,
  };
}

export async function GET(req: NextRequest) {
  const filter = getFilter(req);
  try {
    const [voicemails, bookings] = await Promise.all([
      getTodayVoicemailNotifications(filter).catch(() => []),
      getTodaySameDayBookingNotifications(filter).catch(() => []),
    ]);

    // Merge and sort by most recent first
    const all = [...voicemails, ...bookings].sort((a, b) =>
      b.sortTime.localeCompare(a.sortTime)
    );

    return NextResponse.json(all);
  } catch (err) {
    console.error("[notifications] failed:", err);
    return NextResponse.json([], { status: 200 });
  }
}
