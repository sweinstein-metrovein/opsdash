import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";

export default function NotificationsCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1">
      <div className="px-4 py-3 border-b border-slate-100 text-[13px] font-bold text-slate-900">
        Notifications
      </div>
      {MOCK_NOTIFICATIONS.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-slate-400">
          No new notifications
        </div>
      ) : (
        <div>
          {MOCK_NOTIFICATIONS.map((n) => (
            <div
              key={n.id}
              className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer last:border-b-0"
            >
              <div className="text-[10px] font-semibold text-slate-400 mb-0.5">
                {n.time}
              </div>
              <div className="text-[12px] font-medium text-slate-700">
                {n.note}
              </div>
              <div className="flex gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="text-sky-500 underline">{n.detail}</span>
                <span>· Patient ID {n.patientId}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
