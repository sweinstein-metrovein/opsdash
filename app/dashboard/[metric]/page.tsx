"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { TILE_MAP } from "@/lib/tiles";

interface DetailData {
  headers: string[];
  rows: string[][];
  total: number;
  rowHighlights?: boolean[];    // red highlight
  orangeHighlights?: boolean[]; // orange highlight
  wideColumns?: number[];
  linkColumns?: number[];       // cell value is URL → "Edit Link ↗"
  textLinkColumns?: number[];   // cell value is "text|||url" → hyperlinked text
}

const REFRESH_MS = 60_000;

const SECTION_ACCENT: Record<string, string> = {
  billing:     "#E7373B",
  scheduling:  "#0284C7",
  followup:    "#7C3AED",
  collections: "#059669",
};

export default function MetricDetailPage() {
  const { metric } = useParams<{ metric: string }>();
  const searchParams = useSearchParams();
  const filterStr = searchParams.toString();

  const tile   = TILE_MAP[metric];
  const accent = tile ? (SECTION_ACCENT[tile.section] ?? "#E7373B") : "#E7373B";

  const [data, setData]               = useState<DetailData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [sortCol, setSortCol]         = useState<number | null>(null);
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");

  // Export state
  const [exporting, setExporting]     = useState(false);
  const [exportUrl, setExportUrl]     = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Dual-scroll refs (phantom scrollbar at top)
  const topScrollRef   = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1);

  // Measure table scroll width whenever data changes
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

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    setExportUrl(null);
    try {
      const state  = searchParams.get("state")  ?? undefined;
      const sister = searchParams.get("sister") ? Number(searchParams.get("sister")) : undefined;
      const view   = searchParams.get("view")   ?? undefined;
      const res  = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tile: metric, state, sister, view }),
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
    if (sortCol === colIdx) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(colIdx);
      setSortDir("asc");
    }
  }

  // Sort by index so row highlights travel with their rows
  const { displayRows, displayIndices } = useMemo(() => {
    if (!data) return { displayRows: [], displayIndices: [] };

    let indices = data.rows.map((_, i) => i);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      indices = indices.filter(i => data.rows[i].some(cell => cell.toLowerCase().includes(q)));
    }

    if (sortCol !== null) {
      indices = [...indices].sort((a, b) => {
        const av = data.rows[a][sortCol] ?? "";
        const bv = data.rows[b][sortCol] ?? "";
        const ad = Date.parse(av.replace(" ", "T"));
        const bd = Date.parse(bv.replace(" ", "T"));
        if (!isNaN(ad) && !isNaN(bd)) return sortDir === "asc" ? ad - bd : bd - ad;
        const an = parseFloat(av.replace(/[$,]/g, ""));
        const bn = parseFloat(bv.replace(/[$,]/g, ""));
        if (!isNaN(an) && !isNaN(bn)) return sortDir === "asc" ? an - bn : bn - an;
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return {
      displayRows:    indices.map(i => data.rows[i]),
      displayIndices: indices,
    };
  }, [data, search, sortCol, sortDir]);

  const backParams = new URLSearchParams();
  if (searchParams.get("view"))   backParams.set("view",   searchParams.get("view")!);
  if (searchParams.get("state"))  backParams.set("state",  searchParams.get("state")!);
  if (searchParams.get("sister")) backParams.set("sister", searchParams.get("sister")!);

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

      {/* Search */}
      {data && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none">🔍</span>
            <input type="text" placeholder="Search all columns…" value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full pl-8 pr-8 py-2 text-[13px] border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent placeholder:text-slate-400 transition-shadow" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px]">✕</button>
            )}
          </div>
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

          {/* ── Phantom scrollbar at TOP ── */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto"
            style={{ height: "10px", borderBottom: "1px solid #e2e8f0" }}
            onScroll={onTopScroll}
          >
            <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
          </div>

          {/* ── Actual table ── */}
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
                  {data.headers.map((h, i) => (
                    <th key={h} onClick={() => handleSort(i)}
                        className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer select-none border-b border-slate-200 hover:text-slate-700 transition-colors"
                        style={{ background: "#F8FAFC" }}>
                      <span className="flex items-center gap-1.5">
                        {h}
                        {sortCol === i
                          ? <span className="font-bold" style={{ color: accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-slate-300 text-[10px]">↕</span>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={data.headers.length + 1} className="px-4 py-10 text-center text-slate-400 text-[13px]">
                      {search ? "No records match your search." : "No records found."}
                    </td>
                  </tr>
                ) : (
                  displayRows.map((row, ri) => {
                    // Use original index so highlights travel with their row after sorting
                    const origIdx    = displayIndices[ri];
                    const highlighted = data.rowHighlights?.[origIdx]  ?? false;
                    const oranged     = !highlighted && (data.orangeHighlights?.[origIdx] ?? false);
                    const isEven = ri % 2 === 0;
                    const rowBg  = highlighted ? "#FFF5F5"
                                 : oranged     ? "#FFF7ED"
                                 : isEven      ? "#ffffff"
                                 : "#F8FAFC";
                    return (
                      <tr key={ri}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-blue-50/40 transition-colors"
                          style={{ background: rowBg }}>
                        <td className="px-4 py-2.5 text-slate-400 text-[11px] tabular-nums font-medium w-10">{ri + 1}</td>
                        {row.map((cell, ci) => {
                          const isWide     = data.wideColumns?.includes(ci)     ?? false;
                          const isLink     = data.linkColumns?.includes(ci)     ?? false;
                          const isTextLink = data.textLinkColumns?.includes(ci) ?? false;
                          const cellColor  = highlighted ? "text-red-600 font-medium"
                                           : oranged     ? "text-orange-700 font-medium"
                                           : "text-slate-700";
                          return (
                            <td key={ci}
                                className={`px-4 py-2.5 text-[13px] leading-snug ${cellColor} ${
                                  isWide ? "whitespace-normal min-w-[240px] max-w-[420px]" : "whitespace-nowrap"
                                }`}>
                              {isTextLink ? (() => {
                                const [text, url] = cell.split("|||");
                                return url && url !== "–" && url.startsWith("http") ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer"
                                     className="hover:underline font-medium"
                                     style={{ color: highlighted ? "#dc2626" : oranged ? "#c2410c" : "#2563eb" }}
                                     onClick={e => e.stopPropagation()}>
                                    {text || "—"}
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
