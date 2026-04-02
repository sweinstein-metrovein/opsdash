"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { STATES, getSisterGroups } from "@/lib/facilities";

const STATE_LABELS: Record<string, string> = {
  AZ: "Arizona", CT: "Connecticut", MI: "Michigan",
  NJ: "New Jersey", NY: "New York", TX: "Texas",
};

// Brand blue for active accent
const BRAND_BLUE = "#d4f1ff";
const ACTIVE_TEXT = "#0369A1";   // readable dark-blue for active labels
const ACTIVE_BG   = "#EFF9FF";   // very light blue tint for active bg

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSister = searchParams.get("sister") ? Number(searchParams.get("sister")) : null;
  const activeState  = searchParams.get("state") ?? null;
  const activeView   = searchParams.get("view") ?? null;

  const [expandedStates, setExpandedStates] = useState<Set<string>>(
    new Set(activeState ? [activeState] : [])
  );

  function handleStateClick(state: string) {
    router.push(`/dashboard?state=${state}`);
    setExpandedStates(new Set([state]));
  }

  function toggleCollapse(state: string) {
    setExpandedStates(prev => {
      const next = new Set(prev);
      next.has(state) ? next.delete(state) : next.add(state);
      return next;
    });
  }

  return (
    <nav
      className="w-[240px] min-w-[240px] flex flex-col overflow-y-auto"
      style={{ background: "#ffffff", borderRight: "1px solid #e2e8f0" }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <Image
          src="/mvc-logo.png"
          alt="Metro Vein Centers"
          width={160}
          height={28}
          priority
        />
        <div
          className="mt-1.5 font-semibold tracking-widest uppercase"
          style={{ fontSize: "10px", color: "#94a3b8" }}
        >
          Operations Dashboard
        </div>
      </div>

      {/* Company-wide view */}
      <div className="pt-4 pb-1">
        <div
          className="font-semibold uppercase tracking-widest px-5 pb-2"
          style={{ fontSize: "10px", color: "#94a3b8" }}
        >
          Company
        </div>
        <Link
          href="/dashboard?view=company"
          className="flex items-center gap-2.5 px-5 py-2 text-[13px] border-l-[3px] transition-all"
          style={
            activeView === "company"
              ? { background: ACTIVE_BG, color: ACTIVE_TEXT, borderLeftColor: BRAND_BLUE, fontWeight: 600 }
              : { color: "#64748b", borderLeftColor: "transparent" }
          }
        >
          <span className="text-base">🏢</span> All Clinics
        </Link>
      </div>

      {/* States + sister groups */}
      <div className="flex-1 pb-4">
        <div
          className="font-semibold uppercase tracking-widest px-5 pt-3 pb-2"
          style={{ fontSize: "10px", color: "#94a3b8" }}
        >
          States &amp; Clinics
        </div>

        {STATES.map(state => {
          const groups       = getSisterGroups(state);
          const isExpanded   = expandedStates.has(state);
          const isStateActive = activeState === state && !activeSister;

          return (
            <div key={state}>
              <div className="flex items-center">
                <button
                  onClick={() => handleStateClick(state)}
                  className="flex-1 flex items-center gap-2 px-5 py-2 text-[13px] border-l-[3px] transition-all text-left"
                  style={
                    isStateActive
                      ? { background: ACTIVE_BG, color: ACTIVE_TEXT, borderLeftColor: BRAND_BLUE, fontWeight: 600 }
                      : { color: "#64748b", borderLeftColor: "transparent" }
                  }
                >
                  <span
                    className="font-bold rounded px-1.5 py-0.5 min-w-[24px] text-center"
                    style={{
                      fontSize: "10px",
                      background: isStateActive ? "rgba(142,213,248,0.3)" : "#f1f5f9",
                      color: isStateActive ? ACTIVE_TEXT : "#94a3b8",
                    }}
                  >
                    {state}
                  </span>
                  {STATE_LABELS[state] ?? state}
                </button>
                <button
                  onClick={() => toggleCollapse(state)}
                  className="pr-4 transition-colors text-xs"
                  style={{ color: "#cbd5e1" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#cbd5e1")}
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              </div>

              {isExpanded && (
                <div className="ml-3" style={{ borderLeft: "1px solid #e2e8f0" }}>
                  {groups.map(group => {
                    const isGroupActive = activeSister === group.sisterFacilityId;
                    const label = group.facNameCombined.replace(/MVC /g, "").trim();

                    return (
                      <Link
                        key={group.sisterFacilityId}
                        href={`/dashboard?state=${state}&sister=${group.sisterFacilityId}`}
                        className="flex items-start gap-2 px-4 py-2 text-[12px] border-l-[3px] transition-all leading-snug"
                        style={
                          isGroupActive
                            ? { background: ACTIVE_BG, color: ACTIVE_TEXT, borderLeftColor: BRAND_BLUE, fontWeight: 600 }
                            : { color: "#94a3b8", borderLeftColor: "transparent" }
                        }
                      >
                        <span
                          className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: isGroupActive ? BRAND_BLUE : "#cbd5e1", marginTop: "5px" }}
                        />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User footer */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
            style={{
              fontSize: "11px",
              background: "rgba(142,213,248,0.25)",
              border: `1.5px solid ${BRAND_BLUE}`,
              color: ACTIVE_TEXT,
            }}
          >
            MV
          </div>
          <div>
            <div className="font-semibold" style={{ fontSize: "12px", color: "#334155" }}>Admin</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Metro Vein Centers</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
