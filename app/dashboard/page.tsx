import { Suspense } from "react";
import TileGrid from "@/components/TileGrid";
import ReferencesCard from "@/components/ReferencesCard";
import NotificationsCard from "@/components/NotificationsCard";

export default function DashboardPage() {
  return (
    <div className="flex gap-5 items-start">
      {/* Left: live tile grid */}
      <div className="flex-1 min-w-0">
        <Suspense fallback={<div className="text-slate-400 text-sm">Loading tiles…</div>}>
          <TileGrid />
        </Suspense>
      </div>

      {/* Right: references + notifications */}
      <div className="w-[300px] min-w-[300px] flex flex-col gap-5">
        <ReferencesCard />
        <NotificationsCard />
      </div>
    </div>
  );
}
