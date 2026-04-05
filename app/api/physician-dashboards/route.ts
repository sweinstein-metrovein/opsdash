import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPhysicianDashboardForEmail,
  getPhysicianDashboardsByState,
  getAllPhysicianDashboards,
} from "@/lib/queries";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ view: "none" });
  }

  const role  = (session.userRole ?? "").toLowerCase();
  const email = session.user.email;
  const state = session.userState;

  try {
    if (role === "admin") {
      const states = await getAllPhysicianDashboards();
      if (states.length === 0) return NextResponse.json({ view: "none" });
      return NextResponse.json({ view: "admin", states });
    }

    if (role === "regional" && state) {
      const providers = await getPhysicianDashboardsByState(state);
      if (providers.length === 0) return NextResponse.json({ view: "none" });
      return NextResponse.json({ view: "regional", state, providers });
    }

    // Clinic / sister role — check if the user is also a physician
    const entry = await getPhysicianDashboardForEmail(email);
    if (!entry || !entry.dashboardLink || entry.dashboardLink === "–") {
      return NextResponse.json({ view: "none" });
    }
    return NextResponse.json({ view: "physician", entry });
  } catch (err) {
    console.error("[physician-dashboards]", err);
    return NextResponse.json({ view: "none" });
  }
}
