"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { WorkItem } from "@/types";

// ── プリセット定義 ───────────────────────────────────────

const PRESET_CATEGORIES = ["外構", "リフォーム", "内装", "屋根・外壁", "解体", "その他"] as const;

const PRESET_ITEMS: Record<string, string[]> = {
  外構: [
    "カーポート",
    "ブロック積み",
    "フェンス",
    "人工芝",
    "土間コンクリート",
    "ポスト・インターホン",
    "植栽",
    "砂利敷き",
    "駐車場舗装",
    "境界工事",
    "門扉・門柱",
    "アプローチ",
  ],
  リフォーム: [
    "キッチン",
    "浴室（ユニットバス）",
    "洗面台",
    "トイレ",
    "窓・サッシ",
    "床（フローリング）",
    "壁紙（クロス）",
    "収納・クローゼット",
    "間取り変更",
  ],
  内装: [
    "フローリング",
    "クロス張替え",
    "天井仕上げ",
    "照明設置",
    "建具（ドア・引戸）",
    "階段",
  ],
  "屋根・外壁": [
    "屋根塗装",
    "屋根葺き替え",
    "外壁塗装",
    "外壁張替え",
    "雨樋",
    "防水工事",
  ],
  解体: [
    "解体工事",
    "残材処分",
    "基礎工事",
    "土工事",
  ],
  その他: [],
};

// ── ユーティリティ ──────────────────────────────────────

function genId(): string {
  return `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Props ───────────────────────────────────────────────

interface Props {
  items: WorkItem[];
  onChange: (items: WorkItem[]) => void;
}

// ── メインコンポーネント ─────────────────────────────────

export function WorkItemsEditor({ items, onChange }: Props) {
  const [selectedCat, setSelectedCat] = useState<string>(PRESET_CATEGORIES[0]);
  const [customCat, setCustomCat] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // カテゴリ一覧（登録済み + 未登録は後から追加）
  const usedCategories = [...new Set(items.map((i) => i.category))];

  function toggleCollapse(cat: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function addItemToCategory(category: string, name = "", detail = "") {
    onChange([...items, { id: genId(), category, name, detail }]);
  }

  function updateItem(id: string, field: "name" | "detail", value: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function handleAddCategory() {
    const cat = showCustomInput ? customCat.trim() : selectedCat;
    if (!cat) return;
    addItemToCategory(cat);
    if (showCustomInput) {
      setCustomCat("");
      setShowCustomInput(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── 登録済みカテゴリ別アイテム ── */}
      {usedCategories.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          <p className="text-2xl mb-2">📋</p>
          <p>工事項目がまだありません</p>
          <p className="text-xs mt-1">下のボタンで大枠カテゴリを追加してください</p>
        </div>
      )}

      {usedCategories.map((category) => {
        const catItems = items.filter((i) => i.category === category);
        const isCollapsed = collapsedCats.has(category);
        const filled = catItems.filter((i) => i.name.trim()).length;

        return (
          <div key={category} className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
            {/* カテゴリヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <button
                type="button"
                onClick={() => toggleCollapse(category)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <span className="text-sm font-bold text-blue-900">🏷 {category}</span>
                <span className="text-[10px] bg-blue-500 text-white rounded-full px-2 py-0.5 font-bold">
                  {filled}/{catItems.length}件
                </span>
                {isCollapsed
                  ? <ChevronDown className="h-4 w-4 text-blue-400 ml-auto" />
                  : <ChevronUp className="h-4 w-4 text-blue-400 ml-auto" />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="divide-y divide-gray-50">
                {/* アイテム一覧 */}
                {catItems.map((item, idx) => (
                  <div key={item.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-bold w-4 shrink-0">{idx + 1}</span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                        placeholder="工事名（例: カーポート）"
                        className="flex-1 text-sm font-medium border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white placeholder:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-300 active:text-red-500 transition-colors shrink-0"
                        aria-label="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="pl-6">
                      <input
                        type="text"
                        value={item.detail}
                        onChange={(e) => updateItem(item.id, "detail", e.target.value)}
                        placeholder="詳細・サイズ・数量など（任意）"
                        className="w-full text-xs border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 text-gray-600 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                ))}

                {/* プリセット項目クイック追加 */}
                {PRESET_ITEMS[category]?.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50/50">
                    <p className="text-[10px] text-gray-400 font-bold mb-2 uppercase tracking-wide">よく使う工事</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_ITEMS[category].map((preset) => {
                        const alreadyAdded = catItems.some((i) => i.name === preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => addItemToCategory(category, preset)}
                            className={`text-xs rounded-full px-2.5 py-1 border font-medium transition-colors ${
                              alreadyAdded
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 line-through opacity-50"
                                : "bg-white text-blue-700 border-blue-200 active:bg-blue-50"
                            }`}
                          >
                            {alreadyAdded ? "✓" : "+"} {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* + 項目追加ボタン */}
                <button
                  type="button"
                  onClick={() => addItemToCategory(category)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-blue-500 text-xs font-semibold active:bg-blue-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  「{category}」に項目を追加
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── 大枠カテゴリ追加 ── */}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-4 space-y-3 bg-gray-50/50">
        <p className="text-xs font-bold text-gray-500">＋ 大枠カテゴリを追加</p>

        {/* プリセットカテゴリ */}
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((cat) => {
            const used = usedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setSelectedCat(cat); setShowCustomInput(false); }}
                className={`text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors ${
                  selectedCat === cat && !showCustomInput
                    ? "bg-blue-600 text-white border-blue-600"
                    : used
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {used ? "✓ " : ""}{cat}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className={`text-xs rounded-full px-3 py-1.5 font-semibold border transition-colors ${
              showCustomInput
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            ✏️ カスタム
          </button>
        </div>

        {/* カスタムカテゴリ名入力 */}
        {showCustomInput && (
          <input
            type="text"
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            placeholder="カテゴリ名を入力（例: 給排水, 電気工事）"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            autoFocus
          />
        )}

        <button
          type="button"
          onClick={handleAddCategory}
          className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold active:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {showCustomInput
            ? `「${customCat || "…"}」カテゴリを追加`
            : `「${selectedCat}」カテゴリを追加`}
        </button>
      </div>
    </div>
  );
}
