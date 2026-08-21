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

// GET /api/projects
export async function GET() {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const projects = await db.prepare(
    "SELECT * FROM projects ORDER BY updated_at DESC"
  ).all();

  const ids = projects.results.map((p: Record<string, unknown>) => p.id as string);
  if (ids.length === 0) return NextResponse.json([]);

  const placeholders = ids.map(() => "?").join(",");
  const [constructions, images, workItems] = await Promise.all([
    db.prepare(`SELECT * FROM construction_details WHERE project_id IN (${placeholders})`).bind(...ids).all(),
    db.prepare(`SELECT * FROM project_images WHERE project_id IN (${placeholders}) ORDER BY created_at DESC`).bind(...ids).all(),
    db.prepare(`SELECT * FROM work_items WHERE project_id IN (${placeholders}) ORDER BY sort_order`).bind(...ids).all(),
  ]);

  const result = projects.results.map((p: Record<string, unknown>) => {
    const construction = constructions.results.find(
      (c: Record<string, unknown>) => c.project_id === p.id
    );
    const projectImages = images.results.filter(
      (i: Record<string, unknown>) => i.project_id === p.id
    );
    const projectWorkItems = workItems.results.filter(
      (w: Record<string, unknown>) => w.project_id === p.id
    );
    const profit = construction ? calcProfit(construction as Partial<ConstructionDetails>) : undefined;
    return {
      ...p,
      construction: construction ? { ...construction, work_items: projectWorkItems } : null,
      images: projectImages,
      profit,
    };
  });

  return NextResponse.json(result);
}

// POST /api/projects
export async function POST(req: NextRequest) {
  const db = getDB();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const body = await req.json();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO projects (id, customer_name, phone, address, work_type, status, target_month, next_action_date, memo, last_contact_date, drawing_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`
  ).bind(
    id,
    body.customer_name,
    body.phone ?? "",
    body.address ?? "",
    body.work_type ?? "reform",
    body.status ?? "new_inquiry",
    body.target_month ?? null,
    body.next_action_date ?? null,
    body.memo ?? null,
    now,
    now,
  ).run();

  const project = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  return NextResponse.json(project, { status: 201 });
}
