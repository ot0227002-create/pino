export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { dbServer, hasSupabaseServer } from "@/lib/db-server";
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

// GET /api/projects/[id] — 1件取得
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;

  const { data: project, error } = await dbServer
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: construction }, { data: images }] = await Promise.all([
    dbServer
      .from("construction_details")
      .select("*")
      .eq("project_id", id)
      .maybeSingle(),
    dbServer
      .from("project_images")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const profit = construction ? calcProfit(construction) : undefined;

  return NextResponse.json({
    ...project,
    construction: construction ?? null,
    images: images ?? [],
    profit,
  });
}

// PATCH /api/projects/[id] — 案件・工事情報を更新
// Body: { project?: {...}, construction?: {...} }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const now = new Date().toISOString();

  // 案件フィールドの更新
  if (body.project) {
    const { error } = await dbServer
      .from("projects")
      .update({ ...body.project, updated_at: now })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 工事情報のUpsert
  if (body.construction) {
    const { data: existing } = await dbServer
      .from("construction_details")
      .select("id")
      .eq("project_id", id)
      .maybeSingle();

    if (existing) {
      const { error } = await dbServer
        .from("construction_details")
        .update({ ...body.construction, updated_at: now })
        .eq("project_id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await dbServer
        .from("construction_details")
        .insert({
          ...body.construction,
          project_id: id,
          created_at: now,
          updated_at: now,
        });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/projects/[id] — 案件を削除（関連データも連動削除）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;

  // 関連データを先に削除（Supabase RLSがCASCADEをブロックする場合の保険）
  await dbServer.from("project_images").delete().eq("project_id", id);
  await dbServer.from("construction_details").delete().eq("project_id", id);

  const { error } = await dbServer.from("projects").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
