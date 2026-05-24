"use client";

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
  Legend,
} from "recharts";
import { TrendingUp, Briefcase, DollarSign, Percent } from "lucide-react";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { formatCurrency, formatRate } from "@/lib/profit";
import { WORK_TYPE_LABEL, type WorkType } from "@/types";

export default function DashboardPage() {
  const projects = getProjectsWithDetails();

  // 完工済み or 施工中で請負金額があるもの
  const activeProjects = projects.filter(
    (p) =>
      p.profit &&
      p.profit.contract_amount > 0 &&
      (p.status === "completed" || p.status === "in_progress" || p.status === "contracted")
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

  // 工種別集計
  const workTypeData: { name: string; revenue: number; profit: number; rate: number }[] =
    (["reform", "exterior", "interior"] as WorkType[]).map((wt) => {
      const ps = activeProjects.filter((p) => p.work_type === wt);
      const rev = ps.reduce((s, p) => s + (p.profit?.contract_amount ?? 0), 0);
      const prof = ps.reduce((s, p) => s + (p.profit?.profit ?? 0), 0);
      return {
        name: WORK_TYPE_LABEL[wt],
        revenue: rev,
        profit: prof,
        rate: rev > 0 ? Math.round((prof / rev) * 1000) / 10 : 0,
      };
    });

  // 月別集計（モックデータの完工日ベース）
  const monthlyData = [
    { month: "1月", revenue: 0, profit: 0 },
    { month: "2月", revenue: 0, profit: 0 },
    { month: "3月", revenue: 0, profit: 0 },
    { month: "4月", revenue: 1200000, profit: 410000 },
    { month: "5月", revenue: 2800000, profit: 870000 },
    { month: "6月", revenue: 4750000, profit: 1490000 },
  ];

  const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-8">
        <div className="flex items-center h-16">
          <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={<Briefcase className="h-5 w-5 text-blue-600" />}
            label="稼働案件"
            value={`${activeProjects.length}件`}
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

        {/* 月別利益グラフ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">月別 売上・利益</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="revenue" name="売上" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="利益" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 工種別 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 工種別 利益率 Pie */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">工種別 利益率</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={workTypeData}
                  dataKey="rate"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, rate }) => `${name} ${rate}%`}
                  labelLine={false}
                >
                  {workTypeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 工種別 Table */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">工種別 集計</h2>
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
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i] }}
                      />
                      {row.name}
                    </td>
                    <td className="py-2.5 text-right text-gray-600">
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

        {/* 案件一覧へのリンク */}
        <Link
          href="/projects"
          className="block w-full text-center rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-medium text-blue-700 active:bg-blue-100"
        >
          案件一覧を見る →
        </Link>
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
