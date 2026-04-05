import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllAnnouncements } from "@/lib/announcements";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.userRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const announcements = await getAllAnnouncements();
    return NextResponse.json(announcements);
  } catch (e) {
    console.error("Announcements all GET error:", e);
    return NextResponse.json([], { status: 200 });
  }
}
