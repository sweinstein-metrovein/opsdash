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

// ── Dark sidebar design tokens ────────────────────────────────────────────────
const S = {
  activeBg:     "rgba(212,241,255,0.13)",
  activeBorder: "#d4f1ff",
  activeText:   "#d4f1ff",
  inactiveText: "rgba(255,255,255,0.58)",
  hoverBg:      "rgba(255,255,255,0.07)",
  hoverText:    "rgba(255,255,255,0.88)",
  labelText:    "rgba(255,255,255,0.28)",
  sectionBorder:"rgba(255,255,255,0.07)",
  dotActive:    "#d4f1ff",
  dotInactive:  "rgba(255,255,255,0.22)",
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
        background: "linear-gradient(170deg, #002847 0%, #013462 60%, #002847 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${S.sectionBorder}` }}>
        <Image
          src="/mvc-logo.png"
          alt="Metro Vein Centers"
          width={148}
          height={26}
          priority
          style={{ filter: "brightness(0) invert(1)", opacity: 0.92 }}
        />
        <div
          className="mt-2 font-semibold tracking-[0.18em] uppercase"
          style={{ fontSize: "9.5px", color: S.labelText, letterSpacing: "0.16em" }}
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
                              color:           isGroupActive ? "#7dd3fc"       : "rgba(255,255,255,0.45)",
                              fontWeight:      isGroupActive ? 600 : 400,
                            }}
                            onMouseEnter={e => {
                              if (!isGroupActive) {
                                (e.currentTarget as HTMLElement).style.background = S.hoverBg;
                                (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.78)";
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isGroupActive) {
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                                (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.45)";
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
        <div className="pb-3" style={{ borderTop: `1px solid ${S.sectionBorder}` }}>
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
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, opacity: 0.7 }}>
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
              </svg>
            }
          />
        </div>
      )}

      {/* ── User footer ── */}
      <div className="px-4 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{
              fontSize: "11px",
              background: "linear-gradient(135deg, rgba(212,241,255,0.25) 0%, rgba(212,241,255,0.12) 100%)",
              border: "1.5px solid rgba(212,241,255,0.35)",
              color: S.activeText,
              letterSpacing: "0.04em",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate" style={{ fontSize: "12px", color: "rgba(255,255,255,0.88)" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)" }}>{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color      = "#E8756A";
            (e.currentTarget as HTMLElement).style.background = "rgba(232,117,106,0.14)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.35)";
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
        borderLeftColor: isActive ? "#d4f1ff" : "transparent",
        background:      isActive ? "rgba(212,241,255,0.13)" : "transparent",
        color:           isActive ? "#d4f1ff" : "rgba(255,255,255,0.58)",
        fontWeight:      isActive ? 600 : 400,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.88)";
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.58)";
        }
      }}
    >
      {icon}
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: isActive ? "#d4f1ff" : "rgba(255,255,255,0.3)" }}
        />
      )}
      {label}
    </Link>
  );
}
