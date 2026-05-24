"use client";

import { useState, useEffect } from "react";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { ProjectWithDetails } from "@/types";

const TARGET_RATE = 20;

function fmtCurrency(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}億`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`;
  return `¥${n.toLocaleString()}`;
}

const STATUS_GROUPS = [
  { label: "新規・調査",  statuses: ["new_inquiry", "survey_scheduled", "survey_done"],     color: "bg-blue-100 text-blue-700" },
  { label: "見積・検討",  statuses: ["estimating", "estimate_sent", "considering"],          color: "bg-amber-100 text-amber-700" },
  { label: "契約・施工",  statuses: ["contracted", "in_progress"],                           color: "bg-purple-100 text-purple-700" },
  { label: "完工",        statuses: ["completed"],                                            color: "bg-emerald-100 text-emerald-700" },
];

export function SummaryClient() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (!hasSupabase) {
        setProjects(getProjectsWithDetails());
        return;
      }
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

  const activeProjects = projects.filter(p =>
    p.profit && p.profit.contract_amount > 0 &&
    ["completed", "in_progress", "contracted"].includes(p.status)
  );

  const totalRevenue  = activeProjects.reduce((s, p) => s + (p.profit?.contract_amount ?? 0), 0);
  const totalProfit   = activeProjects.reduce((s, p) => s + (p.profit?.profit ?? 0), 0);
  const avgProfitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const alertProjects = activeProjects.filter(p => {
    const r = p.profit!;
    return r.contract_amount > 0 && (r.profit / r.contract_amount) * 100 < TARGET_RATE;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center">
        <h1 className="text-lg font-bold text-gray-900">サマリー</h1>
      </header>

      {loading ? <LoadingSpinner /> : (
        <div className="px-4 py-5 space-y-5">

          {/* KPI カード */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard emoji="📈" label="売上合計"   value={fmtCurrency(totalRevenue)}        sub={`${activeProjects.length}件`} />
            <KpiCard emoji="💰" label="利益合計"   value={fmtCurrency(totalProfit)}         sub="粗利" />
            <KpiCard emoji="📊" label="平均利益率" value={`${avgProfitRate.toFixed(1)}%`}   sub={avgProfitRate >= TARGET_RATE ? "目標達成 ✅" : "目標未達 ⚠️"} highlight={avgProfitRate < TARGET_RATE} />
            <KpiCard emoji="📁" label="全案件数"   value={`${projects.length}件`}           sub="登録済み" />
          </div>

          {/* ステータス別件数 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">案件ステータス分布</h2>
            <div className="space-y-2">
              {STATUS_GROUPS.map(g => {
                const count = projects.filter(p => g.statuses.includes(p.status)).length;
                const pct   = projects.length > 0 ? (count / projects.length) * 100 : 0;
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
          </div>

          {/* 警戒案件 */}
          {alertProjects.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-red-600 mb-3">⚠️ 利益率警戒案件（{TARGET_RATE}%未達）</h2>
              <div className="space-y-2">
                {alertProjects.map(p => {
                  const rate = p.profit!.contract_amount > 0
                    ? (p.profit!.profit / p.profit!.contract_amount) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.customer_name}</p>
                        <p className="text-xs text-gray-400">{p.status}</p>
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

function KpiCard({ emoji, label, value, sub, highlight }: {
  emoji: string; label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${highlight ? "border-amber-200" : "border-gray-200"}`}>
      <div className="text-2xl mb-1.5">{emoji}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
