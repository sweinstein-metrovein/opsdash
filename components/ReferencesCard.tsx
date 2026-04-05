import { Suspense } from "react";
import { MOCK_REFERENCES } from "@/lib/mock-data";
import PhysicianDashboardSection from "./PhysicianDashboardSection";

export default function ReferencesCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 text-[13px] font-bold text-slate-900">
        References
      </div>
      <div className="flex flex-col">
        {MOCK_REFERENCES.map((ref) => (
          <a
            key={ref.id}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-sky-600 hover:bg-sky-50 transition-colors border-b border-slate-100 last:border-b-0"
          >
            <span className="text-base">{ref.icon}</span>
            {ref.label}
            <span className="ml-auto text-slate-300 text-xs">↗</span>
          </a>
        ))}

        {/* Physician weekly dashboards — only renders for users in physician_dashboards table */}
        <Suspense fallback={null}>
          <PhysicianDashboardSection />
        </Suspense>
      </div>
    </div>
  );
}
