export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { dbServer, hasSupabaseServer } from "@/lib/db-server";
import type { ConstructionDetails } from "@/types";

function calcProfit(c: Partial<ConstructionDetails>) {
  const contract_amount = Math.round((c.contract_amount ?? 0) / 1.1); // 税抜に変換
  const total_cost =
    (c.subcontractor_cost ?? 0) + (c.material_cost ?? 0) + (c.other_cost ?? 0);
  const profit = contract_amount - total_cost;
  const profit_rate =
    contract_amount > 0
      ? Math.round(((profit / contract_amount) * 100) * 10) / 10
      : 0;
  return { contract_amount, total_cost, profit, profit_rate };
}

// GET /api/projects — 全案件一覧（工事詳細・写真・利益付き）
export async function GET() {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data: projects, error } = await dbServer
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (projects ?? []).map((p: { id: string }) => p.id);
  const [{ data: constructions }, { data: images }, { data: workItems }] = await Promise.all([
    ids.length
      ? dbServer.from("construction_details").select("*").in("project_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? dbServer.from("project_images").select("*").in("project_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? dbServer.from("work_items").select("*").in("project_id", ids).order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);

  const result = (projects ?? []).map((p: { id: string }) => {
    const construction = (constructions ?? []).find(
      (c: { project_id: string }) => c.project_id === p.id
    );
    const projectImages = (images ?? []).filter(
      (i: { project_id: string }) => i.project_id === p.id
    );
    const projectWorkItems = (workItems ?? []).filter(
      (w: { project_id: string }) => w.project_id === p.id
    );
    const profit = construction ? calcProfit(construction) : undefined;
    return {
      ...p,
      construction: construction ? { ...construction, work_items: projectWorkItems } : null,
      images: projectImages,
      profit,
    };
  });

  return NextResponse.json(result);
}

// POST /api/projects — 新規案件作成
export async function POST(req: NextRequest) {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const { data, error } = await dbServer
    .from("projects")
    .insert({
      customer_name: body.customer_name,
      phone: body.phone ?? "",
      address: body.address ?? "",
      work_type: body.work_type ?? "reform",
      status: body.status ?? "new_inquiry",
      target_month: body.target_month ?? null,
      next_action_date: body.next_action_date ?? null,
      memo: body.memo ?? null,
      last_contact_date: null,
      drawing_url: null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
