"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, LogOut, Target, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ProjectCard } from "@/components/project/ProjectCard";
import { StatusFilter } from "@/components/project/StatusFilter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import type { ProjectWithDetails, SalesStatus, WorkType } from "@/types";

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  reform: "リフォーム", exterior: "外構", interior: "内装",
};
const WORK_TYPES: WorkType[] = ["reform", "exterior", "interior"];
const TYPE_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

function fmtM(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return `¥${n.toLocaleString()}`;
}

// ──────────────────────────────────────────────
export function ProjectListClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SalesStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false); // mobile collapse

  // 目標利益（localStorage 永続化）
  const [goalInput, setGoalInput] = useState("");
  const [goal, setGoal] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem("profitGoal");
    if (saved) { setGoal(Number(saved)); setGoalInput(saved); }
  }, []);

  function applyGoal() {
    const v = Number(goalInput.replace(/,/g, "").replace(/万/g, "0000"));
    if (!isNaN(v) && v >= 0) {
      setGoal(v);
      localStorage.setItem("profitGoal", String(v));
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      if (!hasSupabase) { setProjects(getProjectsWithDetails()); return; }
      const { data: projectData, error } = await supabase
        .from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = projectData.map((p: { id: string }) => p.id);
      const [{ data: constructions }, { data: images }] = await Promise.all([
        supabase.from("construction_details").select("*").in("project_id", ids),
        supabase.from("project_images").select("*").in("project_id", ids),
      ]);
      const combined: ProjectWithDetails[] = projectData.map((p: ProjectWithDetails) => {
        const construction = constructions?.find((c: { project_id: string }) => c.project_id === p.id);
        const projectImages = images?.filter((i: { project_id: string }) => i.project_id === p.id) ?? [];
        const profit = construction ? calcProfit(construction) : undefined;
        return { ...p, construction, images: projectImages, profit };
      });
      setProjects(combined);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => projects.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = query.toLowerCase();
    const matchQuery = !q || p.customer_name.toLowerCase().includes(q)
      || p.address.toLowerCase().includes(q) || p.phone.includes(q);
    return matchStatus && matchQuery;
  }), [projects, statusFilter, query]);

  const counts = useMemo(() => {
    const result: Partial<Record<SalesStatus | "all", number>> = { all: projects.length };
    projects.forEach((p) => { result[p.status] = (result[p.status] ?? 0) + 1; });
    return result;
  }, [projects]);

  // ── サマリー計算 ──
  const activeProjects = useMemo(() =>
    projects.filter(p => p.profit && p.profit.contract_amount > 0
      && ["completed", "in_progress", "contracted"].includes(p.status)),
  [projects]);

  const totalRevenue = useMemo(() =>
    activeProjects.reduce((s, p) => s + (p.profit?.contract_amount ?? 0), 0), [activeProjects]);
  const totalProfit  = useMemo(() =>
    activeProjects.reduce((s, p) => s + (p.profit?.profit ?? 0), 0), [activeProjects]);
  const avgRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const achieveRate = goal > 0 ? Math.min((totalProfit / goal) * 100, 100) : 0;

  // 工種別ミニグラフデータ
  const typeChartData = useMemo(() =>
    WORK_TYPES.map((wt, i) => {
      const ps = activeProjects.filter(p => p.work_type === wt);
      return {
        name: WORK_TYPE_LABEL[wt],
        profit: ps.reduce((s, p) => s + (p.profit?.profit ?? 0), 0),
        color: TYPE_COLORS[i],
      };
    }).filter(d => d.profit > 0),
  [activeProjects]);

  // ── サマリーパネル（共通コンテンツ）──
  const SummaryPanel = () => (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-blue-400 font-semibold uppercase">売上合計</p>
          <p className="text-base font-bold text-blue-700">{fmtM(totalRevenue)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase">利益合計</p>
          <p className="text-base font-bold text-emerald-700">{fmtM(totalProfit)}</p>
          <p className="text-[10px] text-emerald-500">{avgRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* 目標設定 */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-gray-400" />
          <p className="text-xs font-semibold text-gray-600">今月の目標利益</p>
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            onBlur={applyGoal}
            onKeyDown={e => e.key === "Enter" && applyGoal()}
            placeholder="例: 500000"
            className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <button onClick={applyGoal}
            className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-medium shrink-0">
            設定
          </button>
        </div>
        {/* 達成率バー */}
        {goal > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400">達成率</p>
              <p className={`text-xs font-bold ${achieveRate >= 100 ? "text-emerald-600" : achieveRate >= 70 ? "text-blue-600" : "text-amber-500"}`}>
                {achieveRate.toFixed(0)}%
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  achieveRate >= 100 ? "bg-emerald-500" : achieveRate >= 70 ? "bg-blue-500" : "bg-amber-400"
                }`}
                style={{ width: `${achieveRate}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 text-right">
              目標 {fmtM(goal)} / 現在 {fmtM(totalProfit)}
            </p>
          </div>
        )}
      </div>

      {/* ミニグラフ：工種別利益 */}
      {typeChartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">工種別 利益</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={typeChartData} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => fmtM(v)}
                contentStyle={{ fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
              />
              <Bar dataKey="profit" name="利益" radius={[3, 3, 0, 0]}>
                {typeChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 案件数 */}
      <p className="text-xs text-gray-400 text-center">{projects.length}件の案件</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-bold text-gray-900">案件一覧</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout}
              className="flex items-center justify-center rounded-lg p-2 text-gray-400 active:text-gray-600"
              aria-label="ログアウト">
              <LogOut className="h-5 w-5" />
            </button>
            <Link href="/projects/new"
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" />新規
            </Link>
          </div>
        </div>
        {/* 検索 */}
        <div className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="顧客名・住所・電話番号で検索"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="pb-3">
          <StatusFilter selected={statusFilter} onChange={setStatusFilter} counts={counts} />
        </div>
      </header>

      {/* ── モバイル: サマリー折りたたみ ── */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4">
        <button onClick={() => setSummaryOpen(v => !v)}
          className="w-full flex items-center justify-between py-3 text-sm font-semibold text-gray-700">
          <span>📊 サマリー {goal > 0 ? `— 達成率 ${achieveRate.toFixed(0)}%` : ""}</span>
          {summaryOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {summaryOpen && (
          <div className="pb-4">
            <SummaryPanel />
          </div>
        )}
      </div>

      {/* ── デスクトップ: 2カラム ── */}
      <div className="flex gap-0">
        {/* 左パネル（デスクトップのみ） */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-200 bg-white sticky top-[112px] self-start h-[calc(100vh-112px)] overflow-y-auto p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">📊 サマリー</h2>
          <SummaryPanel />
        </aside>

        {/* 案件リスト */}
        <main className="flex-1 px-4 py-4 space-y-3 pb-36">
          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-sm">該当する案件がありません</p>
            </div>
          ) : (
            filtered.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </main>
      </div>

      {/* 浮動 + ボタン */}
      <Link href="/projects/new"
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-xl shadow-blue-200 active:scale-95 transition-transform"
        aria-label="新規案件">
        <Plus className="h-6 w-6 text-white" />
      </Link>
    </div>
  );
}
