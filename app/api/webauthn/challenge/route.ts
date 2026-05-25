export const runtime = "edge";

import { NextResponse } from "next/server";
import { generateChallenge, signChallenge } from "@/lib/webauthn";

// GET /api/webauthn/challenge
// Returns a 32-byte random challenge and stores HMAC-signed value in HttpOnly cookie.
export async function GET() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "設定エラー" }, { status: 500 });

  const challenge = await generateChallenge();
  const sig = await signChallenge(challenge, secret);

  const res = NextResponse.json({ challenge });
  res.cookies.set("wa_challenge", `${challenge}.${sig}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 300, // 5 minutes
    path: "/",
  });
  return res;
}
