"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { STATES, getSisterGroups } from "@/lib/facilities";

const STATE_LABELS: Record<string, string> = {
  AZ: "Arizona", CT: "Connecticut", MI: "Michigan",
  NJ: "New Jersey", NY: "New York", TX: "Texas",
};

// ── Light sidebar design tokens ───────────────────────────────────────────────
const S = {
  activeBg:     "rgba(0,40,71,0.07)",
  activeBorder: "#002847",
  activeText:   "#002847",
  inactiveText: "#64748b",
  hoverBg:      "rgba(0,40,71,0.04)",
  hoverText:    "#1e293b",
  labelText:    "#94a3b8",
  sectionBorder:"#e8eef4",
  dotActive:    "#002847",
  dotInactive:  "#cbd5e1",
};

export default function Sidebar() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const activeSister = searchParams.get("sister") ? Number(searchParams.get("sister")) : null;
  const activeState  = searchParams.get("state") ?? null;
  const activeView   = searchParams.get("view")  ?? null;

  const userRole   = session?.userRole   ?? "admin";
  const userState  = session?.userState  ?? null;
  const userSister = session?.userSister ?? null;

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

  const displayName = session?.userName ?? session?.user?.name ?? "Staff";
  const initials    = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel   = userRole === "admin" ? "Administrator"
                    : userRole === "regional" ? `Regional · ${userState}`
                    : "Clinic Staff";

  const visibleStates = userRole === "admin"
    ? STATES
    : (userRole === "regional" && userState)
      ? [userState]
      : userState
        ? [userState]
        : [];

  return (
    <nav
      className="w-[240px] min-w-[240px] flex flex-col overflow-y-auto"
      style={{
        background: "#ffffff",
        borderRight: "1px solid #e8eef4",
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${S.sectionBorder}` }}>
        <Image
          src="/mvc-logo.png"
          alt="Metro Vein Centers"
          width={172}
          height={30}
          priority
        />
        <div
          className="mt-2 font-bold tracking-[0.18em] uppercase"
          style={{ fontSize: "10px", color: "#002847", letterSpacing: "0.14em", opacity: 0.55 }}
        >
          Operations Dashboard
        </div>
      </div>

      {/* ── Company-wide link (admins only) ── */}
      {userRole === "admin" && (
        <div className="pt-4 pb-1">
          <div
            className="font-bold uppercase tracking-widest px-5 pb-2"
            style={{ fontSize: "9px", color: S.labelText }}
          >
            Company
          </div>
          <NavItem
            href="/dashboard?view=company"
            isActive={activeView === "company"}
            label="MVC Company-Wide"
          />
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex-1 pb-4">

        {userRole === "sister" && userSister !== null ? (
          <>
            <div className="font-bold uppercase tracking-widest px-5 pt-4 pb-2"
                 style={{ fontSize: "9px", color: S.labelText }}>
              My Clinic
            </div>
            {visibleStates.map(state =>
              getSisterGroups(state)
                .filter(g => g.sisterFacilityId === userSister)
                .map(group => {
                  const label = group.facNameCombined.replace(/MVC /g, "").trim();
                  return (
                    <NavItem
                      key={group.sisterFacilityId}
                      href={`/dashboard?state=${state}&sister=${group.sisterFacilityId}`}
                      isActive
                      label={label}
                      showDot
                    />
                  );
                })
            )}
          </>
        ) : (
          <>
            <div
              className="font-bold uppercase tracking-widest px-5 pt-3 pb-2"
              style={{ fontSize: "9px", color: S.labelText }}
            >
              {userRole === "regional" ? "My State" : "States & Clinics"}
            </div>

            {visibleStates.map(state => {
              const groups        = getSisterGroups(state);
              const isExpanded    = expandedStates.has(state);
              const isStateActive = activeState === state && !activeSister;

              return (
                <div key={state}>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleStateClick(state)}
                      className="flex-1 flex items-center gap-2 px-4 py-2 text-[13px] border-l-[3px] transition-all text-left"
                      style={{
                        borderLeftColor: isStateActive ? S.activeBorder : "transparent",
                        background:      isStateActive ? S.activeBg      : "transparent",
                        color:           isStateActive ? S.activeText    : S.inactiveText,
                      }}
                      onMouseEnter={e => {
                        if (!isStateActive) {
                          (e.currentTarget as HTMLElement).style.background = S.hoverBg;
                          (e.currentTarget as HTMLElement).style.color      = S.hoverText;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isStateActive) {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color      = S.inactiveText;
                        }
                      }}
                    >
                      <span
                        className="font-bold rounded px-1.5 py-0.5 min-w-[26px] text-center"
                        style={{
                          fontSize: "9.5px",
                          background: isStateActive ? "rgba(212,241,255,0.18)" : "rgba(255,255,255,0.09)",
                          color:      isStateActive ? S.activeText : "rgba(255,255,255,0.45)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {state}
                      </span>
                      <span style={{ fontWeight: isStateActive ? 600 : 400 }}>
                        {STATE_LABELS[state] ?? state}
                      </span>
                    </button>

                    <button
                      onClick={() => toggleCollapse(state)}
                      className="pr-4 pl-1 py-2 text-[11px] transition-all"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                      {groups.map(group => {
                        const isGroupActive = activeSister === group.sisterFacilityId;
                        const label = group.facNameCombined.replace(/MVC /g, "").trim();
                        return (
                          <Link
                            key={group.sisterFacilityId}
                            href={`/dashboard?state=${state}&sister=${group.sisterFacilityId}`}
                            className="flex items-start gap-2 px-4 py-2 text-[12px] border-l-[2px] transition-all leading-snug"
                            style={{
                              borderLeftColor: isGroupActive ? S.activeBorder : "transparent",
                              background:      isGroupActive ? S.activeBg      : "transparent",
                              color:           isGroupActive ? "#002847"       : "#64748b",
                              fontWeight:      isGroupActive ? 600 : 400,
                            }}
                            onMouseEnter={e => {
                              if (!isGroupActive) {
                                (e.currentTarget as HTMLElement).style.background = S.hoverBg;
                                (e.currentTarget as HTMLElement).style.color      = "#1e293b";
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isGroupActive) {
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                                (e.currentTarget as HTMLElement).style.color      = "#64748b";
                              }
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: isGroupActive ? S.dotActive : S.dotInactive, marginTop: "5px" }}
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
          </>
        )}
      </div>

      {/* ── Admin section ── */}
      {userRole === "admin" && (
        <div className="pb-3" style={{ borderTop: "1px solid #e8eef4" }}>
          <div
            className="font-bold uppercase tracking-widest px-5 pt-3 pb-2"
            style={{ fontSize: "9px", color: S.labelText }}
          >
            Admin
          </div>
          <NavItem
            href="/dashboard/admin/announcements"
            isActive={false}
            label="Announcements"
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, opacity: 0.7 }}>
                <path d="M16.881 4.345A23.112 23.112 0 018.25 6H7.5a5.25 5.25 0 00-.88 10.427 21.593 21.593 0 001.378 3.94c.464 1.004 1.674 1.32 2.582.796l.657-.379c.88-.508 1.165-1.593.772-2.468a17.116 17.116 0 01-.628-1.607c1.918.258 3.76.75 5.5 1.446A21.727 21.727 0 0018 11.25c0-2.414-.393-4.735-1.119-6.905zM18.26 3.74a23.22 23.22 0 011.24 7.51 23.22 23.22 0 01-1.24 7.51c-.055.161-.122.322-.193.49a.75.75 0 001.404.54 24.72 24.72 0 001.324-8.054 24.72 24.72 0 00-1.324-8.054.75.75 0 00-1.404.54c.07.167.138.33.193.49z"/>
              </svg>
            }
          />
        </div>
      )}

      {/* ── User footer ── */}
      <div className="px-4 py-3.5" style={{ borderTop: "1px solid #e8eef4" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{
              fontSize: "11px",
              background: "rgba(0,40,71,0.08)",
              border: "1.5px solid rgba(0,40,71,0.14)",
              color: "#002847",
              letterSpacing: "0.04em",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate" style={{ fontSize: "12px", color: "#1e293b" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color      = "#E8756A";
            (e.currentTarget as HTMLElement).style.background = "rgba(232,117,106,0.10)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color      = "#94a3b8";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

// ── Reusable nav item ──────────────────────────────────────────────────────────
function NavItem({
  href, isActive, label, showDot, icon,
}: {
  href: string; isActive: boolean; label: string; showDot?: boolean; icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2 text-[13px] border-l-[3px] transition-all"
      style={{
        borderLeftColor: isActive ? "#002847" : "transparent",
        background:      isActive ? "rgba(0,40,71,0.07)" : "transparent",
        color:           isActive ? "#002847" : "#64748b",
        fontWeight:      isActive ? 600 : 400,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "rgba(0,40,71,0.04)";
          (e.currentTarget as HTMLElement).style.color      = "#1e293b";
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color      = "#64748b";
        }
      }}
    >
      {icon}
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: isActive ? "#002847" : "#cbd5e1" }}
        />
      )}
      {label}
    </Link>
  );
}
