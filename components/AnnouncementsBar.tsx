"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Announcement } from "@/lib/announcements";

// ─── Priority config ─────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: { border: "#E8756A", bg: "#fff5f4", badge: "rgba(232,117,106,0.12)", text: "#c44f45", label: "Urgent" },
  normal: { border: "#0284C7", bg: "#f0f9ff", badge: "rgba(2,132,199,0.10)",   text: "#0369a1", label: ""       },
  info:   { border: "#94a3b8", bg: "#f8fafc", badge: "rgba(148,163,184,0.12)", text: "#64748b", label: "Info"   },
};

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  RCM:         { bg: "rgba(231,55,59,0.09)",   text: "#B91C1C" },
  Scheduling:  { bg: "rgba(2,132,199,0.09)",   text: "#0369A1" },
  "Follow-Up": { bg: "rgba(124,58,237,0.09)",  text: "#6D28D9" },
  Collections: { bg: "rgba(5,150,105,0.09)",   text: "#047857" },
  Operations:  { bg: "rgba(234,88,12,0.09)",   text: "#c2410c" },
  Clinical:    { bg: "rgba(15,118,110,0.09)",  text: "#0f766e" },
  IT:          { bg: "rgba(99,102,241,0.09)",  text: "#4338ca" },
  General:     { bg: "rgba(100,116,139,0.09)", text: "#475569" },
};

function deptStyle(dept: string) {
  return DEPT_COLORS[dept] ?? DEPT_COLORS["General"];
}

function fmtDate(ts?: string): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AnnouncementModal({
  item,
  onClose,
}: {
  item: Announcement;
  onClose: () => void;
}) {
  const p  = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;
  const dc = deptStyle(item.dept);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[540px] rounded-2xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow: "0 24px 64px rgba(0,40,71,0.18), 0 8px 24px rgba(0,40,71,0.10)",
          borderTop: `3px solid ${p.border}`,
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {item.priority === "urgent" && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: p.badge, color: p.text }}
                >
                  ⚠ Urgent
                </span>
              )}
              <span
                className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: dc.bg, color: dc.text }}
              >
                {item.dept}
              </span>
              {item.isPinned && (
                <span className="text-[11px] font-medium" style={{ color: "#94a3b8" }}>📌 Pinned</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "#f1f5f9", color: "#64748b" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          </div>

          <h2
            className="font-bold leading-snug"
            style={{
              fontSize: "18px",
              color: "#0f172a",
              fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
            }}
          >
            {item.title}
          </h2>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#f1f5f9", margin: "0 24px" }} />

        {/* Body */}
        <div className="px-6 py-5">
          <p
            className="leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: "14px", color: "#374151" }}
          >
            {item.body}
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Posted by {item.createdBy.split("@")[0].replace(".", " ")}
            {item.createdAt && ` · ${fmtDate(item.createdAt)}`}
          </span>
          {item.publishEnd && (
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Expires {fmtDate(item.publishEnd)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main bar ─────────────────────────────────────────────────────────────────

export default function AnnouncementsBar() {
  const searchParams = useSearchParams();
  const filterStr    = searchParams.toString();

  const [items, setItems]       = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [loaded, setLoaded]     = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements?${filterStr}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // silent — announcements are non-critical
    } finally {
      setLoaded(true);
    }
  }, [filterStr]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  // Refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(fetchAnnouncements, 5 * 60_000);
    return () => clearInterval(t);
  }, [fetchAnnouncements]);

  if (!loaded || items.length === 0) return null;

  return (
    <>
      <div
        className="rounded-xl mb-5 overflow-hidden"
        style={{
          background: "#fff",
          border: "1px solid rgba(148,163,184,0.25)",
          boxShadow: "0 1px 3px rgba(0,40,71,0.06), 0 1px 2px rgba(0,40,71,0.04)",
        }}
      >
        {/* Section header */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ color: "#002847", flexShrink: 0 }}>
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" fill="currentColor"/>
          </svg>
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: "9.5px", color: "#002847" }}
          >
            Announcements
          </span>
          <span
            className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
            style={{ background: "rgba(0,40,71,0.08)", color: "#002847" }}
          >
            {items.length}
          </span>
        </div>

        {/* Announcement rows */}
        <div className="divide-y divide-slate-50">
          {items.map(item => {
            const p  = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;
            const dc = deptStyle(item.dept);
            return (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group"
                style={{ background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = p.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Priority bar */}
                <div
                  className="w-0.5 self-stretch rounded-full flex-shrink-0"
                  style={{ background: p.border, minHeight: "18px" }}
                />

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.isPinned && (
                    <span style={{ fontSize: "11px" }}>📌</span>
                  )}
                  {item.priority === "urgent" && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
                      style={{ background: p.badge, color: p.text }}
                    >
                      Urgent
                    </span>
                  )}
                  <span
                    className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold flex-shrink-0"
                    style={{ background: dc.bg, color: dc.text }}
                  >
                    {item.dept}
                  </span>
                </div>

                {/* Title */}
                <span
                  className="flex-1 min-w-0 truncate font-medium"
                  style={{ fontSize: "13px", color: "#1e293b" }}
                >
                  {item.title}
                </span>

                {/* Date + arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span style={{ fontSize: "11px", color: "#cbd5e1" }}>{fmtDate(item.createdAt)}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 20 20" fill="none"
                    className="transition-transform group-hover:translate-x-0.5"
                    style={{ color: "#cbd5e1" }}
                  >
                    <path d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" fill="currentColor"/>
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <AnnouncementModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
