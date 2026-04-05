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

const SECTION_STYLE: Record<string, {
  accent: string;
  accentGrad: string;
  accentLight: string;
  labelColor: string;
  hoverShadow: string;
  sectionBadgeBg: string;
  sectionBadgeText: string;
}> = {
  billing: {
    accent:           "#E7373B",
    accentGrad:       "linear-gradient(135deg, #E7373B 0%, #c72428 100%)",
    accentLight:      "rgba(231,55,59,0.07)",
    labelColor:       "#B91C1C",
    hoverShadow:      "0 8px 28px rgba(231,55,59,0.18), 0 3px 8px rgba(231,55,59,0.1)",
    sectionBadgeBg:   "rgba(254,242,242,1)",
    sectionBadgeText: "#B91C1C",
  },
  scheduling: {
    accent:           "#0284C7",
    accentGrad:       "linear-gradient(135deg, #0284C7 0%, #0369a1 100%)",
    accentLight:      "rgba(2,132,199,0.07)",
    labelColor:       "#0369A1",
    hoverShadow:      "0 8px 28px rgba(2,132,199,0.18), 0 3px 8px rgba(2,132,199,0.1)",
    sectionBadgeBg:   "rgba(240,249,255,1)",
    sectionBadgeText: "#0369A1",
  },
  followup: {
    accent:           "#7C3AED",
    accentGrad:       "linear-gradient(135deg, #7C3AED 0%, #6d28d9 100%)",
    accentLight:      "rgba(124,58,237,0.07)",
    labelColor:       "#6D28D9",
    hoverShadow:      "0 8px 28px rgba(124,58,237,0.18), 0 3px 8px rgba(124,58,237,0.1)",
    sectionBadgeBg:   "rgba(245,243,255,1)",
    sectionBadgeText: "#6D28D9",
  },
  collections: {
    accent:           "#059669",
    accentGrad:       "linear-gradient(135deg, #059669 0%, #047857 100%)",
    accentLight:      "rgba(5,150,105,0.07)",
    labelColor:       "#047857",
    hoverShadow:      "0 8px 28px rgba(5,150,105,0.18), 0 3px 8px rgba(5,150,105,0.1)",
    sectionBadgeBg:   "rgba(236,253,245,1)",
    sectionBadgeText: "#047857",
  },
};

function LoadingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ height: "42px" }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: color, opacity: 0.3, animationDelay: `${i * 0.18}s`, animationDuration: "1s" }}
        />
      ))}
    </div>
  );
}

export default function MetricTile({ tile, value, secondaryValue, isLoading }: Props) {
  const searchParams = useSearchParams();
  const style   = SECTION_STYLE[tile.section] ?? SECTION_STYLE.billing;
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

  const tileContent = (
    <div className="flex flex-col h-full">
      {/* Gradient top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 rounded-t-xl"
        style={{ height: "3px", background: style.accentGrad }}
      />

      {/* Subtle section tint in top-right corner */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-bl-[60px] opacity-[0.035] pointer-events-none"
        style={{ background: style.accent }}
      />

      {/* Tile label */}
      <div
        className="text-[10px] font-bold uppercase tracking-widest leading-snug mb-3 pr-5"
        style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
      >
        {tile.label}
      </div>

      {/* Metric(s) */}
      {isLoading ? (
        <div className="flex-1 flex items-end pb-1">
          <LoadingDots color={style.accent} />
        </div>
      ) : isDual ? (
        <div className="flex items-end gap-3 flex-1">
          <div className="flex-1 min-w-0">
            <div
              className="font-extrabold leading-none tabular-nums"
              style={{ fontSize: "28px", color: "#0f172a", letterSpacing: "-0.02em" }}
            >
              {display}
            </div>
            {tile.primaryLabel && (
              <div className="text-[10.5px] font-bold mt-1.5 uppercase tracking-wider" style={{ color: style.labelColor }}>
                {tile.primaryLabel}
              </div>
            )}
          </div>
          <div className="self-stretch w-px" style={{ background: "#e2e8f0" }} />
          <div className="flex-1 min-w-0">
            <div
              className="font-extrabold leading-none tabular-nums"
              style={{ fontSize: "28px", color: "#0f172a", letterSpacing: "-0.02em" }}
            >
              {secondaryValue === null ? "—" : formatValue(secondaryValue, tile.secondaryFormat)}
            </div>
            {tile.secondaryLabel && (
              <div className="text-[10.5px] font-bold mt-1.5 uppercase tracking-wider" style={{ color: style.labelColor }}>
                {tile.secondaryLabel}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-end pb-0.5">
          <div
            className="font-extrabold leading-none tabular-nums"
            style={{ fontSize: "38px", color: "#0f172a", letterSpacing: "-0.03em" }}
          >
            {display}
          </div>
        </div>
      )}

      {/* Sub label */}
      {sub && (
        <div
          className="text-[11px] font-bold mt-2 uppercase tracking-wider"
          style={{ color: style.labelColor }}
        >
          {sub}
        </div>
      )}

      {/* Link arrow */}
      {!isNoLink && (
        <div
          className="absolute bottom-3 right-3.5 transition-all duration-200"
          style={{ color: "#d1d5db", fontSize: "15px", fontWeight: 300 }}
        >
          {isExternal ? "↗" : "›"}
        </div>
      )}
    </div>
  );

  const baseCls = [
    "group relative bg-white rounded-xl p-4 pt-5 overflow-hidden",
    "border border-slate-200/70",
    "transition-all duration-200 ease-out",
    "min-h-[124px]",
    isNoLink ? "cursor-default" : "cursor-pointer",
  ].join(" ");

  const baseStyle = {
    boxShadow: "0 1px 3px rgba(0,40,71,0.06), 0 1px 2px rgba(0,40,71,0.04)",
  };

  if (isNoLink) {
    return <div className={baseCls} style={baseStyle}>{tileContent}</div>;
  }

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.boxShadow = style.hoverShadow;
      e.currentTarget.style.transform  = "translateY(-2px)";
      e.currentTarget.style.borderColor = "rgba(148,163,184,0.7)";
      const arrow = e.currentTarget.querySelector(".absolute.bottom-3") as HTMLElement | null;
      if (arrow) arrow.style.color = style.accent;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.boxShadow = baseStyle.boxShadow;
      e.currentTarget.style.transform  = "";
      e.currentTarget.style.borderColor = "";
      const arrow = e.currentTarget.querySelector(".absolute.bottom-3") as HTMLElement | null;
      if (arrow) arrow.style.color = "#d1d5db";
    },
  };

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
         className={baseCls} style={baseStyle} {...hoverHandlers}>
        {tileContent}
      </a>
    );
  }

  return (
    <Link href={href} className={baseCls} style={baseStyle} {...hoverHandlers}>
      {tileContent}
    </Link>
  );
}
