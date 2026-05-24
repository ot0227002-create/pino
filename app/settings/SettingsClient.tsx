"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Building2, Bell, Shield, Image as ImageIcon, Upload, Trash2,
} from "lucide-react";
import Cropper from "react-easy-crop";

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

  // ファビコン（画像アップロード）
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // 絵文字ファビコン
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [faviconDataUrl, setFaviconDataUrl] = useState<string | null>(null);

  // 通知
  const [swStatus, setSwStatus] = useState<"checking"|"unsupported"|"registered"|"error">("checking");
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setSwStatus("unsupported"); return;
    }
    setNotifPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js")
      .then(() => setSwStatus("registered"))
      .catch(() => setSwStatus("error"));
  }, []);

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
    setFaviconPreview(url);
    applyFavicon(url);
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.addEventListener("load", () => { setImage(reader.result as string); setShowCropper(true); setSelectedEmoji(null); });
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  const onCropComplete = useCallback((_: unknown, pixels: typeof croppedAreaPixels) => { setCroppedAreaPixels(pixels); }, []);
  const handleSaveCrop = () => {
    if (!image || !croppedAreaPixels) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 512, 512);
      const url = canvas.toDataURL("image/png");
      setFaviconPreview(url); setFaviconDataUrl(url); setShowCropper(false); setImage(null);
      applyFavicon(url);
    };
    img.src = image;
  };

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  async function sendTestNotification() {
    if (notifPermission !== "granted") { alert("先に通知を許可してください"); return; }
    let count = 5;
    setTestCountdown(count);
    const iv = setInterval(async () => {
      count--;
      if (count > 0) { setTestCountdown(count); } else {
        clearInterval(iv); setTestCountdown(null);
        const iconUrl = faviconDataUrl || "/icon-192.png";
        const body = "⚠️ 利益率警戒: 山田様邸の利益率が18%に低下しています";
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("PRO-MANAGEMENT ⚠️", { body, icon: iconUrl, vibrate: [200, 100, 200, 100, 200] } as NotificationOptions);
        } catch { new Notification("PRO-MANAGEMENT ⚠️", { body, icon: iconUrl }); }
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
          <button onClick={() => setIsSaving(true)} disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50">
            {isSaving ? "保存中..." : <><Save className="w-4 h-4" />保存</>}
          </button>
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

                {/* プレビュー */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden text-5xl">
                      {faviconPreview
                        ? <img src={faviconPreview} alt="preview" className="w-full h-full object-cover" />
                        : <span className="text-gray-300 text-3xl">?</span>}
                    </div>
                    {faviconPreview && (
                      <button onClick={() => { setFaviconPreview(null); setFaviconDataUrl(null); setSelectedEmoji(null); localStorage.removeItem("appFavicon"); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">ブラウザのタブに即時反映されます</p>
                </div>

                {/* 絵文字グリッド */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">🎨 絵文字から選択</p>
                  <div className="grid grid-cols-7 gap-2">
                    {EMOJI_LIST.map((em) => (
                      <button key={em} onClick={() => handleEmojiSelect(em)}
                        className={`text-3xl py-3 rounded-xl border-2 transition-all ${
                          selectedEmoji === em
                            ? "border-blue-500 bg-blue-50 scale-110"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}>
                        {em}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">選択するとCanvas描画でPNGに変換されます</p>
                </div>

                {/* 画像アップロード */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">📁 画像をアップロード＆トリミング</p>
                  <label className="flex flex-col items-center gap-2 px-4 py-5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <Upload className="w-7 h-7 text-blue-500" />
                    <span className="text-sm text-gray-500">クリックして画像を選択</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    正方形トリミング後 512×512px PNG / PWA通知アイコンと共有
                  </p>
                </div>
              </>
            )}

            {/* ── 通知 ── */}
            {activeTab === "notification" && (
              <>
                <h2 className="text-base font-bold text-gray-900 border-l-4 border-blue-500 pl-3">プッシュ通知設定</h2>

                {/* SW ステータス */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Service Worker</p>
                  <p className={`text-sm font-semibold ${
                    swStatus === "registered"  ? "text-emerald-600"
                    : swStatus === "unsupported" ? "text-red-500"
                    : swStatus === "error"       ? "text-amber-500"
                    : "text-gray-400"
                  }`}>
                    {swStatus === "registered"  && "✅ 登録済み — バックグラウンド通知が有効"}
                    {swStatus === "unsupported" && "❌ このブラウザは非対応"}
                    {swStatus === "error"       && "⚠️ 登録エラー（開発環境では正常）"}
                    {swStatus === "checking"    && "確認中..."}
                  </p>
                </div>

                {/* 通知権限 */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">通知の許可状態</p>
                    <p className={`text-xs mt-0.5 ${perm.cls}`}>{perm.text}</p>
                  </div>
                  {notifPermission !== "granted" && (
                    <button onClick={requestPermission}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95">
                      許可する
                    </button>
                  )}
                </div>

                {notifPermission === "denied" && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    ⚠️ ブラウザの設定から手動で許可してください（アドレスバーの🔒マーク）
                  </div>
                )}

                {/* テスト通知 */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">⚠️ テスト通知を送信</p>
                    <p className="text-xs text-gray-500 mt-1">ボタンを押すと5秒後に利益率警戒の通知が届きます</p>
                  </div>
                  <button onClick={sendTestNotification}
                    disabled={notifPermission !== "granted" || testCountdown !== null}
                    className="w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40
                      bg-amber-500 hover:bg-amber-600 text-white shadow shadow-amber-200">
                    {testCountdown !== null ? `🔔 ${testCountdown}秒後に送信...` : "🔔 5秒後にテスト通知を送る"}
                  </button>
                </div>

                {/* iOS補足 */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 text-xs text-blue-700 leading-relaxed space-y-1">
                  <p className="font-bold">📱 iPhone でプッシュ通知を受け取るには</p>
                  <p>① iOS 16.4 以上が必要です</p>
                  <p>② Safariでこのサイトを開く → 「共有」→「ホーム画面に追加」</p>
                  <p>③ ホーム画面のアイコンからアプリを起動 → 通知を許可</p>
                </div>
              </>
            )}

            {/* ── セキュリティ ── */}
            {activeTab === "security" && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                <Shield className="w-10 h-10 mb-3 text-gray-300" />
                <p>現在準備中です</p>
              </div>
            )}

          </div>
        </section>
      </main>

      {/* トリミングモーダル */}
      {showCropper && image && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <Cropper image={image} crop={crop} zoom={zoom} aspect={1}
              onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
          </div>
          <div className="w-full max-w-lg mt-6 space-y-4">
            <input type="range" min={1} max={3} step={0.1} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            <div className="flex gap-3">
              <button onClick={() => { setShowCropper(false); setImage(null); }}
                className="flex-1 py-3 rounded-xl font-bold bg-white text-gray-700 hover:bg-gray-100 transition-all">
                キャンセル
              </button>
              <button onClick={handleSaveCrop}
                className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all">
                切り抜きを確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
