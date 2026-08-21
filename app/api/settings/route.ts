export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db-server";

// GET /api/settings
export async function GET() {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const row = await db.prepare("SELECT * FROM app_settings WHERE id = 1").first<Record<string, unknown>>();
  if (!row) return NextResponse.json({ id: 1 });

  // monthly_goals は JSON 文字列で保存
  return NextResponse.json({
    ...row,
    monthly_goals: typeof row.monthly_goals === "string"
      ? JSON.parse(row.monthly_goals as string)
      : (row.monthly_goals ?? {}),
    notif_progress: row.notif_progress === 1 || row.notif_progress === true,
    notif_task:     row.notif_task     === 1 || row.notif_task     === true,
    notif_profit:   row.notif_profit   === 1 || row.notif_profit   === true,
  });
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const body = await req.json();
  const now = new Date().toISOString();

  const existing = await db.prepare("SELECT id FROM app_settings WHERE id = 1").first();

  // monthly_goals は JSON 文字列で保存
  const monthly_goals = body.monthly_goals !== undefined
    ? JSON.stringify(body.monthly_goals)
    : undefined;

  const payload = { ...body, ...(monthly_goals !== undefined ? { monthly_goals } : {}) };
  delete payload.id;

  if (existing) {
    const fields = Object.keys(payload).map(k => `${k} = ?`).join(", ");
    await db.prepare(`UPDATE app_settings SET ${fields}, updated_at = ? WHERE id = 1`)
      .bind(...Object.values(payload), now).run();
  } else {
    const keys = ["id", ...Object.keys(payload), "updated_at"];
    const vals = [1, ...Object.values(payload), now];
    const ph = vals.map(() => "?").join(", ");
    await db.prepare(`INSERT INTO app_settings (${keys.join(", ")}) VALUES (${ph})`)
      .bind(...vals).run();
  }

  return NextResponse.json({ success: true });
}
