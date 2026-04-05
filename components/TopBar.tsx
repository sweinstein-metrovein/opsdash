"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAllSisterGroups } from "@/lib/facilities";

const STATE_LABELS_MAP: Record<string, string> = {
  AZ: "Arizona", CT: "Connecticut", MI: "Michigan",
  NJ: "New Jersey", NY: "New York", TX: "Texas",
};

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
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  return (
    <header
      className="flex-shrink-0 relative"
      style={{
        background: "linear-gradient(135deg, #c8ecf9 0%, #d4f1ff 50%, #cbedfb 100%)",
        boxShadow: "0 2px 12px rgba(0,40,71,0.1), 0 1px 3px rgba(0,40,71,0.06)",
        borderBottom: "1px solid rgba(0,60,100,0.1)",
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 120% at 80% 50%, rgba(255,255,255,0.35) 0%, transparent 70%)",
        }}
      />

      <div className="relative px-7 flex items-center justify-between" style={{ height: "76px" }}>

        {/* ── Left: back + breadcrumb + title ── */}
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all"
              style={{ color: "rgba(0,40,71,0.65)", background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,40,71,0.1)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.75)";
                (e.currentTarget as HTMLElement).style.color      = "#002847";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.5)";
                (e.currentTarget as HTMLElement).style.color      = "rgba(0,40,71,0.65)";
              }}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.8 }}>
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
              </svg>
              Back
            </Link>
          )}

          <div>
            {/* Breadcrumb trail */}
            <div className="flex items-center gap-1" style={{ fontSize: "10.5px" }}>
              <Link href="/dashboard"
                    className="font-bold transition-opacity hover:opacity-80"
                    style={{ color: "#002847" }}>
                Metro Vein Centers
              </Link>
              <Chevron />
              <span style={{ color: "rgba(0,40,71,0.45)" }}>Ops Dashboard</span>

              {crumbs.slice(0, -1).map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <Chevron />
                  {crumb.href ? (
                    <Link href={crumb.href}
                          className="transition-opacity hover:opacity-80"
                          style={{ color: "rgba(0,40,71,0.6)" }}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <span style={{ color: "rgba(0,40,71,0.6)" }}>{crumb.label}</span>
                  )}
                </span>
              ))}

              {crumbs.length > 0 && (
                <span className="flex items-center gap-1">
                  <Chevron />
                  <span style={{ color: "#002847", fontWeight: 700 }}>
                    {crumbs[crumbs.length - 1].label}
                  </span>
                </span>
              )}
            </div>

            {/* Page title */}
            <h1
              className="font-bold leading-tight mt-0.5"
              style={{ fontSize: "21px", color: "#002847", letterSpacing: "-0.01em" }}
            >
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* ── Right: live indicator + date ── */}
        <div className="flex items-center gap-2.5">
          {/* Live pill */}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#064e3b",
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(5,150,105,0.25)",
              backdropFilter: "blur(4px)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} />
            Live
          </div>

          {/* Date pill */}
          <div
            className="rounded-full px-3 py-1.5"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "rgba(0,40,71,0.7)",
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(0,40,71,0.1)",
              backdropFilter: "blur(4px)",
            }}
          >
            {dateStr}
          </div>
        </div>

      </div>
    </header>
  );
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
      <path d="M7.5 4.5l5 5.5-5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
