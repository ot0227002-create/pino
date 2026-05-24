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
        // ログイン時刻をクライアント側に保存 → 24時間セッション管理に使用
        localStorage.setItem("loginTime", String(data.loginTime ?? Date.now()));
        router.push("/projects");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "パスワードが違います");
        setPassword("");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center px-5">
      <div className="w-full max-w-xs">
        {/* カード */}
        <div className="bg-white rounded-3xl shadow-2xl px-8 py-10 space-y-8">
          {/* ロゴ */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">🏗️</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                案件管理
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                リフォーム・工事 管理システム
              </p>
            </div>
          </div>

          {/* フォーム */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoFocus
                className="w-full text-center text-2xl font-bold tracking-[0.4em] rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-4 pr-12 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors placeholder:text-gray-300 placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-center">
                <p className="text-sm text-red-500 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 active:bg-blue-700 disabled:opacity-40 disabled:shadow-none transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ログイン中...
                </span>
              ) : (
                "ログイン"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-blue-200 mt-6">
          © 案件管理システム
        </p>
      </div>
    </div>
  );
}
