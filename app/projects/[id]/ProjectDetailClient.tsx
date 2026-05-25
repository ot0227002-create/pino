"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Camera,
  TrendingUp,
  Edit3,
  CheckSquare,
  Square,
  Trash2,
  Wand2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProfitCard } from "@/components/ui/ProfitCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusChangeSheet } from "@/components/project/StatusChangeSheet";
import { PhotoUpload } from "@/components/project/PhotoUpload";
import { lsGetProject, lsUpdateProject, lsDeleteProject } from "@/lib/local-store";
import { formatCurrency } from "@/lib/profit";
import { cn } from "@/lib/utils";
import {
  WORK_TYPE_LABEL,
  SALES_STATUS_LABEL,
  SALES_STATUS_ORDER,
  type SalesStatus,
  type ProjectWithDetails,
  type ProjectImage,
  type WorkItem,
} from "@/types";

type Tab = "sales" | "construction" | "profit" | "photos";

export function ProjectDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  async function loadProject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 503) {
        setProject(lsGetProject(id) ?? null);
        return;
      }
      if (res.status === 404) { setProject(null); return; }
      if (!res.ok) throw new Error("Failed to fetch project");
      const data = await res.json();
      setProject(data);
    } catch (e) {
      console.error(e);
      setProject(lsGetProject(id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: SalesStatus) {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: { status: newStatus } }),
      });
      if (res.status === 503) lsUpdateProject(id, { status: newStatus });
    } catch {
      lsUpdateProject(id, { status: newStatus });
    }
    setProject((prev) => prev ? { ...prev, status: newStatus } : prev);
    setShowStatusSheet(false);
  }

  function handleImagesChange(images: ProjectImage[]) {
    setProject((prev) => prev ? { ...prev, images } : prev);
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.status === 503) lsDeleteProject(id);
      else if (!res.ok) throw new Error("Delete failed");
      router.push("/projects");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center">
          <Link href="/projects" className="flex items-center gap-1 text-blue-600">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">一覧</span>
          </Link>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">案件が見つかりません</p>
      </div>
    );
  }

  const c = project.construction;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "sales", label: "営業", icon: <FileText className="h-4 w-4" /> },
    { key: "construction", label: "工事", icon: <Calendar className="h-4 w-4" /> },
    { key: "profit", label: "利益", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "photos", label: "写真", icon: <Camera className="h-4 w-4" /> },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* ── ヘッダー ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 pt-safe-top">
          <div className="flex items-center justify-between h-14">
            <Link href="/projects" className="flex items-center gap-1 text-blue-600">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">一覧</span>
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-base font-bold text-gray-900 truncate max-w-[160px] mx-auto">
                {project.customer_name}
              </h1>
              <p className="text-[10px] text-gray-400 leading-tight">
                {WORK_TYPE_LABEL[project.work_type]} · <span className="font-semibold">{SALES_STATUS_LABEL[project.status]}</span>
              </p>
            </div>
            <Link
              href={`/projects/${id}/edit`}
              className="flex items-center gap-1 text-gray-500"
            >
              <Edit3 className="h-4 w-4" />
              <span className="text-sm">編集</span>
            </Link>
          </div>
        </header>

        {/* ── タブ（ヘッダー直下に移動） ── */}
        <div className="sticky top-14 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                  activeTab === t.key
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-400"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── サマリーカード（スクロールエリア） ── */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={project.status} />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              <a href={`tel:${project.phone}`} className="text-blue-600">{project.phone}</a>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-blue-600 underline truncate"
              >
                {project.address}
              </a>
            </div>
          </div>
          {/* 進捗バー + ステータス変更 */}
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex-1 flex gap-0.5">
              {SALES_STATUS_ORDER.map((step, idx) => {
                const cur = SALES_STATUS_ORDER.indexOf(project.status);
                return (
                  <div key={step} className={`flex-1 h-1.5 rounded-full transition-colors ${
                    idx < cur ? "bg-blue-400" : idx === cur ? "bg-blue-600" : "bg-gray-200"
                  }`} />
                );
              })}
            </div>
            <button
              onClick={() => setShowStatusSheet(true)}
              className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 active:bg-blue-100"
            >
              変更
            </button>
          </div>
        </div>

        <main className="px-4 py-4 pb-24">
          {activeTab === "sales" && (
            <div className="space-y-4">
              <Section title="接触履歴">
                <Row label="最終接触日" value={project.last_contact_date ?? "—"} />
                <Row
                  label="次回アクション日"
                  value={project.next_action_date ?? "—"}
                  highlight={!!project.next_action_date}
                />
              </Section>
              {project.memo && (
                <Section title="メモ">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {project.memo}
                  </p>
                </Section>
              )}
              <AiEmailComposer project={project} />
            </div>
          )}

          {activeTab === "construction" && (
            <div className="space-y-4">
              {/* 工事項目リスト */}
              {(c?.work_items ?? []).length > 0 ? (
                <WorkItemsDisplay items={c!.work_items!} />
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-5 text-center text-gray-400">
                  <p className="text-2xl mb-1">📋</p>
                  <p className="text-sm mb-2">工事項目が登録されていません</p>
                  <Link href={`/projects/${id}/edit`} className="text-blue-600 text-sm font-semibold">
                    編集で追加 →
                  </Link>
                </div>
              )}

              {!c ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm mb-3">工事詳細情報が未登録です</p>
                  <Link href={`/projects/${id}/edit`} className="text-blue-600 text-sm font-medium">
                    編集して追加 →
                  </Link>
                </div>
              ) : (
                <>
                  <Section title="契約">
                    <Row
                      label="請負契約書"
                      value={
                        c.is_contracted ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckSquare className="h-4 w-4" />締結済
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Square className="h-4 w-4" />未締結
                          </span>
                        )
                      }
                    />
                    <Row label="契約日" value={c.contract_date ?? "—"} />
                    <Row
                      label="請負金額"
                      value={c.contract_amount ? formatCurrency(c.contract_amount) : "—"}
                    />
                  </Section>
                  <Section title="施工情報">
                    <Row label="施工内容" value={c.description ?? "—"} />
                    <Row label="工期" value={c.construction_period ?? "—"} />
                    <Row label="着工日" value={c.start_date ?? "—"} />
                    <Row label="完工予定日" value={c.planned_end_date ?? "—"} />
                    <Row label="完成立会い日" value={c.completion_date ?? "—"} />
                  </Section>
                  {c.site_memo && (
                    <Section title="現場状況メモ">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.site_memo}</p>
                    </Section>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "profit" && (
            <div className="space-y-4">
              {!project.profit || project.profit.contract_amount === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm mb-3">請負金額が未設定です</p>
                  <Link
                    href={`/projects/${id}/edit`}
                    className="text-blue-600 text-sm font-medium"
                  >
                    編集して追加 →
                  </Link>
                </div>
              ) : (
                <>
                  <ProfitCard profit={project.profit} />
                  <Section title="原価内訳">
                    <Row
                      label="下請支払予定"
                      value={c?.subcontractor_cost ? formatCurrency(c.subcontractor_cost) : "—"}
                    />
                    <Row
                      label="材料費"
                      value={c?.material_cost ? formatCurrency(c.material_cost) : "—"}
                    />
                    <Row
                      label="その他経費"
                      value={c?.other_cost ? formatCurrency(c.other_cost) : "—"}
                    />
                    <div className="border-t border-gray-100 pt-2 mt-1">
                      <Row
                        label="原価合計"
                        value={formatCurrency(project.profit.total_cost)}
                        bold
                      />
                    </div>
                  </Section>
                </>
              )}
            </div>
          )}

          {activeTab === "photos" && (
            <PhotoUpload
              projectId={id}
              images={project.images ?? []}
              onChange={handleImagesChange}
            />
          )}

          {/* 削除ボタン */}
          <div className="pt-6 pb-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-bold active:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              この案件を削除する
            </button>
          </div>
        </main>
      </div>

      {showStatusSheet && (
        <StatusChangeSheet
          current={project.status}
          onSelect={handleStatusChange}
          onClose={() => setShowStatusSheet(false)}
        />
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">案件を削除しますか？</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-gray-700">{project.customer_name}</span>様の案件データがすべて削除されます。この操作は取り消せません。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3.5 rounded-xl bg-red-500 text-sm font-bold text-white active:bg-red-600"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────
// AI メール生成ロジック
// ────────────────────────────────────────────────────
function generateEmailText(params: {
  customerName: string;
  status: SalesStatus;
  workType: string;
  description: string | null;
  startDate: string | null;
  plannedEndDate: string | null;
  pastEmail: string;
  instruction: string;
  signature: string;
}): string {
  const { customerName, status, workType, description, startDate, pastEmail, instruction, signature } = params;
  const workLabel = WORK_TYPE_LABEL[params.workType as keyof typeof WORK_TYPE_LABEL] ?? workType;

  // 口調検出（敬語 vs カジュアル）
  const formalHits = (pastEmail.match(/ございます|いたします|誠に|拝察|御社|いただき/g) ?? []).length;
  const casualHits = (pastEmail.match(/よろしく！|ですね！|ー！|だよ|じゃん/g) ?? []).length;
  const greeting = formalHits >= casualHits
    ? "平素より大変お世話になっております。"
    : "いつもお世話になっております。";

  const statusCtx: Partial<Record<SalesStatus, string>> = {
    new_inquiry: `この度は${workLabel}工事についてお問い合わせいただき、誠にありがとうございます。`,
    survey_scheduled: "現地調査のご予約をいただき、ありがとうございます。",
    survey_done: "先日は現地調査にご協力いただき、誠にありがとうございました。",
    estimating: description ? `${description}のお見積もりを現在作成中でございます。` : `${workLabel}工事のお見積もりを作成しております。`,
    estimate_sent: "先日お送りしましたお見積もりにつきまして、ご確認いただけましたでしょうか。",
    considering: "ご検討中のところ恐れ入りますが、ご連絡申し上げます。",
    contracted: "この度はご契約いただき、誠にありがとうございます。",
    in_progress: description ? `現在、${description}の工事を鋭意進めております。` : "現在、工事を進めさせていただいております。",
    completed: `この度は${workLabel}工事が無事に完了いたしました。`,
  };

  let body: string;
  if (!instruction.trim()) {
    body = "ご不明な点やご要望がございましたら、いつでもお気軽にご連絡ください。\n\n今後ともどうぞよろしくお願いいたします。";
  } else {
    const kw = instruction;
    if (/時間.*変更|変更.*時間|日程.*変更|変更.*日程|リスケ|スケジュール変更/.test(kw)) {
      const what = /現調|現地調査/.test(kw) ? "現地調査" : /見積/.test(kw) ? "お見積もりのご説明" : "打ち合わせ";
      body = `${what}の日程変更についてご相談したくご連絡いたしました。\n\n${kw}をお願いできますでしょうか。\n\nお忙しい中恐れ入りますが、ご都合のほどをお知らせいただけますと幸いです。`;
    } else if (/追加.*見積|見積.*追加|追加工事/.test(kw)) {
      body = `${description ? `${description}の工事に関しまして` : "工事に関しまして"}、追加工事のお見積もりをご用意いたしましたのでご確認ください。\n\n${kw}\n\nご不明な点がございましたら、お気軽にお申し付けください。`;
    } else if (/見積|お見積/.test(kw)) {
      body = `${description ? `${description}の` : ""}お見積もりについてご連絡いたします。\n\n${kw}\n\nご確認のほど、よろしくお願いいたします。`;
    } else if (/着工|工事開始|スタート/.test(kw)) {
      const dateInfo = startDate ? `着工予定日は ${startDate} を予定しております。` : "着工日程は改めてご連絡いたします。";
      body = `工事着工についてご連絡申し上げます。\n\n${kw}\n\n${dateInfo}\n\n工事期間中はご不便をおかけすることがございますが、何卒よろしくお願いいたします。`;
    } else if (/完工|完成|竣工|引き渡し/.test(kw)) {
      body = `${description ? `${description}の` : ""}工事についてご連絡申し上げます。\n\n${kw}\n\n改めてご依頼いただき、誠にありがとうございました。何かお気づきの点がございましたら、いつでもご連絡ください。`;
    } else if (/確認|チェック/.test(kw)) {
      body = `${kw}について、ご確認をお願いしたくご連絡いたしました。\n\nご確認のほど、よろしくお願いいたします。`;
    } else {
      body = `${kw}について、ご連絡申し上げます。\n\nご不明な点がございましたら、お気軽にお申し付けください。`;
    }
  }

  const parts: string[] = [`${customerName}様`, "", greeting];
  const ctx = statusCtx[status];
  if (ctx) parts.push(ctx);
  parts.push("", body, "", "何卒よろしくお願いいたします。");
  if (signature) parts.push("", signature);
  return parts.join("\n");
}

// ────────────────────────────────────────────────────
// AI連絡文作成コンポーネント
// ────────────────────────────────────────────────────
function AiEmailComposer({ project }: { project: ProjectWithDetails }) {
  const [open, setOpen] = useState(false);
  const [pastEmail, setPastEmail] = useState("");
  const [instruction, setInstruction] = useState("");
  const [generated, setGenerated] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signature, setSignature] = useState("");
  const [templates, setTemplates] = useState<{ key: string; name: string; body: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    async function loadSettings() {
      let company = "", person = "", dept = "";
      let tplInquiry = "", tplEstimate = "", tplConstruction = "";
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const s = await res.json();
          company       = s.email_company_name ?? "";
          person        = s.email_person_name ?? "";
          dept          = s.email_department ?? "";
          tplInquiry    = s.email_template_inquiry ?? "";
          tplEstimate   = s.email_template_estimate ?? "";
          tplConstruction = s.email_template_construction ?? "";
        } else {
          throw new Error("API not available");
        }
      } catch {
        company         = localStorage.getItem("emailCompanyName") ?? "";
        person          = localStorage.getItem("emailPersonName") ?? "";
        dept            = localStorage.getItem("emailDepartment") ?? "";
        tplInquiry      = localStorage.getItem("emailTemplate_inquiry") ?? "";
        tplEstimate     = localStorage.getItem("emailTemplate_estimate") ?? "";
        tplConstruction = localStorage.getItem("emailTemplate_construction") ?? "";
      }
      const sigParts = [person + (dept ? `（${dept}）` : ""), company].filter(Boolean);
      setSignature(sigParts.length ? ["---", ...sigParts].join("\n") : "");
      const names = ["お問い合わせ後", "現調・見積提出時", "着工・完工時"];
      setTemplates(
        [tplInquiry, tplEstimate, tplConstruction]
          .map((body, i) => ({ key: ["inquiry", "estimate", "construction"][i], name: names[i], body }))
          .filter(t => t.body)
      );
    }
    loadSettings();
  }, [open]);

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => {
      setGenerated(generateEmailText({
        customerName: project.customer_name,
        status: project.status,
        workType: project.work_type,
        description: project.construction?.description ?? null,
        startDate: project.construction?.start_date ?? null,
        plannedEndDate: project.construction?.planned_end_date ?? null,
        pastEmail,
        instruction,
        signature,
      }));
      setGenerating(false);
    }, 700);
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(generated); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 active:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-bold text-indigo-900">AI連絡文作成</p>
          <span className="text-[9px] bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5 font-bold tracking-wide">AI</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-indigo-400" />
          : <ChevronDown className="h-4 w-4 text-indigo-400" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-indigo-100">
          {/* 宛先プレビュー */}
          <div className="flex items-center gap-2 text-sm bg-indigo-50 rounded-xl px-3 py-2">
            <span className="text-xs text-indigo-400 font-semibold shrink-0">宛先</span>
            <span className="font-bold text-indigo-900">{project.customer_name}様</span>
            <span className="text-[10px] text-indigo-400 ml-auto">{WORK_TYPE_LABEL[project.work_type]} / {SALES_STATUS_LABEL[project.status]}</span>
          </div>

          {/* テンプレート一覧 */}
          {templates.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 font-semibold mb-2 uppercase tracking-wide">テンプレートを過去文欄に転写</p>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <button key={t.key} onClick={() => setPastEmail(t.body)}
                    className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-3 py-1.5 active:bg-indigo-100 font-medium">
                    📄 {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 過去のやり取り欄 */}
          <div>
            <label className="text-[11px] text-gray-400 font-semibold block mb-1.5 uppercase tracking-wide">
              過去のメール・LINEのやり取り（口調の参考用）
            </label>
            <textarea
              value={pastEmail}
              onChange={e => setPastEmail(e.target.value)}
              placeholder="過去にお客様とやり取りしたメールやLINEをここに貼り付けてください（口調を参考にします）"
              rows={3}
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 placeholder:text-gray-300"
            />
          </div>

          {/* 指示欄 */}
          <div>
            <label className="text-[11px] text-gray-400 font-semibold block mb-1.5 uppercase tracking-wide">
              今回の要件・指示
            </label>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="例: 明日の現調を14時から16時に変更してほしい"
              rows={2}
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 placeholder:text-gray-300"
            />
          </div>

          {/* 生成ボタン */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-md shadow-indigo-200 active:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generating ? (
              <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...</>
            ) : (
              <><Wand2 className="h-4 w-4" />AI文章を生成する</>
            )}
          </button>

          {/* 生成結果 */}
          {generated && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">生成された文章</p>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                    copied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
                  }`}
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5" />コピー済！</>
                    : <><Copy className="h-3.5 w-3.5" />コピー</>}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{generated}</p>
              </div>
              <p className="text-[10px] text-gray-400 text-center">LINEやメールアプリに貼り付けて使えます</p>
            </div>
          )}

          {/* 署名プレビュー */}
          {!generated && signature && (
            <div className="text-[10px] text-gray-400 border-t border-indigo-100 pt-2">
              署名: {signature.replace(/^---\n/, "").split("\n").join(" / ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="px-4 py-3 space-y-2.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span
        className={cn(
          "text-sm text-right",
          bold ? "font-bold text-gray-900" : "text-gray-700",
          highlight && "text-blue-600 font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────
// 工事項目表示コンポーネント
// ────────────────────────────────────────────────────
function WorkItemsDisplay({ items }: { items: WorkItem[] }) {
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">工事項目リスト</p>
        <span className="text-[10px] bg-blue-500 text-white rounded-full px-2 py-0.5 font-bold">
          {items.filter(i => i.name.trim()).length}件
        </span>
      </div>
      {categories.map((category) => {
        const catItems = items.filter((i) => i.category === category);
        return (
          <div key={category} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* カテゴリヘッダー */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center gap-2">
              <span className="text-sm font-bold text-blue-900">🏷 {category}</span>
              <span className="text-[10px] text-blue-500 font-semibold">{catItems.length}件</span>
            </div>
            {/* 項目リスト */}
            <div className="divide-y divide-gray-50">
              {catItems.map((item, idx) => (
                <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-[10px] text-gray-400 font-bold w-4 shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{item.name || "—"}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
