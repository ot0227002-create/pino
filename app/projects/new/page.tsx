"use client";

export const runtime = "edge";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { lsCreateProject } from "@/lib/local-store";
import {
  SALES_STATUS_LABEL,
  SALES_STATUS_ORDER,
  WORK_TYPE_LABEL,
  type SalesStatus,
  type WorkType,
} from "@/types";

const WORK_TYPES: WorkType[] = ["reform", "exterior", "interior"];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value: key, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return opts;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workType, setWorkType] = useState<WorkType>("reform");
  const [status, setStatus] = useState<SalesStatus>("new_inquiry");
  const [targetMonth, setTargetMonth] = useState(currentMonthKey());
  const [nextActionDate, setNextActionDate] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) return;
    setSaving(true);
    try {
      if (hasSupabase) {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("projects")
          .insert({
            customer_name: customerName,
            phone,
            address,
            work_type: workType,
            status,
            target_month: targetMonth,
            next_action_date: nextActionDate || null,
            memo: memo || null,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (error) throw error;
        router.push(`/projects/${data.id}`);
      } else {
        const created = lsCreateProject({
          customer_name: customerName,
          phone,
          address,
          work_type: workType,
          status,
          target_month: targetMonth,
          next_action_date: nextActionDate || null,
          memo: memo || null,
          last_contact_date: null,
          drawing_url: null,
        });
        router.push(`/projects/${created.id}`);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

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
            disabled={saving || !customerName.trim()}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </header>

      <form
        id="new-project-form"
        onSubmit={handleSubmit}
        className="px-4 py-4 pb-24 space-y-5"
      >
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">顧客情報</p>
          </div>
          <div className="divide-y divide-gray-100">
            <FieldRow label="顧客名 *">
              <input
                required
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="田中 一郎"
                className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
              />
            </FieldRow>
            <FieldRow label="電話番号">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="090-0000-0000"
                className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
              />
            </FieldRow>
            <FieldRow label="施工場所">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="東京都○○区..."
                className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
              />
            </FieldRow>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 px-1">工種</p>
          <div className="flex gap-2">
            {WORK_TYPES.map((wt) => (
              <button
                key={wt}
                type="button"
                onClick={() => setWorkType(wt)}
                className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                  workType === wt
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {WORK_TYPE_LABEL[wt]}
              </button>
            ))}
          </div>
        </section>

        {/* ── 対象月 ── */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 px-1">対象月</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full px-4 py-3.5 text-sm text-gray-900 bg-transparent focus:outline-none"
            >
              {getMonthOptions().map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 px-1">営業ステータス</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SalesStatus)}
              className="w-full px-4 py-3.5 text-sm text-gray-900 bg-transparent focus:outline-none"
            >
              {SALES_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{SALES_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">スケジュール</p>
          </div>
          <FieldRow label="次回アクション日">
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">メモ</p>
          </div>
          <div className="px-4 py-3">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
