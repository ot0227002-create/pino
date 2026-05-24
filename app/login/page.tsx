"use client";

export const runtime = "edge";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

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
        const data = await res.json();
        localStorage.setItem("loginTime", String(data.loginTime ?? Date.now()));
        router.push("/projects");
        router.refresh();
      } else {
        const data = await res.json();
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
      {/* ── 背景装飾ブロブ ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-48 -right-24 w-[520px] h-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(79,70,229,0.18) 0%, transparent 68%)",
            filter: "blur(64px)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-24 w-[560px] h-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 60% 60%, rgba(37,99,235,0.14) 0%, transparent 68%)",
            filter: "blur(72px)",
          }}
        />
        {/* 中央のごく薄いグロー */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />
      </div>

      {/* ── メインコンテンツ ── */}
      <div className="relative w-full max-w-[340px] login-card">

        {/* ── フローティングロゴ ── */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="logo-float h-[88px] w-[88px] rounded-[26px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #3b82f6 0%, #4f46e5 100%)",
              boxShadow:
                "0 28px 56px -8px rgba(59,130,246,0.42)," +
                "0 10px 20px -4px rgba(79,70,229,0.32)," +
                "inset 0 1px 0 rgba(255,255,255,0.28)," +
                "inset 0 -1px 0 rgba(0,0,0,0.08)",
            }}
          >
            <span
              style={{
                fontSize: 44,
                lineHeight: 1,
                filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.28))",
              }}
            >
              🏗️
            </span>
          </div>

          <h1
            className="mt-5 font-bold text-slate-900"
            style={{
              fontSize: "22px",
              letterSpacing: "-0.035em",
              lineHeight: 1.2,
            }}
          >
            こばかいアプリ
          </h1>
          <p
            className="mt-1.5 font-semibold text-slate-400 tracking-widest uppercase"
            style={{ fontSize: "10px" }}
          >
            Reform &amp; Construction
          </p>
        </div>

        {/* ── カード ── */}
        <div
          className="rounded-[28px] bg-white px-7 py-8"
          style={{
            boxShadow:
              "0 0 0 1px rgba(15,23,42,0.04)," +
              "0 4px 6px -1px rgba(15,23,42,0.04)," +
              "0 20px 40px -8px rgba(15,23,42,0.10)," +
              "0 48px 80px -16px rgba(15,23,42,0.06)",
          }}
        >
          {/* ラベル */}
          <p
            className="text-center font-semibold text-slate-400 tracking-[0.2em] uppercase mb-5"
            style={{ fontSize: "10px" }}
          >
            Sign In
          </p>

          <form onSubmit={handleLogin} className="space-y-3.5">

            {/* ── パスワード入力 ── */}
            <div
              className="flex items-center rounded-2xl border bg-slate-50 transition-all duration-200
                         focus-within:bg-white focus-within:border-blue-400
                         focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12),inset_0_1px_3px_rgba(15,23,42,0.04)]"
              style={{
                borderColor: "rgba(226,232,240,1)",
                boxShadow: "inset 0 2px 4px rgba(15,23,42,0.05)",
              }}
            >
              <input
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoFocus
                className="flex-1 min-w-0 bg-transparent py-[14px] pl-5 pr-1 text-slate-800 font-semibold
                           tracking-[0.28em] focus:outline-none
                           placeholder:text-slate-300 placeholder:text-[15px]
                           placeholder:font-normal placeholder:tracking-normal"
                style={{ fontSize: "18px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center justify-center w-11 h-11 mr-1.5 rounded-xl
                           text-slate-400 transition-all active:bg-slate-100 active:text-slate-600"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPassword
                  ? <EyeOff className="h-[18px] w-[18px]" />
                  : <Eye    className="h-[18px] w-[18px]" />}
              </button>
            </div>

            {/* ── エラーメッセージ ── */}
            {error && (
              <div
                key={errorKey}
                className="error-in flex items-center gap-2.5 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(254,242,242,0.95)",
                  border: "1px solid rgba(248,113,113,0.35)",
                  boxShadow: "0 2px 8px -2px rgba(239,68,68,0.12)",
                }}
              >
                <span className="text-red-400 text-[15px] leading-none shrink-0">⚠</span>
                <p className="text-[13px] text-red-500 font-semibold">{error}</p>
              </div>
            )}

            {/* ── ログインボタン ── */}
            <button
              type="submit"
              disabled={!password || loading}
              className="relative w-full py-[15px] rounded-2xl text-[15px] font-bold text-white
                         overflow-hidden transition-all duration-150
                         active:scale-[0.975] disabled:opacity-40 btn-shimmer"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                boxShadow:
                  password && !loading
                    ? "0 8px 24px -4px rgba(37,99,235,0.48),0 4px 8px -2px rgba(79,70,229,0.28)"
                    : "none",
                minHeight: 52,
              }}
            >
              {/* 上部ハイライト */}
              <div
                className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)",
                }}
              />
              <span className="relative flex items-center justify-center gap-2.5">
                {loading ? (
                  <>
                    <span className="h-[15px] w-[15px] border-2 border-white/25 border-t-white rounded-full animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </span>
            </button>

          </form>
        </div>

        <p
          className="text-center text-slate-400 mt-5 tracking-wider"
          style={{ fontSize: "11px" }}
        >
          © こばかいアプリ
        </p>
      </div>
    </div>
  );
}
