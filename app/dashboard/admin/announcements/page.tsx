"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { STATES, getSisterGroups } from "@/lib/facilities";
import type { Announcement } from "@/lib/announcements";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_OPTIONS = ["RCM", "Scheduling", "Follow-Up", "Collections", "Operations", "Clinical", "IT", "General"];
const PRIORITY_OPTIONS = [
  { value: "info",   label: "Info",   color: "#64748b" },
  { value: "normal", label: "Normal", color: "#0284C7" },
  { value: "urgent", label: "Urgent", color: "#E8756A" },
];
const STATE_LABELS: Record<string, string> = {
  AZ: "Arizona", CT: "Connecticut", MI: "Michigan",
  NJ: "New Jersey", NY: "New York", TX: "Texas",
};

// ─── Status helpers ───────────────────────────────────────────────────────────

type AnnStatus = "live" | "scheduled" | "expired" | "draft";

function getStatus(a: Announcement): AnnStatus {
  const now = Date.now();
  if (!a.isActive) return "draft";
  const start = a.publishStart ? new Date(a.publishStart).getTime() : null;
  const end   = a.publishEnd   ? new Date(a.publishEnd).getTime()   : null;
  if (start && start > now) return "scheduled";
  if (end   && end   < now) return "expired";
  return "live";
}

const STATUS_STYLE: Record<AnnStatus, { bg: string; text: string; label: string }> = {
  live:      { bg: "rgba(5,150,105,0.10)",  text: "#047857", label: "Live"      },
  scheduled: { bg: "rgba(2,132,199,0.10)",  text: "#0369a1", label: "Scheduled" },
  expired:   { bg: "rgba(148,163,184,0.15)",text: "#64748b", label: "Expired"   },
  draft:     { bg: "rgba(234,179,8,0.12)",  text: "#92400e", label: "Draft"     },
};

function fmtDateTime(ts?: string): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return ts; }
}

// ─── Blank form ───────────────────────────────────────────────────────────────

interface FormState {
  dept: string; priority: string; title: string; body: string;
  publishStart: string; publishEnd: string;
  audienceType: string; audienceStates: string[]; audienceSisters: number[];
  isActive: boolean; isPinned: boolean;
}

function blankForm(): FormState {
  return {
    dept: "General", priority: "normal", title: "", body: "",
    publishStart: "", publishEnd: "",
    audienceType: "company", audienceStates: [], audienceSisters: [],
    isActive: true, isPinned: false,
  };
}

function formToPayload(f: FormState) {
  let audienceValue: string | null = null;
  if (f.audienceType === "state")  audienceValue = f.audienceStates.join(",")  || null;
  if (f.audienceType === "sister") audienceValue = f.audienceSisters.join(",") || null;
  return {
    dept: f.dept, priority: f.priority, title: f.title, body: f.body,
    publishStart: f.publishStart || null,
    publishEnd:   f.publishEnd   || null,
    audienceType: f.audienceType,
    audienceValue,
    isActive: f.isActive,
    isPinned: f.isPinned,
  };
}

function annToForm(a: Announcement): FormState {
  const states   = a.audienceType === "state"  && a.audienceValue ? a.audienceValue.split(",") : [];
  const sisters  = a.audienceType === "sister" && a.audienceValue ? a.audienceValue.split(",").map(Number) : [];
  // format timestamp to datetime-local value "YYYY-MM-DDTHH:MM"
  function toLocal(ts?: string) {
    if (!ts) return "";
    try { return new Date(ts).toISOString().slice(0, 16); } catch { return ""; }
  }
  return {
    dept: a.dept, priority: a.priority, title: a.title, body: a.body,
    publishStart: toLocal(a.publishStart),
    publishEnd:   toLocal(a.publishEnd),
    audienceType: a.audienceType,
    audienceStates: states,
    audienceSisters: sisters,
    isActive: a.isActive,
    isPinned: a.isPinned,
  };
}

// ─── Form panel ───────────────────────────────────────────────────────────────

