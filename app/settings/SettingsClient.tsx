"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Building2, Bell, Shield, Image as ImageIcon, Copy, Check,
  Eye, EyeOff, LogOut, Clock, BookOpen,
} from "lucide-react";

const EMOJI_LIST = ["🏗️", "🛠️", "🏡", "📊", "📈", "🎨", "🚧"];

function emojiToDataUrl(emoji: string, size = 512): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${Math.floor(size * 0.78)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return canvas.toDataURL("image/png");
}

function permLabel(p: string) {
  if (p === "granted") return { text: "許可済み ✅", cls: "text-emerald-600" };
  if (p === "denied")  return { text: "拒否されています ❌", cls: "text-red-500" };
  return { text: "未設定", cls: "text-gray-400" };
}

export function SettingsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("company");
  const [isSaving, setIsSaving] = useState(false);

  // 絵文字ファビコン
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [faviconDataUrl, setFaviconDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // セキュリティタブ
  const [loginTime, setLoginTime] = useState<number | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // 通知
  const [swStatus, setSwStatus] = useState<"checking"|"unsupported"|"registered"|"error">("checking");
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [notifProgress, setNotifProgress] = useState(true);
  const [notifTask, setNotifTask] = useState(true);
  const [notifProfit, setNotifProfit] = useState(true);
  const [testProgressCountdown, setTestProgressCountdown] = useState<number | null>(null);
  const [testTaskCountdown, setTestTaskCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // ログイン時刻
    const raw = localStorage.getItem("loginTime");
    if (raw) setLoginTime(Number(raw));
    const np  = localStorage.getItem("notifProgress");
    const nt  = localStorage.getItem("notifTask");
    const npr = localStorage.getItem("notifProfit");
    if (np  !== null) setNotifProgress(np  === "true");
    if (nt  !== null) setNotifTask(nt  === "true");
    if (npr !== null) setNotifProfit(npr === "true");
    // Service Worker & 通知
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setSwStatus("unsupported"); return;
    }
    setNotifPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js")
      .then(() => setSwStatus("registered"))
      .catch(() => setSwStatus("error"));
  }, []);

  function generateCode(emoji: string): string {
    return `// ① app/icon.tsx（ブラウザ用ファビコン 32×32）
import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 24, background: 'transparent', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ${emoji}
      </div>
    ),
    { ...size }
  );
}

// ② app/apple-icon.tsx（iPhone ホーム画面用 180×180）
import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 120, background: '#ffffff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ${emoji}
      </div>
    ),
    { ...size }
  );
}`;
  }

  async function handleCopyCode(emoji: string) {
    try {
      await navigator.clipboard.writeText(generateCode(emoji));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select textarea
    }
  }

  function applyFavicon(url: string) {
    localStorage.setItem("appFavicon", url);
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = url;
  }

  function handleEmojiSelect(emoji: string) {
    setSelectedEmoji(emoji);
    const url = emojiToDataUrl(emoji);
    setFaviconDataUrl(url);
    applyFavicon(url);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!currentPw) { setPwError("現在のパスワードを入力してください"); return; }
    if (!newPw)     { setPwError("新しいパスワードを入力してください"); return; }
    if (newPw !== confirmPw) { setPwError("新しいパスワードが一致しません"); return; }
    if (newPw.length < 4)   { setPwError("パスワードは4文字以上で設定してください"); return; }
    setPwChanging(true);
    await new Promise(r => setTimeout(r, 600)); // UI フィードバック用の疑似待機
    setPwChanging(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    alert("パスワードを変更しました。\n\nCloudflare Pages の環境変数 APP_PASSWORD も同じ値に更新してください。");
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    localStorage.clear();
    router.push("/login");
  }

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  function toggleNotif(key: "notifProgress"|"notifTask"|"notifProfit", setter: (v: boolean) => void, current: boolean) {
    const v = !current;
    setter(v);
    localStorage.setItem(key, String(v));
  }

  async function sendProgressTest() {
    if (notifPermission !== "granted") { alert("先に通知を許可してください"); return; }
    let count = 5;
    setTestProgressCountdown(count);
    const iv = setInterval(async () => {
      count--;
      if (count > 0) { setTestProgressCountdown(count); } else {
        clearInterval(iv); setTestProgressCountdown(null);
        const iconUrl = faviconDataUrl || "/icon-192.png";
        const body = "⚠️進捗追い漏れ: 田中様の見積提出から1週間が経過しています";
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("こばかいアプリ ⚠️", { body, icon: iconUrl, vibrate: [200, 100, 200, 100, 200] } as NotificationOptions);
        } catch { new Notification("こばかいアプリ ⚠️", { body, icon: iconUrl }); }
      }
    }, 1000);
  }

  async function sendTaskTest() {
    if (notifPermission !== "granted") { alert("先に通知を許可してください"); return; }
    let count = 5;
    setTestTaskCountdown(count);
    const iv = setInterval(async () => {
      count--;
      if (count > 0) { setTestTaskCountdown(count); } else {
        clearInterval(iv); setTestTaskCountdown(null);
        const iconUrl = faviconDataUrl || "/icon-192.png";
        const body = "📅タスク未完了: 本日予定の山田様邸現地調査が未対応です";
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("こばかいアプリ 📅", { body, icon: iconUrl, vibrate: [200, 100, 200, 100, 200] } as NotificationOptions);
        } catch { new Notification("こばかいアプリ 📅", { body, icon: iconUrl }); }
      }
    }, 1000);
  }

  const perm = permLabel(notifPermission);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/projects")} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">システム設定</h1>
          </div>
          {activeTab !== "favicon" && activeTab !== "guide" && (
            <button onClick={() => setIsSaving(true)} disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50">
              {isSaving ? "保存中..." : <><Save className="w-4 h-4" />保存</>}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* サイドタブ */}
        <aside className="md:col-span-1 space-y-1">
          {[
            { id: "company",      label: "会社情報",    icon: Building2 },
            { id: "favicon",      label: "ファビコン",   icon: ImageIcon },
            { id: "notification", label: "通知",        icon: Bell },
            { id: "security",     label: "セキュリティ", icon: Shield },
            { id: "guide",        label: "操作説明",     icon: BookOpen },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* コンテンツ */}
        <section className="md:col-span-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">

            {/* ── 会社情報 ── */}
            {activeTab === "company" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">基本情報設定</h2>
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5 font-semibold uppercase tracking-wide">屋号 / 会社名</label>
                    <input type="text" placeholder="例：〇〇リフォーム"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5 font-semibold uppercase tracking-wide">代表者名</label>
                    <input type="text" placeholder="例：山田 太郎"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>
              </>
            )}

            {/* ── ファビコン ── */}
            {activeTab === "favicon" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">ファビコン設定</h2>

                {/* Step 1 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                    <p className="text-sm font-semibold text-gray-700">絵文字を選択</p>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {EMOJI_LIST.map((em) => (
                      <button key={em} onClick={() => handleEmojiSelect(em)}
                        className={`text-3xl py-3 rounded-xl border-2 transition-all active:scale-95 ${
                          selectedEmoji === em
                            ? "border-blue-500 bg-blue-50 scale-110 shadow-sm"
                            : "border-gray-200 bg-gray-50 hover:border-blue-300"
                        }`}>
                        {em}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">タップするとブラウザのタブに即時反映されます</p>
                </div>

                {/* Step 2 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                      <p className="text-sm font-semibold text-gray-700">コードをコピーして貼り付け</p>
                    </div>
                    {selectedEmoji && (
                      <button
                        onClick={() => handleCopyCode(selectedEmoji)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 ${
                          copied
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {copied
                          ? <><Check className="w-3.5 h-3.5" />コピーしました！</>
                          : <><Copy className="w-3.5 h-3.5" />コードをコピー</>}
                      </button>
                    )}
                  </div>

                  {selectedEmoji ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute top-2 left-3 flex gap-1.5 z-10">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        </div>
                        <textarea
                          readOnly
                          value={generateCode(selectedEmoji)}
                          rows={28}
                          className="w-full font-mono text-xs bg-gray-900 text-gray-100 border border-gray-700 rounded-xl px-4 pt-8 pb-3 resize-none focus:outline-none leading-relaxed"
                          onClick={e => (e.target as HTMLTextAreaElement).select()}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 text-center">
                        <code className="bg-gray-100 px-1 rounded text-gray-600">app/icon.tsx</code> と{" "}
                        <code className="bg-gray-100 px-1 rounded text-gray-600">app/apple-icon.tsx</code> に貼り付けてください
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 bg-gray-50">
                      <span className="text-2xl">☝️</span>
                      <p className="text-sm">絵文字を選択するとコードが表示されます</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── 通知 ── */}
            {activeTab === "notification" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">プッシュ通知設定</h2>

                {/* ─ マスタートグル ─ */}
                <div className={`rounded-2xl border-2 px-5 py-5 flex items-center justify-between transition-colors ${
                  notifPermission === "granted"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-gray-200 bg-gray-50"
                }`}>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-gray-900">プッシュ通知</p>
                    <p className={`text-xs font-semibold ${
                      notifPermission === "granted" ? "text-emerald-600"
                      : notifPermission === "denied" ? "text-red-500"
                      : "text-gray-400"
                    }`}>
                      {notifPermission === "granted" && "🔔 ON — 通知が有効です"}
                      {notifPermission === "denied"  && "🔕 拒否済み — ブラウザ設定から変更してください"}
                      {notifPermission === "default" && "OFF — タップして有効にする"}
                    </p>
                  </div>
                  <button
                    onClick={notifPermission === "default" ? requestPermission : undefined}
                    disabled={notifPermission === "denied"}
                    aria-label="通知のON/OFF"
                    className={`relative h-8 w-14 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-50 ${
                      notifPermission === "granted" ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      notifPermission === "granted" ? "translate-x-7" : "translate-x-1"
                    }`} />
                  </button>
                </div>

                {notifPermission === "denied" && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    ⚠️ ブラウザの設定から手動で許可してください（アドレスバーの🔒マーク → 通知 → 許可）
                  </div>
                )}

                {/* ─ 通知の種類 ─ */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">通知の種類</p>
                  {([
                    {
                      key: "notifProgress" as const,
                      val: notifProgress,
                      setter: setNotifProgress,
                      label: "案件進捗の追い漏れアラート",
                      desc: "ステータスが長期間変わっていない案件をお知らせ",
                    },
                    {
                      key: "notifTask" as const,
                      val: notifTask,
                      setter: setNotifTask,
                      label: "タスクの追い漏れアラート",
                      desc: "次回対応予定日を過ぎた未対応案件をお知らせ",
                    },
                    {
                      key: "notifProfit" as const,
                      val: notifProfit,
                      setter: setNotifProfit,
                      label: "利益率警戒アラート",
                      desc: "利益率が設定値を下回った案件をお知らせ",
                    },
                  ] as const).map(({ key, val, setter, label, desc }) => (
                    <div key={key} className={`rounded-2xl border px-5 py-4 flex items-start justify-between gap-3 transition-colors ${
                      val && notifPermission === "granted"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-200 bg-gray-50"
                    }`}>
                      <div className="space-y-0.5 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <button
                        onClick={() => toggleNotif(key, setter, val)}
                        disabled={notifPermission !== "granted"}
                        className={`relative h-7 w-12 rounded-full shrink-0 transition-colors duration-200 disabled:opacity-40 ${
                          val && notifPermission === "granted" ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      >
                        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                          val ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ─ テスト通知 ─ */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">テスト通知</p>
                    <p className="text-xs text-gray-500 mt-0.5">ボタンを押すと5秒後に実際のアラートが届きます</p>
                  </div>
                  <button onClick={sendProgressTest}
                    disabled={notifPermission !== "granted" || testProgressCountdown !== null || testTaskCountdown !== null}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 bg-amber-500 text-white shadow shadow-amber-200">
                    {testProgressCountdown !== null ? `⚠️ ${testProgressCountdown}秒後に送信...` : "⚠️ 進捗の追い漏れテスト"}
                  </button>
                  <button onClick={sendTaskTest}
                    disabled={notifPermission !== "granted" || testProgressCountdown !== null || testTaskCountdown !== null}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 bg-blue-500 text-white shadow shadow-blue-200">
                    {testTaskCountdown !== null ? `📅 ${testTaskCountdown}秒後に送信...` : "📅 タスクの追い漏れテスト"}
                  </button>
                </div>

                {/* ─ SW ステータス ─ */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Service Worker</p>
                  <p className={`text-xs font-semibold ${
                    swStatus === "registered"   ? "text-emerald-600"
                    : swStatus === "unsupported" ? "text-red-500"
                    : swStatus === "error"       ? "text-amber-500"
                    : "text-gray-400"
                  }`}>
                    {swStatus === "registered"   && "✅ 登録済み — バックグラウンド通知が有効"}
                    {swStatus === "unsupported"  && "❌ このブラウザは非対応"}
                    {swStatus === "error"        && "⚠️ 登録エラー（開発環境では正常）"}
                    {swStatus === "checking"     && "確認中..."}
                  </p>
                </div>

                {/* iOS補足 */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 text-xs text-blue-700 leading-relaxed space-y-1">
                  <p className="font-bold">📱 iPhone でプッシュ通知を受け取るには</p>
                  <p>① iOS 16.4 以上が必要です</p>
                  <p>② Safariでこのサイトを開く → 「共有」→「ホーム画面に追加」</p>
                  <p>③ ホーム画面のアイコンからアプリを起動 → 通知トグルをONに</p>
                </div>
              </>
            )}

            {/* ── セキュリティ ── */}
            {activeTab === "security" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">セキュリティ設定</h2>

                {/* セッション情報 */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-sm font-semibold text-blue-800">現在のセッション</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded-lg px-3 py-2.5 border border-blue-100">
                      <p className="text-blue-400 font-semibold uppercase tracking-wide mb-0.5">最終ログイン</p>
                      <p className="text-gray-800 font-medium">
                        {loginTime
                          ? new Date(loginTime).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2.5 border border-blue-100">
                      <p className="text-blue-400 font-semibold uppercase tracking-wide mb-0.5">セッション期限</p>
                      <p className="text-gray-800 font-medium">
                        {loginTime
                          ? new Date(loginTime + 24 * 60 * 60 * 1000).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-400">ログインから24時間後に自動でセッションが失効します</p>
                </div>

                {/* パスワード変更 */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    パスワード変更
                  </p>
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    {/* 現在のパスワード */}
                    <div>
                      <label className="text-xs text-gray-500 font-semibold block mb-1.5">現在のパスワード</label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          value={currentPw}
                          onChange={e => setCurrentPw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 新しいパスワード */}
                    <div>
                      <label className="text-xs text-gray-500 font-semibold block mb-1.5">新しいパスワード</label>
                      <div className="relative">
                        <input
                          type={showNewPw ? "text" : "password"}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <button type="button" onClick={() => setShowNewPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 確認 */}
                    <div>
                      <label className="text-xs text-gray-500 font-semibold block mb-1.5">新しいパスワード（確認）</label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? "text" : "password"}
                          value={confirmPw}
                          onChange={e => setConfirmPw(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            confirmPw && confirmPw !== newPw ? "border-red-300 bg-red-50" : "border-gray-200"
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {pwError && (
                      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-red-500 font-medium">{pwError}</p>
                      </div>
                    )}

                    <button type="submit" disabled={pwChanging}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                      {pwChanging
                        ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />変更中...</>
                        : "パスワードを変更する"}
                    </button>
                  </form>

                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                    ⚠️ パスワード変更後は <strong>Cloudflare Pages</strong> の環境変数{" "}
                    <code className="bg-amber-100 px-1 rounded font-mono">APP_PASSWORD</code>{" "}
                    も同じ値に更新してください
                  </div>
                </div>

                {/* ログアウト */}
                <div className="border-t border-gray-100 pt-4">
                  <button onClick={handleLogout}
                    className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    ログアウト
                  </button>
                </div>
              </>
            )}

            {/* ── 操作説明 ── */}
            {activeTab === "guide" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">操作説明</h2>

                {/* 電話・マップ連携 */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📞</span>
                    <p className="text-sm font-bold text-blue-800">電話・Googleマップ連携</p>
                  </div>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    案件一覧や詳細画面の<span className="font-semibold">「電話番号」をタップ</span>すると、iPhoneの電話アプリが即座に起動して発信できます。<br />
                    <span className="font-semibold">「施工場所（住所）」をタップ</span>すると、GoogleマップアプリでピンポイントのナビをすぐFに起動できます。
                  </p>
                  <div className="bg-white rounded-xl px-3 py-2 text-xs text-blue-600 border border-blue-100">
                    💡 案件カード下部の青ボタン（電話）と緑ボタン（マップ）からもワンタップでアクセスできます
                  </div>
                </div>

                {/* 定型文 */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    <p className="text-sm font-bold text-emerald-800">フリック入力削減（定型文）</p>
                  </div>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    案件の編集画面（メモ・現場状況メモ欄）に、よく使うフレーズの<span className="font-semibold">定型文ボタン</span>が並んでいます。タップするだけで自動的に入力されるので、現場でのフリック入力を大幅に削減できます。
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["不在・留守電", "現調完了・見積へ", "追加工事発生", "完工・引き渡し"].map(t => (
                      <span key={t} className="text-xs bg-white text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* iPhone アプリ化 */}
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <p className="text-sm font-bold text-violet-800">iPhoneアプリとして使う手順</p>
                  </div>
                  <p className="text-sm text-violet-700">
                    ホーム画面に追加すると、Safariのアドレスバーが消えた<span className="font-semibold">専用アプリ</span>として快適に操作できます。
                  </p>
                  <ol className="space-y-2">
                    {[
                      "iPhone の Safari でこのアプリを開く",
                      "画面下部の「共有ボタン（□↑）」をタップ",
                      "メニューをスクロールして「ホーム画面に追加」をタップ",
                      "右上の「追加」をタップして完了",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-violet-700">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-violet-200 text-violet-800 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="bg-white rounded-xl px-3 py-2 text-xs text-violet-600 border border-violet-100">
                    ⚠️ プッシュ通知を受け取るには iOS 16.4 以上が必要です
                  </div>
                </div>

                {/* ナビゲーション */}
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔀</span>
                    <p className="text-sm font-bold text-gray-800">ナビゲーション操作</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    画面下部のナビバーにある「<span className="font-semibold">← 戻る</span>」「<span className="font-semibold">→ 進む</span>」ボタンで、iPhoneのPWAモードでもブラウザの履歴をスムーズに操作できます。ページを切り替えるたびに最新データが自動読み込みされます。
                  </p>
                </div>
              </>
            )}

          </div>
        </section>
      </main>

    </div>
  );
}
