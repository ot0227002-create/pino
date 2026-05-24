"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Building2, Bell, Shield, Image as ImageIcon, Upload, Trash2,
} from "lucide-react";
import Cropper from "react-easy-crop";

// ──────────────────────────────────────────────
// 絵文字ファビコン候補
// ──────────────────────────────────────────────
const EMOJI_LIST = ["🏗️", "🛠️", "🏡", "📊", "📈", "🎨", "🚧"];

// ──────────────────────────────────────────────
// Canvas で絵文字 → PNG DataURL
// ──────────────────────────────────────────────
function emojiToDataUrl(emoji: string, size = 512): string {
  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.font         = `${Math.floor(size * 0.78)}px serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return canvas.toDataURL("image/png");
}

// ──────────────────────────────────────────────
// 通知許可状態のラベル
// ──────────────────────────────────────────────
function permLabel(p: string) {
  if (p === "granted") return { text: "許可済み ✅", cls: "text-emerald-400" };
  if (p === "denied")  return { text: "拒否されています ❌", cls: "text-red-400" };
  return { text: "未設定", cls: "text-gray-400" };
}

export function SettingsClient() {
  const router = useRouter();
  const [activeTab,  setActiveTab]  = useState("company");
  const [isSaving,   setIsSaving]   = useState(false);

  // ── ファビコン（画像アップロード）──
  const [image,            setImage]            = useState<string | null>(null);
  const [crop,             setCrop]             = useState({ x: 0, y: 0 });
  const [zoom,             setZoom]             = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x:number;y:number;width:number;height:number } | null>(null);
  const [faviconPreview,   setFaviconPreview]   = useState<string | null>(null);
  const [showCropper,      setShowCropper]      = useState(false);

  // ── 絵文字ファビコン ──
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  // 絵文字 or 切り取り画像。通知アイコンとも共有
  const [faviconDataUrl, setFaviconDataUrl] = useState<string | null>(null);

  // ── 通知 ──
  const [swStatus,       setSwStatus]       = useState<"checking"|"unsupported"|"registered"|"error">("checking");
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [testCountdown,  setTestCountdown]  = useState<number | null>(null);

  // Service Worker 登録 & 初期権限取得
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setSwStatus("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => setSwStatus("registered"))
      .catch(() => setSwStatus("error"));
  }, []);

  // ── ファビコン: 絵文字選択 ──
  function handleEmojiSelect(emoji: string) {
    setSelectedEmoji(emoji);
    const url = emojiToDataUrl(emoji);
    setFaviconDataUrl(url);
    setFaviconPreview(url);
    // ブラウザのタブアイコンをリアルタイム変更
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  // ── ファビコン: ファイルアップロード ──
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImage(reader.result as string);
        setShowCropper(true);
        setSelectedEmoji(null);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  const onCropComplete = useCallback((_: unknown, pixels: typeof croppedAreaPixels) => {
    setCroppedAreaPixels(pixels);
  }, []);
  const handleSaveCrop = () => {
    if (!image || !croppedAreaPixels) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0, 512, 512);
      const url = canvas.toDataURL("image/png");
      setFaviconPreview(url);
      setFaviconDataUrl(url);
      setShowCropper(false);
      setImage(null);
    };
    img.src = image;
  };

  // ── 通知: 権限リクエスト ──
  async function requestPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  // ── 通知: テスト通知（5秒後）──
  async function sendTestNotification() {
    if (notifPermission !== "granted") {
      alert("先に通知を許可してください");
      return;
    }
    let count = 5;
    setTestCountdown(count);
    const iv = setInterval(async () => {
      count--;
      if (count > 0) {
        setTestCountdown(count);
      } else {
        clearInterval(iv);
        setTestCountdown(null);
        const iconUrl = faviconDataUrl || "/icon-192.png";
        const body = "⚠️ 利益率警戒: 山田様邸の利益率が18%に低下しています";
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("PRO-MANAGEMENT ⚠️", {
            body,
            icon: iconUrl,
            vibrate: [200, 100, 200, 100, 200],
          } as NotificationOptions);
        } catch {
          new Notification("PRO-MANAGEMENT ⚠️", { body, icon: iconUrl });
        }
      }
    }, 1000);
  }

  const handleGlobalSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const perm = permLabel(notifPermission);

  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-sans pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-[#161b22]/80 backdrop-blur-md border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/projects")}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">システム設定</h1>
          </div>
          <button onClick={handleGlobalSave} disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50">
            {isSaving ? "保存中..." : <><Save className="w-4 h-4" />保存</>}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* サイドタブ */}
        <aside className="md:col-span-1 space-y-2">
          {[
            { id: "company",      label: "会社情報", icon: Building2 },
            { id: "favicon",      label: "ファビコン", icon: ImageIcon },
            { id: "notification", label: "通知",     icon: Bell },
            { id: "security",     label: "セキュリティ", icon: Shield },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-gray-400 hover:bg-gray-800"
              }`}>
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* コンテンツ */}
        <section className="md:col-span-3">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">

            {/* ── 会社情報 ── */}
            {activeTab === "company" && (
              <>
                <h2 className="text-lg font-bold border-l-4 border-blue-500 pl-3">基本情報設定</h2>
                <div className="grid gap-4">
                  <Field label="屋号 / 会社名">
                    <input type="text" placeholder="例：〇〇リフォーム"
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" />
                  </Field>
                  <Field label="代表者名">
                    <input type="text" placeholder="例：山田 太郎"
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" />
                  </Field>
                </div>
              </>
            )}

            {/* ── ファビコン ── */}
            {activeTab === "favicon" && (
              <>
                <h2 className="text-lg font-bold border-l-4 border-blue-500 pl-3">ファビコン設定</h2>

                {/* プレビュー */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-2xl bg-[#0d1117] border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden group-hover:border-blue-500 transition-colors text-6xl">
                      {faviconPreview
                        ? <img src={faviconPreview} alt="preview" className="w-full h-full object-cover" />
                        : <span className="text-gray-600">?</span>}
                    </div>
                    {faviconPreview && (
                      <button onClick={() => { setFaviconPreview(null); setFaviconDataUrl(null); setSelectedEmoji(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 p-1.5 rounded-full hover:bg-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">ブラウザのタブに即時反映されます</p>
                </div>

                {/* 絵文字グリッド */}
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-3">🎨 絵文字から選択</p>
                  <div className="grid grid-cols-7 gap-2">
                    {EMOJI_LIST.map((em) => (
                      <button key={em} onClick={() => handleEmojiSelect(em)}
                        className={`text-3xl py-3 rounded-xl transition-all ${
                          selectedEmoji === em
                            ? "bg-blue-600/20 border-2 border-blue-500 scale-110"
                            : "bg-[#0d1117] border border-gray-800 hover:border-gray-600"
                        }`}>
                        {em}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">選択するとCanvas描画で即座にPNGに変換されます</p>
                </div>

                {/* 画像アップロード */}
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-3">📁 画像をアップロード＆トリミング</p>
                  <label className="flex flex-col items-center gap-2 px-4 py-5 bg-[#0d1117] border border-gray-800 rounded-2xl cursor-pointer hover:bg-[#1c2128] transition-all">
                    <Upload className="w-7 h-7 text-blue-500" />
                    <span className="text-sm text-gray-400">クリックして画像を選択</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  </label>
                  <p className="text-[10px] text-gray-600 mt-2 text-center">
                    ※ 正方形トリミング後 512×512px PNG に変換 / PWA通知アイコンと共有
                  </p>
                </div>
              </>
            )}

            {/* ── 通知 ── */}
            {activeTab === "notification" && (
              <>
                <h2 className="text-lg font-bold border-l-4 border-blue-500 pl-3">プッシュ通知設定</h2>

                {/* SW ステータス */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-xl px-5 py-4 space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Service Worker</p>
                  <p className={`text-sm font-semibold ${
                    swStatus === "registered" ? "text-emerald-400"
                    : swStatus === "unsupported" ? "text-red-400"
                    : swStatus === "error" ? "text-amber-400"
                    : "text-gray-400"
                  }`}>
                    {swStatus === "registered"  && "✅ 登録済み — バックグラウンド通知が有効"}
                    {swStatus === "unsupported" && "❌ このブラウザは非対応（iOS Safari はホーム画面追加が必要）"}
                    {swStatus === "error"       && "⚠️ 登録エラー（開発環境では正常）"}
                    {swStatus === "checking"    && "確認中..."}
                  </p>
                </div>

                {/* 通知権限 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#0d1117] border border-gray-800 rounded-xl px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold">通知の許可状態</p>
                      <p className={`text-xs mt-0.5 ${perm.cls}`}>{perm.text}</p>
                    </div>
                    {notifPermission !== "granted" && (
                      <button onClick={requestPermission}
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95">
                        許可する
                      </button>
                    )}
                  </div>

                  {notifPermission === "denied" && (
                    <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-900/30 rounded-xl px-4 py-3">
                      ⚠️ ブラウザの設定から通知を手動で許可してください（アドレスバーの🔒マーク）
                    </div>
                  )}
                </div>

                {/* テスト通知 */}
                <div className="bg-[#0d1117] border border-gray-800 rounded-xl px-5 py-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold">⚠️ テスト通知を送信</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ボタンを押すと5秒後に「利益率警戒」通知がこの端末に届きます
                    </p>
                  </div>

                  <button
                    onClick={sendTestNotification}
                    disabled={notifPermission !== "granted" || testCountdown !== null}
                    className="w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40
                      bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20">
                    {testCountdown !== null
                      ? `🔔 ${testCountdown}秒後に送信...`
                      : "🔔 5秒後にテスト通知を送る"}
                  </button>

                  {faviconDataUrl && (
                    <p className="text-[10px] text-gray-600 text-center">
                      通知アイコン: ファビコンタブで設定した画像を使用
                    </p>
                  )}
                </div>

                {/* iOS 補足 */}
                <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl px-4 py-4 text-xs text-blue-300 leading-relaxed space-y-1">
                  <p className="font-bold">📱 iPhone でプッシュ通知を受け取るには</p>
                  <p>① iOS 16.4 以上が必要です</p>
                  <p>② Safariでこのサイトを開く → 「共有」→「ホーム画面に追加」</p>
                  <p>③ ホーム画面のアイコンからアプリを起動 → 通知を許可</p>
                </div>
              </>
            )}

            {/* ── セキュリティ ── */}
            {activeTab === "security" && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600 italic text-sm">
                <Shield className="w-10 h-10 mb-3 text-gray-700" />
                <p>現在準備中です。次回のアップデートをお待ちください。</p>
              </div>
            )}

          </div>
        </section>
      </main>

      {/* トリミングモーダル */}
      {showCropper && image && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <Cropper image={image} crop={crop} zoom={zoom} aspect={1}
              onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
          </div>
          <div className="w-full max-w-lg mt-6 space-y-5">
            <div className="px-2">
              <label className="text-xs text-gray-500 uppercase font-bold block text-center mb-3">ズーム</label>
              <input type="range" min={1} max={3} step={0.1} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowCropper(false); setImage(null); }}
                className="flex-1 py-4 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 transition-all">
                キャンセル
              </button>
              <button onClick={handleSaveCrop}
                className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg transition-all">
                切り抜きを確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-2 font-bold uppercase">{label}</label>
      {children}
    </div>
  );
}
