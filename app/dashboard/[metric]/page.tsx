"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { TILE_MAP } from "@/lib/tiles";

interface AcknowledgeConfig {
  tile: string;
  rowKeys: string[];
  isAcknowledged: boolean[];
  acknowledgedBy: string[];
  acknowledgedAt: string[];
}

interface DetailData {
  headers: string[];
  rows: string[][];
  total: number;
  rowHighlights?: boolean[];
  orangeHighlights?: boolean[];
  wideColumns?: number[];
  linkColumns?: number[];
  textLinkColumns?: number[];
  acknowledgeConfig?: AcknowledgeConfig;
}

interface LocalAckEntry {
  acked: boolean;
  by?: string;
  at?: string;
}

const REFRESH_MS = 60_000;

const SECTION_ACCENT: Record<string, string> = {
  billing:     "#E7373B",
  scheduling:  "#0284C7",
  followup:    "#7C3AED",
  collections: "#059669",
};

const SECTION_BG: Record<string, string> = {
  billing:     "rgba(254,242,242,1)",
  scheduling:  "rgba(240,249,255,1)",
  followup:    "rgba(245,243,255,1)",
  collections: "rgba(236,253,245,1)",
};

export default function MetricDetailPage() {
  const { metric }     = useParams<{ metric: string }>();
  const searchParams   = useSearchParams();
  const filterStr      = searchParams.toString();
  const { data: session } = useSession();

  const tile    = TILE_MAP[metric];
  const accent  = tile ? (SECTION_ACCENT[tile.section] ?? "#0284C7") : "#0284C7";
  const accentBg = tile ? (SECTION_BG[tile.section] ?? "rgba(240,249,255,1)") : "rgba(240,249,255,1)";

  const [data, setData]               = useState<DetailData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [sortCol, setSortCol]         = useState<number | null>(null);
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");
  const [showCompleted, setShowCompleted] = useState(true);
  const [localAckState, setLocalAckState] = useState<Record<string, LocalAckEntry>>({});
  const [ackPending, setAckPending]       = useState<Set<string>>(new Set());
  const [colWidths, setColWidths]         = useState<Record<number, number>>({});
  const resizeRef = useRef<{ col: number; startX: number; startW: number } | null>(null);

  const [exporting, setExporting]     = useState(false);
  const [exportUrl, setExportUrl]     = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const topScrollRef   = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1);

  useEffect(() => { setLocalAckState({}); }, [filterStr]);

  useEffect(() => {
    if (!tableScrollRef.current) return;
    const el = tableScrollRef.current;
    const update = () => setTableScrollWidth(el.scrollWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  function onTopScroll(e: React.UIEvent<HTMLDivElement>) {
    if (tableScrollRef.current) tableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }
  function onTableScroll(e: React.UIEvent<HTMLDivElement>) {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/detail?tile=${metric}&${filterStr}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Detail fetch error:", e);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [metric, filterStr]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  async function handleAcknowledge(rowKey: string, currentAcked: boolean) {
    if (ackPending.has(rowKey) || !data?.acknowledgeConfig) return;
    const newAcked = !currentAcked;
    const email    = session?.user?.email ?? "You";
    const timeStr  = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    setLocalAckState(prev => ({
      ...prev,
      [rowKey]: newAcked ? { acked: true, by: email, at: timeStr } : { acked: false },
    }));
    setAckPending(prev => new Set(prev).add(rowKey));
    try {
      const res = await fetch("/api/acknowledge", {
        method:  newAcked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tile: data.acknowledgeConfig.tile, rowKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setLocalAckState(prev => { const next = { ...prev }; delete next[rowKey]; return next; });
    } finally {
      setAckPending(prev => { const n = new Set(prev); n.delete(rowKey); return n; });
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    setExportUrl(null);
    try {
      const state  = searchParams.get("state")  ?? undefined;
      const sister = searchParams.get("sister") ? Number(searchParams.get("sister")) : undefined;
      const view   = searchParams.get("view")   ?? undefined;
      const res    = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ tile: metric, state, sister, view }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExportError(json.error === "no_token"
          ? "Drive access not granted — please sign out and sign back in."
          : (json.error ?? "Export failed."));
      } else {
        setExportUrl(json.url);
      }
    } catch {
      setExportError("Export failed — check your connection.");
    } finally {
      setExporting(false);
    }
  }

  function handleSort(colIdx: number) {
    if (sortCol === colIdx) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(colIdx); setSortDir("asc"); }
  }

  function onResizeMouseDown(e: React.MouseEvent, colIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLTableCellElement;
    resizeRef.current = { col: colIdx, startX: e.clientX, startW: th.offsetWidth };
    function onMouseMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      const { col, startX, startW } = resizeRef.current;
      setColWidths(prev => ({ ...prev, [col]: Math.max(60, startW + ev.clientX - startX) }));
    }
    function onMouseUp() {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  const { displayRows, displayIndices } = useMemo(() => {
    if (!data) return { displayRows: [], displayIndices: [] };
    const cfg = data.acknowledgeConfig;
    let indices = data.rows.map((_, i) => i);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      indices = indices.filter(i => data.rows[i].some(cell => cell.toLowerCase().includes(q)));
    }

    if (!showCompleted && cfg) {
      indices = indices.filter(i => {
        const rk    = cfg.rowKeys[i] ?? "";
        const local = localAckState[rk];
        const acked = local !== undefined ? local.acked : (cfg.isAcknowledged[i] ?? false);
        return !acked;
      });
    }

    const compareRows = (a: number, b: number): number => {
      const av = data.rows[a][sortCol!] ?? "";
      const bv = data.rows[b][sortCol!] ?? "";
      const ad = Date.parse(av.replace(" ", "T"));
      const bd = Date.parse(bv.replace(" ", "T"));
      if (!isNaN(ad) && !isNaN(bd)) return sortDir === "asc" ? ad - bd : bd - ad;
      const an = parseFloat(av.replace(/[$,]/g, ""));
      const bn = parseFloat(bv.replace(/[$,]/g, ""));
      if (!isNaN(an) && !isNaN(bn)) return sortDir === "asc" ? an - bn : bn - an;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    };

    if (cfg) {
      indices = [...indices].sort((a, b) => {
        const aKey   = cfg.rowKeys[a] ?? "";
        const bKey   = cfg.rowKeys[b] ?? "";
        const aLocal = localAckState[aKey];
        const bLocal = localAckState[bKey];
        const aAcked = aLocal !== undefined ? aLocal.acked : (cfg.isAcknowledged[a] ?? false);
        const bAcked = bLocal !== undefined ? bLocal.acked : (cfg.isAcknowledged[b] ?? false);
        if (aAcked !== bAcked) return aAcked ? 1 : -1;
        if (sortCol !== null) return compareRows(a, b);
        return 0;
      });
    } else if (sortCol !== null) {
      indices = [...indices].sort(compareRows);
    }

    return { displayRows: indices.map(i => data.rows[i]), displayIndices: indices };
  }, [data, search, sortCol, sortDir, showCompleted, localAckState]);

  const completedCount = useMemo(() => {
    if (!data?.acknowledgeConfig) return 0;
    const cfg = data.acknowledgeConfig;
    return data.rows.filter((_, i) => {
      const rk    = cfg.rowKeys[i] ?? "";
      const local = localAckState[rk];
      return local !== undefined ? local.acked : (cfg.isAcknowledged[i] ?? false);
    }).length;
  }, [data, localAckState]);

  const backParams = new URLSearchParams();
  if (searchParams.get("view"))   backParams.set("view",   searchParams.get("view")!);
  if (searchParams.get("state"))  backParams.set("state",  searchParams.get("state")!);
  if (searchParams.get("sister")) backParams.set("sister", searchParams.get("sister")!);

  const hasAck = !!data?.acknowledgeConfig;

  return (
    <div className="max-w-full">
      {/* ── Back link ── */}
      <Link
        href={`/dashboard?${backParams.toString()}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold mb-5 transition-all"
        style={{
          color: "#64748b",
          background: "rgba(255,255,255,0.7)",
          border: "1px solid #e2e8f0",
          borderRadius: "9999px",
          padding: "7px 16px",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color      = "#ffffff";
          (e.currentTarget as HTMLElement).style.background = "#E8756A";
          (e.currentTarget as HTMLElement).style.borderColor = "#E8756A";
          (e.currentTarget as HTMLElement).style.boxShadow  = "0 4px 12px rgba(232,117,106,0.3)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color      = "#64748b";
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.7)";
          (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
          (e.currentTarget as HTMLElement).style.boxShadow  = "";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
        </svg>
        Back to Dashboard
      </Link>

      {/* ── Page header ── */}
      <div
        className="rounded-2xl p-5 mb-5 flex items-start justify-between gap-4"
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,40,71,0.06), 0 1px 2px rgba(0,40,71,0.04)",
        }}
      >
        <div className="flex items-start gap-3.5">
          {/* Colored badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: accentBg, border: `1px solid ${accent}22` }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
          </div>

          <div>
            <h2
              className="font-bold leading-tight"
              style={{ fontSize: "22px", color: "#0f172a", letterSpacing: "-0.01em" }}
            >
              {tile?.label ?? metric}
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "#94a3b8" }}>
              {loading && !data ? (
                "Loading data from BigQuery…"
              ) : (
                <>
                  <span className="font-semibold" style={{ color: "#475569" }}>
                    {displayRows.length.toLocaleString()}
                  </span>
                  {search && data && displayRows.length !== data.rows.length
                    ? ` of ${data.rows.length.toLocaleString()} records`
                    : ` record${displayRows.length !== 1 ? "s" : ""}`}
                  {hasAck && data && (() => {
                    const cfg = data.acknowledgeConfig!;
                    const unaddressed = data.rows.filter((_, i) => {
                      const rk    = cfg.rowKeys[i] ?? "";
                      const local = localAckState[rk];
                      return local !== undefined ? !local.acked : !(cfg.isAcknowledged[i] ?? false);
                    }).length;
                    return (
                      <span
                        className="ml-2 font-bold rounded-full px-2 py-0.5 text-[11px]"
                        style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}
                      >
                        {unaddressed.toLocaleString()} unaddressed
                      </span>
                    );
                  })()}
                  {lastUpdated && (
                    <span className="ml-2" style={{ color: "#cbd5e1" }}>
                      · Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportUrl ? (
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 transition-all"
              style={{
                color: "#065f46", background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "9999px",
                boxShadow: "0 1px 2px rgba(5,150,105,0.1)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Open Sheet ↗
            </a>
          ) : (
            <button
              onClick={handleExport}
              disabled={exporting || !data}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 transition-all disabled:opacity-40"
              style={{
                color: "#475569", background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "9999px",
                boxShadow: "0 1px 2px rgba(0,40,71,0.05)",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "white"}
            >
              {exporting ? (
                <><span className="animate-spin inline-block text-[13px]">↻</span> Exporting…</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                  Export to Sheets
                </>
              )}
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 transition-all disabled:opacity-40"
            style={{
              color: "#475569", background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "9999px",
              boxShadow: "0 1px 2px rgba(0,40,71,0.05)",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "white"}
          >
            <span className={loading ? "animate-spin inline-block text-[13px]" : "text-[13px]"}>↻</span>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Export error ── */}
      {exportError && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-[12px] font-medium"
          style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}
        >
          {exportError}
          <button onClick={() => setExportError(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* ── Search + Ack toggle ── */}
      {data && (
        <div className="mb-3 flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="13" height="13" viewBox="0 0 20 20" fill="none"
              style={{ color: "#94a3b8" }}
            >
              <path d="M17.5 17.5l-4.167-4.167m0 0A6.667 6.667 0 103.333 13.333a6.667 6.667 0 009.998 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search all columns…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-7 py-2 text-[13px] rounded-xl transition-all"
              style={{
                width: "220px",
                border: "1px solid #e2e8f0",
                background: "white",
                color: "#0f172a",
                boxShadow: "0 1px 2px rgba(0,40,71,0.05)",
                outline: "none",
              }}
              onFocus={e => {
                (e.target as HTMLInputElement).style.borderColor = "#7dd3fc";
                (e.target as HTMLInputElement).style.boxShadow   = "0 0 0 3px rgba(125,211,252,0.2)";
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = "#e2e8f0";
                (e.target as HTMLInputElement).style.boxShadow   = "0 1px 2px rgba(0,40,71,0.05)";
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#94a3b8", fontSize: "11px" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#475569"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
              >✕</button>
            )}
          </div>

          {/* Show/Hide completed */}
          {hasAck && (
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-xl px-3.5 py-2 transition-all"
              style={{
                border:     showCompleted ? "1px solid #e2e8f0"  : "1px solid #a7f3d0",
                color:      showCompleted ? "#64748b"             : "#065f46",
                background: showCompleted ? "white"               : "#ecfdf5",
                boxShadow:  "0 1px 2px rgba(0,40,71,0.05)",
              }}
            >
              {showCompleted
                ? <><span style={{ opacity: 0.6 }}>○</span> Show All ({completedCount} completed)</>
                : <><span>✓</span> Unaddressed Only — show all</>
              }
            </button>
          )}
        </div>
      )}

      {/* ── Fetch error ── */}
      {error && (
        <div className="rounded-xl px-4 py-3 mb-4 text-[13px]"
             style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading && !data ? (
        <div
          className="rounded-2xl p-16 text-center"
          style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,40,71,0.06)" }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                   style={{ background: accent, opacity: 0.5, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <div className="text-[13px]" style={{ color: "#94a3b8" }}>Loading data from BigQuery…</div>
        </div>
      ) : data ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,40,71,0.06), 0 1px 2px rgba(0,40,71,0.04)",
          }}
        >
          {/* Top phantom scrollbar */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto"
            style={{ height: "10px", borderBottom: "1px solid #f1f5f9" }}
            onScroll={onTopScroll}
          >
            <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
          </div>

          {/* Table */}
          <div
            ref={tableScrollRef}
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)" }}
            onScroll={onTableScroll}
          >
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* Row # */}
                  <th
                    className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap w-10"
                    style={{ background: "#F8FAFC", color: "#94a3b8", borderBottom: "2px solid #e2e8f0" }}
                  >#</th>

                  {/* Done checkbox column */}
                  {hasAck && (
                    <th
                      className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap w-24 text-center"
                      style={{ background: "#F8FAFC", color: "#94a3b8", borderBottom: "2px solid #e2e8f0" }}
                    >Done</th>
                  )}

                  {/* Data columns */}
                  {data.headers.map((h, i) => (
                    <th
                      key={h}
                      onClick={() => handleSort(i)}
                      className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors"
                      style={{
                        background: sortCol === i ? `${accent}09` : "#F8FAFC",
                        color: sortCol === i ? accent : "#64748b",
                        borderBottom: sortCol === i ? `2px solid ${accent}` : "2px solid #e2e8f0",
                        position: "relative",
                        width:    colWidths[i] ?? undefined,
                        maxWidth: colWidths[i] ? undefined : (data.wideColumns?.includes(i) ? 350 : 200),
                        minWidth: 60,
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        {h}
                        {sortCol === i
                          ? <span className="font-black" style={{ color: accent, fontSize: "11px" }}>
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          : <span style={{ color: "#d1d5db", fontSize: "10px" }}>↕</span>
                        }
                      </span>
                      {/* Resize handle */}
                      <div
                        onMouseDown={e => onResizeMouseDown(e, i)}
                        onClick={e => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group"
                        style={{ zIndex: 1 }}
                      >
                        <div className="absolute inset-y-2 right-0 w-px bg-transparent group-hover:bg-slate-300 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.headers.length + (hasAck ? 2 : 1)}
                      className="px-4 py-12 text-center text-[13px]"
                      style={{ color: "#94a3b8" }}
                    >
                      {search ? "No records match your search." : "No records found."}
                    </td>
                  </tr>
                ) : displayRows.map((row, ri) => {
                  const origIdx = displayIndices[ri];
                  const cfg     = data.acknowledgeConfig;
                  const rowKey  = cfg ? (cfg.rowKeys[origIdx] ?? "") : "";
                  const local   = localAckState[rowKey];
                  const acked   = cfg ? (local !== undefined ? local.acked : (cfg.isAcknowledged[origIdx] ?? false)) : false;
                  const ackedBy = cfg ? (local?.by ?? (cfg.acknowledgedBy[origIdx] !== "—" ? cfg.acknowledgedBy[origIdx] : undefined)) : undefined;
                  const ackedAt = cfg ? (local?.at ?? (cfg.acknowledgedAt[origIdx] !== "—" ? cfg.acknowledgedAt[origIdx] : undefined)) : undefined;
                  const pending = ackPending.has(rowKey);

                  const highlighted = hasAck ? !acked : (data.rowHighlights?.[origIdx] ?? false);
                  const oranged     = !highlighted && (data.orangeHighlights?.[origIdx] ?? false);
                  const isEven      = ri % 2 === 0;
                  const rowBg       = highlighted ? "#FFF5F5"
                                    : oranged     ? "#FFF7ED"
                                    : isEven      ? "#ffffff"
                                    : "#FAFBFC";

                  return (
                    <tr
                      key={ri}
                      className="border-b border-slate-100 last:border-b-0"
                      style={{ background: rowBg }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background =
                          highlighted ? "#FFF0F0" : oranged ? "#FFF3E5" : "#F0F7FF";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = rowBg;
                      }}
                    >
                      {/* Row number */}
                      <td className="px-4 py-2.5 tabular-nums w-10" style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: 500 }}>
                        {ri + 1}
                      </td>

                      {/* Ack checkbox */}
                      {hasAck && (
                        <td className="px-3 py-2 w-24 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5 pt-0.5">
                            <input
                              type="checkbox"
                              checked={acked}
                              disabled={pending}
                              onChange={() => handleAcknowledge(rowKey, acked)}
                              className="w-4 h-4 cursor-pointer disabled:opacity-40 rounded"
                              style={{ accentColor: "#059669" }}
                            />
                            {acked && ackedBy && (
                              <span className="text-[9px] leading-tight text-center max-w-[80px] truncate" style={{ color: "#94a3b8" }} title={ackedBy}>
                                {ackedBy.split("@")[0]}
                              </span>
                            )}
                            {acked && ackedAt && (
                              <span className="text-[9px] leading-tight text-center" style={{ color: "#94a3b8" }}>
                                {ackedAt}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Data cells */}
                      {row.map((cell, ci) => {
                        const isWide     = data.wideColumns?.includes(ci)     ?? false;
                        const isLink     = data.linkColumns?.includes(ci)     ?? false;
                        const isTextLink = data.textLinkColumns?.includes(ci) ?? false;
                        const cellColor  = highlighted ? "#dc2626"
                                         : oranged     ? "#c2410c"
                                         : "#374151";

                        return (
                          <td
                            key={ci}
                            title={isTextLink ? cell.split("|||")[0] : (isLink ? undefined : cell)}
                            className="px-4 py-2.5 text-[13px] leading-snug"
                            style={{
                              color: cellColor,
                              fontWeight: highlighted || oranged ? 500 : 400,
                              width:      colWidths[ci] ?? undefined,
                              maxWidth:   colWidths[ci] ? colWidths[ci] : (isWide ? 350 : 200),
                              overflow:   "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: isWide ? "normal" : "nowrap",
                            }}
                          >
                            {isTextLink ? (() => {
                              const [text, url] = cell.split("|||");
                              return url && url !== "–" && url.startsWith("http") ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
                                  style={{ color: highlighted ? "#dc2626" : oranged ? "#c2410c" : "#0284c7" }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  {text || "—"}
                                  <span style={{ fontSize: "10px", opacity: 0.6 }}>↗</span>
                                </a>
                              ) : <span>{text || "—"}</span>;
                            })() : isLink ? (
                              cell && cell !== "–" ? (
                                <a
                                  href={cell}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 hover:underline font-semibold text-[12px] transition-colors"
                                  style={{ color: "#0284c7" }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  Edit Link <span style={{ fontSize: "10px" }}>↗</span>
                                </a>
                              ) : <span style={{ color: "#d1d5db" }}>—</span>
                            ) : cell}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
