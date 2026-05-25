"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { lsGetProject, lsUpdateProject, lsUpsertConstruction } from "@/lib/local-store";
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

// ── チェックリスト定義 ────────────────────────────────
interface CheckItem {
  label: string;       // 表示名
  refKey: string;      // セクションのref key
  icon: string;        // 絵文字
}
const CHECK_ITEMS: CheckItem[] = [
  { label: "顧客名",   refKey: "customer",     icon: "👤" },
  { label: "電話番号", refKey: "customer",     icon: "📞" },
  { label: "施工場所", refKey: "customer",     icon: "📍" },
  { label: "施工内容", refKey: "construction", icon: "🔨" },
  { label: "着工日",   refKey: "construction", icon: "📅" },
  { label: "完工予定", refKey: "construction", icon: "🏁" },
  { label: "請負金額", refKey: "contract",     icon: "💴" },
  { label: "下請費用", refKey: "cost",         icon: "🧾" },
];

export function EditProjectClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [pendingIncomplete, setPendingIncomplete] = useState<string[]>([]);

  // セクションへのスクロール用 ref
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 503) {
        data = lsGetProject(id);
      } else if (res.ok) {
        data = await res.json();
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

  // ── リアルタイム入力状態 ─────────────────────────────
  const checkStatus = useMemo(() => ({
    "顧客名":   customerName.trim().length > 0,
    "電話番号": phone.trim().length > 0,
    "施工場所": address.trim().length > 0,
    "施工内容": description.trim().length > 0,
    "着工日":   startDate.length > 0,
    "完工予定": plannedEndDate.length > 0,
    "請負金額": parseFloat(contractAmount) > 0,
    "下請費用": parseFloat(subcontractorCost) > 0,
  }), [customerName, phone, address, description, startDate, plannedEndDate, contractAmount, subcontractorCost]);

  const scrollToSection = useCallback((refKey: string) => {
    sectionRefs.current[refKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

  async function doSave() {
    setSaving(true);
    const constructionPayload = {
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
    };

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            customer_name: customerName,
            phone,
            address,
            work_type: workType,
            status,
            target_month: targetMonth,
            last_contact_date: lastContactDate || null,
            next_action_date: nextActionDate || null,
            memo: memo || null,
          },
          construction:
            hasConstruction || description || contractAmount || subcontractorCost || materialCost
              ? constructionPayload
              : undefined,
        }),
      });

      if (res.status === 503) {
        // localStorage フォールバック
        lsUpdateProject(id, {
          customer_name: customerName,
          phone,
          address,
          work_type: workType,
          status,
          target_month: targetMonth,
          last_contact_date: lastContactDate || null,
          next_action_date: nextActionDate || null,
          memo: memo || null,
        });
        lsUpsertConstruction({ project_id: id, ...constructionPayload });
      } else if (!res.ok) {
        throw new Error("Save failed");
      }

      router.push(`/projects/${id}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (!customerName.trim()) return;
    // 未入力の重要項目を検出
    const missing = CHECK_ITEMS
      .filter(c => !checkStatus[c.label as keyof typeof checkStatus])
      .map(c => c.icon + " " + c.label);
    if (missing.length > 0) {
      setPendingIncomplete(missing);
      setShowIncompleteModal(true);
      return;
    }
    doSave();
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

      {/* ── 入力チェックリスト（リアルタイム） ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">入力チェック — タップでその欄へ</p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {CHECK_ITEMS.map((item) => {
            const ok = checkStatus[item.label as keyof typeof checkStatus];
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToSection(item.refKey)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold shrink-0 transition-colors ${
                  ok
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                }`}
              >
                {ok
                  ? <CheckCircle2 className="h-3 w-3" />
                  : <AlertCircle className="h-3 w-3" />}
                {item.icon} {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 pb-44 space-y-5">
        {/* ── 顧客情報 ── */}
        <FormSection
          title="顧客情報"
          sectionRef={(el) => { sectionRefs.current["customer"] = el; }}
          doneCount={[customerName, phone, address].filter(v => v.trim().length > 0).length}
          totalCount={3}
        >
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

        {/* ── 施工情報 ── （上位に配置して見落とし防止） */}
        <FormSection
          title="施工情報"
          sectionRef={(el) => { sectionRefs.current["construction"] = el; }}
          doneCount={[description, startDate, plannedEndDate, constructionPeriod].filter(v => v.trim().length > 0).length}
          totalCount={4}
        >
          <FieldRow label="施工内容 ★">
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
          <FieldRow label="着工日 ★">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-right text-gray-900 focus:outline-none"
            />
          </FieldRow>
          <FieldRow label="完工予定日 ★">
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

        {/* ── 契約 ── */}
        <FormSection
          title="契約"
          sectionRef={(el) => { sectionRefs.current["contract"] = el; }}
          doneCount={[contractDate, contractAmount].filter(v => v.trim().length > 0 && (isNaN(Number(v)) || Number(v) > 0)).length + (isContracted ? 1 : 0)}
          totalCount={3}
        >
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-500">請負契約書締結 ★</span>
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
          <FieldRow label="請負金額（円）★">
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
        <FormSection
          title="原価"
          sectionRef={(el) => { sectionRefs.current["cost"] = el; }}
          doneCount={[subcontractorCost, materialCost, otherCost].filter(v => parseFloat(v) > 0).length}
          totalCount={3}
        >
          <FieldRow label="下請支払予定（円）★">
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
                <p className="text-xs font-bold text-gray-900">{formatCurrency(profit.contract_amount)}</p>
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

      {/* ── 未入力確認モーダル ── */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900">未入力の項目があります</h3>
              <p className="text-sm text-gray-500">以下の項目が未入力です。このまま保存しますか？</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {pendingIncomplete.map((item) => (
                <span key={item} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1.5 font-medium">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowIncompleteModal(false)}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50"
              >
                入力に戻る
              </button>
              <button
                onClick={() => { setShowIncompleteModal(false); doSave(); }}
                className="flex-1 py-3.5 rounded-xl bg-blue-600 text-sm font-bold text-white active:bg-blue-700"
              >
                このまま保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormSection({
  title,
  children,
  sectionRef,
  doneCount,
  totalCount,
}: {
  title: string;
  children: React.ReactNode;
  sectionRef?: (el: HTMLDivElement | null) => void;
  doneCount?: number;
  totalCount?: number;
}) {
  const allDone = doneCount !== undefined && totalCount !== undefined && doneCount >= totalCount;
  const hasProgress = doneCount !== undefined && totalCount !== undefined;

  return (
    <div ref={sectionRef} className="bg-white rounded-2xl border border-gray-200 overflow-hidden scroll-mt-32">
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
        allDone ? "bg-emerald-50 border-emerald-100" : hasProgress && doneCount! > 0 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
      }`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${
          allDone ? "text-emerald-700" : "text-gray-500"
        }`}>{title}</p>
        {hasProgress && (
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
            allDone
              ? "bg-emerald-500 text-white"
              : doneCount! > 0
              ? "bg-amber-400 text-white"
              : "bg-gray-200 text-gray-500"
          }`}>
            {allDone ? "✓ 完了" : `${doneCount}/${totalCount}`}
          </span>
        )}
      </div>
      <div className="px-4 py-3 divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const isKey = label.includes("★");
  const displayLabel = label.replace(" ★", "");
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className={`text-sm shrink-0 ${isKey ? "font-semibold text-gray-700" : "text-gray-500"}`}>
        {displayLabel}
        {isKey && <span className="ml-1 text-[9px] text-amber-500 font-bold align-super">必</span>}
      </span>
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
