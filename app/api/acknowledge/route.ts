import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runQuery } from "@/lib/bigquery";

const PROJECT = process.env.BIGQUERY_PROJECT_ID!;
const DATASET = process.env.BIGQUERY_DATASET!;
const ACK = `\`${PROJECT}.${DATASET}.acknowledgments\``;

function safe(s: string) {
  return String(s).replace(/'/g, "''");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tile, rowKey } = await req.json();
  if (!tile || !rowKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  await runQuery(`
    INSERT INTO ${ACK} (tile_id, row_key, acknowledged_by, acknowledged_at)
    VALUES ('${safe(tile)}', '${safe(rowKey)}', '${safe(session.user.email)}', CURRENT_TIMESTAMP())
  `);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tile, rowKey } = await req.json();
  if (!tile || !rowKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  await runQuery(`
    UPDATE ${ACK}
    SET revoked_at = CURRENT_TIMESTAMP(), revoked_by = '${safe(session.user.email)}'
    WHERE tile_id = '${safe(tile)}' AND row_key = '${safe(rowKey)}' AND revoked_at IS NULL
  `);

  return NextResponse.json({ ok: true });
}
