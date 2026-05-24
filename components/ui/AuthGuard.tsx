"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_MS = 24 * 60 * 60 * 1000; // 24時間

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("loginTime");
    if (!raw || Date.now() - Number(raw) > SESSION_MS) {
      localStorage.clear();
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  // チェック完了まで何も描画しない（コンテンツ一瞬表示を防ぐ）
  if (!ready) return null;
  return <>{children}</>;
}
