"use client";

import { useEffect, useState } from "react";
import type { PhysicianDashboardEntry, PhysicianStateGroup } from "@/lib/queries";

// ── Types matching the API responses ─────────────────────────────────────────

type DashboardData =
  | { view: "none" }
  | { view: "physician"; entry: PhysicianDashboardEntry }
  | { view: "regional"; state: string; providers: PhysicianDashboardEntry[] }
  | { view: "admin"; states: PhysicianStateGroup[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "2026-03-31" → "Mar 31, 2026" */
function fmtWeek(dateStr: string): string {
  if (!dateStr || dateStr === "–") return "";
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Extract last name for display ("Dr. Smith" from "Dr. John Smith" or full name) */
function shortName(name: string): string {
  if (!name || name === "–") return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  // "John Smith MD" → keep "Dr. John Smith" if prefix present, else first + last
  const hasDr = /^dr\.?$/i.test(parts[0]);
  if (hasDr && parts.length >= 3) return `Dr. ${parts[parts.length - 1]}`;
  return name;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A single provider link row */
function ProviderRow({
  entry,
  indent = false,
}: {
  entry: PhysicianDashboardEntry;
  indent?: boolean;
}) {
  const weekLabel = fmtWeek(entry.weekStartDate);
  return (
    <a
      href={entry.dashboardLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 py-2.5 transition-colors hover:bg-sky-50"
      style={{ paddingLeft: indent ? "28px" : "16px", paddingRight: "16px" }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-slate-800 group-hover:text-sky-700 truncate leading-tight">
          {entry.providerName}
        </div>
        {weekLabel && (
          <div className="text-[10px] text-slate-400 mt-0.5">Week of {weekLabel}</div>
        )}
      </div>
      <span className="text-slate-300 text-[11px] group-hover:text-sky-400 shrink-0 transition-colors">↗</span>
    </a>
  );
}

/** Collapsible section used for states in admin view */
function StateGroup({
  group,
  defaultOpen = false,
}: {
  group: PhysicianStateGroup;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold tracking-wide"
            style={{ background: "#EFF6FF", color: "#1D4ED8" }}
          >
            {group.state}
          </span>
          <span className="text-[12px] font-medium text-slate-600 group-hover:text-slate-900">
            {group.providers.length} provider{group.providers.length !== 1 ? "s" : ""}
          </span>
        </div>
        <svg
          className="w-3.5 h-3.5 text-slate-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-50">
          {group.providers.map((p, i) => (
            <ProviderRow key={i} entry={p} indent />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PhysicianDashboardSection() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [open, setOpen] = useState(true); // regional/admin panel open by default

  useEffect(() => {
    fetch("/api/physician-dashboards", { cache: "no-store" })
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ view: "none" }));
  }, []);

  // Nothing to show
  if (!data || data.view === "none") return null;

  // ── PHYSICIAN: single link ─────────────────────────────────────────────────
  if (data.view === "physician") {
    const { entry } = data;
    const weekLabel = fmtWeek(entry.weekStartDate);
    return (
      <>
        {/* Divider */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Physician</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <a
          href={entry.dashboardLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors border-b border-slate-100 last:border-b-0"
        >
          <span className="text-base shrink-0">📊</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-sky-700 truncate leading-tight">
              {entry.providerName} Weekly Dashboard
            </div>
            {weekLabel && (
              <div className="text-[10px] text-slate-400 mt-0.5">Week of {weekLabel}</div>
            )}
          </div>
          <span className="ml-auto text-slate-300 text-xs group-hover:text-sky-400 transition-colors shrink-0">↗</span>
        </a>
      </>
    );
  }

  // ── REGIONAL: collapsible list of providers in their state ─────────────────
  if (data.view === "regional") {
    const { state, providers } = data;
    return (
      <>
        {/* Divider */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Physician</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Collapsible header */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors group border-b border-slate-100"
        >
          <span className="text-base shrink-0">📊</span>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold text-sky-700 leading-tight">
              Physician Dashboards
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {providers.length} provider{providers.length !== 1 ? "s" : ""} · {state}
            </div>
          </div>
          <svg
            className="w-4 h-4 text-slate-400 transition-transform shrink-0"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div className="bg-slate-50/50 border-b border-slate-100">
            {providers.map((p, i) => (
              <ProviderRow key={i} entry={p} />
            ))}
          </div>
        )}
      </>
    );
  }

  // ── ADMIN: two-level hierarchy (state → providers) ─────────────────────────
  if (data.view === "admin") {
    const { states } = data;
    const totalProviders = states.reduce((acc, s) => acc + s.providers.length, 0);
    return (
      <>
        {/* Divider */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Physician</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Collapsible header */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors group border-b border-slate-100"
        >
          <span className="text-base shrink-0">📊</span>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-semibold text-sky-700 leading-tight">
              Physician Dashboards
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {totalProviders} providers · {states.length} state{states.length !== 1 ? "s" : ""}
            </div>
          </div>
          <svg
            className="w-4 h-4 text-slate-400 transition-transform shrink-0"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div className="bg-slate-50/50 border-b border-slate-100 divide-y divide-slate-100">
            {states.map((group, i) => (
              <StateGroup key={i} group={group} defaultOpen={states.length === 1} />
            ))}
          </div>
        )}
      </>
    );
  }

  return null;
}
