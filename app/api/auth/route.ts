export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

// POST /api/auth → ログイン
export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const correctPassword = process.env.APP_PASSWORD;
  const sessionSecret = process.env.APP_SESSION_SECRET;

  if (!correctPassword || !sessionSecret) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  if (password !== correctPassword) {
    return NextResponse.json(
      { error: "パスワードが違います" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_session", sessionSecret, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30日
    path: "/",
  });

  return response;
}

// DELETE /api/auth → ログアウト
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
