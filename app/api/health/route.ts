export const runtime = "edge";

import { NextResponse } from "next/server";
import { dbServer, hasSupabaseServer } from "@/lib/db-server";

// GET /api/health
// 本番環境の接続状態を確認するための診断エンドポイント
// 認証不要（middleware の除外リストに追加済み）
export async function GET() {
  const checks: Record<string, { ok: boolean; message: string }> = {};

  // ── 1. 必須環境変数チェック ──────────────────────────────
  checks.app_password = {
    ok: !!process.env.APP_PASSWORD,
    message: process.env.APP_PASSWORD ? "設定済み ✅" : "❌ APP_PASSWORD が未設定",
  };
  checks.session_secret = {
    ok: !!process.env.APP_SESSION_SECRET,
    message: process.env.APP_SESSION_SECRET
      ? "設定済み ✅"
      : "❌ APP_SESSION_SECRET が未設定",
  };
  checks.supabase_url = {
    ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    message: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `設定済み ✅ (${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/https?:\/\//, "").split(".")[0]}...)`
      : "⚠️ NEXT_PUBLIC_SUPABASE_URL 未設定 (localStorage モードで動作)",
  };
  checks.supabase_key = {
    ok: !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    message:
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role キー設定済み ✅"
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "anon キーのみ設定 ⚠️ (service_role 推奨)"
        : "❌ Supabase キーが未設定 (localStorage モードで動作)",
  };

  // ── 2. Supabase 疎通確認 ────────────────────────────────
  if (hasSupabaseServer) {
    try {
      const { error } = await dbServer
        .from("projects")
        .select("id")
        .limit(1);
      checks.supabase_connection = {
        ok: !error,
        message: error
          ? `❌ DB接続エラー: ${error.message}`
          : "Supabase 接続 OK ✅",
      };
    } catch (e) {
      checks.supabase_connection = {
        ok: false,
        message: `❌ 接続例外: ${String(e)}`,
      };
    }
  } else {
    checks.supabase_connection = {
      ok: false,
      message: "⚠️ Supabase 未設定 — localStorage モードで動作中",
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      mode: hasSupabaseServer ? "supabase" : "localStorage",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 200 } // 診断用なので常に 200 を返す
  );
}
