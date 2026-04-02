"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAllSisterGroups } from "@/lib/facilities";

const STATE_LABELS_MAP: Record<string, string> = {
  AZ: "Arizona", CT: "Connecticut", MI: "Michigan",
  NJ: "New Jersey", NY: "New York", TX: "Texas",
};

// Brand blue — used as header background
const BRAND_BLUE = "#d4f1ff";

export default function TopBar() {
  const searchParams = useSearchParams();
  const state  = searchParams.get("state");
  const sister = searchParams.get("sister") ? Number(searchParams.get("sister")) : null;

  let pageTitle = "All Clinics";
  let crumbs: { label: string; href?: string }[] = [];

  if (sister) {
    const group     = getAllSisterGroups().find(g => g.sisterFacilityId === sister);
    const groupName = group?.facNameCombined ?? `Sister Group ${sister}`;
    crumbs = [
      { label: "All Clinics", href: "/dashboard" },
      ...(state ? [{ label: STATE_LABELS_MAP[state] ?? state, href: `/dashboard?state=${state}` }] : []),
      { label: groupName },
    ];
    pageTitle = groupName;
  } else if (state) {
    const stateLabel = STATE_LABELS_MAP[state] ?? state;
    crumbs = [
      { label: "All Clinics", href: "/dashboard" },
      { label: stateLabel },
    ];
    pageTitle = stateLabel;
  } else {
    crumbs = [{ label: "All Clinics" }];
  }

  const backHref = crumbs.length > 1 ? (crumbs[crumbs.length - 2].href ?? "/dashboard") : null;

  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <header
      className="flex-shrink-0"
      style={{ background: BRAND_BLUE, boxShadow: "0 2px 8px rgba(142,213,248,0.4)" }}
    >
      <div className="px-7 flex items-center justify-between" style={{ height: "68px" }}>

        {/* ── Left: back button + brand + breadcrumb ── */}
        <div className="flex items-center gap-4">

          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all text-[12px] font-semibold"
              style={{ color: "rgba(0,60,100,0.7)", background: "rgba(255,255,255,0.35)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color      = "rgba(0,60,100,0.95)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.55)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color      = "rgba(0,60,100,0.7)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.35)";
              }}
            >
              ← Back
            </Link>
          )}

          <div>
            {/* Brand name + breadcrumb path */}
            <div className="flex items-center gap-1 mb-0.5" style={{ fontSize: "11px" }}>
              <Link
                href="/dashboard"
                className="font-bold transition-opacity hover:opacity-70"
                style={{ color: "#003c64" }}
              >
                Metro Vein Centers
              </Link>
              <span style={{ color: "rgba(0,60,100,0.35)" }}>›</span>
              <span style={{ color: "rgba(0,60,100,0.55)" }}>Ops Dashboard</span>

              {crumbs.slice(0, -1).map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span style={{ color: "rgba(0,60,100,0.35)" }}>›</span>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="transition-opacity hover:opacity-70"
                      style={{ color: "rgba(0,60,100,0.65)" }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span style={{ color: "rgba(0,60,100,0.65)" }}>{crumb.label}</span>
                  )}
                </span>
              ))}

              {crumbs.length > 0 && (
                <span className="flex items-center gap-1">
                  <span style={{ color: "rgba(0,60,100,0.35)" }}>›</span>
                  <span style={{ color: "#003c64", fontWeight: 700 }}>
                    {crumbs[crumbs.length - 1].label}
                  </span>
                </span>
              )}
            </div>

            {/* Page title */}
            <h1
              className="font-bold leading-tight tracking-tight"
              style={{ fontSize: "20px", color: "#002847" }}
            >
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* ── Right: live pill + date ── */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#005a2b",
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(0,90,43,0.2)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#16a34a" }}
            />
            Live
          </div>
          <div
            className="rounded-full px-3 py-1.5"
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#003c64",
              background: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(0,60,100,0.15)",
            }}
          >
            {dateStr}
          </div>
        </div>

      </div>
    </header>
  );
}
