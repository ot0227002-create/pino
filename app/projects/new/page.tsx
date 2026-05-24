"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import {
  SALES_STATUS_LABEL,
  SALES_STATUS_ORDER,
  WORK_TYPE_LABEL,
  type SalesStatus,
  type WorkType,
} from "@/types";

const WORK_TYPES: WorkType[] = ["reform", "exterior", "interior"];

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    memo: "",
    status: "new_inquiry" as SalesStatus,
    work_type: "reform" as WorkType,
    next_action_date: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Supabase insert
    await new Promise((r) => setTimeout(r, 600));
    router.push("/projects");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <Link href="/projects" className="flex items-center gap-1 text-blue-600">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">キャンセル</span>
          </Link>
          <h1 className="text-base font-bold text-gray-900">新規案件</h1>
          <button
            form="new-project-form"
            type="submit"
            disabled={saving || !form.customer_name}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            保存
          </button>
        </div>
      </header>

      <form
        id="new-project-form"
        onSubmit={handleSubmit}
        className="px-4 py-4 pb-24 space-y-5"
      >
        {/* 顧客情報 */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              顧客情報
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            <FieldRow label="顧客名 *">
              <input
                required
                type="text"
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                placeholder="田中 一郎"
                className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
              />
            </FieldRow>
            <FieldRow label="電話番号">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="090-0000-0000"
                className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
              />
            </FieldRow>
            <FieldRow label="施工場所">
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="東京都○○区..."
                className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
              />
            </FieldRow>
          </div>
        </section>

        {/* 工種 */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 px-1">工種</p>
          <div className="flex gap-2">
            {WORK_TYPES.map((wt) => (
              <button
                key={wt}
                type="button"
                onClick={() => set("work_type", wt)}
                className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                  form.work_type === wt
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {WORK_TYPE_LABEL[wt]}
              </button>
            ))}
          </div>
        </section>

        {/* ステータス */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 px-1">営業ステータス</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as SalesStatus)}
              className="w-full px-4 py-3.5 text-sm text-gray-900 bg-transparent focus:outline-none"
            >
              {SALES_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SALES_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 次回アクション */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              スケジュール
            </p>
          </div>
          <FieldRow label="次回アクション日">
            <input
              type="date"
              value={form.next_action_date}
              onChange={(e) => set("next_action_date", e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
        </section>

        {/* メモ */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              メモ
            </p>
          </div>
          <div className="px-4 py-3">
            <textarea
              value={form.memo}
              onChange={(e) => set("memo", e.target.value)}
              placeholder="お客様からの要望、現場メモなど..."
              rows={4}
              className="w-full bg-transparent text-sm text-gray-900 resize-none focus:outline-none placeholder:text-gray-300"
            />
          </div>
        </section>
      </form>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
