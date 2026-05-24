"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import {
  IMAGE_CATEGORY_LABEL,
  type ImageCategory,
  type ProjectImage,
} from "@/types";
import { cn } from "@/lib/utils";

const CATEGORIES: ImageCategory[] = ["before", "after", "in_progress", "other"];

interface Props {
  projectId: string;
  images: ProjectImage[];
  onChange: (images: ProjectImage[]) => void;
}

export function PhotoUpload({ projectId, images, onChange }: Props) {
  const [category, setCategory] = useState<ImageCategory>("before");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      let imageUrl = "";

      if (hasSupabase) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${projectId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-images")
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("project-images")
          .getPublicUrl(path);
        imageUrl = publicUrl;

        const { data, error } = await supabase
          .from("project_images")
          .insert({ project_id: projectId, image_url: imageUrl, category })
          .select()
          .single();
        if (error) throw error;
        onChange([data, ...images]);
      } else {
        // モック：ローカルプレビュー
        imageUrl = URL.createObjectURL(file);
        const mock: ProjectImage = {
          id: Date.now().toString(),
          project_id: projectId,
          image_url: imageUrl,
          category,
          created_at: new Date().toISOString(),
        };
        onChange([mock, ...images]);
      }
    } catch (e) {
      console.error(e);
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(img: ProjectImage) {
    if (!confirm("この写真を削除しますか？")) return;
    if (hasSupabase) {
      await supabase.from("project_images").delete().eq("id", img.id);
    }
    onChange(images.filter((i) => i.id !== img.id));
  }

  const grouped = CATEGORIES.reduce<Record<ImageCategory, ProjectImage[]>>(
    (acc, cat) => {
      acc[cat] = images.filter((i) => i.category === cat);
      return acc;
    },
    { before: [], after: [], in_progress: [], other: [] }
  );

  return (
    <div className="space-y-4">
      {/* カテゴリ選択 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              category === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {IMAGE_CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* アップロードボタン */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 py-5 text-sm font-medium text-blue-600 active:bg-blue-100 disabled:opacity-50"
      >
        <Camera className="h-5 w-5" />
        {uploading
          ? "アップロード中..."
          : `${IMAGE_CATEGORY_LABEL[category]}を撮影・追加`}
      </button>

      {/* 写真グリッド（カテゴリ別） */}
      {CATEGORIES.map((cat) => {
        const imgs = grouped[cat];
        if (imgs.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-500 mb-2 px-1">
              {IMAGE_CATEGORY_LABEL[cat]} ({imgs.length}枚)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {imgs.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 group"
                >
                  <Image
                    src={img.image_url}
                    alt={IMAGE_CATEGORY_LABEL[img.category]}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(img)}
                    className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
