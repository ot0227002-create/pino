"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const PROJECTS = [
  { id: 1,  name: "山田様邸",        type: "外構",     amount: 2400000, cost: 1900000, date: "2026-05-10", status: "完工",   nextAction: "" },
  { id: 2,  name: "佐藤様邸",        type: "リフォーム", amount: 4500000, cost: 3800000, date: "2026-05-18", status: "施工中", nextAction: "2026-05-26" },
  { id: 3,  name: "田中様ビル",      type: "内装",     amount: 1200000, cost: 850000,  date: "2026-04-15", status: "完工",   nextAction: "" },
  { id: 4,  name: "高橋様邸",        type: "外構",     amount: 1800000, cost: 1300000, date: "2026-05-02", status: "契約済", nextAction: "2026-05-25" },
  { id: 5,  name: "渡辺様マンション", type: "内装",     amount: 3000000, cost: 2100000, date: "2026-04-20", status: "完工",   nextAction: "" },
  { id: 6,  name: "伊藤様邸",        type: "リフォーム", amount: 5500000, cost: 4100000, date: "2026-03-12", status: "完工",   nextAction: "" },
  { id: 7,  name: "中村様邸",        type: "外構",     amount: 900000,  cost: 650000,  date: "2026-03-25", status: "完工",   nextAction: "" },
  { id: 8,  name: "小林様店舗",      type: "内装",     amount: 6000000, cost: 4200000, date: "2026-05-05", status: "施工中", nextAction: "2026-05-28" },
  { id: 9,  name: "加藤様邸",        type: "リフォーム", amount: 1500000, cost: 1350000, date: "2026-02-18", status: "完工",   nextAction: "" },
  { id: 10, name: "吉田様邸",        type: "外構",     amount: 2200000, cost: 1700000, date: "2026-04-05", status: "完工",   nextAction: "" },
];

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
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`;
  return `¥${n.toLocaleString()}`;
}
function fmtFull(n: number) { return `¥${n.toLocaleString()}`; }
function profitRate(amount: number, cost: number) {
  return amount > 0 ? ((amount - cost) / amount) * 100 : 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const thisMonth = "2026-05";
  const monthProjects = PROJECTS.filter(p => p.date.startsWith(thisMonth));
  const monthRevenue = monthProjects.reduce((s, p) => s + p.amount, 0);
  const monthProfit  = monthProjects.reduce((s, p) => s + (p.amount - p.cost), 0);
  const monthRate    = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  const typeData = WORK_TYPES.map((type, i) => {
    const ps   = PROJECTS.filter(p => p.type === type);
    const rev  = ps.reduce((s, p) => s + p.amount, 0);
    const prof = ps.reduce((s, p) => s + (p.amount - p.cost), 0);
    return { name: type, count: ps.length, revenue: rev, profit: prof,
             rate: rev > 0 ? Math.round((prof / rev) * 100) : 0, color: PIE_COLORS[i] };
  });

  const alertProjects = PROJECTS
    .map(p => ({ ...p, rate: profitRate(p.amount, p.cost) }))
    .filter(p => p.rate < TARGET_RATE)
    .sort((a, b) => a.rate - b.rate);

  const tasks = PROJECTS
    .filter(p => p.nextAction)
    .sort((a, b) => a.nextAction.localeCompare(b.nextAction));

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── サイドナビ ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">🏗️</span>
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight">案件管理</p>
              <p className="text-[10px] text-gray-400 mt-0.5">リフォーム管理システム</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <SideItem href="/dashboard" emoji="📊" label="ダッシュボード" active />
          <SideItem href="/projects"  emoji="📁" label="案件一覧" />
          <SideItem href="/settings"  emoji="⚙️" label="設定" />
        </nav>
        <div className="px-3 pb-5 border-t border-gray-100 pt-3">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl text-sm transition-colors">
            <span>🚪</span>ログアウト
          </button>
        </div>
      </aside>

      {/* ── メイン ── */}
      <main className="flex-1 overflow-auto px-8 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">利益集計・分析</h1>
          <p className="text-gray-400 text-sm mt-1">2026年5月 · ダミーデータ表示中</p>
        </div>

        {/* KPI カード */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard emoji="📈" label="当月売上総額"   value={fmtCurrency(monthRevenue)} sub={`${monthProjects.length}件の案件`} accent="blue" />
          <KpiCard emoji="💰" label="当月総利益額"   value={fmtCurrency(monthProfit)}  sub="粗利合計"                          accent="emerald" />
          <KpiCard emoji="📊" label="当月平均利益率" value={`${monthRate.toFixed(1)}%`}
            sub={monthRate >= TARGET_RATE ? `目標 ${TARGET_RATE}% 達成 ✅` : `目標 ${TARGET_RATE}% 未達 ⚠️`}
            accent={monthRate >= TARGET_RATE ? "emerald" : "amber"} />
        </div>

        {/* グラフ段 */}
        <div className="grid grid-cols-5 gap-5">
          {/* 月別推移 */}
          <div className="col-span-3 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">📈 月別売上・利益推移</h2>
            {mounted ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_DATA} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v: number) => fmtFull(v)}
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#374151" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
                  <Bar dataKey="revenue" name="売上" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit"  name="利益" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">読み込み中...</div>}
          </div>

          {/* 工種別 */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🔵 工種別件数比率</h2>
            {mounted ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={typeData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                    outerRadius={60} innerRadius={28} paddingAngle={3}>
                    {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}件`}
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[150px]" />}
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-1.5 font-medium">工種</th>
                  <th className="text-right pb-1.5 font-medium">売上</th>
                  <th className="text-right pb-1.5 font-medium">利益率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {typeData.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-700">{d.name}</span>
                    </td>
                    <td className="text-right text-gray-500">{fmtCurrency(d.revenue)}</td>
                    <td className={`text-right font-bold ${d.rate >= TARGET_RATE ? "text-emerald-600" : "text-amber-500"}`}>
                      {d.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 下段 */}
        <div className="grid grid-cols-2 gap-5">
          {/* 警戒案件 */}
          <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-red-600 mb-4">
              ⚠️ 利益率警戒案件
              <span className="ml-2 text-xs text-gray-400 font-normal">目標 {TARGET_RATE}% 未達</span>
            </h2>
            {alertProjects.length === 0 ? (
              <p className="text-gray-400 text-sm py-6 text-center">警戒案件はありません ✅</p>
            ) : (
              <div className="space-y-2">
                {alertProjects.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.type} · {p.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-500 font-bold text-sm">{p.rate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400">{fmtCurrency(p.amount - p.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 直近タスク */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              📅 直近のタスク
              <span className="ml-2 text-xs text-gray-400 font-normal">次回アクション日順</span>
            </h2>
            {tasks.length === 0 ? (
              <p className="text-gray-400 text-sm py-6 text-center">タスクはありません</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(p => {
                  const daysLeft = Math.ceil(
                    (new Date(p.nextAction).getTime() - new Date("2026-05-24").getTime()) / 86400000
                  );
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.type} · {p.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-600 text-xs font-medium">{p.nextAction}</p>
                        <p className={`text-xs mt-0.5 ${daysLeft <= 1 ? "text-red-500" : "text-gray-400"}`}>
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

function SideItem({ href, emoji, label, active }: { href:string; emoji:string; label:string; active?:boolean }) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 border border-blue-100"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}>
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </Link>
  );
}

const ACCENT: Record<string, string> = {
  blue:    "border-blue-100   bg-blue-50",
  emerald: "border-emerald-100 bg-emerald-50",
  amber:   "border-amber-100  bg-amber-50",
};

function KpiCard({ emoji, label, value, sub, accent }: {
  emoji:string; label:string; value:string; sub:string; accent:string;
}) {
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm ${ACCENT[accent] ?? "border-gray-200"}`}>
      <div className="text-3xl mb-3 leading-none">{emoji}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
    </div>
  );
}
