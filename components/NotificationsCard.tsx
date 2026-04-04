"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { NotificationItem } from "@/lib/queries";

const REFRESH_MS = 30_000;

const TYPE_CONFIG = {
  "voicemail": {
    label:   "Voicemail",
    icon:    "📞",
    color:   "#0284C7",
    bg:      "#EFF6FF",
    border:  "#BFDBFE",
    textCol: "#1D4ED8",
  },
  "same-day-booking": {
    label:   "Same-Day Booking",
    icon:    "📅",
    color:   "#7C3AED",
    bg:      "#F5F3FF",
    border:  "#DDD6FE",
    textCol: "#5B21B6",
  },
};

function timeAgo(timeDisplay: string): string {
  const date = new Date(timeDisplay.replace(" ", "T"));
  if (isNaN(date.getTime())) return timeDisplay;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 12) return `${diffHr}h ago`;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function InfoRow({ label, value, link }: { label: string; value?: string; link?: string }) {
  if (!value || value === "–" || value === "") return null;
  return (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide shrink-0 w-28">{label}</span>
      {link && link !== "–" && link.startsWith("http") ? (
        <a href={link} target="_blank" rel="noopener noreferrer"
           className="text-[12px] text-blue-600 hover:underline font-medium text-right flex items-center gap-1">
          {value} <span className="text-[10px]">↗</span>
        </a>
      ) : (
        <span className="text-[12px] text-slate-700 font-medium text-right">{value}</span>
      )}
    </div>
  );
}

