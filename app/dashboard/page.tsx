import { Suspense } from "react";
import TileGrid from "@/components/TileGrid";
import ReferencesCard from "@/components/ReferencesCard";
import NotificationsCard from "@/components/NotificationsCard";
import AnnouncementsBar from "@/components/AnnouncementsBar";

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Suspense>
        <AnnouncementsBar />
      </Suspense>
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          <Suspense fallback={<div className="text-slate-400 text-sm">Loading...</div>}>
            <TileGrid />
          </Suspense>
        </div>
        <div className="w-[300px] min-w-[300px] flex flex-col gap-5">
          <ReferencesCard />
          <Suspense fallback={<div className="bg-white rounded-xl border border-slate-200 p-4 text-slate-400 text-sm">Loading...</div>}>
            <NotificationsCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
