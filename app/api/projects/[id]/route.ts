export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db-server";
import type { ConstructionDetails } from "@/types";

function calcProfit(c: Partial<ConstructionDetails>) {
  const contract_amount = c.contract_amount ?? 0;
  const total_cost =
    (c.subcontractor_cost ?? 0) + (c.material_cost ?? 0) + (c.other_cost ?? 0);
  const profit = contract_amount - total_cost;
  const profit_rate =
    total_cost > 0
      ? Math.round(((profit / total_cost) * 100) * 10) / 10
      : 0;
  return { contract_amount, total_cost, profit, profit_rate };
}

// GET /api/projects/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { id } = await params;
  const project = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [construction, images, workItems] = await Promise.all([
    db.prepare("SELECT * FROM construction_details WHERE project_id = ?").bind(id).first(),
    db.prepare("SELECT * FROM project_images WHERE project_id = ? ORDER BY created_at DESC").bind(id).all(),
    db.prepare("SELECT * FROM work_items WHERE project_id = ? ORDER BY sort_order").bind(id).all(),
  ]);

  const profit = construction ? calcProfit(construction as Partial<ConstructionDetails>) : undefined;
  return NextResponse.json({
    ...project,
    construction: construction ? { ...construction, work_items: workItems.results } : null,
    images: images.results,
    profit,
  });
}

// PATCH /api/projects/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const now = new Date().toISOString();

  if (body.project) {
    const p = body.project;
    const fields = Object.keys(p).map(k => `${k} = ?`).join(", ");
    await db.prepare(`UPDATE projects SET ${fields}, updated_at = ? WHERE id = ?`)
      .bind(...Object.values(p), now, id).run();
  }

  if (body.construction) {
    const existing = await db.prepare(
      "SELECT id FROM construction_details WHERE project_id = ?"
    ).bind(id).first();

    const c = body.construction;
    if (existing) {
      const fields = Object.keys(c).map(k => `${k} = ?`).join(", ");
      await db.prepare(`UPDATE construction_details SET ${fields}, updated_at = ? WHERE project_id = ?`)
        .bind(...Object.values(c), now, id).run();
    } else {
      const cId = crypto.randomUUID();
      const keys = ["id", "project_id", ...Object.keys(c), "created_at", "updated_at"];
      const vals = [cId, id, ...Object.values(c), now, now];
      const ph = vals.map(() => "?").join(", ");
      await db.prepare(`INSERT INTO construction_details (${keys.join(", ")}) VALUES (${ph})`)
        .bind(...vals).run();
    }
  }

  if (body.work_items !== undefined) {
    await db.prepare("DELETE FROM work_items WHERE project_id = ?").bind(id).run();
    const items = body.work_items as Array<{
      category: string; name: string; detail: string; sort_order?: number;
    }>;
    if (items.length > 0) {
      await Promise.all(items.map((item, index) =>
        db.prepare(
          "INSERT INTO work_items (id, project_id, category, name, detail, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(crypto.randomUUID(), id, item.category, item.name, item.detail ?? "", item.sort_order ?? index).run()
      ));
    }
  }

  // 画像レコード追加（URLのみ）
  if (body.image) {
    const { image_url, r2_key, category } = body.image;
    await db.prepare(
      "INSERT INTO project_images (id, project_id, image_url, r2_key, category) VALUES (?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), id, image_url, r2_key ?? null, category ?? "other").run();
  }

  // 画像レコード削除
  if (body.delete_image_id) {
    await db.prepare("DELETE FROM project_images WHERE id = ? AND project_id = ?")
      .bind(body.delete_image_id, id).run();
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/projects/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { id } = await params;
  await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
  return NextResponse.json({ success: true });
}