function NotificationModal({
  item,
  onClose,
  onAcknowledge,
  ackPending,
}: {
  item: NotificationItem;
  onClose: () => void;
  onAcknowledge: (item: NotificationItem) => void;
  ackPending: boolean;
}) {
  const cfg = TYPE_CONFIG[item.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
           style={{ border: "1px solid #e2e8f0" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{cfg.icon}</span>
            <div>
              <div className="text-[13px] font-bold text-slate-900">{item.patientName}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.textCol, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </span>
                <span className="text-[11px] text-slate-400">{item.timeDisplay}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all text-[16px]">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Patient Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Patient</div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <InfoRow label="Name"    value={item.patientName} />
              <InfoRow label="ID"      value={item.patientId} />
              <InfoRow label="Phone"   value={item.phone} />
              {item.email && <InfoRow label="Email"   value={item.email} />}
              {item.insuranceCarrier && <InfoRow label="Insurance" value={item.insuranceCarrier} />}
            </div>
          </div>

          {/* Appointment Section (same-day bookings) */}
          {item.type === "same-day-booking" && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Appointment</div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <InfoRow label="Date / Time" value={item.apptDate} />
                <InfoRow label="Local Time"  value={item.localApptTime} />
                <InfoRow label="Type"        value={item.apptType} />
                <InfoRow label="Status"      value={item.apptStatus} />
                <InfoRow label="List"        value={item.listName} />
                <InfoRow label="Attended"    value={item.attended} />
              </div>
            </div>
          )}

          {/* Voicemail Section */}
          {item.type === "voicemail" && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Voicemail</div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <InfoRow label="Received" value={item.timeDisplay} />
                {item.recordingLink && item.recordingLink !== "–" && (
                  <InfoRow label="Recording" value="Listen ↗" link={item.recordingLink} />
                )}
              </div>
            </div>
          )}

          {/* Facility Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Facility</div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <InfoRow label="Clinic"    value={item.facility} />
              <InfoRow label="State"     value={item.state} />
              {item.createdBy  && <InfoRow label="Booked By" value={item.createdBy} />}
              {item.loginUser  && item.loginUser !== item.createdBy && <InfoRow label="Login User" value={item.loginUser} />}
              {item.jobTitle   && <InfoRow label="Job Title"  value={item.jobTitle} />}
            </div>
          </div>

          {/* Acknowledged info */}
          {item.isAcknowledged && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="text-emerald-600 text-[14px]">✓</span>
              <div>
                <div className="text-[12px] font-semibold text-emerald-700">Addressed</div>
                <div className="text-[11px] text-emerald-600">
                  {item.acknowledgedBy.split("@")[0]} · {item.acknowledgedAt}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button onClick={onClose}
                  className="text-[12px] text-slate-500 hover:text-slate-700 font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all">
            Close
          </button>
          <button
            onClick={() => onAcknowledge(item)}
            disabled={ackPending}
            className="text-[12px] font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
            style={item.isAcknowledged
              ? { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }
              : { background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" }
            }
          >
            {ackPending ? (
              <><span className="animate-spin inline-block text-[10px]">↻</span> Saving…</>
            ) : item.isAcknowledged ? (
              <>✕ Mark Unaddressed</>
            ) : (
              <>✓ Mark Addressed</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsCard() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [items, setItems]           = useState<NotificationItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<NotificationItem | null>(null);
  const [ackPending, setAckPending] = useState<Set<string>>(new Set());
  const [localAcks, setLocalAcks]   = useState<Record<string, { acked: boolean; by: string; at: string }>>({});

  const filterStr = searchParams.toString();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?${filterStr}`, { cache: "no-store" });
      if (res.ok) {
        const json: NotificationItem[] = await res.json();
        setItems(json);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filterStr]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  async function handleAcknowledge(item: NotificationItem) {
    const rk = item.rowKey;
    if (ackPending.has(rk)) return;

    const localEntry = localAcks[rk];
    const currentAcked = localEntry !== undefined ? localEntry.acked : item.isAcknowledged;
    const newAcked = !currentAcked;
    const email   = session?.user?.email ?? "You";
    const timeStr = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });

    setLocalAcks(prev => ({
      ...prev,
      [rk]: { acked: newAcked, by: email, at: timeStr },
    }));
    setAckPending(prev => new Set(prev).add(rk));

    // Update the selected item optimistically
    if (selected?.rowKey === rk) {
      setSelected(prev => prev ? {
        ...prev,
        isAcknowledged: newAcked,
        acknowledgedBy: newAcked ? email : "",
        acknowledgedAt: newAcked ? timeStr : "",
      } : null);
    }

    try {
      await fetch("/api/acknowledge", {
        method:  newAcked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tile: item.tileId, rowKey: rk }),
      });
    } catch {
      setLocalAcks(prev => { const n = { ...prev }; delete n[rk]; return n; });
    } finally {
      setAckPending(prev => { const n = new Set(prev); n.delete(rk); return n; });
    }
  }

  function getEffectiveAck(item: NotificationItem) {
    const local = localAcks[item.rowKey];
    if (local !== undefined) return local;
    return { acked: item.isAcknowledged, by: item.acknowledgedBy, at: item.acknowledgedAt };
  }

  const unacknowledgedCount = items.filter(item => !getEffectiveAck(item).acked).length;

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-900">Notifications</span>
            {unacknowledgedCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 min-w-[18px] text-center">
                {unacknowledgedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">Today</span>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="flex items-center justify-center gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                       style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-2xl mb-2">✓</div>
              <div className="text-[12px] font-semibold text-slate-500">All clear</div>
              <div className="text-[11px] text-slate-400 mt-0.5">No activity today</div>
            </div>
          ) : (
            items.map(item => {
              const cfg         = TYPE_CONFIG[item.type];
              const ackState    = getEffectiveAck(item);
              const isPending   = ackPending.has(item.rowKey);

              return (
                <div
                  key={`${item.tileId}-${item.rowKey}`}
                  onClick={() => setSelected({ ...item, isAcknowledged: ackState.acked, acknowledgedBy: ackState.by, acknowledgedAt: ackState.at })}
                  className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer last:border-b-0 flex items-start gap-3"
                >
                  {/* Type icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] shrink-0 mt-0.5"
                       style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[12px] font-semibold text-slate-800 truncate">{item.patientName}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(item.sortTime)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.facility}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: cfg.bg, color: cfg.textCol }}>
                        {cfg.label}
                      </span>
                      {ackState.acked ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          {isPending ? <span className="animate-spin inline-block text-[9px]">↻</span> : "✓"} Done
                        </span>
                      ) : item.phone && item.phone !== "–" ? (
                        <span className="text-[10px] text-slate-400">{item.phone}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <NotificationModal
          item={selected}
          onClose={() => setSelected(null)}
          onAcknowledge={handleAcknowledge}
          ackPending={ackPending.has(selected.rowKey)}
        />
      )}
    </>
  );
}
