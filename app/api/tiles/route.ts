import { NextRequest, NextResponse } from "next/server";
import { ViewFilter } from "@/lib/queries";
import {
  getHeldClaimsCount, getMissingOrdersCount, getMissingNpovCount, getAlertsCount,
  getIntakeFormsCount, getEligibilityCount, getMissingStatusesCount,
  getScheduleUpdatesCount, getMissingDocsCount,
  getOutstandingPosCount, getMissedCopaysCount, getCopayPctCount, getStockingsCount,
  getCBErrorsCount, getFiveStarsCount,
} from "@/lib/queries";
import { MOCK_TILE_VALUES } from "@/lib/mock-data";

/** Parse filter from URL search params */
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

/** Run a tile count query; returns 0 on error so one bad query never crashes the whole route */
async function safe(label: string, fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[tiles] ${label} failed:`, err);
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const filter = getFilter(req);

  const [
    heldClaims, missingOrders, missingNpov, alerts,
    intakeForms, eligibility, missingStatuses, scheduleUpdates, missingDocs,
    outstandingPos, missedCopays, copayPct, stockings, cbErrors, fiveStars,
  ] = await Promise.all([
    safe("held-claims",        () => getHeldClaimsCount(filter)),
    safe("missing-orders",     () => getMissingOrdersCount(filter)),
    safe("missing-npov",       () => getMissingNpovCount(filter)),
    safe("alerts",             () => getAlertsCount(filter)),
    safe("intake-forms",       () => getIntakeFormsCount(filter)),
    safe("eligibility",        () => getEligibilityCount(filter)),
    safe("missing-statuses",   () => getMissingStatusesCount(filter)),
    safe("schedule-updates",   () => getScheduleUpdatesCount(filter)),
    safe("missing-docs",       () => getMissingDocsCount(filter)),
    safe("outstanding-pos",    () => getOutstandingPosCount(filter)),
    safe("missed-copays",      () => getMissedCopaysCount(filter)),
    safe("copay-pct",          () => getCopayPctCount(filter)),
    safe("stockings",          () => getStockingsCount(filter)),
    safe("cb-errors",          () => getCBErrorsCount(filter)),
    safe("five-stars",         () => getFiveStarsCount(filter)),
  ]);

  return NextResponse.json({
    "held-claims":          heldClaims,
    "missing-orders":       missingOrders,
    "missing-npov":         missingNpov,
    "alerts":               alerts,
    "intake-forms":         intakeForms,
    "eligibility":          eligibility,
    "missing-statuses":     missingStatuses,
    "schedule-updates":     scheduleUpdates,
    "missing-docs":         missingDocs,
    "first-tx-calls":       null,
    "voicemails":           null,
    "outstanding-pos":      outstandingPos,
    "incomplete-consents":  MOCK_TILE_VALUES["incomplete-consents"],
    "cb-errors":            cbErrors,
    "missed-copays":        missedCopays,
    "copay-pct":            copayPct,
    "stockings":            stockings,
    "five-stars":           fiveStars,
  });
}
