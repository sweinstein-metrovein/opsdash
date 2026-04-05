import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveAnnouncements, createAnnouncement } from "@/lib/announcements";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const state  = searchParams.get("state")  ?? null;
  const sister = searchParams.get("sister") ? Number(searchParams.get("sister")) : null;
  const view   = searchParams.get("view")   ?? null;

  try {
    const announcements = await getActiveAnnouncements({ state, sister, view });
    return NextResponse.json(announcements);
  } catch (e) {
    console.error("Announcements GET error:", e);
    return NextResponse.json([], { status: 200 }); // gracefully return empty on error
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.userRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!body.dept?.trim())  return NextResponse.json({ error: "Dept is required" },  { status: 400 });

    const id = await createAnnouncement(body, session.user.email);
    return NextResponse.json({ id });
  } catch (e) {
    console.error("Announcements POST error:", e);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
