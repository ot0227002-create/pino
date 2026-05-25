export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  b64urlToBytes,
  verifyChallengeSig,
  decodeCredCookie,
  verifyAssertion,
} from "@/lib/webauthn";

// POST /api/webauthn/authenticate
// Verifies a WebAuthn assertion and issues an auth session cookie.
export async function POST(request: NextRequest) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "設定エラー" }, { status: 500 });

  // Read stored credential
  const credCookie = request.cookies.get("wa_cred")?.value;
  if (!credCookie) {
    return NextResponse.json({ error: "生体認証が未登録です" }, { status: 400 });
  }
  const cred = await decodeCredCookie(credCookie, secret);
  if (!cred) {
    return NextResponse.json({ error: "認証情報が壊れています" }, { status: 400 });
  }

  // Verify challenge
  const challengeCookie = request.cookies.get("wa_challenge")?.value;
  if (!challengeCookie) {
    return NextResponse.json({ error: "チャレンジ期限切れ" }, { status: 400 });
  }
  const dotIdx = challengeCookie.lastIndexOf(".");
  const storedChallenge = challengeCookie.slice(0, dotIdx);
  const storedSig = challengeCookie.slice(dotIdx + 1);

  const challengeOk = await verifyChallengeSig(storedChallenge, storedSig, secret);
  if (!challengeOk) return NextResponse.json({ error: "チャレンジ無効" }, { status: 400 });

  const body = await request.json();
  const { id, response: authResp, type } = body as {
    id: string;
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
    };
    type: string;
  };

  if (type !== "public-key") {
    return NextResponse.json({ error: "不正なタイプ" }, { status: 400 });
  }

  // Verify credential ID matches registered one
  if (id !== cred.credentialId) {
    return NextResponse.json({ error: "認証情報の不一致" }, { status: 400 });
  }

  // Verify clientDataJSON
  const clientDataBytes = b64urlToBytes(authResp.clientDataJSON);
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes)) as {
    type: string;
    challenge: string;
  };

  if (clientData.type !== "webauthn.get") {
    return NextResponse.json({ error: "不正なclientDataType" }, { status: 400 });
  }
  if (clientData.challenge !== storedChallenge) {
    return NextResponse.json({ error: "チャレンジ不一致" }, { status: 400 });
  }

  // Verify ECDSA signature
  const valid = await verifyAssertion({
    publicKeyX: cred.publicKeyX,
    publicKeyY: cred.publicKeyY,
    authenticatorData: b64urlToBytes(authResp.authenticatorData),
    clientDataJSON: clientDataBytes,
    signature: b64urlToBytes(authResp.signature),
  });

  if (!valid) {
    return NextResponse.json({ error: "署名が無効です" }, { status: 401 });
  }

  // Issue session
  const loginTime = Date.now();
  const res = NextResponse.json({ success: true, loginTime });
  res.cookies.set("auth_session", secret, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  res.cookies.delete("wa_challenge");

  return res;
}
