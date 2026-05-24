"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, LogOut, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Target } from "lucide-react";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { ProjectCard } from "@/components/project/ProjectCard";
import { StatusFilter } from "@/components/project/StatusFilter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { WelcomeModal } from "@/components/ui/WelcomeModal";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import type { ProjectWithDetails, SalesStatus, WorkType } from "@/types";

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  reform: "リフォーム", exterior: "外構", interior: "内装",
};

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getProjMonth(p: ProjectWithDetails) {
  if (p.target_month) return p.target_month;
  return getMonthKey(new Date(p.updated_at ?? p.created_at));
}
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
  // PC左パネル — 月別ダッシュボード
  const nowKey = useMemo(() => getMonthKey(new Date()), []);
  const [pcMonth, setPcMonth] = useState(() => getMonthKey(new Date()));
  const [goalsMap, setGoalsMap] = useState<Record<string, number>>({});
  const [goalInput, setGoalInput] = useState("");

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    localStorage.clear();
    router.push("/login");
  }

  useEffect(() => {
    router.refresh();
    loadProjects();
    // 月別目標をロード
    const goals: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = getMonthKey(d);
      const v = localStorage.getItem(`monthlyGoal_${key}`);
      if (v) goals[key] = Number(v);
    }
    setGoalsMap(goals);
    setGoalInput(goals[getMonthKey(new Date())]?.toString() ?? "");
  }, []);

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
  const totalCostSum = useMemo(() =>
    activeProjects.reduce((s, p) => s + (p.profit?.total_cost ?? 0), 0), [activeProjects]);
  const avgRate = totalCostSum > 0 ? (totalProfit / totalCostSum) * 100 : 0;

  // PC左パネル: 月別計算
  const [pcY, pcM] = pcMonth.split("-").map(Number);
  const pcMonthLabel = `${pcY}年${pcM}月`;
  const pcMonthProjs = useMemo(() =>
    activeProjects.filter(p => getProjMonth(p) === pcMonth), [activeProjects, pcMonth]);
  const pcRevenue = pcMonthProjs.reduce((s, p) => s + (p.profit?.contract_amount ?? 0), 0);
  const pcProfit  = pcMonthProjs.reduce((s, p) => s + (p.profit?.profit ?? 0), 0);
  const pcCost    = pcMonthProjs.reduce((s, p) => s + (p.profit?.total_cost ?? 0), 0);
  const pcRate    = pcCost > 0 ? (pcProfit / pcCost) * 100 : 0;
  const pcGoal    = goalsMap[pcMonth] ?? 0;
  const pcAchievePct = pcGoal > 0 ? (pcProfit / pcGoal) * 100 : 0;
  const pc6MData  = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
      const key = getMonthKey(d);
      const ps = activeProjects.filter(p => getProjMonth(p) === key);
      return {
        month: `${d.getMonth() + 1}月`,
        profit: ps.reduce((s, p) => s + (p.profit?.profit ?? 0), 0),
        goal: goalsMap[key] ?? 0,
        key,
      };
    }), [activeProjects, goalsMap]);

  function pcChangeMonth(delta: number) {
    const d = new Date(pcY, pcM - 1 + delta, 1);
    if (getMonthKey(d) > nowKey) return;
    setPcMonth(getMonthKey(d));
  }
  function pcSaveGoal() {
    const v = Number(goalInput.replace(/[^\d]/g, ""));
    if (!isNaN(v) && v >= 0) {
      setGoalsMap(prev => ({ ...prev, [pcMonth]: v }));
      localStorage.setItem(`monthlyGoal_${pcMonth}`, String(v));
    }
  }

  // 工種別棒グラフデータ
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

  // 月別利益推移データ（直近6ヶ月）
  const trendData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    activeProjects.forEach(p => {
      const key = getProjMonth(p);
      byMonth[key] = (byMonth[key] ?? 0) + (p.profit?.profit ?? 0);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, profit]) => ({ month: key.slice(5) + "月", profit }));
  }, [activeProjects]);

  // ── サマリーパネル（共通コンテンツ）──
  const SummaryPanel = () => (
    <div className="space-y-4">
      {/* KPI 3枚 */}
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-2.5 py-2">
          <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wide">売上</p>
          <p className="text-sm font-bold text-blue-700 leading-tight">{fmtM(totalRevenue)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-2">
          <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">利益</p>
          <p className="text-sm font-bold text-emerald-700 leading-tight">{fmtM(totalProfit)}</p>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-2.5 py-2">
          <p className="text-[9px] text-violet-400 font-bold uppercase tracking-wide">利益率</p>
          <p className="text-sm font-bold text-violet-700 leading-tight">{avgRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* 利益推移 AreaChart */}
      {trendData.length >= 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">利益推移</p>
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={trendData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => fmtM(v)}
                contentStyle={{ fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
              />
              <Area dataKey="profit" name="利益" type="monotone"
                stroke="#10b981" strokeWidth={2}
                fill="url(#profitGrad)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 工種別棒グラフ */}
      {typeChartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">工種別 利益</p>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={typeChartData} barCategoryGap="30%">
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

      <p className="text-xs text-gray-400 text-center">{projects.length}件の案件</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <WelcomeModal />
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
          <span>📊 サマリー</span>
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
        <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 border-r border-gray-200 bg-white sticky top-[112px] self-start h-[calc(100vh-112px)] overflow-y-auto">
          {/* 月選択ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => pcChangeMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">{pcMonthLabel}</p>
              {pcMonth === nowKey && <p className="text-[9px] text-blue-500 font-semibold">今月</p>}
            </div>
            <button onClick={() => pcChangeMonth(1)} disabled={pcMonth === nowKey}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* 月別KPI */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-2 py-2">
                <p className="text-[9px] text-blue-400 font-bold uppercase">売上</p>
                <p className="text-xs font-bold text-blue-700 leading-tight">{fmtM(pcRevenue)}</p>
                <p className="text-[9px] text-blue-400">{pcMonthProjs.length}件</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2 py-2">
                <p className="text-[9px] text-emerald-400 font-bold uppercase">利益</p>
                <p className="text-xs font-bold text-emerald-700 leading-tight">{fmtM(pcProfit)}</p>
                <p className="text-[9px] text-emerald-400">{pcRate.toFixed(1)}%</p>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-2 py-2">
                <p className="text-[9px] text-violet-400 font-bold uppercase">利益率</p>
                <p className="text-xs font-bold text-violet-700 leading-tight">{pcRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* 目標設定 */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-xs font-semibold text-gray-700">目標利益</p>
              </div>
              <div className="flex gap-1.5">
                <input type="text" inputMode="numeric" value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onBlur={pcSaveGoal} onKeyDown={e => e.key === "Enter" && pcSaveGoal()}
                  placeholder="例: 500000"
                  className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={pcSaveGoal}
                  className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold shrink-0">
                  設定
                </button>
              </div>
              {pcGoal > 0 && (
                <div className="space-y-1">
                  <div className="flex items-end justify-between">
                    <span className="text-[10px] text-gray-400">達成率</span>
                    <span className={`text-base font-black ${pcAchievePct >= 100 ? "text-emerald-600" : pcAchievePct >= 70 ? "text-blue-600" : "text-amber-500"}`}>
                      {pcAchievePct.toFixed(0)}<span className="text-xs">%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pcAchievePct >= 100 ? "bg-emerald-500" : pcAchievePct >= 70 ? "bg-blue-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(pcAchievePct, 100)}%` }} />
                  </div>
                  <p className="text-[9px] text-gray-400 text-right">目標 {fmtM(pcGoal)} / 実績 {fmtM(pcProfit)}</p>
                </div>
              )}
            </div>

            {/* 6ヶ月比較グラフ */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">直近6ヶ月 利益 vs 目標</p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={pc6MData} barCategoryGap="20%" barGap={2}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => fmtM(v)}
                    contentStyle={{ fontSize: 10, border: "1px solid #e5e7eb", borderRadius: 6 }} />
                  <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
                  <Bar dataKey="profit" name="実績" radius={[2, 2, 0, 0]} maxBarSize={16}>
                    {pc6MData.map((d, i) => <Cell key={i} fill={d.key === pcMonth ? "#10b981" : "#6ee7b7"} />)}
                  </Bar>
                  <Bar dataKey="goal" name="目標" radius={[2, 2, 0, 0]} maxBarSize={16}>
                    {pc6MData.map((d, i) => <Cell key={i} fill={d.key === pcMonth ? "#3b82f6" : "#bfdbfe"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 全体KPI */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">全案件 累計</p>
              <SummaryPanel />
            </div>
          </div>
        </aside>

        {/* 案件リスト */}
        <main className="flex-1 px-4 py-4 space-y-3 pb-44">
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
