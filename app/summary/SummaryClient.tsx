"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { ProjectWithDetails } from "@/types";

const TARGET_RATE = 20;

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getProjectMonth(p: ProjectWithDetails) {
  if (p.target_month) return p.target_month;
  return getMonthKey(new Date(p.updated_at ?? p.created_at));
}
function fmtCurrency(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}億`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`;
  return `¥${n.toLocaleString()}`;
}
function fmtM(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return `¥${n.toLocaleString()}`;
}

const STATUS_GROUPS = [
  { label: "新規・調査",  statuses: ["new_inquiry", "survey_scheduled", "survey_done"],   color: "bg-blue-100 text-blue-700"    },
  { label: "見積・検討",  statuses: ["estimating", "estimate_sent", "considering"],        color: "bg-amber-100 text-amber-700"  },
  { label: "契約・施工",  statuses: ["contracted", "in_progress"],                         color: "bg-purple-100 text-purple-700"},
  { label: "完工",        statuses: ["completed"],                                          color: "bg-emerald-100 text-emerald-700"},
];

export function SummaryClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonthKey = getMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [goalsMap, setGoalsMap] = useState<Record<string, number>>({});
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    router.refresh(); // Next.js キャッシュを無効化して常に最新を取得
    loadData();
    // localStorage から全月の目標を読み込み
    const goals: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = getMonthKey(d);
      const v = localStorage.getItem(`monthlyGoal_${key}`);
      if (v) goals[key] = Number(v);
    }
    setGoalsMap(goals);
    setGoalInput(goals[currentMonthKey]?.toString() ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setGoalInput(goalsMap[selectedMonth]?.toString() ?? "");
  }, [selectedMonth, goalsMap]);

  async function loadData() {
    setLoading(true);
    try {
      if (!hasSupabase) { setProjects(getProjectsWithDetails()); return; }
      const { data: projectData } = await supabase.from("projects").select("*");
      const ids = (projectData ?? []).map((p: { id: string }) => p.id);
      const { data: constructions } = await supabase
        .from("construction_details").select("*").in("project_id", ids);
      const combined: ProjectWithDetails[] = (projectData ?? []).map((p: ProjectWithDetails) => {
        const construction = (constructions ?? []).find((c: { project_id: string }) => c.project_id === p.id);
        const profit = construction ? calcProfit(construction) : undefined;
        return { ...p, construction, profit };
      });
      setProjects(combined);
    } finally {
      setLoading(false);
    }
  }

  function changeMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const key = getMonthKey(d);
    if (key > currentMonthKey) return; // 未来月は不可
    setSelectedMonth(key);
  }

  function saveGoal() {
    const raw = goalInput.replace(/,/g, "").replace(/万/g, "0000");
    const v = Number(raw);
    if (!isNaN(v) && v >= 0) {
      setGoalsMap(prev => ({ ...prev, [selectedMonth]: v }));
      localStorage.setItem(`monthlyGoal_${selectedMonth}`, String(v));
    }
  }

  const activeProjects = useMemo(() =>
    projects.filter(p =>
      p.profit && p.profit.contract_amount > 0 &&
      ["completed", "in_progress", "contracted"].includes(p.status)
    ), [projects]);

  // 選択月のプロジェクト
  const monthProjects = useMemo(() =>
    activeProjects.filter(p => getProjectMonth(p) === selectedMonth),
    [activeProjects, selectedMonth]);

  const monthRevenue = monthProjects.reduce((s, p) => s + (p.profit?.contract_amount ?? 0), 0);
  const monthProfit  = monthProjects.reduce((s, p) => s + (p.profit?.profit ?? 0), 0);
  const monthRate    = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;
  const selectedGoal = goalsMap[selectedMonth] ?? 0;
  const achieveRate  = selectedGoal > 0 ? Math.min((monthProfit / selectedGoal) * 100, 100) : 0;
  const achievePct   = selectedGoal > 0 ? (monthProfit / selectedGoal) * 100 : 0;

  // 直近6ヶ月グラフデータ
  const chartData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const key = getMonthKey(d);
      const ps = activeProjects.filter(p => getProjectMonth(p) === key);
      const profit = ps.reduce((s, p) => s + (p.profit?.profit ?? 0), 0);
      const goal = goalsMap[key] ?? 0;
      return { month: `${d.getMonth() + 1}月`, 実績: profit, 目標: goal, key };
    }),
    [activeProjects, goalsMap]);

  const alertProjects = activeProjects.filter(p => {
    const r = p.profit!;
    return r.contract_amount > 0 && (r.profit / r.contract_amount) * 100 < TARGET_RATE;
  });

  // 月ラベル
  const [y, m] = selectedMonth.split("-").map(Number);
  const monthLabel = `${y}年${m}月`;
  const isCurrentMonth = selectedMonth === currentMonthKey;

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center">
        <h1 className="text-lg font-bold text-gray-900">サマリー</h1>
      </header>

      {loading ? <LoadingSpinner /> : (
        <div className="px-4 py-4 space-y-4">

          {/* ── 月選択 ── */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
            <button onClick={() => changeMonth(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-center">
              <p className="text-base font-bold text-gray-900">{monthLabel}</p>
              {isCurrentMonth && <p className="text-[10px] text-blue-500 font-semibold">今月</p>}
            </div>
            <button onClick={() => changeMonth(1)}
              disabled={isCurrentMonth}
              className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors disabled:opacity-30">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* ── KPI カード（選択月） ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wide">売上</p>
              <p className="text-sm font-bold text-blue-700 leading-tight mt-0.5">{fmtCurrency(monthRevenue)}</p>
              <p className="text-[9px] text-blue-400 mt-0.5">{monthProjects.length}件</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3">
              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">利益</p>
              <p className="text-sm font-bold text-emerald-700 leading-tight mt-0.5">{fmtCurrency(monthProfit)}</p>
              <p className="text-[9px] text-emerald-400 mt-0.5">{monthRate.toFixed(1)}%</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-3">
              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-wide">利益率</p>
              <p className="text-sm font-bold text-violet-700 leading-tight mt-0.5">{monthRate.toFixed(1)}%</p>
              <p className={`text-[9px] mt-0.5 font-semibold ${monthRate >= TARGET_RATE ? "text-emerald-500" : "text-amber-500"}`}>
                {monthRate >= TARGET_RATE ? "目標達成" : `目標${TARGET_RATE}%`}
              </p>
            </div>
          </div>

          {/* ── 月別目標設定 ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold text-gray-800">{monthLabel}の目標利益</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text" inputMode="numeric"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onBlur={saveGoal}
                onKeyDown={e => e.key === "Enter" && saveGoal()}
                placeholder="例: 500000"
                className="flex-1 min-w-0 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <button onClick={saveGoal}
                className="text-sm bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold shrink-0 active:bg-blue-700">
                設定
              </button>
            </div>

            {selectedGoal > 0 && (
              <div className="space-y-2">
                {/* 達成率数値 */}
                <div className="flex items-end justify-between">
                  <span className="text-xs text-gray-400">達成率</span>
                  <span className={`text-2xl font-black ${
                    achievePct >= 100 ? "text-emerald-600" : achievePct >= 70 ? "text-blue-600" : "text-amber-500"
                  }`}>
                    {achievePct.toFixed(0)}<span className="text-base font-bold">%</span>
                  </span>
                </div>
                {/* プログレスバー */}
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      achievePct >= 100 ? "bg-emerald-500" : achievePct >= 70 ? "bg-blue-500" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(achievePct, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-right">
                  目標 {fmtCurrency(selectedGoal)} ／ 実績 {fmtCurrency(monthProfit)}
                  {achievePct > 100 && <span className="ml-1 text-emerald-600 font-bold">🎉 目標突破！</span>}
                </p>
              </div>
            )}
          </div>

          {/* ── 6ヶ月比較グラフ ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">直近6ヶ月 — 利益実績 vs 目標</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtM(v), name]}
                  contentStyle={{ fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
                />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Bar dataKey="実績" name="実績" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.key === selectedMonth ? "#10b981" : "#6ee7b7"} />
                  ))}
                </Bar>
                <Bar dataKey="目標" name="目標" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.key === selectedMonth ? "#3b82f6" : "#bfdbfe"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-400 text-center mt-1">
              色が濃い月 = 現在選択中の月
            </p>
          </div>

          {/* ── ステータス分布（全案件） ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">案件ステータス分布（全体）</h2>
            <div className="space-y-2">
              {STATUS_GROUPS.map(g => {
                const count = projects.filter(p => g.statuses.includes(p.status)).length;
                const pct = projects.length > 0 ? (count / projects.length) * 100 : 0;
                return (
                  <div key={g.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${g.color}`}>{g.label}</span>
                      <span className="text-xs text-gray-500">{count}件</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-2">全{projects.length}件</p>
          </div>

          {/* ── 利益率警戒案件 ── */}
          {alertProjects.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-red-600 mb-3">
                ⚠️ 利益率警戒案件（{TARGET_RATE}%未達）
              </h2>
              <div className="space-y-2">
                {alertProjects.map(p => {
                  const rate = p.profit!.contract_amount > 0
                    ? (p.profit!.profit / p.profit!.contract_amount) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.customer_name}</p>
                        <p className="text-xs text-gray-400">{p.address}</p>
                      </div>
                      <span className="text-red-500 font-bold text-sm">{rate.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
