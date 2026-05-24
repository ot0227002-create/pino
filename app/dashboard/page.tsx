"use client";

export const runtime = "edge";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Briefcase, DollarSign, Percent } from "lucide-react";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import { formatCurrency, formatRate } from "@/lib/profit";
import { WORK_TYPE_LABEL, type WorkType, type ProjectWithDetails } from "@/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (!hasSupabase) {
        setProjects(getProjectsWithDetails());
        return;
      }
      const { data: projectData } = await supabase
        .from("projects")
        .select("*");
      const ids = (projectData ?? []).map((p: { id: string }) => p.id);
      const { data: constructions } = await supabase
        .from("construction_details")
        .select("*")
        .in("project_id", ids);

      const combined: ProjectWithDetails[] = (projectData ?? []).map((p: ProjectWithDetails) => {
        const construction = (constructions ?? []).find(
          (c: { project_id: string }) => c.project_id === p.id
        );
        const profit = construction ? calcProfit(construction) : undefined;
        return { ...p, construction, profit };
      });
      setProjects(combined);
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = projects.filter(
    (p) =>
      p.profit &&
      p.profit.contract_amount > 0 &&
      ["completed", "in_progress", "contracted"].includes(p.status)
  );

  const totalRevenue = activeProjects.reduce(
    (s, p) => s + (p.profit?.contract_amount ?? 0),
    0
  );
  const totalProfit = activeProjects.reduce(
    (s, p) => s + (p.profit?.profit ?? 0),
    0
  );
  const avgProfitRate =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const workTypeData = (["reform", "exterior", "interior"] as WorkType[]).map(
    (wt) => {
      const ps = activeProjects.filter((p) => p.work_type === wt);
      const rev = ps.reduce((s, p) => s + (p.profit?.contract_amount ?? 0), 0);
      const prof = ps.reduce((s, p) => s + (p.profit?.profit ?? 0), 0);
      return {
        name: WORK_TYPE_LABEL[wt],
        revenue: rev,
        profit: prof,
        rate: rev > 0 ? Math.round((prof / rev) * 1000) / 10 : 0,
      };
    }
  );

  // ステータス分布
  const statusData = [
    { name: "新規・調査", value: projects.filter(p => ["new_inquiry","survey_scheduled","survey_done"].includes(p.status)).length },
    { name: "見積・検討", value: projects.filter(p => ["estimating","estimate_sent","considering"].includes(p.status)).length },
    { name: "契約・施工", value: projects.filter(p => ["contracted","in_progress"].includes(p.status)).length },
    { name: "完工", value: projects.filter(p => p.status === "completed").length },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 lg:px-8">
        <div className="flex items-center h-16">
          <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Briefcase className="h-5 w-5 text-blue-600" />}
                label="全案件"
                value={`${projects.length}件`}
                bg="bg-blue-50"
              />
              <KpiCard
                icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                label="売上合計"
                value={formatCurrency(totalRevenue)}
                bg="bg-emerald-50"
              />
              <KpiCard
                icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
                label="利益合計"
                value={formatCurrency(totalProfit)}
                bg="bg-teal-50"
              />
              <KpiCard
                icon={<Percent className="h-5 w-5 text-purple-600" />}
                label="平均利益率"
                value={formatRate(avgProfitRate)}
                bg="bg-purple-50"
              />
            </div>

            {/* 工種別グラフ */}
            {workTypeData.some((d) => d.revenue > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">工種別 売上・利益</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={workTypeData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" name="売上" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="利益" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 下段2カラム */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ステータス分布 */}
              {statusData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">案件ステータス分布</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        label={({ name, value }) => `${name} ${value}`}
                        labelLine={false}
                      >
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 工種別利益率テーブル */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">工種別 利益率</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">工種</th>
                      <th className="text-right pb-2 font-medium">売上</th>
                      <th className="text-right pb-2 font-medium">利益率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {workTypeData.map((row, i) => (
                      <tr key={row.name}>
                        <td className="py-2.5 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i] }}
                          />
                          {row.name}
                        </td>
                        <td className="py-2.5 text-right text-gray-600 text-xs">
                          {row.revenue > 0 ? formatCurrency(row.revenue) : "—"}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-emerald-600">
                          {row.revenue > 0 ? `${row.rate}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Link
              href="/projects"
              className="block w-full text-center rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-medium text-blue-700"
            >
              案件一覧を見る →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3.5">
      <div className={`inline-flex rounded-lg p-2 ${bg} mb-2`}>{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
