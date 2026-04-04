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

export default function MetricDetailPage() {
  const { metric }     = useParams<{ metric: string }>();
  const searchParams   = useSearchParams();
  const filterStr      = searchParams.toString();
  const { data: session } = useSession();

  const tile   = TILE_MAP[metric];
  const accent = tile ? (SECTION_ACCENT[tile.section] ?? "#E7373B") : "#E7373B";

  const [data, setData]               = useState<DetailData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [sortCol, setSortCol]         = useState<number | null>(null);
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");
  const [showCompleted, setShowCompleted]           = useState(true);
  const [localAckState, setLocalAckState]           = useState<Record<string, LocalAckEntry>>({});
  const [ackPending, setAckPending]                 = useState<Set<string>>(new Set());
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const resizeRef = useRef<{ col: number; startX: number; startW: number } | null>(null);

  // Export state
  const [exporting, setExporting]     = useState(false);
  const [exportUrl, setExportUrl]     = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Dual-scroll refs (phantom scrollbar at top)
  const topScrollRef   = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1);

  // Reset local ack state when filter (state/sister) changes
  useEffect(() => { setLocalAckState({}); }, [filterStr]);

  // Measure table scroll width for phantom scrollbar
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

    // Optimistic update
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
      // Revert on error
      setLocalAckState(prev => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tile: metric, state, sister, view }),
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
      const newW = Math.max(60, startW + ev.clientX - startX);
      setColWidths(prev => ({ ...prev, [col]: newW }));
    }
    function onMouseUp() {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // ── Derived ack state helpers (inline to avoid closure issues in useMemo) ──
  // These are called inside useMemo with localAckState/data in deps.

  const { displayRows, displayIndices } = useMemo(() => {
    if (!data) return { displayRows: [], displayIndices: [] };

    const cfg = data.acknowledgeConfig;
    let indices = data.rows.map((_, i) => i);

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      indices = indices.filter(i => data.rows[i].some(cell => cell.toLowerCase().includes(q)));
    }

    // Hide completed rows
    if (!showCompleted && cfg) {
      indices = indices.filter(i => {
        const rk     = cfg.rowKeys[i] ?? "";
        const local  = localAckState[rk];
        const acked  = local !== undefined ? local.acked : (cfg.isAcknowledged[i] ?? false);
        return !acked;
      });
    }

    // Sort
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
      // Ack tiles: unacked always first; column sort applied within each group
      indices = [...indices].sort((a, b) => {
        const aKey   = cfg.rowKeys[a] ?? "";
        const bKey   = cfg.rowKeys[b] ?? "";
        const aLocal = localAckState[aKey];
        const bLocal = localAckState[bKey];
        const aAcked = aLocal !== undefined ? aLocal.acked : (cfg.isAcknowledged[a] ?? false);
        const bAcked = bLocal !== undefined ? bLocal.acked : (cfg.isAcknowledged[b] ?? false);
        if (aAcked !== bAcked) return aAcked ? 1 : -1;
        if (sortCol !== null) return compareRows(a, b);
        return 0; // preserve SQL order within group
      });
    } else if (sortCol !== null) {
      indices = [...indices].sort(compareRows);
    }

    return { displayRows: indices.map(i => data.rows[i]), displayIndices: indices };
  }, [data, search, sortCol, sortDir, showCompleted, localAckState]);

  // Count completed for toggle label
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
      {/* Back */}
      <Link
        href={`/dashboard?${backParams.toString()}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-700 mb-5 transition-colors group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
        Back to Dashboard
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-1 h-8 rounded-full mt-0.5 flex-shrink-0" style={{ background: accent }} />
          <div>
            <h2 className="text-[24px] font-bold text-slate-900 leading-tight tracking-tight">
              {tile?.label ?? metric}
            </h2>
            <p className="text-[13px] text-slate-400 mt-0.5">
              {loading && !data ? "Loading…" : (
                <>
                  <span className="font-semibold text-slate-600">{displayRows.length.toLocaleString()}</span>
                  {search && data && displayRows.length !== data.rows.length
                    ? ` of ${data.rows.length.toLocaleString()} records`
                    : ` record${displayRows.length !== 1 ? "s" : ""}`}
                  {hasAck && data && (() => {
                    const cfg = data.acknowledgeConfig!;
                    const unaddressed = data.rows.filter((_, i) => {
                      const rk = cfg.rowKeys[i] ?? "";
                      const local = localAckState[rk];
                      return local !== undefined ? !local.acked : !(cfg.isAcknowledged[i] ?? false);
                    }).length;
                    return (
                      <span className="ml-2 text-red-500 font-semibold">
                        · {unaddressed.toLocaleString()} unaddressed
                      </span>
                    );
                  })()}
                  {lastUpdated && (
                    <span className="ml-2 text-slate-400">
                      · Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {exportUrl ? (
            <a href={exportUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3.5 py-2 transition-all">
              <span>📊</span> Open Sheet ↗
            </a>
          ) : (
            <button onClick={handleExport} disabled={exporting || !data}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 transition-all shadow-sm disabled:opacity-40">
              {exporting
                ? <><span className="animate-spin inline-block">↻</span> Exporting…</>
                : <><span>📊</span> Export to Google Sheets</>}
            </button>
          )}
          <button onClick={fetchData} disabled={loading}
                  className="text-[12px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3.5 py-2 transition-all disabled:opacity-40 flex items-center gap-1.5 bg-white hover:bg-slate-50 shadow-sm">
            <span className={loading ? "animate-spin inline-block" : ""}>↻</span>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[12px] rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
          <span>⚠</span> {exportError}
          <button onClick={() => setExportError(null)} className="ml-auto text-amber-400 hover:text-amber-600">✕</button>
        </div>
      )}

      {/* Search + Show/Hide Completed toggle */}
      {data && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none">🔍</span>
            <input type="text" placeholder="Search all columns…" value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full pl-8 pr-8 py-2 text-[13px] border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent placeholder:text-slate-400 transition-shadow" />
            {search && (
              <button onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px]">✕</button>
            )}
          </div>

          {hasAck && (
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium border rounded-lg px-3.5 py-2 transition-all shadow-sm"
              style={{
                borderColor: showCompleted ? "#d1d5db" : "#86efac",
                color:       showCompleted ? "#64748b"  : "#166534",
                background:  showCompleted ? "white"    : "#f0fdf4",
              }}
            >
              {showCompleted
                ? <>○ Show All ({completedCount} completed)</>
                : <>✓ Showing Unaddressed Only — click to show all</>}
            </button>
          )}
        </div>
      )}

      {/* Fetch error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* Table */}
      {loading && !data ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="text-slate-400 text-[14px]">Loading data from BigQuery…</div>
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Phantom scrollbar at TOP */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto"
            style={{ height: "10px", borderBottom: "1px solid #e2e8f0" }}
            onScroll={onTopScroll}
          >
            <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
          </div>

          {/* Actual table */}
          <div
            ref={tableScrollRef}
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 270px)" }}
            onScroll={onTableScroll}
          >
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap w-10 border-b border-slate-200"
                      style={{ background: "#F8FAFC" }}>#</th>
                  {hasAck && (
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap w-24 border-b border-slate-200 text-center"
                        style={{ background: "#F8FAFC" }}>Done</th>
                  )}
                  {data.headers.map((h, i) => (
                    <th key={h} onClick={() => handleSort(i)}
                        className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer select-none border-b border-slate-200 hover:text-slate-700 transition-colors"
                        style={{
                          background: "#F8FAFC",
                          position: "relative",
                          width: colWidths[i] ?? undefined,
                          maxWidth: colWidths[i] ? undefined : (data.wideColumns?.includes(i) ? 350 : 200),
                          minWidth: 60,
                        }}>
                      <span className="flex items-center gap-1.5">
                        {h}
                        {sortCol === i
                          ? <span className="font-bold" style={{ color: accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-slate-300 text-[10px]">↕</span>}
                      </span>
                      {/* Resize handle */}
                      <div
                        onMouseDown={e => onResizeMouseDown(e, i)}
                        onClick={e => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize group"
                        style={{ zIndex: 1 }}
                      >
                        <div className="absolute inset-y-2 right-0 w-0.5 bg-transparent group-hover:bg-slate-300 transition-colors" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={data.headers.length + (hasAck ? 2 : 1)}
                        className="px-4 py-10 text-center text-slate-400 text-[13px]">
                      {search ? "No records match your search." : "No records found."}
                    </td>
                  </tr>
                ) : displayRows.map((row, ri) => {
                  const origIdx = displayIndices[ri];
                  const cfg     = data.acknowledgeConfig;

                  // Resolve ack state for this row
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
                                    : "#F8FAFC";

                  return (
                    <tr key={ri}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-blue-50/40 transition-colors"
                        style={{ background: rowBg }}>
                      <td className="px-4 py-2.5 text-slate-400 text-[11px] tabular-nums font-medium w-10">{ri + 1}</td>

                      {hasAck && (
                        <td className="px-3 py-2 w-24 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5 pt-0.5">
                            <input
                              type="checkbox"
                              checked={acked}
                              disabled={pending}
                              onChange={() => handleAcknowledge(rowKey, acked)}
                              className="w-4 h-4 cursor-pointer accent-emerald-600 disabled:opacity-40"
                            />
                            {acked && ackedBy && (
                              <span className="text-[9px] text-slate-400 leading-tight text-center max-w-[80px] truncate" title={ackedBy}>
                                {ackedBy.split("@")[0]}
                              </span>
                            )}
                            {acked && ackedAt && (
                              <span className="text-[9px] text-slate-400 leading-tight text-center">{ackedAt}</span>
                            )}
                          </div>
                        </td>
                      )}

                      {row.map((cell, ci) => {
                        const isWide     = data.wideColumns?.includes(ci)     ?? false;
                        const isLink     = data.linkColumns?.includes(ci)     ?? false;
                        const isTextLink = data.textLinkColumns?.includes(ci) ?? false;
                        const cellColor  = highlighted ? "text-red-600 font-medium"
                                         : oranged     ? "text-orange-700 font-medium"
                                         : "text-slate-700";
                        return (
                          <td key={ci}
                              title={isTextLink ? cell.split("|||")[0] : (isLink ? undefined : cell)}
                              className={`px-4 py-2.5 text-[13px] leading-snug ${cellColor}`}
                              style={{
                                width: colWidths[ci] ?? undefined,
                                maxWidth: colWidths[ci] ? colWidths[ci] : (isWide ? 350 : 200),
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: isWide ? "normal" : "nowrap",
                              }}>
                            {isTextLink ? (() => {
                              const [text, url] = cell.split("|||");
                              return url && url !== "–" && url.startsWith("http") ? (
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                   className="hover:underline font-medium inline-flex items-center gap-1"
                                   style={{ color: highlighted ? "#dc2626" : oranged ? "#c2410c" : "#2563eb" }}
                                   onClick={e => e.stopPropagation()}>
                                  {text || "—"}<span className="text-[10px] opacity-70">↗</span>
                                </a>
                              ) : <span>{text || "—"}</span>;
                            })() : isLink ? (
                              cell && cell !== "–" ? (
                                <a href={cell} target="_blank" rel="noopener noreferrer"
                                   className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium text-[12px]"
                                   onClick={e => e.stopPropagation()}>
                                  Edit Link ↗
                                </a>
                              ) : <span className="text-slate-300">—</span>
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
