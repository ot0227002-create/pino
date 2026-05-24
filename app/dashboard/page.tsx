"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ──────────────────────────────────────────────
// ダミーデータ（10件・リアル想定）
// ──────────────────────────────────────────────
const PROJECTS = [
  { id: 1,  name: "山田様邸",       type: "外構",     amount: 2400000, cost: 1900000, date: "2026-05-10", status: "完工",   nextAction: "" },
  { id: 2,  name: "佐藤様邸",       type: "リフォーム", amount: 4500000, cost: 3800000, date: "2026-05-18", status: "施工中", nextAction: "2026-05-26" },
  { id: 3,  name: "田中様ビル",     type: "内装",     amount: 1200000, cost: 850000,  date: "2026-04-15", status: "完工",   nextAction: "" },
  { id: 4,  name: "高橋様邸",       type: "外構",     amount: 1800000, cost: 1300000, date: "2026-05-02", status: "契約済", nextAction: "2026-05-25" },
  { id: 5,  name: "渡辺様マンション", type: "内装",   amount: 3000000, cost: 2100000, date: "2026-04-20", status: "完工",   nextAction: "" },
  { id: 6,  name: "伊藤様邸",       type: "リフォーム", amount: 5500000, cost: 4100000, date: "2026-03-12", status: "完工",   nextAction: "" },
  { id: 7,  name: "中村様邸",       type: "外構",     amount: 900000,  cost: 650000,  date: "2026-03-25", status: "完工",   nextAction: "" },
  { id: 8,  name: "小林様店舗",     type: "内装",     amount: 6000000, cost: 4200000, date: "2026-05-05", status: "施工中", nextAction: "2026-05-28" },
  { id: 9,  name: "加藤様邸",       type: "リフォーム", amount: 1500000, cost: 1350000, date: "2026-02-18", status: "完工",   nextAction: "" },
  { id: 10, name: "吉田様邸",       type: "外構",     amount: 2200000, cost: 1700000, date: "2026-04-05", status: "完工",   nextAction: "" },
];

