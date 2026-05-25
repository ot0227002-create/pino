"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Fingerprint, KeyRound } from "lucide-react";

// ── WebAuthn helpers (client-side only) ────────────────────────────────────

function base64urlToBuffer(b64: string): ArrayBuffer {
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (b64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const LS_CRED_ID = "wa_credential_id";
const LS_BIOMETRIC = "wa_enabled";

async function fetchChallenge(): Promise<string> {
  const res = await fetch("/api/webauthn/challenge");
  if (!res.ok) throw new Error("challenge fetch failed");
  const { challenge } = await res.json() as { challenge: string };
  return challenge;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  // Biometric state
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem(LS_BIOMETRIC) === "true";
    const credId = localStorage.getItem(LS_CRED_ID);
    const supported = typeof PublicKeyCredential !== "undefined";
    setHasBiometric(enabled && !!credId && supported);
    setShowPasswordForm(!enabled || !credId || !supported);
  }, []);

  // ── Password Login ──────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json() as { loginTime?: number };
        localStorage.setItem("loginTime", String(data.loginTime ?? Date.now()));

        // If WebAuthn available and not yet registered → show prompt
        if (
          typeof PublicKeyCredential !== "undefined" &&
          !localStorage.getItem(LS_BIOMETRIC)
        ) {
          setShowRegisterPrompt(true);
        } else {
          router.push("/projects");
          router.refresh();
        }
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "パスワードが違います");
        setErrorKey((k) => k + 1);
        setPassword("");
      }
    } catch {
      setError("通信エラーが発生しました");
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  // ── Biometric Register ──────────────────────────────────────────────────

  const handleRegisterBiometric = useCallback(async () => {
    setRegisterLoading(true);
    try {
      const challenge = await fetchChallenge();
      const rpId = location.hostname;

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64urlToBuffer(challenge),
          rp: { name: "こばかいアプリ", id: rpId },
          user: {
            id: new TextEncoder().encode("kobakaiuser"),
            name: "owner",
            displayName: "こばかいオーナー",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "none",
        },
      }) as PublicKeyCredential | null;

      if (!credential) throw new Error("認証情報の作成がキャンセルされました");

      const resp = credential.response as AuthenticatorAttestationResponse;

      const res = await fetch("/api/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64url(resp.clientDataJSON),
            attestationObject: bufferToBase64url(resp.attestationObject),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "登録失敗");
      }

      const data = await res.json() as { credentialId: string };
      localStorage.setItem(LS_CRED_ID, data.credentialId);
      localStorage.setItem(LS_BIOMETRIC, "true");

      router.push("/projects");
      router.refresh();
    } catch (err) {
      // User cancelled or not supported → just proceed
      setShowRegisterPrompt(false);
      router.push("/projects");
      router.refresh();
      console.warn("biometric register:", err);
    } finally {
      setRegisterLoading(false);
    }
  }, [router]);

  // ── Biometric Authenticate ──────────────────────────────────────────────

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true);
    setError("");
    try {
      const credId = localStorage.getItem(LS_CRED_ID);
      if (!credId) throw new Error("no credential");

      const challenge = await fetchChallenge();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: base64urlToBuffer(challenge),
          allowCredentials: [
            { id: base64urlToBuffer(credId), type: "public-key" },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) throw new Error("キャンセルされました");

      const resp = assertion.response as AuthenticatorAssertionResponse;

      const res = await fetch("/api/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assertion.id,
          rawId: bufferToBase64url(assertion.rawId),
          type: assertion.type,
          response: {
            authenticatorData: bufferToBase64url(resp.authenticatorData),
            clientDataJSON: bufferToBase64url(resp.clientDataJSON),
            signature: bufferToBase64url(resp.signature),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json() as { loginTime?: number };
        localStorage.setItem("loginTime", String(data.loginTime ?? Date.now()));
        router.push("/projects");
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "生体認証に失敗しました");
        setErrorKey((k) => k + 1);
        setShowPasswordForm(true);
      }
    } catch (err) {
      console.warn("biometric auth:", err);
      setShowPasswordForm(true);
    } finally {
      setBiometricLoading(false);
    }
  }, [router]);

  // ── Biometric Register Prompt modal ────────────────────────────────────

  if (showRegisterPrompt) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-5"
        style={{
          background: "linear-gradient(150deg, #f0f5ff 0%, #eaf0fe 35%, #f2eeff 68%, #f0f5ff 100%)",
          paddingTop: "max(40px, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(40px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="w-full max-w-[340px] rounded-[28px] bg-white px-7 py-8 text-center"
          style={{
            boxShadow: "0 0 0 1px rgba(15,23,42,0.04), 0 20px 40px -8px rgba(15,23,42,0.10)",
          }}
        >
          <div
            className="mx-auto mb-5 h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
          >
            <Fingerprint className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">生体認証を設定しますか？</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            次回からFace IDや指紋でログインできます。いつでも設定から変更できます。
          </p>
          <button
            onClick={handleRegisterBiometric}
            disabled={registerLoading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mb-3 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
          >
            {registerLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                登録中...
              </span>
            ) : (
              "Face ID / 指紋で設定する"
            )}
          </button>
          <button
            onClick={() => { router.push("/projects"); router.refresh(); }}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-slate-400 active:bg-slate-50 transition-colors"
          >
            スキップ
          </button>
        </div>
      </div>
    );
  }

  // ── Main Login UI ───────────────────────────────────────────────────────

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "max(40px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(40px, env(safe-area-inset-bottom, 0px))",
        background:
          "linear-gradient(150deg, #f0f5ff 0%, #eaf0fe 35%, #f2eeff 68%, #f0f5ff 100%)",
      }}
    >
      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-48 -right-24 w-[520px] h-[520px] rounded-full"
          style={{ background: "radial-gradient(circle at 40% 40%, rgba(79,70,229,0.18) 0%, transparent 68%)", filter: "blur(64px)" }}
        />
        <div
          className="absolute -bottom-48 -left-24 w-[560px] h-[560px] rounded-full"
          style={{ background: "radial-gradient(circle at 60% 60%, rgba(37,99,235,0.14) 0%, transparent 68%)", filter: "blur(72px)" }}
        />
      </div>

      <div className="relative w-full max-w-[340px]">

        {/* ロゴ */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="logo-float h-[88px] w-[88px] rounded-[26px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #3b82f6 0%, #4f46e5 100%)",
              boxShadow: "0 28px 56px -8px rgba(59,130,246,0.42),0 10px 20px -4px rgba(79,70,229,0.32),inset 0 1px 0 rgba(255,255,255,0.28)",
            }}
          >
            <span style={{ fontSize: 44, lineHeight: 1, filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.28))" }}>🏗️</span>
          </div>
          <h1 className="mt-5 font-bold text-slate-900" style={{ fontSize: "22px", letterSpacing: "-0.035em" }}>
            こばかいアプリ
          </h1>
          <p className="mt-1.5 font-semibold text-slate-400 tracking-widest uppercase" style={{ fontSize: "10px" }}>
            Reform &amp; Construction
          </p>
        </div>

        {/* カード */}
        <div
          className="rounded-[28px] bg-white px-7 py-8 space-y-4"
          style={{
            boxShadow: "0 0 0 1px rgba(15,23,42,0.04),0 4px 6px -1px rgba(15,23,42,0.04),0 20px 40px -8px rgba(15,23,42,0.10)",
          }}
        >
          <p className="text-center font-semibold text-slate-400 tracking-[0.2em] uppercase" style={{ fontSize: "10px" }}>
            Sign In
          </p>

          {/* ── 生体認証ボタン ── */}
          {hasBiometric && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="relative w-full py-[15px] rounded-2xl text-[15px] font-bold text-white overflow-hidden transition-all duration-150 active:scale-[0.975] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #0891b2 100%)",
                boxShadow: biometricLoading ? "none" : "0 8px 24px -4px rgba(5,150,105,0.4)",
                minHeight: 52,
              }}
            >
              <span className="relative flex items-center justify-center gap-2.5">
                {biometricLoading ? (
                  <>
                    <span className="h-[15px] w-[15px] border-2 border-white/25 border-t-white rounded-full animate-spin" />
                    認証中...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-5 w-5" />
                    Face ID / 指紋でログイン
                  </>
                )}
              </span>
            </button>
          )}

          {/* パスワード切替 */}
          {hasBiometric && !showPasswordForm && (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold py-1 active:text-slate-600 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              パスワードでログイン
            </button>
          )}

          {/* ── パスワードフォーム ── */}
          {showPasswordForm && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div
                className="flex items-center rounded-2xl border bg-slate-50 transition-all duration-200 focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
                style={{ borderColor: "rgba(226,232,240,1)", boxShadow: "inset 0 2px 4px rgba(15,23,42,0.05)" }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワード"
                  autoFocus={!hasBiometric}
                  className="flex-1 min-w-0 bg-transparent py-[14px] pl-5 pr-1 text-slate-800 font-semibold tracking-[0.28em] focus:outline-none placeholder:text-slate-300 placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal"
                  style={{ fontSize: "18px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex items-center justify-center w-11 h-11 mr-1.5 rounded-xl text-slate-400 transition-all active:bg-slate-100"
                  style={{ minWidth: 44, minHeight: 44 }}
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!password || loading}
                className="relative w-full py-[15px] rounded-2xl text-[15px] font-bold text-white overflow-hidden transition-all duration-150 active:scale-[0.975] disabled:opacity-40 btn-shimmer"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                  boxShadow: password && !loading ? "0 8px 24px -4px rgba(37,99,235,0.48)" : "none",
                  minHeight: 52,
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)" }}
                />
                <span className="relative flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <span className="h-[15px] w-[15px] border-2 border-white/25 border-t-white rounded-full animate-spin" />
                      ログイン中...
                    </>
                  ) : "ログイン"}
                </span>
              </button>
            </form>
          )}

          {/* エラー */}
          {error && (
            <div
              key={errorKey}
              className="error-in flex items-center gap-2.5 rounded-xl px-4 py-3"
              style={{ background: "rgba(254,242,242,0.95)", border: "1px solid rgba(248,113,113,0.35)" }}
            >
              <span className="text-red-400 text-[15px] shrink-0">⚠</span>
              <p className="text-[13px] text-red-500 font-semibold">{error}</p>
            </div>
          )}
        </div>

        <p className="text-center text-slate-400 mt-5 tracking-wider" style={{ fontSize: "11px" }}>
          © こばかいアプリ
        </p>
      </div>
    </div>
  );
}
