"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";

const STEPS = [
  {
    icon: "🏗️",
    color: "bg-blue-50 border-blue-100",
    badge: "bg-blue-100 text-blue-600",
    title: "案件を新規作成する",
    desc: "下部ナビの「新規」ボタン、または「案件」画面の「＋新規案件」から案件を登録。お客様名・住所・電話番号・請負金額を入力して保存してください。",
    tip: "対象月を設定しておくと月次集計と自動で連動します",
  },
  {
    icon: "📊",
    color: "bg-emerald-50 border-emerald-100",
    badge: "bg-emerald-100 text-emerald-600",
    title: "ステータスで進捗を管理",
    desc: "案件カードをタップして詳細画面へ。「ステータス変更」から「初回問合せ」→「完工・引渡し」まで6段階で進捗を追跡できます。",
    tip: "ステータスバッジの色で一覧から一目で進捗確認できます",
  },
  {
    icon: "💰",
    color: "bg-amber-50 border-amber-100",
    badge: "bg-amber-100 text-amber-600",
    title: "原価・利益を自動計算",
    desc: "案件詳細「収益」タブで外注費・材料費・その他経費を入力すると、原価ベースの利益率を自動で算出。サマリー画面で月次集計も確認できます。",
    tip: "利益率 = (請負金額 − 原価合計) ÷ 原価合計 × 100",
  },
  {
    icon: "📸",
    color: "bg-orange-50 border-orange-100",
    badge: "bg-orange-100 text-orange-600",
    title: "写真・図面をカテゴリ別保存",
    desc: "案件詳細「写真」タブからビフォー・アフター・施工中・図面の4カテゴリで保存。PDFの図面も追加でき、端末のストレージに保存されます。",
    tip: "写真タップで全画面ライトボックス表示されます",
  },
  {
    icon: "✉️",
    color: "bg-violet-50 border-violet-100",
    badge: "bg-violet-100 text-violet-600",
    title: "AI連絡文でお客様へ爆速返信",
    desc: "案件詳細「営業」タブのAI連絡文作成から、進捗に合わせたメール・LINE文章を自動生成。コピーしてそのまま送信できます。",
    tip: "設定のメールテンプレートをカスタマイズすると自社スタイルに最適化されます",
  },
  {
    icon: "📱",
    color: "bg-indigo-50 border-indigo-100",
    badge: "bg-indigo-100 text-indigo-600",
    title: "ホーム画面に追加してアプリ化",
    desc: "iPhone の Safari でこのページを開き、「共有ボタン（□↑）」→「ホーム画面に追加」でアドレスバーのない専用アプリとして使えます。",
    tip: "アプリ化するとプッシュ通知も受け取れます（iOS 16.4以上）",
  },
];

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("hasSeenWelcome")) {
      // 少し遅延してから表示（ページロード後に自然に出る）
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem("hasSeenWelcome", "true");
      setVisible(false);
      setLeaving(false);
    }, 280);
  }

  if (!visible) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={dismiss}
    >
      <div
        className={`w-full max-w-lg bg-white rounded-t-3xl shadow-2xl ${leaving ? "" : "animate-welcome-sheet"}`}
        style={{
          paddingBottom: "max(32px, env(safe-area-inset-bottom, 0px))",
          ...(leaving ? { transform: "translateY(100%)", transition: "transform 0.28s cubic-bezier(0.55,0,1,0.45)" } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-6">
          {/* ドラッグハンドル */}
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

          {/* ヘッダー */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">
                はじめてガイド
              </span>
              <h2 className="text-[20px] font-bold text-gray-900 leading-tight mt-0.5">
                こばかいアプリへ<br />ようこそ 🎉
              </h2>
            </div>
            <button
              onClick={dismiss}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 active:bg-gray-200 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ステップインジケーター */}
          <div className="flex gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "flex-[3] bg-blue-500" : i < step ? "flex-1 bg-blue-200" : "flex-1 bg-gray-100"
                }`}
              />
            ))}
          </div>

          {/* コンテンツカード */}
          <div className={`rounded-2xl border p-4 mb-4 ${s.color}`} key={step}
            style={{ animation: "fadeSlideIn 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
            <div className="flex items-start gap-4">
              <span className="text-[40px] leading-none shrink-0 mt-0.5">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                    STEP {step + 1}
                  </span>
                </div>
                <p className="font-bold text-gray-900 text-[15px] mb-1.5 leading-snug">{s.title}</p>
                <p className="text-[13px] text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-1.5 bg-white/60 rounded-xl px-3 py-2">
              <span className="text-[13px] shrink-0">💡</span>
              <p className="text-[11px] text-gray-500 leading-relaxed">{s.tip}</p>
            </div>
          </div>

          {/* カウンター */}
          <p className="text-center text-[11px] text-gray-400 mb-4">
            {step + 1} / {STEPS.length}
          </p>

          {/* ボタン */}
          <div className="flex gap-2.5">
            {!isFirst && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="w-14 py-4 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-500 active:bg-gray-50 transition-colors shrink-0 flex items-center justify-center"
              >
                ←
              </button>
            )}
            <button
              onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
              className="flex-1 py-4 rounded-2xl text-[15px] font-bold text-white transition-all active:scale-[0.975] flex items-center justify-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                boxShadow: "0 6px 16px -4px rgba(37,99,235,0.4)",
              }}
            >
              {isLast ? (
                "さあ始めよう 🚀"
              ) : (
                <>次へ <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {/* スキップ */}
          {!isLast && (
            <button
              onClick={dismiss}
              className="w-full text-center text-[12px] text-gray-400 mt-3 py-1"
            >
              スキップ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
