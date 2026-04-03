import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import RoleGuard from "@/components/RoleGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Suspense>
          <TopBar />
        </Suspense>
        {/* Enforces role-based redirect — renders nothing visible */}
        <Suspense>
          <RoleGuard />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-7">{children}</main>
      </div>
    </div>
  );
}
