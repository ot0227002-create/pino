"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProfitCard } from "@/components/ui/ProfitCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusChangeSheet } from "@/components/project/StatusChangeSheet";
import { PhotoUpload } from "@/components/project/PhotoUpload";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import { formatCurrency } from "@/lib/profit";
import { cn } from "@/lib/utils";
import {
  WORK_TYPE_LABEL,
  SALES_STATUS_LABEL,
  SALES_STATUS_ORDER,
  type SalesStatus,
  type ProjectWithDetails,
  type ProjectImage,
} from "@/types";

type Tab = "sales" | "construction" | "profit" | "photos";

export function ProjectDetailClient({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  async function loadProject() {
    setLoading(true);
    try {
      if (!hasSupabase) {
        const mock = getProjectWithDetails(id);
        setProject(mock ?? null);
        return;
      }

      const { data: p, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const [{ data: construction }, { data: images }] = await Promise.all([
        supabase
          .from("construction_details")
          .select("*")
          .eq("project_id", id)
          .maybeSingle(),
        supabase
          .from("project_images")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
      ]);

      const profit = construction ? calcProfit(construction) : undefined;
      setProject({ ...p, construction: construction ?? undefined, images: images ?? [], profit });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: SalesStatus) {
    if (!project) return;
    if (hasSupabase) {
      await supabase
        .from("projects")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
    }
    setProject((prev) => prev ? { ...prev, status: newStatus } : prev);
    setShowStatusSheet(false);
  }

  function handleImagesChange(images: ProjectImage[]) {
    setProject((prev) => prev ? { ...prev, images } : prev);
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
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-safe-top">
          <div className="flex items-center justify-between h-14">
            <Link href="/projects" className="flex items-center gap-1 text-blue-600">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">一覧</span>
            </Link>
            <h1 className="text-base font-bold text-gray-900 truncate max-w-[160px]">
              {project.customer_name}
            </h1>
            <Link
              href={`/projects/${id}/edit`}
              className="flex items-center gap-1 text-gray-500"
            >
              <Edit3 className="h-4 w-4" />
              <span className="text-sm">編集</span>
            </Link>
          </div>
        </header>

        {/* サマリーカード */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={project.status} />
                <span className="text-xs text-gray-400">
                  {WORK_TYPE_LABEL[project.work_type]}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`tel:${project.phone}`} className="text-blue-600">
                    {project.phone}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate">{project.address}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowStatusSheet(true)}
            className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-medium text-blue-700"
          >
            ステータスを変更
          </button>
        </div>

        {/* 営業進捗ステップバー */}
        <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-2.5">
          <div className="flex gap-0.5 mb-1.5">
            {SALES_STATUS_ORDER.map((step, idx) => {
              const cur = SALES_STATUS_ORDER.indexOf(project.status);
              return (
                <div key={step} className={`flex-1 h-1.5 rounded-full transition-colors ${
                  idx < cur ? "bg-blue-400" : idx === cur ? "bg-blue-600" : "bg-gray-200"
                }`} />
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              ステップ {SALES_STATUS_ORDER.indexOf(project.status) + 1}/{SALES_STATUS_ORDER.length}
            </span>
            <span className="text-xs font-semibold text-blue-700">
              {SALES_STATUS_LABEL[project.status]}
            </span>
          </div>
        </div>

        {/* タブ */}
        <div className="sticky top-14 z-10 bg-white border-b border-gray-200">
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
            </div>
          )}

          {activeTab === "construction" && (
            <div className="space-y-4">
              {!c ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm mb-3">工事情報が未登録です</p>
                  <Link
                    href={`/projects/${id}/edit`}
                    className="text-blue-600 text-sm font-medium"
                  >
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
                  <Section title="施工">
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
        </main>
      </div>

      {showStatusSheet && (
        <StatusChangeSheet
          current={project.status}
          onSelect={handleStatusChange}
          onClose={() => setShowStatusSheet(false)}
        />
      )}
    </>
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
