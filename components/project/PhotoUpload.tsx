"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileText, Plus, Trash2, X, ZoomIn } from "lucide-react";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { IMAGE_CATEGORY_LABEL, type ImageCategory, type ProjectImage } from "@/types";
import { cn } from "@/lib/utils";

// ── ローカル保存用の型 ──────────────────────────────
interface LocalPhoto {
  id: string;
  dataUrl: string;
  category: ImageCategory;
  isPdf: boolean;
  fileName: string;
  createdAt: string;
}

// ── ヘルパー ──────────────────────────────────────
const lsKey = (id: string) => `lsphotos_${id}`;

function loadLocal(projectId: string): LocalPhoto[] {
  try { return JSON.parse(localStorage.getItem(lsKey(projectId)) ?? "[]"); }
  catch { return []; }
}

function saveLocal(projectId: string, photos: LocalPhoto[]) {
  try { localStorage.setItem(lsKey(projectId), JSON.stringify(photos)); }
  catch {
    alert("ストレージ容量不足です。不要な写真を削除してください。");
  }
}

async function compressToBase64(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target!.result as string);
    r.readAsDataURL(file);
  });
}

// ── Props ─────────────────────────────────────────
interface Props {
  projectId: string;
  images: ProjectImage[];
  onChange: (images: ProjectImage[]) => void;
}

const DISPLAY_CATEGORIES: { cat: ImageCategory; label: string; color: string }[] = [
  { cat: "before",      label: "ビフォー",   color: "bg-blue-600 text-white" },
  { cat: "after",       label: "アフター",   color: "bg-emerald-600 text-white" },
  { cat: "in_progress", label: "施工中",     color: "bg-amber-500 text-white" },
  { cat: "other",       label: "図面・その他", color: "bg-gray-600 text-white" },
];

export function PhotoUpload({ projectId, images: supabaseImages, onChange }: Props) {
  const [category, setCategory] = useState<ImageCategory>("before");
  const [uploading, setUploading] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<LocalPhoto[]>([]);
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  // マウント時にlocalStorageから復元
  useEffect(() => {
    setLocalPhotos(loadLocal(projectId));
  }, [projectId]);

  function persist(photos: LocalPhoto[]) {
    setLocalPhotos(photos);
    saveLocal(projectId, photos);
    // 親に通知（Supabase画像 + ローカル画像）
    const converted: ProjectImage[] = photos.map(p => ({
      id: p.id,
      project_id: projectId,
      image_url: p.dataUrl,
      category: p.category,
      created_at: p.createdAt,
    }));
    onChange([...supabaseImages, ...converted]);
  }

  async function handleImageFile(file: File) {
    setUploading(true);
    try {
      if (hasSupabase) {
        // Supabase アップロード
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${projectId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("project-images").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("project-images").getPublicUrl(path);
        const { data, error: dbErr } = await supabase
          .from("project_images").insert({ project_id: projectId, image_url: publicUrl, category }).select().single();
        if (dbErr) throw dbErr;
        onChange([data, ...supabaseImages]);
      } else {
        // LocalStorage Base64
        const dataUrl = await compressToBase64(file);
        const photo: LocalPhoto = {
          id: `img_${Date.now()}`,
          dataUrl,
          category,
          isPdf: false,
          fileName: file.name,
          createdAt: new Date().toISOString(),
        };
        persist([photo, ...localPhotos]);
      }
    } catch (e) {
      console.error(e);
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  }

  async function handlePdfFile(file: File) {
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const photo: LocalPhoto = {
        id: `pdf_${Date.now()}`,
        dataUrl,
        category: "other",
        isPdf: true,
        fileName: file.name,
        createdAt: new Date().toISOString(),
      };
      persist([photo, ...localPhotos]);
    } catch (e) {
      console.error(e);
      alert("PDFの保存に失敗しました");
    } finally {
      setUploading(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  function handleDelete(id: string) {
    if (!confirm("この写真・ファイルを削除しますか？")) return;
    if (hasSupabase && !id.startsWith("img_") && !id.startsWith("pdf_")) {
      supabase.from("project_images").delete().eq("id", id).then(() => {});
      onChange(supabaseImages.filter(i => i.id !== id));
    } else {
      persist(localPhotos.filter(p => p.id !== id));
    }
  }

  // 全写真（Supabaseローカルフォトをマージ）
  const allPhotos: (ProjectImage & { isPdf?: boolean; fileName?: string })[] = [
    ...supabaseImages,
    ...localPhotos.map(p => ({
      id: p.id,
      project_id: projectId,
      image_url: p.dataUrl,
      category: p.category,
      created_at: p.createdAt,
      isPdf: p.isPdf,
      fileName: p.fileName,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* カテゴリ選択 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DISPLAY_CATEGORIES.map(({ cat, label }) => (
          <button key={cat} type="button" onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              category === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* アップロードボタン群 */}
      <div className="grid grid-cols-2 gap-2">
        <input ref={imgRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
        <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 py-4 text-sm font-medium text-blue-600 active:bg-blue-100 disabled:opacity-50">
          <Camera className="h-5 w-5" />
          {uploading ? "保存中..." : `${IMAGE_CATEGORY_LABEL[category]}を追加`}
        </button>

        <input ref={pdfRef} type="file" accept="application/pdf,image/*" className="hidden"
          onChange={e => e.target.files?.[0] && (
            e.target.files[0].type === "application/pdf" ? handlePdfFile(e.target.files[0]) : handleImageFile(e.target.files[0])
          )} />
        <button type="button" onClick={() => pdfRef.current?.click()} disabled={uploading}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-4 text-sm font-medium text-gray-600 active:bg-gray-100 disabled:opacity-50">
          <FileText className="h-5 w-5" />
          図面・PDFを追加
        </button>
      </div>

      {/* カテゴリ別グリッド */}
      {DISPLAY_CATEGORIES.map(({ cat, label, color }) => {
        const photos = allPhotos.filter(p => p.category === cat);
        if (photos.length === 0) return null;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", color)}>{label}</span>
              <span className="text-xs text-gray-400">{photos.length}件</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map(photo => (
                <div key={photo.id}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer"
                  onClick={() => !photo.isPdf && setLightbox({ url: photo.image_url, title: label })}>
                  {photo.isPdf ? (
                    <a href={photo.image_url} target="_blank" rel="noopener noreferrer"
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-500 active:bg-gray-200"
                      onClick={e => e.stopPropagation()}>
                      <FileText className="h-8 w-8 text-gray-400" />
                      <span className="text-[9px] text-gray-400 px-1 truncate w-full text-center">
                        {(photo as { fileName?: string }).fileName ?? "PDF"}
                      </span>
                    </a>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.image_url} alt={label}
                        className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 group-active:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                      </div>
                    </>
                  )}
                  <button type="button" onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                    className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {allPhotos.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Plus className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">写真・図面をここに追加できます</p>
        </div>
      )}

      {/* ライトボックス */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/20 active:bg-white/30">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.title}
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">{lightbox.title}</p>
        </div>
      )}
    </div>
  );
}
