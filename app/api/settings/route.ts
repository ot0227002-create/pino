export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { dbServer, hasSupabaseServer } from "@/lib/db-server";

// GET /api/settings — アプリ設定を取得（ID=1 の単一行）
export async function GET() {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await dbServer
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 行がまだ存在しない場合は空のデフォルトを返す
  return NextResponse.json(data ?? { id: 1 });
}

// PUT /api/settings — アプリ設定を保存（upsert）
export async function PUT(req: NextRequest) {
  if (!hasSupabaseServer) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const { error } = await dbServer.from("app_settings").upsert(
    { ...body, id: 1, updated_at: now },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
