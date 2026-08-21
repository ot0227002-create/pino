export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDB, getBucket } from "@/lib/db-server";

// GET /api/health
export async function GET() {
  const checks: Record<string, { ok: boolean; message: string }> = {};
  const db = getDB();

  checks.app_password = {
    ok: !!process.env.APP_PASSWORD,
    message: process.env.APP_PASSWORD ? "設定済み ✅" : "❌ APP_PASSWORD が未設定",
  };
  checks.session_secret = {
    ok: !!process.env.APP_SESSION_SECRET,
    message: process.env.APP_SESSION_SECRET ? "設定済み ✅" : "❌ APP_SESSION_SECRET が未設定",
  };
  checks.d1_database = {
    ok: !!db,
    message: db ? "D1 バインディング OK ✅" : "❌ D1 DB バインディング未設定",
  };

  if (db) {
    try {
      await db.prepare("SELECT 1").first();
      checks.d1_connection = { ok: true, message: "D1 接続 OK ✅" };

      const tableCheck = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
      ).first();
      checks.d1_schema = {
        ok: !!tableCheck,
        message: tableCheck ? "スキーマ OK ✅" : "❌ テーブル未作成（schema-d1.sql を実行してください）",
      };
    } catch (e) {
      checks.d1_connection = { ok: false, message: `❌ D1 接続エラー: ${String(e)}` };
    }
  }

  const bucket = getBucket();
  checks.r2_bucket = {
    ok: !!bucket,
    message: bucket ? "R2 バケット OK ✅" : "⚠️ R2 未設定（写真アップロード無効）",
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    mode: db ? "d1" : "localStorage",
    timestamp: new Date().toISOString(),
    checks,
  });
}
