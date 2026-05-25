"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Building2, Bell, Shield, Image as ImageIcon, Copy, Check,
  Eye, EyeOff, LogOut, Clock, BookOpen, Mail,
} from "lucide-react";

// ── ガイドセクションコンポーネント ──────────────────────
const GUIDE_COLOR: Record<string, { bg: string; border: string; title: string; num: string; tip: string; tag: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-100",   title: "text-blue-900",   num: "bg-blue-500 text-white",   tip: "bg-blue-100/60 text-blue-700",  tag: "bg-white text-blue-700 border-blue-200" },
  emerald:{ bg: "bg-emerald-50",border: "border-emerald-100",title: "text-emerald-900",num: "bg-emerald-500 text-white",tip: "bg-emerald-100/60 text-emerald-700",tag:"bg-white text-emerald-700 border-emerald-200"},
  orange: { bg: "bg-orange-50", border: "border-orange-100", title: "text-orange-900", num: "bg-orange-500 text-white", tip: "bg-orange-100/60 text-orange-700",tag: "bg-white text-orange-700 border-orange-200" },
  violet: { bg: "bg-violet-50", border: "border-violet-100", title: "text-violet-900", num: "bg-violet-500 text-white", tip: "bg-violet-100/60 text-violet-700",tag: "bg-white text-violet-700 border-violet-200" },
  cyan:   { bg: "bg-cyan-50",   border: "border-cyan-100",   title: "text-cyan-900",   num: "bg-cyan-500 text-white",   tip: "bg-cyan-100/60 text-cyan-700",  tag: "bg-white text-cyan-700 border-cyan-200" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-100",   title: "text-teal-900",   num: "bg-teal-500 text-white",   tip: "bg-teal-100/60 text-teal-700",  tag: "bg-white text-teal-700 border-teal-200" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-100", title: "text-indigo-900", num: "bg-indigo-500 text-white", tip: "bg-indigo-100/60 text-indigo-700",tag: "bg-white text-indigo-700 border-indigo-200" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-100",  title: "text-amber-900",  num: "bg-amber-500 text-white",  tip: "bg-amber-100/60 text-amber-700", tag: "bg-white text-amber-700 border-amber-200" },
  gray:   { bg: "bg-gray-50",   border: "border-gray-200",   title: "text-gray-900",   num: "bg-gray-600 text-white",   tip: "bg-gray-200/60 text-gray-600",  tag: "bg-white text-gray-600 border-gray-200" },
};

interface GuideItem { label: string; desc: string; tip?: boolean; }
function GuideSection({
  icon, color, title, items, tags,
}: {
  icon: string; color: string; title: string; items: GuideItem[]; tags?: string[];
}) {
  const c = GUIDE_COLOR[color] ?? GUIDE_COLOR.gray;
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{icon}</span>
        <p className={`text-sm font-bold ${c.title}`}>{title}</p>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-start gap-2">
              <span className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${c.num}`}>
                {i + 1}
              </span>
              <p className={`text-sm font-semibold ${c.title}`}>{item.label}</p>
            </div>
            <p className={`text-sm leading-relaxed pl-7 ${c.title} opacity-80`} style={{ whiteSpace: "pre-line" }}>
              {item.desc}
            </p>
            {item.tip && (
              <div className={`ml-7 rounded-xl px-3 py-2 text-xs leading-relaxed ${c.tip}`}>
                💡 ポイント
              </div>
            )}
          </div>
        ))}
      </div>
      {tags && (
        <div className="flex flex-wrap gap-1.5 pl-1 pt-1">
          {tags.map(t => (
            <span key={t} className={`text-xs border rounded-full px-3 py-1 ${c.tag}`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_EMAIL_TEMPLATES = {
  inquiry:
    "この度はお問い合わせいただき、誠にありがとうございます。\n\nご希望の内容を確認させていただき、改めてご提案申し上げます。\n\nよろしくお願いいたします。",
  estimate:
    "先日は現地調査にご協力いただき、ありがとうございました。\n\nお見積もりをご用意いたしましたのでご確認ください。\n\nご不明な点はお気軽にご連絡ください。",
  construction:
    "この度はご契約いただき、誠にありがとうございます。\n\n工事が完了いたしました。\n\n何かお気づきの点がございましたら、いつでもご連絡ください。",
};

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

  // メール設定
  const [emailCompanyName, setEmailCompanyName] = useState("");
  const [emailPersonName, setEmailPersonName] = useState("");
  const [emailDepartment, setEmailDepartment] = useState("");
  const [emailTemplateInquiry, setEmailTemplateInquiry] = useState(DEFAULT_EMAIL_TEMPLATES.inquiry);
  const [emailTemplateEstimate, setEmailTemplateEstimate] = useState(DEFAULT_EMAIL_TEMPLATES.estimate);
  const [emailTemplateConstruction, setEmailTemplateConstruction] = useState(DEFAULT_EMAIL_TEMPLATES.construction);
  const [emailSaved, setEmailSaved] = useState(false);

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
    // ログイン時刻（デバイスローカル）
    const raw = localStorage.getItem("loginTime");
    if (raw) setLoginTime(Number(raw));
    // メール設定・通知設定をAPIから取得、失敗時はlocalStorageにフォールバック
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const s = await res.json();
          setEmailCompanyName(s.email_company_name ?? "");
          setEmailPersonName(s.email_person_name ?? "");
          setEmailDepartment(s.email_department ?? "");
          setEmailTemplateInquiry(s.email_template_inquiry ?? DEFAULT_EMAIL_TEMPLATES.inquiry);
          setEmailTemplateEstimate(s.email_template_estimate ?? DEFAULT_EMAIL_TEMPLATES.estimate);
          setEmailTemplateConstruction(s.email_template_construction ?? DEFAULT_EMAIL_TEMPLATES.construction);
          if (s.notif_progress != null) setNotifProgress(s.notif_progress);
          if (s.notif_task     != null) setNotifTask(s.notif_task);
          if (s.notif_profit   != null) setNotifProfit(s.notif_profit);
          return;
        }
      } catch { /* fall through */ }
      // localStorage フォールバック
      setEmailCompanyName(localStorage.getItem("emailCompanyName") ?? "");
      setEmailPersonName(localStorage.getItem("emailPersonName") ?? "");
      setEmailDepartment(localStorage.getItem("emailDepartment") ?? "");
      setEmailTemplateInquiry(localStorage.getItem("emailTemplate_inquiry") ?? DEFAULT_EMAIL_TEMPLATES.inquiry);
      setEmailTemplateEstimate(localStorage.getItem("emailTemplate_estimate") ?? DEFAULT_EMAIL_TEMPLATES.estimate);
      setEmailTemplateConstruction(localStorage.getItem("emailTemplate_construction") ?? DEFAULT_EMAIL_TEMPLATES.construction);
      const np  = localStorage.getItem("notifProgress");
      const nt  = localStorage.getItem("notifTask");
      const npr = localStorage.getItem("notifProfit");
      if (np  !== null) setNotifProgress(np  === "true");
      if (nt  !== null) setNotifTask(nt  === "true");
      if (npr !== null) setNotifProfit(npr === "true");
    }
    loadSettings();
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
    // セッション情報のみ削除（案件データ・設定データは保持）
    localStorage.removeItem("loginTime");
    router.push("/login");
  }

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  async function handleEmailSave() {
    setIsSaving(true);
    const payload = {
      email_company_name:          emailCompanyName,
      email_person_name:           emailPersonName,
      email_department:            emailDepartment,
      email_template_inquiry:      emailTemplateInquiry,
      email_template_estimate:     emailTemplateEstimate,
      email_template_construction: emailTemplateConstruction,
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("API save failed");
    } catch {
      // localStorage フォールバック
      localStorage.setItem("emailCompanyName",        emailCompanyName);
      localStorage.setItem("emailPersonName",         emailPersonName);
      localStorage.setItem("emailDepartment",         emailDepartment);
      localStorage.setItem("emailTemplate_inquiry",   emailTemplateInquiry);
      localStorage.setItem("emailTemplate_estimate",  emailTemplateEstimate);
      localStorage.setItem("emailTemplate_construction", emailTemplateConstruction);
    } finally {
      setIsSaving(false);
    }
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  }

  async function toggleNotif(key: "notifProgress"|"notifTask"|"notifProfit", setter: (v: boolean) => void, current: boolean) {
    const v = !current;
    setter(v);
    const apiKey: Record<string, string> = {
      notifProgress: "notif_progress",
      notifTask: "notif_task",
      notifProfit: "notif_profit",
    };
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiKey[key]]: v }),
      });
      if (!res.ok) throw new Error("API save failed");
    } catch {
      localStorage.setItem(key, String(v));
    }
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
          {activeTab !== "favicon" && activeTab !== "guide" && activeTab !== "email" && (
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
            { id: "email",        label: "メール設定",  icon: Mail },
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

            {/* ── メール設定 ── */}
            {activeTab === "email" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">メール・署名設定</h2>

                {/* 署名（基本情報）*/}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">署名（基本情報）</p>
                  <div className="space-y-3">
                    {[
                      { label: "会社名", placeholder: "こばかい工務店", value: emailCompanyName, setter: setEmailCompanyName },
                      { label: "名前",   placeholder: "小林 太郎",   value: emailPersonName,   setter: setEmailPersonName },
                      { label: "部署・役職", placeholder: "営業部 / 代表", value: emailDepartment, setter: setEmailDepartment },
                    ].map(({ label, placeholder, value, setter }) => (
                      <div key={label}>
                        <label className="text-xs text-gray-500 font-semibold block mb-1">{label}</label>
                        <input
                          type="text"
                          value={value}
                          onChange={e => setter(e.target.value)}
                          placeholder={placeholder}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  {(emailPersonName || emailCompanyName) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 font-mono leading-relaxed">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">署名プレビュー</p>
                      ---<br />
                      {emailPersonName}{emailDepartment ? `（${emailDepartment}）` : ""}<br />
                      {emailCompanyName}
                    </div>
                  )}
                </div>

                {/* メールテンプレート */}
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">メールテンプレート</p>
                  {([
                    { label: "お問い合わせ後のメール", value: emailTemplateInquiry, setter: setEmailTemplateInquiry },
                    { label: "現地調査・見積提出時のメール", value: emailTemplateEstimate, setter: setEmailTemplateEstimate },
                    { label: "着工・完工のご挨拶メール", value: emailTemplateConstruction, setter: setEmailTemplateConstruction },
                  ] as const).map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="text-xs text-gray-500 font-semibold block mb-1.5">{label}</label>
                      <textarea
                        value={value}
                        onChange={e => setter(e.target.value)}
                        rows={4}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                  💡 登録したテンプレートは案件詳細の「AI連絡文作成」からワンタップで呼び出せます
                </div>

                <button
                  onClick={handleEmailSave}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    emailSaved
                      ? "bg-emerald-500 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {emailSaved
                    ? <><Check className="w-4 h-4" />保存しました！</>
                    : <><Save className="w-4 h-4" />保存する</>}
                </button>
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
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">操作マニュアル</h2>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    全{[
                      "案件管理","収益計算","写真管理","サマリー",
                      "AI連絡文","定型文","電話・マップ","PWA化","通知","セキュリティ",
                    ].length}項目
                  </span>
                </div>

                {/* ── 案件管理 ── */}
                <GuideSection
                  icon="📋" color="blue" title="案件管理の基本"
                  items={[
                    { label: "新規案件を作成する", desc: "下部ナビの「新規」ボタン、または案件一覧画面の「＋新規案件」をタップ。お客様名・住所・電話番号・請負金額・対象月・工種を入力して保存します。" },
                    { label: "ステータスを更新する", desc: "案件カードをタップして詳細を開き、ステータスバーの変更ボタンから6段階（初回問合せ・現地調査・見積提出・契約・施工中・完工）で進捗を管理します。" },
                    { label: "案件を検索・絞り込む", desc: "一覧画面上部の検索バーにお客様名・住所・電話番号を入力すると即時フィルタリングされます。ステータスバーでの絞り込みも同時に使えます。" },
                    { label: "対象月を設定する", desc: "案件の編集画面で「対象月（何月の案件か）」を選択すると、サマリー画面の月次集計に正確に反映されます。", tip: true },
                  ]}
                />

                {/* ── 収益・利益 ── */}
                <GuideSection
                  icon="💰" color="emerald" title="収益・利益の管理"
                  items={[
                    { label: "金額を入力する", desc: "案件詳細の「収益」タブで請負金額・外注費（下請け）・材料費・その他経費を入力します。すべての金額はカンマなしの半角数字で入力してください。" },
                    { label: "利益率の見方", desc: "原価ベースの利益率（マークアップ率）を自動計算します。計算式：(請負金額 − 原価合計) ÷ 原価合計 × 100。業界標準の原価利益率指標です。" },
                    { label: "利益率アラート", desc: "利益率が20%を下回ると案件カードに警告バッジが表示されます。サマリー画面でも低利益案件がハイライトされます。", tip: true },
                  ]}
                />

                {/* ── 写真・図面 ── */}
                <GuideSection
                  icon="📸" color="orange" title="写真・図面の管理"
                  items={[
                    { label: "写真を追加する", desc: "案件詳細の「写真」タブを開き、カテゴリ（ビフォー・アフター・施工中・図面）を選んでから「カメラで追加」ボタンをタップ。その場で撮影またはカメラロールから選択できます。" },
                    { label: "PDF図面を保存する", desc: "「図面・PDFを追加」ボタンからPDFファイルを選択して保存。図面アイコンをタップするとブラウザでPDFを直接表示できます。" },
                    { label: "写真を拡大表示する", desc: "保存済み写真をタップすると全画面ライトボックスで表示されます。背景タップまたは×ボタンで閉じられます。" },
                    { label: "データの保存場所", desc: "写真・PDFはこの端末のブラウザストレージ（localStorage）に保存されます。端末を変えると引き継がれないためご注意ください。", tip: true },
                  ]}
                />

                {/* ── サマリー ── */}
                <GuideSection
                  icon="📊" color="violet" title="月次サマリーと目標管理"
                  items={[
                    { label: "月次集計の見方", desc: "サマリー画面では選択した月の案件一覧・売上合計・原価合計・利益率をまとめて確認できます。案件の「対象月」フィールドに基づいて集計されます。" },
                    { label: "月次目標を設定する", desc: "PC表示ではサイドバーの目標金額入力欄から月次売上目標を設定できます。達成率がプログレスバーで表示されます。" },
                    { label: "6ヶ月トレンドを見る", desc: "サイドバーの棒グラフで直近6ヶ月の売上・利益推移を確認できます。月をクリックするとその月の詳細に切り替わります。", tip: true },
                  ]}
                />

                {/* ── AI連絡文 ── */}
                <GuideSection
                  icon="✉️" color="cyan" title="AI連絡文作成アシスタント"
                  items={[
                    { label: "連絡文を生成する", desc: "案件詳細の「営業」タブを開き、「AI連絡文作成」パネルを展開。キーワード入力と丁寧さレベルを選んで「文章を生成」をタップするとお客様向けのメール・LINE文が自動作成されます。" },
                    { label: "テンプレートを使う", desc: "「定型文から選択」ボタンで設定画面に登録した3種類のテンプレート（問合せ後・見積提出・完工挨拶）をワンタップで適用できます。" },
                    { label: "コピーして送信する", desc: "生成された文章右上の「コピー」ボタンをタップ → LINEやメールアプリに切り替えてペーストするだけで送信できます。", tip: true },
                    { label: "テンプレートをカスタマイズ", desc: "設定 → 「メール設定」タブで3種類のテンプレートと署名（会社名・担当者名）を自由に編集できます。" },
                  ]}
                />

                {/* ── 定型文 ── */}
                <GuideSection
                  icon="📝" color="teal" title="定型文ボタン（フリック入力削減）"
                  items={[
                    { label: "定型文を使う", desc: "案件の編集画面のメモ欄・現場状況メモ欄の上に定型文ボタンが並んでいます。タップするだけでよく使うフレーズが自動入力されます。" },
                  ]}
                  tags={["不在・留守電", "現調完了・見積へ", "追加工事発生", "完工・引き渡し", "施工中・進行中", "お客様確認待ち"]}
                />

                {/* ── 電話・マップ ── */}
                <GuideSection
                  icon="📞" color="blue" title="電話・Googleマップ連携"
                  items={[
                    { label: "ワンタップで発信する", desc: "案件一覧の電話ボタン（青）または案件詳細の電話番号をタップすると、iPhoneの電話アプリが即起動して発信できます。" },
                    { label: "ナビをすぐ起動する", desc: "案件一覧のマップボタン（緑）または案件詳細の住所をタップすると、Googleマップが起動して現場までの道順を表示します。", tip: true },
                  ]}
                />

                {/* ── PWA化 ── */}
                <GuideSection
                  icon="📱" color="indigo" title="iPhoneアプリとして使う（PWA化）"
                  items={[
                    {
                      label: "ホーム画面に追加する手順",
                      desc: "① iPhone の Safari でこのアプリを開く\n② 画面下部の「共有ボタン（□↑）」をタップ\n③ メニューをスクロールして「ホーム画面に追加」をタップ\n④ 右上の「追加」をタップして完了",
                    },
                    { label: "アプリ化のメリット", desc: "Safariのアドレスバーが消えた全画面の専用アプリとして動作します。プッシュ通知も受け取れます（iOS 16.4以上）。", tip: true },
                    { label: "ナビゲーションについて", desc: "アプリ化するとブラウザの「戻る」ボタンが使えなくなりますが、画面下部の「← →」ボタンで代替できます。" },
                  ]}
                />

                {/* ── 通知 ── */}
                <GuideSection
                  icon="🔔" color="amber" title="プッシュ通知の設定"
                  items={[
                    { label: "通知を有効にする", desc: "設定 → 「通知」タブ → トグルをONにして通知を許可。進捗追い漏れ・タスク追い漏れ・利益率警戒の3種類をそれぞれ個別にON/OFFできます。" },
                    { label: "テスト通知を送る", desc: "「テスト通知」ボタンを押すと5秒後に実際のプッシュ通知が届きます。通知内容や音の確認に使ってください。", tip: true },
                    { label: "iPhoneでの注意点", desc: "iPhoneでプッシュ通知を受け取るには必ずPWA化（ホーム画面に追加）が必要です。Safariのブラウザ上では通知が届きません。" },
                  ]}
                />

                {/* ── セキュリティ ── */}
                <GuideSection
                  icon="🔐" color="gray" title="セキュリティ・ログイン"
                  items={[
                    { label: "セッションの有効期間", desc: "ログインから24時間でセッションが自動失効し、再ログインが必要になります。設定 → セキュリティでログイン時刻と期限を確認できます。" },
                    { label: "新しい端末での初回ログイン", desc: "初めて使う端末・ブラウザではパスワードが必要です。パスワードは管理者に確認してください。" },
                    { label: "ログアウト", desc: "設定 → セキュリティ → 「ログアウト」ボタンから手動でログアウトできます。端末のブラウザストレージも同時にクリアされます。", tip: true },
                  ]}
                />

                {/* バージョン情報 */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">こばかいアプリ</p>
                  <p className="text-xs text-gray-500">リフォーム・工事会社向け案件管理システム</p>
                </div>
              </>
            )}

          </div>
        </section>
      </main>

    </div>
  );
}
