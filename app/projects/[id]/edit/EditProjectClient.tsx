"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, TrendingUp } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectWithDetails } from "@/lib/mock-data";
import { calcProfit, formatCurrency, formatRate } from "@/lib/profit";
import {
  SALES_STATUS_LABEL,
  SALES_STATUS_ORDER,
  WORK_TYPE_LABEL,
  type SalesStatus,
  type WorkType,
  type ProjectWithDetails,
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

export function EditProjectClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 案件フォーム
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workType, setWorkType] = useState<WorkType>("reform");
  const [status, setStatus] = useState<SalesStatus>("new_inquiry");
  const [targetMonth, setTargetMonth] = useState(currentMonthKey());
  const [lastContactDate, setLastContactDate] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [memo, setMemo] = useState("");

  // 工事フォーム
  const [description, setDescription] = useState("");
  const [constructionPeriod, setConstructionPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [siteMemo, setSiteMemo] = useState("");
  const [isContracted, setIsContracted] = useState(false);
  const [contractDate, setContractDate] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [subcontractorCost, setSubcontractorCost] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [otherCost, setOtherCost] = useState("");

  const [hasConstruction, setHasConstruction] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      let data: ProjectWithDetails | null | undefined = null;

      if (!hasSupabase) {
        data = getProjectWithDetails(id);
      } else {
        const { data: p } = await supabase.from("projects").select("*").eq("id", id).single();
        const { data: c } = await supabase
          .from("construction_details")
          .select("*")
          .eq("project_id", id)
          .maybeSingle();
        data = p ? { ...p, construction: c ?? undefined } : null;
      }

      if (!data) return;

      setCustomerName(data.customer_name);
      setPhone(data.phone);
      setAddress(data.address);
      setWorkType(data.work_type);
      setStatus(data.status);
      setTargetMonth(data.target_month ?? currentMonthKey());
      setLastContactDate(data.last_contact_date ?? "");
      setNextActionDate(data.next_action_date ?? "");
      setMemo(data.memo ?? "");

      if (data.construction) {
        const c = data.construction;
        setHasConstruction(true);
        setDescription(c.description ?? "");
        setConstructionPeriod(c.construction_period ?? "");
        setStartDate(c.start_date ?? "");
        setPlannedEndDate(c.planned_end_date ?? "");
        setCompletionDate(c.completion_date ?? "");
        setSiteMemo(c.site_memo ?? "");
        setIsContracted(c.is_contracted);
        setContractDate(c.contract_date ?? "");
        setContractAmount(c.contract_amount?.toString() ?? "");
        setSubcontractorCost(c.subcontractor_cost?.toString() ?? "");
        setMaterialCost(c.material_cost?.toString() ?? "");
        setOtherCost(c.other_cost?.toString() ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  const profit = useMemo(() => {
    const amount = parseFloat(contractAmount) || 0;
    const sub = parseFloat(subcontractorCost) || 0;
    const mat = parseFloat(materialCost) || 0;
    const oth = parseFloat(otherCost) || 0;
    return calcProfit({
      contract_amount: amount,
      subcontractor_cost: sub,
      material_cost: mat,
      other_cost: oth,
    } as never);
  }, [contractAmount, subcontractorCost, materialCost, otherCost]);

  async function handleSave() {
    if (!customerName.trim()) return;
    setSaving(true);
    try {
      if (hasSupabase) {
        await supabase.from("projects").update({
          customer_name: customerName,
          phone,
          address,
          work_type: workType,
          status,
          target_month: targetMonth,
          last_contact_date: lastContactDate || null,
          next_action_date: nextActionDate || null,
          memo: memo || null,
          updated_at: new Date().toISOString(),
        }).eq("id", id);

        const constructionPayload = {
          project_id: id,
          description: description || null,
          construction_period: constructionPeriod || null,
          start_date: startDate || null,
          planned_end_date: plannedEndDate || null,
          completion_date: completionDate || null,
          site_memo: siteMemo || null,
          is_contracted: isContracted,
          contract_date: contractDate || null,
          contract_amount: contractAmount ? parseFloat(contractAmount) : null,
          subcontractor_cost: subcontractorCost ? parseFloat(subcontractorCost) : null,
          material_cost: materialCost ? parseFloat(materialCost) : null,
          other_cost: otherCost ? parseFloat(otherCost) : null,
          updated_at: new Date().toISOString(),
        };

        if (hasConstruction) {
          await supabase.from("construction_details")
            .upsert(constructionPayload, { onConflict: "project_id" });
        } else if (
          description || contractAmount || subcontractorCost || materialCost
        ) {
          await supabase.from("construction_details").insert(constructionPayload);
          setHasConstruction(true);
        }
      }

      router.push(`/projects/${id}`);
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center">
          <Link href={`/projects/${id}`} className="flex items-center gap-1 text-blue-600">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">キャンセル</span>
          </Link>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <Link href={`/projects/${id}`} className="flex items-center gap-1 text-blue-600">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">キャンセル</span>
          </Link>
          <h1 className="text-base font-bold text-gray-900">案件編集</h1>
          <button
            onClick={handleSave}
            disabled={saving || !customerName.trim()}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </header>

      <div className="px-4 py-4 pb-44 space-y-5">
        {/* ── 顧客情報 ── */}
        <FormSection title="顧客情報">
          <FieldRow label="顧客名 *">
            <input
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
              placeholder="東京都..."
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
        </FormSection>

        {/* ── 対象月 ── */}
        <div className="space-y-2">
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
        </div>

        {/* ── 工種 ── */}
        <div className="space-y-2">
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
        </div>

        {/* ── ステータス ── */}
        <div className="space-y-2">
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
        </div>

        {/* ── スケジュール ── */}
        <FormSection title="スケジュール">
          <FieldRow label="最終接触日">
            <input
              type="date"
              value={lastContactDate}
              onChange={(e) => setLastContactDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
          <FieldRow label="次回アクション日">
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
        </FormSection>

        {/* ── メモ ── */}
        <FormSection title="メモ">
          <TemplatePicker onSelect={(t) => setMemo(v => v ? v + "\n" + t : t)} />
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="お客様の要望、現場メモなど..."
            rows={3}
            className="w-full bg-transparent text-sm text-gray-900 resize-none focus:outline-none placeholder:text-gray-300"
          />
        </FormSection>

        {/* ── 契約 ── */}
        <FormSection title="契約">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">請負契約書締結</span>
            <button
              type="button"
              onClick={() => setIsContracted((v) => !v)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                isContracted ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  isContracted ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <FieldRow label="契約日">
            <input
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
          <FieldRow label="請負金額（円）">
            <input
              type="number"
              value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
        </FormSection>

        {/* ── 原価 ── */}
        <FormSection title="原価">
          <FieldRow label="下請支払予定（円）">
            <input
              type="number"
              value={subcontractorCost}
              onChange={(e) => setSubcontractorCost(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
          <FieldRow label="材料費（円）">
            <input
              type="number"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
          <FieldRow label="その他経費（円）">
            <input
              type="number"
              value={otherCost}
              onChange={(e) => setOtherCost(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
        </FormSection>

        {/* ── リアルタイム利益計算 ── */}
        {profit.contract_amount > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-100 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              利益シミュレーション（リアルタイム）
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">請負金額</p>
                <p className="text-xs font-bold text-gray-900">
                  {formatCurrency(profit.contract_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">利益額</p>
                <p className={`text-xs font-bold ${profit.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(profit.profit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">利益率</p>
                <p className={`text-xs font-bold ${profit.profit_rate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatRate(profit.profit_rate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 施工情報 ── */}
        <FormSection title="施工情報">
          <FieldRow label="施工内容">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="キッチン・浴室リフォームなど"
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
          <FieldRow label="工期">
            <input
              type="text"
              value={constructionPeriod}
              onChange={(e) => setConstructionPeriod(e.target.value)}
              placeholder="約4週間"
              className="w-full bg-transparent text-sm text-right text-gray-900 focus:outline-none placeholder:text-gray-300"
            />
          </FieldRow>
          <FieldRow label="着工日">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
          <FieldRow label="完工予定日">
            <input
              type="date"
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
          <FieldRow label="完成立会い日">
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
        </FormSection>

        {/* ── 現場メモ ── */}
        <FormSection title="現場状況メモ">
          <TemplatePicker onSelect={(t) => setSiteMemo(v => v ? v + "\n" + t : t)} />
          <textarea
            value={siteMemo}
            onChange={(e) => setSiteMemo(e.target.value)}
            placeholder="現場の状況、進捗など..."
            rows={3}
            className="w-full bg-transparent text-sm text-gray-900 resize-none focus:outline-none placeholder:text-gray-300"
          />
        </FormSection>

        {/* 保存ボタン（下部） */}
        <button
          onClick={handleSave}
          disabled={saving || !customerName.trim()}
          className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-4 py-3 divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const MEMO_TEMPLATES = [
  "不在・留守電",
  "現調完了・見積へ",
  "追加工事発生",
  "完工・引き渡し",
  "工事開始",
  "要確認",
];

function TemplatePicker({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pb-2.5 pt-1">
      {MEMO_TEMPLATES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t)}
          className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 active:bg-blue-100 transition-colors"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
