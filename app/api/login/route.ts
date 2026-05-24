export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

// POST /api/login — パスワード検証 + セッションCookie発行
export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const correctPassword = process.env.APP_PASSWORD;
  const sessionSecret   = process.env.APP_SESSION_SECRET;

  if (!correctPassword || !sessionSecret) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const loginTime = Date.now();
  const response = NextResponse.json({ success: true, loginTime });

  // HttpOnly Cookie — JS から読めないのでフロントにパスワードが露出しない
  response.cookies.set("auth_session", sessionSecret, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24時間
    path: "/",
  });

  return response;
}