// 月別推移（過去6ヶ月）
const MONTHLY_DATA = [
  { month: "12月", revenue: 5800000, profit: 1200000 },
  { month: "1月",  revenue: 3200000, profit: 580000  },
  { month: "2月",  revenue: 1500000, profit: 150000  },
  { month: "3月",  revenue: 6400000, profit: 1650000 },
  { month: "4月",  revenue: 6400000, profit: 1750000 },
  { month: "5月",  revenue: 14700000, profit: 3500000 },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
const WORK_TYPES = ["リフォーム", "外構", "内装"] as const;
const TARGET_RATE = 20;

function fmtCurrency(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}億`;
  if (n >= 10000)     return `${(n / 10000).toFixed(0)}万`;
  return `¥${n.toLocaleString()}`;
}
function fmtFull(n: number) {
  return `¥${n.toLocaleString()}`;
}
function profitRate(amount: number, cost: number) {
  return amount > 0 ? ((amount - cost) / amount) * 100 : 0;
}

// ──────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // 当月（5月）集計
  const thisMonth = "2026-05";
  const monthProjects = PROJECTS.filter(p => p.date.startsWith(thisMonth));
  const monthRevenue  = monthProjects.reduce((s, p) => s + p.amount, 0);
  const monthProfit   = monthProjects.reduce((s, p) => s + (p.amount - p.cost), 0);
  const monthRate     = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  // 工種別
  const typeData = WORK_TYPES.map((type, i) => {
    const ps   = PROJECTS.filter(p => p.type === type);
    const rev  = ps.reduce((s, p) => s + p.amount, 0);
    const prof = ps.reduce((s, p) => s + (p.amount - p.cost), 0);
    return { name: type, count: ps.length, revenue: rev, profit: prof,
             rate: rev > 0 ? Math.round((prof / rev) * 100) : 0, color: PIE_COLORS[i] };
  });

  // 警戒案件（利益率 < 目標）
  const alertProjects = PROJECTS
    .map(p => ({ ...p, rate: profitRate(p.amount, p.cost) }))
    .filter(p => p.rate < TARGET_RATE)
    .sort((a, b) => a.rate - b.rate);

  // 直近タスク
  const tasks = PROJECTS
    .filter(p => p.nextAction)
    .sort((a, b) => a.nextAction.localeCompare(b.nextAction));

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#0d1117] text-white">

      {/* ── サイドナビ ── */}
      <aside className="w-60 shrink-0 bg-[#161b22] border-r border-gray-800 flex flex-col">
        <div className="px-5 py-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">🏗️</span>
            <div>
              <p className="font-bold text-sm text-white leading-tight">案件管理</p>
              <p className="text-[10px] text-gray-500 mt-0.5">リフォーム管理システム</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <SideItem href="/dashboard" emoji="📊" label="ダッシュボード" active />
          <SideItem href="/projects"  emoji="📁" label="案件一覧" />
          <SideItem href="/settings"  emoji="⚙️" label="設定" />
        </nav>

        <div className="px-3 pb-5 border-t border-gray-800 pt-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800/70 rounded-xl text-sm transition-colors"
          >
            <span>🚪</span>ログアウト
          </button>
        </div>
      </aside>

      {/* ── メインコンテンツ ── */}
      <main className="flex-1 overflow-auto px-8 py-8 space-y-8">

        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">利益集計・分析</h1>
          <p className="text-gray-400 text-sm mt-1">2026年5月 · リアルタイム集計</p>
        </div>

        {/* KPI カード */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard emoji="📈" label="当月売上総額"
            value={fmtCurrency(monthRevenue)} sub={`${monthProjects.length}件の案件`}
            accent="blue" />
          <KpiCard emoji="💰" label="当月総利益額"
            value={fmtCurrency(monthProfit)} sub="粗利合計"
            accent="emerald" />
          <KpiCard emoji="📊" label="当月平均利益率"
            value={`${monthRate.toFixed(1)}%`}
            sub={monthRate >= TARGET_RATE ? `目標 ${TARGET_RATE}% 達成 ✅` : `目標 ${TARGET_RATE}% 未達 ⚠️`}
            accent={monthRate >= TARGET_RATE ? "emerald" : "amber"} />
        </div>

        {/* グラフ段 */}
        <div className="grid grid-cols-5 gap-6">
          {/* 月別推移バーチャート */}
          <div className="col-span-3 bg-[#161b22] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-200 mb-5">📈 月別売上・利益推移</h2>
            {mounted ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_DATA} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip
                    formatter={(v: number) => fmtFull(v)}
                    contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Bar dataKey="revenue" name="売上" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit"  name="利益" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">読み込み中...</div>}
          </div>

          {/* 工種別 */}
          <div className="col-span-2 bg-[#161b22] border border-gray-800 rounded-2xl p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">🔵 工種別件数比率</h2>
            {mounted ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={typeData} dataKey="count" nameKey="name"
                    cx="50%" cy="50%" outerRadius={60} innerRadius={30}
                    paddingAngle={3}>
                    {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}件`}
                    contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[150px]" />}

            <table className="w-full text-xs mt-3">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-1.5 font-medium">工種</th>
                  <th className="text-right pb-1.5 font-medium">売上</th>
                  <th className="text-right pb-1.5 font-medium">利益率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {typeData.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      {d.name}
                    </td>
                    <td className="text-right text-gray-400">{fmtCurrency(d.revenue)}</td>
                    <td className={`text-right font-bold ${d.rate >= TARGET_RATE ? "text-emerald-400" : "text-amber-400"}`}>
                      {d.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 下段：アラート + タスク */}
        <div className="grid grid-cols-2 gap-6">

          {/* 警戒案件 */}
          <div className="bg-[#161b22] border border-red-900/40 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-red-400 mb-4">
              ⚠️ 利益率警戒案件
              <span className="ml-2 text-xs text-gray-500 font-normal">目標 {TARGET_RATE}% 未達</span>
            </h2>
            {alertProjects.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">警戒案件はありません ✅</p>
            ) : (
              <div className="space-y-2">
                {alertProjects.map(p => (
                  <div key={p.id}
                    className="flex items-center justify-between bg-red-900/10 border border-red-900/25 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.type} · {p.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold text-sm">{p.rate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">{fmtCurrency(p.amount - p.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 直近タスク */}
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">
              📅 直近のタスク
              <span className="ml-2 text-xs text-gray-500 font-normal">次回アクション日順</span>
            </h2>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">タスクはありません</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(p => {
                  const daysLeft = Math.ceil(
                    (new Date(p.nextAction).getTime() - new Date("2026-05-24").getTime()) / 86400000
                  );
                  return (
                    <div key={p.id}
                      className="flex items-center justify-between bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.type} · {p.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 text-xs font-medium">{p.nextAction}</p>
                        <p className={`text-xs mt-0.5 ${daysLeft <= 1 ? "text-red-400" : "text-gray-500"}`}>
                          {daysLeft <= 0 ? "期限超過" : `あと${daysLeft}日`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────
// サブコンポーネント
// ──────────────────────────────────────────────
function SideItem({ href, emoji, label, active }: { href: string; emoji: string; label: string; active?: boolean }) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
          : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
      }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </Link>
  );
}

const ACCENT: Record<string, string> = {
  blue:    "border-blue-500/20 bg-blue-600/5",
  emerald: "border-emerald-500/20 bg-emerald-600/5",
  amber:   "border-amber-500/20 bg-amber-600/5",
};

function KpiCard({ emoji, label, value, sub, accent }: {
  emoji: string; label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className={`bg-[#161b22] border rounded-2xl p-6 ${ACCENT[accent] ?? ""}`}>
      <div className="text-3xl mb-3 leading-none">{emoji}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{sub}</p>
    </div>
  );
}