function FormPanel({
  form, setForm, onSave, onCancel, saving, editingId,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  editingId: string | null;
}) {
  const allSisterGroups = STATES.flatMap(s => getSisterGroups(s).map(g => ({ ...g, state: s })));

  function toggleState(st: string) {
    setForm(f => ({
      ...f,
      audienceStates: f.audienceStates.includes(st)
        ? f.audienceStates.filter(x => x !== st)
        : [...f.audienceStates, st],
    }));
  }
  function toggleSister(id: number) {
    setForm(f => ({
      ...f,
      audienceSisters: f.audienceSisters.includes(id)
        ? f.audienceSisters.filter(x => x !== id)
        : [...f.audienceSisters, id],
    }));
  }

  const inputCls = "w-full rounded-lg px-3 py-2 text-[13px] border border-slate-200 bg-white focus:outline-none focus:border-[#E8756A] focus:ring-2 focus:ring-[rgba(232,117,106,0.15)] transition-all";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid rgba(148,163,184,0.3)",
        boxShadow: "0 4px 20px rgba(0,40,71,0.08), 0 1px 4px rgba(0,40,71,0.05)",
      }}
    >
      {/* Form header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}
      >
        <h3
          className="font-bold"
          style={{ fontSize: "16px", color: "#0f172a", fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
        >
          {editingId ? "Edit Announcement" : "New Announcement"}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        {/* Row 1: dept + priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Department</label>
            <select
              value={form.dept}
              onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}
              className={inputCls}
            >
              {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
                  style={{
                    background: form.priority === p.value ? p.color : "#f8fafc",
                    color: form.priority === p.value ? "#fff" : "#64748b",
                    border: `1px solid ${form.priority === p.value ? p.color : "#e2e8f0"}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={labelCls}>Title <span style={{ color: "#E8756A" }}>*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Brief headline for the announcement…"
            className={inputCls}
            maxLength={200}
          />
        </div>

        {/* Body */}
        <div>
          <label className={labelCls}>Full Details</label>
          <textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Provide full details, context, instructions, or links here. Staff will see this when they click the announcement."
            rows={6}
            className={inputCls}
            style={{ resize: "vertical", minHeight: "120px" }}
          />
        </div>

        {/* Publish window */}
        <div>
          <label className={labelCls}>Publish Window <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — leave blank to publish immediately / never expire)</span></label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Publish start</div>
              <input
                type="datetime-local"
                value={form.publishStart}
                onChange={e => setForm(f => ({ ...f, publishStart: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Auto-expire at</div>
              <input
                type="datetime-local"
                value={form.publishEnd}
                onChange={e => setForm(f => ({ ...f, publishEnd: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className={labelCls}>Audience</label>
          <div className="flex gap-2 mb-3">
            {[
              { v: "company", label: "Company-Wide" },
              { v: "state",   label: "By State" },
              { v: "sister",  label: "By Clinic Group" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm(f => ({ ...f, audienceType: opt.v }))}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: form.audienceType === opt.v ? "#002847" : "#f8fafc",
                  color: form.audienceType === opt.v ? "#d4f1ff" : "#64748b",
                  border: `1px solid ${form.audienceType === opt.v ? "#002847" : "#e2e8f0"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {form.audienceType === "state" && (
            <div className="flex flex-wrap gap-2">
              {STATES.map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleState(st)}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: form.audienceStates.includes(st) ? "#0284C7" : "#f0f9ff",
                    color: form.audienceStates.includes(st) ? "#fff" : "#0369a1",
                    border: `1px solid ${form.audienceStates.includes(st) ? "#0284C7" : "#bae6fd"}`,
                  }}
                >
                  {STATE_LABELS[st] ?? st}
                </button>
              ))}
            </div>
          )}

          {form.audienceType === "sister" && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 flex flex-col gap-0.5">
              {STATES.map(st =>
                getSisterGroups(st).map(g => (
                  <label
                    key={g.sisterFacilityId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.audienceSisters.includes(g.sisterFacilityId)}
                      onChange={() => toggleSister(g.sisterFacilityId)}
                      className="rounded"
                      style={{ accentColor: "#0284C7" }}
                    />
                    <span style={{ fontSize: "12px", color: "#374151" }}>
                      <span className="font-medium text-slate-400 mr-1">{st}</span>
                      {g.facNameCombined.replace(/MVC /g, "")}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-8">
          {[
            { key: "isActive" as const, label: "Publish immediately", sub: "Off = save as draft" },
            { key: "isPinned" as const, label: "Pin to top",          sub: "Pinned items appear first" },
          ].map(t => (
            <div key={t.key} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key] }))}
                aria-checked={form[t.key]}
                role="switch"
                style={{
                  position: "relative",
                  flexShrink: 0,
                  width: "40px",
                  height: "22px",
                  borderRadius: "9999px",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  background: form[t.key] ? "#002847" : "#cbd5e1",
                  transition: "background 200ms ease-out",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: "2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transition: "transform 200ms ease-out",
                    transform: form[t.key] ? "translateX(18px)" : "translateX(0px)",
                  }}
                />
              </button>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{t.label}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{t.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "#002847", color: "#d4f1ff",
              borderRadius: "9999px",
              boxShadow: "0 2px 8px rgba(0,40,71,0.2)",
            }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = "#013462"; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#002847"}
          >
            {saving ? (
              <><span className="animate-spin inline-block text-[14px]">↻</span> Saving…</>
            ) : (
              <>{editingId ? "Save Changes" : "Publish Announcement"}</>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-[13px] font-medium transition-all"
            style={{ color: "#64748b", borderRadius: "9999px", border: "1px solid #e2e8f0" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnnouncementsAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [items, setItems]         = useState<Announcement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(blankForm());
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AnnStatus | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && session?.userRole !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements/all");
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openNew() {
    setEditingId(null);
    setForm(blankForm());
    setShowForm(true);
    setError(null);
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm(annToForm(a));
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = formToPayload(form);
      const url = editingId ? `/api/announcements/${editingId}` : "/api/announcements";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      setShowForm(false);
      await fetchAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await fetchAll();
    } catch { /* silent */ }
  }

  async function toggleActive(a: Announcement) {
    try {
      await fetch(`/api/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      await fetchAll();
    } catch { /* silent */ }
  }

  const displayed = filterStatus === "all"
    ? items
    : items.filter(a => getStatus(a) === filterStatus);

  const counts = {
    all:       items.length,
    live:      items.filter(a => getStatus(a) === "live").length,
    scheduled: items.filter(a => getStatus(a) === "scheduled").length,
    expired:   items.filter(a => getStatus(a) === "expired").length,
    draft:     items.filter(a => getStatus(a) === "draft").length,
  };

  if (status === "loading" || session?.userRole !== "admin") return null;

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-bold leading-tight"
            style={{
              fontSize: "24px", color: "#0f172a",
              fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
            }}
          >
            Announcements
          </h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}>
            Create and manage announcements visible to clinic staff
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition-all"
          style={{
            background: "#002847", color: "#d4f1ff",
            borderRadius: "9999px",
            boxShadow: "0 2px 8px rgba(0,40,71,0.2)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#013462"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#002847"}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
          </svg>
          New Announcement
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-[12px] font-medium"
          style={{ background: "#fff5f4", border: "1px solid rgba(232,117,106,0.3)", color: "#c44f45" }}
        >
          ⚠ {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <div className="mb-6">
          <FormPanel
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={saving}
            editingId={editingId}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(["all", "live", "scheduled", "draft", "expired"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize"
            style={{
              background: filterStatus === tab ? "#002847" : "rgba(255,255,255,0.7)",
              color: filterStatus === tab ? "#d4f1ff" : "#64748b",
              border: `1px solid ${filterStatus === tab ? "#002847" : "#e2e8f0"}`,
            }}
          >
            {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px]"
              style={{
                background: filterStatus === tab ? "rgba(212,241,255,0.2)" : "rgba(0,40,71,0.07)",
                color: filterStatus === tab ? "#d4f1ff" : "#64748b",
              }}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#fff",
          border: "1px solid rgba(148,163,184,0.25)",
          boxShadow: "0 1px 3px rgba(0,40,71,0.06)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#002847", opacity: 0.3, animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "#94a3b8", fontSize: "13px" }}>
            No announcements found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
                {["Title", "Dept", "Priority", "Status", "Audience", "Published", ""].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5"
                    style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(a => {
                const st = getStatus(a);
                const ss = STATUS_STYLE[st];
                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: "1px solid #f8fafc" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafbfc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td className="px-4 py-3" style={{ maxWidth: "260px" }}>
                      <div className="font-medium truncate" style={{ fontSize: "13px", color: "#0f172a" }}>
                        {a.isPinned && <span className="mr-1 text-[11px]">📌</span>}
                        {a.title}
                      </div>
                      {a.body && (
                        <div className="truncate mt-0.5" style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "240px" }}>
                          {a.body.slice(0, 80)}{a.body.length > 80 ? "…" : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ background: "rgba(0,40,71,0.07)", color: "#002847" }}>
                        {a.dept}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
                        style={{
                          background: a.priority === "urgent" ? "rgba(232,117,106,0.12)" : a.priority === "info" ? "rgba(148,163,184,0.12)" : "rgba(2,132,199,0.10)",
                          color: a.priority === "urgent" ? "#c44f45" : a.priority === "info" ? "#64748b" : "#0369a1",
                        }}
                      >
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: ss.bg, color: ss.text }}>
                        {ss.label}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: "12px", color: "#64748b" }}>
                      {a.audienceType === "company" ? "Company-wide"
                        : a.audienceType === "state"  ? (a.audienceValue ?? "—")
                        : `${(a.audienceValue ?? "").split(",").length} groups`}
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {fmtDateTime(a.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Live toggle */}
                        <button
                          onClick={() => toggleActive(a)}
                          title={a.isActive ? "Unpublish" : "Publish"}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: a.isActive ? "rgba(5,150,105,0.1)" : "rgba(148,163,184,0.1)", color: a.isActive ? "#047857" : "#94a3b8" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        >
                          {a.isActive ? (
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(a)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(2,132,199,0.08)", color: "#0369a1" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        >
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirm(a.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(232,117,106,0.08)", color: "#c44f45" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        >
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)" }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-[380px]"
            style={{ boxShadow: "0 24px 64px rgba(0,40,71,0.18)" }}
          >
            <h3 className="font-bold text-[16px] text-slate-900 mb-2">Delete Announcement?</h3>
            <p className="text-[13px] text-slate-500 mb-5">
              This announcement will be permanently removed and staff will no longer see it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 text-[13px] font-semibold rounded-full transition-all"
                style={{ background: "#E8756A", color: "#fff" }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-[13px] font-medium rounded-full border border-slate-200 transition-all hover:bg-slate-50"
                style={{ color: "#64748b" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
