/**
 * WebAuthn utilities — runs on Edge Runtime (Web Crypto API only).
 */
import { decodeCBOR } from "./cbor";
import type { CBORValue } from "./cbor";

// ── Base64url ────────────────────────────────────────────────────────────────

export function b64urlToBytes(b: string): Uint8Array {
  const base64 = b.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── HMAC-SHA256 challenge signing ────────────────────────────────────────────

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function generateChallenge(): Promise<string> {
  return bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function signChallenge(challenge: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(challenge));
  return bytesToB64url(new Uint8Array(sig));
}

export async function verifyChallengeSig(
  challenge: string,
  sig: string,
  secret: string
): Promise<boolean> {
  const key = await hmacKey(secret);
  const sigBuf = b64urlToBytes(sig);
  const dataBuf = new TextEncoder().encode(challenge);
  return crypto.subtle.verify("HMAC", key, sigBuf.buffer.slice(sigBuf.byteOffset, sigBuf.byteOffset + sigBuf.byteLength) as ArrayBuffer, dataBuf);
}

// ── authData parser ──────────────────────────────────────────────────────────

export interface ParsedAuthData {
  rpIdHash: Uint8Array;
  flags: number;
  signCount: number;
  credentialId?: Uint8Array;
  publicKeyBytes?: Uint8Array;
}

export function parseAuthData(authData: Uint8Array): ParsedAuthData {
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const view = new DataView(authData.buffer, authData.byteOffset);
  const signCount = view.getUint32(33, false); // big-endian

  // AT flag (bit 6) = attested credential data present
  if (!(flags & 0x40)) return { rpIdHash, flags, signCount };

  const credIdLen = view.getUint16(53, false);
  const credentialId = authData.slice(55, 55 + credIdLen);
  const publicKeyBytes = authData.slice(55 + credIdLen);

  return { rpIdHash, flags, signCount, credentialId, publicKeyBytes };
}

// ── COSE P-256 public key extraction ────────────────────────────────────────

export function parseCOSEPublicKey(coseBytes: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  const map = decodeCBOR(coseBytes) as Map<CBORValue, CBORValue>;
  const x = map.get(-2) as Uint8Array | undefined;
  const y = map.get(-3) as Uint8Array | undefined;
  if (!x || !y || x.length !== 32 || y.length !== 32)
    throw new Error("webauthn: invalid COSE P-256 key");
  return { x, y };
}

export async function importP256Key(x: Uint8Array, y: Uint8Array): Promise<CryptoKey> {
  // Raw format: 0x04 || x (32 bytes) || y (32 bytes)
  const raw = new Uint8Array(65);
  raw[0] = 0x04;
  raw.set(x, 1);
  raw.set(y, 33);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

// ── DER → raw (r || s) signature conversion ──────────────────────────────────

function derToRaw(der: Uint8Array): Uint8Array {
  // 30 [81] len  02 rLen r  02 sLen s
  let off = 1;
  if (der[off] === 0x81) off += 2; else off += 1; // skip total length

  if (der[off++] !== 0x02) throw new Error("webauthn: bad DER (R marker)");
  const rLen = der[off++];
  const rPad = der[off] === 0x00 ? 1 : 0;
  const r = der.slice(off + rPad, off + rLen);
  off += rLen;

  if (der[off++] !== 0x02) throw new Error("webauthn: bad DER (S marker)");
  const sLen = der[off++];
  const sPad = der[off] === 0x00 ? 1 : 0;
  const s = der.slice(off + sPad, off + sLen);

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length); // right-pad to 32 bytes
  raw.set(s, 64 - s.length);
  return raw;
}

// ── Assertion signature verification ────────────────────────────────────────

export async function verifyAssertion(params: {
  publicKeyX: string;
  publicKeyY: string;
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  signature: Uint8Array;
}): Promise<boolean> {
  const { publicKeyX, publicKeyY, authenticatorData, clientDataJSON, signature } = params;

  const pubKey = await importP256Key(b64urlToBytes(publicKeyX), b64urlToBytes(publicKeyY));

  const cdjBuf = clientDataJSON.buffer.slice(clientDataJSON.byteOffset, clientDataJSON.byteOffset + clientDataJSON.byteLength) as ArrayBuffer;
  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", cdjBuf)
  );

  // Signed data = authenticatorData || SHA-256(clientDataJSON)
  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
  signedData.set(authenticatorData);
  signedData.set(clientDataHash, authenticatorData.length);

  const rawSig = derToRaw(signature);

  const rawSigBuf = rawSig.buffer.slice(rawSig.byteOffset, rawSig.byteOffset + rawSig.byteLength) as ArrayBuffer;
  const signedDataBuf = signedData.buffer.slice(signedData.byteOffset, signedData.byteOffset + signedData.byteLength) as ArrayBuffer;
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pubKey, rawSigBuf, signedDataBuf);
}

// ── Credential cookie encoding/decoding ──────────────────────────────────────

export interface StoredCredential {
  credentialId: string; // base64url
  publicKeyX: string;
  publicKeyY: string;
  counter: number;
}

export async function encodeCredCookie(
  cred: StoredCredential,
  secret: string
): Promise<string> {
  const payload = btoa(JSON.stringify(cred));
  const sig = await signChallenge(payload, secret);
  return `${payload}.${sig}`;
}

export async function decodeCredCookie(
  cookie: string,
  secret: string
): Promise<StoredCredential | null> {
  const dotIdx = cookie.lastIndexOf(".");
  if (dotIdx < 0) return null;
  const payload = cookie.slice(0, dotIdx);
  const sig = cookie.slice(dotIdx + 1);
  const valid = await verifyChallengeSig(payload, sig, secret);
  if (!valid) return null;
  try {
    return JSON.parse(atob(payload)) as StoredCredential;
  } catch {
    return null;
  }
}
