"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TILES, SECTIONS, TileSection } from "@/lib/tiles";
import MetricTile from "./MetricTile";

const SECTION_ORDER: TileSection[] = ["billing", "scheduling", "followup", "collections"];
const REFRESH_INTERVAL_MS = 60_000; // 60 seconds

export default function TileGrid() {
  const searchParams = useSearchParams();
  const filterStr = searchParams.toString(); // re-fetch when filter changes

  const [values, setValues]       = useState<Record<string, number | null>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchTiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tiles?${filterStr}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setValues(data);
      setHasLoaded(true);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to fetch tiles:", e);
      setError("Could not load live data — showing last known values.");
    } finally {
      setLoading(false);
    }
  }, [filterStr]);

  // Fetch on mount and whenever filter changes
  useEffect(() => {
    fetchTiles();
  }, [fetchTiles]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(fetchTiles, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchTiles]);

  return (
    <div className="flex flex-col gap-1">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              Refreshing…
            </span>
          )}
          {!loading && lastUpdated && (
            <span className="text-[11px] text-slate-400">
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          {error && (
            <span className="text-[11px] text-amber-500">{error}</span>
          )}
        </div>
        <button
          onClick={fetchTiles}
          disabled={loading}
          className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tile sections */}
      {SECTION_ORDER.map(section => {
        const tiles = TILES.filter(t => t.section === section);
        const sectionAccent: Record<string, string> = {
          billing:     "#E7373B",
          scheduling:  "#0284C7",
          followup:    "#7C3AED",
          collections: "#059669",
        };
        return (
          <div key={section} className="mb-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-1 h-4 rounded-full" style={{ background: sectionAccent[section] }} />
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {SECTIONS[section]}
              </div>
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(tiles.length, 5)}, minmax(0, 1fr))` }}
            >
              {tiles.map(tile => (
                <MetricTile
                  key={tile.id}
                  tile={tile}
                  value={values[tile.id] ?? null}
                  secondaryValue={tile.secondaryTileId ? (values[tile.secondaryTileId] ?? null) : undefined}
                  isLoading={!hasLoaded}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
