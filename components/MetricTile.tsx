"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TileConfig, formatValue } from "@/lib/tiles";

interface Props {
  tile: TileConfig;
  value: number | null;
  secondaryValue?: number | null;
  isLoading?: boolean;
}

const CURRENT_MONTH = new Date().toLocaleString("en-US", { month: "long" });

// Brand-aligned section palette
// billing    → MVC red
// scheduling → sky blue (complements brand #4CC6F9)
// followup   → violet (professional, distinct)
// collections→ emerald (financial success)
const SECTION_STYLE: Record<string, {
  accent: string;
  accentLight: string;
  labelColor: string;
  hoverShadow: string;
}> = {
  billing:     { accent: "#E7373B", accentLight: "rgba(231,55,59,0.08)",  labelColor: "#C81E22", hoverShadow: "rgba(231,55,59,0.14)"  },
  scheduling:  { accent: "#0284C7", accentLight: "rgba(2,132,199,0.07)",  labelColor: "#0369A1", hoverShadow: "rgba(2,132,199,0.14)"  },
  followup:    { accent: "#7C3AED", accentLight: "rgba(124,58,237,0.07)", labelColor: "#6D28D9", hoverShadow: "rgba(124,58,237,0.14)" },
  collections: { accent: "#059669", accentLight: "rgba(5,150,105,0.07)",  labelColor: "#047857", hoverShadow: "rgba(5,150,105,0.14)"  },
};

/** Three-dot loading animation shown before first data arrives */
function LoadingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ height: "36px" }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full animate-pulse"
          style={{
            background: color,
            opacity: 0.35,
            animationDelay: `${i * 0.18}s`,
            animationDuration: "1s",
          }}
        />
      ))}
    </div>
  );
}

export default function MetricTile({ tile, value, secondaryValue, isLoading }: Props) {
  const searchParams = useSearchParams();
  const style  = SECTION_STYLE[tile.section] ?? SECTION_STYLE.billing;
  const display = value === null ? "—" : formatValue(value, tile.format);
  const sub     = tile.sub?.replace("{month}", CURRENT_MONTH);
  const isDual  = secondaryValue !== undefined;

  const params = new URLSearchParams();
  if (searchParams.get("view"))   params.set("view",   searchParams.get("view")!);
  if (searchParams.get("state"))  params.set("state",  searchParams.get("state")!);
  if (searchParams.get("sister")) params.set("sister", searchParams.get("sister")!);

  const href       = tile.externalUrl ?? `/dashboard/${tile.id}?${params.toString()}`;
  const isExternal = !!tile.externalUrl;
  const isNoLink   = !!tile.noLink;

  // ── Inner card content ────────────────────────────────────────────────────
  const tileContent = (
    <div className="flex flex-col h-full">

      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 rounded-t-xl"
        style={{ height: "3px", background: style.accent }}
      />

      {/* Section-tinted top-right dot */}
      <div
        className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full opacity-40"
        style={{ background: style.accent }}
      />

      {/* Tile label */}
      <div
        className="text-[10.5px] font-bold uppercase tracking-widest leading-snug mb-3 pr-5"
        style={{ color: "#94a3b8" }}
      >
        {tile.label}
      </div>

      {/* Metric(s) */}
      {isLoading ? (
        <div className="flex-1 flex items-end">
          <LoadingDots color={style.accent} />
        </div>
      ) : isDual ? (
        <div className="flex items-end gap-3 flex-1">
          <div className="flex-1 min-w-0">
            <div className="font-bold leading-none tracking-tight" style={{ fontSize: "30px", color: "#0f172a" }}>
              {display}
            </div>
            {tile.primaryLabel && (
              <div className="text-[11px] font-semibold mt-1.5 uppercase tracking-wide" style={{ color: style.labelColor }}>
                {tile.primaryLabel}
              </div>
            )}
          </div>
          <div className="self-stretch w-px mx-1" style={{ background: "#e2e8f0" }} />
          <div className="flex-1 min-w-0">
            <div className="font-bold leading-none tracking-tight" style={{ fontSize: "30px", color: "#0f172a" }}>
              {secondaryValue === null ? "—" : formatValue(secondaryValue, tile.secondaryFormat)}
            </div>
            {tile.secondaryLabel && (
              <div className="text-[11px] font-semibold mt-1.5 uppercase tracking-wide" style={{ color: style.labelColor }}>
                {tile.secondaryLabel}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-end">
          <div className="font-bold leading-none tracking-tight" style={{ fontSize: "36px", color: "#0f172a" }}>
            {display}
          </div>
        </div>
      )}

      {/* Sub label */}
      {sub && (
        <div
          className="text-[12px] font-semibold mt-2.5 uppercase tracking-wide"
          style={{ color: style.labelColor }}
        >
          {sub}
        </div>
      )}

      {/* Arrow indicator (clickable tiles only) */}
      {!isNoLink && (
        <div
          className="absolute bottom-3 right-3.5 text-[16px] font-light transition-colors"
          style={{ color: "#cbd5e1" }}
        >
          {isExternal ? "↗" : "›"}
        </div>
      )}
    </div>
  );

  // ── Shared class string ───────────────────────────────────────────────────
  const cls = [
    "group relative bg-white rounded-xl p-4 pt-5 overflow-hidden",
    "border border-slate-200/80",
    "transition-all duration-150 ease-out",
    "min-h-[116px]",
    isNoLink
      ? "cursor-default"
      : "cursor-pointer hover:-translate-y-[2px] hover:border-slate-300/80 shadow-sm hover:shadow-md",
  ].join(" ");

  // ── Render ────────────────────────────────────────────────────────────────
  if (isNoLink) {
    return <div className={cls}>{tileContent}</div>;
  }

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 28px ${style.hoverShadow}`)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "")}
      >
        {tileContent}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={cls}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 28px ${style.hoverShadow}`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "")}
    >
      {tileContent}
    </Link>
  );
}
