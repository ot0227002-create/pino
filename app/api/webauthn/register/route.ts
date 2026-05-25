export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  b64urlToBytes, bytesToB64url,
  verifyChallengeSig,
  parseAuthData, parseCOSEPublicKey,
  encodeCredCookie,
} from "@/lib/webauthn";
import { decodeCBOR } from "@/lib/cbor";
import type { CBORValue } from "@/lib/cbor";

// POST /api/webauthn/register
// Called after a successful password login to register a passkey.
export async function POST(request: NextRequest) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "設定エラー" }, { status: 500 });

  // Must be authenticated
  const sessionCookie = request.cookies.get("auth_session")?.value;
  if (sessionCookie !== secret) {
    return NextResponse.json({ error: "未認証" }, { status: 401 });
  }

  // Read & verify challenge cookie
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
    response: { clientDataJSON: string; attestationObject: string };
    type: string;
  };

  if (type !== "public-key") {
    return NextResponse.json({ error: "不正なタイプ" }, { status: 400 });
  }

  // Verify clientDataJSON
  const clientDataBytes = b64urlToBytes(authResp.clientDataJSON);
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes)) as {
    type: string;
    challenge: string;
    origin: string;
  };

  if (clientData.type !== "webauthn.create") {
    return NextResponse.json({ error: "不正なclientDataType" }, { status: 400 });
  }
  if (clientData.challenge !== storedChallenge) {
    return NextResponse.json({ error: "チャレンジ不一致" }, { status: 400 });
  }

  // Parse attestationObject (CBOR)
  const attObjBytes = b64urlToBytes(authResp.attestationObject);
  const attObj = decodeCBOR(attObjBytes) as Map<CBORValue, CBORValue>;
  const authData = attObj.get("authData") as Uint8Array;
  if (!authData) return NextResponse.json({ error: "authData なし" }, { status: 400 });

  // Parse authData
  const parsed = parseAuthData(authData);
  if (!parsed.credentialId || !parsed.publicKeyBytes) {
    return NextResponse.json({ error: "認証データ解析失敗" }, { status: 400 });
  }

  // Extract P-256 public key
  const { x, y } = parseCOSEPublicKey(parsed.publicKeyBytes);
  const credentialId = bytesToB64url(parsed.credentialId);

  // Encode credential into a signed HttpOnly cookie (public key is not secret)
  const credData = {
    credentialId,
    publicKeyX: bytesToB64url(x),
    publicKeyY: bytesToB64url(y),
    counter: parsed.signCount,
  };
  const credCookie = await encodeCredCookie(credData, secret);

  const res = NextResponse.json({ success: true, credentialId });
  res.cookies.set("wa_cred", credCookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  res.cookies.delete("wa_challenge");

  return res;
}
