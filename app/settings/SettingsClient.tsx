"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Building2, Bell, Shield,
  Image as ImageIcon, Upload, Trash2
} from "lucide-react";
import Cropper from "react-easy-crop";

export function SettingsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("company");
  const [isSaving, setIsSaving] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImage(reader.result as string);
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_: unknown, pixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSaveCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;

    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      );
      setFaviconPreview(canvas.toDataURL("image/png"));
      setShowCropper(false);
      setImage(null);
    };
    img.src = image;
  };

  const handleGlobalSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-sans pb-20">
      <header className="sticky top-0 z-30 bg-[#161b22]/80 backdrop-blur-md border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/projects")}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">システム設定</h1>
          </div>
          <button
            onClick={handleGlobalSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "保存中..." : <><Save className="w-4 h-4" />保存</>}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 space-y-2">
          {[
            { id: "company", label: "会社情報", icon: Building2 },
            { id: "favicon", label: "ファビコン", icon: ImageIcon },
            { id: "notification", label: "通知", icon: Bell },
            { id: "security", label: "セキュリティ", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </aside>

        <section className="md:col-span-3">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 shadow-xl">

            {activeTab === "company" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold border-l-4 border-blue-500 pl-3">基本情報設定</h2>
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-2 font-bold uppercase">屋号 / 会社名</label>
                    <input type="text" placeholder="例：〇〇リフォーム" className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-2 font-bold uppercase">代表者名</label>
                    <input type="text" placeholder="例：山田 太郎" className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "favicon" && (
              <div className="space-y-8">
                <div className="flex flex-col items-center py-6">
                  <h2 className="text-lg font-bold self-start border-l-4 border-blue-500 pl-3 mb-8">ファビコン設定</h2>

                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl bg-[#0d1117] border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500">
                      {faviconPreview ? (
                        <img src={faviconPreview} alt="Favicon Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-600" />
                      )}
                    </div>
                    {faviconPreview && (
                      <button onClick={() => setFaviconPreview(null)} className="absolute -top-2 -right-2 bg-red-500 p-1.5 rounded-full shadow-lg hover:bg-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-8 w-full max-w-sm">
                    <label className="flex flex-col items-center gap-2 px-4 py-6 bg-[#0d1117] border border-gray-800 rounded-2xl cursor-pointer hover:bg-[#1c2128] transition-all">
                      <Upload className="w-8 h-8 text-blue-500" />
                      <span className="text-sm text-gray-400">画像を選択してトリミング</span>
                      <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    </label>
                    <p className="text-[10px] text-gray-600 mt-4 text-center leading-relaxed">
                      ※ 正方形にトリミングされます。<br />
                      ※ 推奨サイズ：512×512 px以上（PNG / JPG）
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "company" && activeTab !== "favicon" && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600 italic">
                <p>現在準備中です。次回のアップデートをお待ちください。</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {showCropper && image && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="w-full max-w-lg mt-8 space-y-6">
            <div className="px-4">
              <label className="text-xs text-gray-500 uppercase font-bold mb-4 block text-center">ズーム調整</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setShowCropper(false); setImage(null); }}
                className="flex-1 py-4 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveCroppedImage}
                className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/20 transition-all"
              >
                切り抜きを確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
