"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, X, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { lsGetProjects } from "@/lib/local-store";
import type { ProjectWithDetails, WorkType, SalesStatus } from "@/types";
import {
  WORK_TYPE_LABEL,
  SALES_STATUS_LABEL,
  SALES_STATUS_COLOR,
} from "@/types";

// ── カラー設定 ──────────────────────────────────────────────────────────────

const WORK_TYPE_BAR: Record<WorkType, { bar: string; dot: string; bg: string; text: string }> = {
  exterior: { bar: "bg-blue-500",    dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700" },
  reform:   { bar: "bg-emerald-500", dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
  interior: { bar: "bg-violet-500",  dot: "bg-violet-400",  bg: "bg-violet-50",  text: "text-violet-700" },
};

const EVENT_KIND_LABEL: Record<"start"|"end"|"action", { label: string; color: string }> = {
  start:  { label: "着工日",         color: "text-blue-600 bg-blue-50 border-blue-200" },
  end:    { label: "完工予定日",      color: "text-gray-600 bg-gray-50 border-gray-200" },
  action: { label: "次回アクション",  color: "text-orange-600 bg-orange-50 border-orange-200" },
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

const ACTIVE_STATUSES: SalesStatus[] = ["contracted", "in_progress", "completed"];

// ── 型定義 ──────────────────────────────────────────────────────────────────

interface DayEvent {
  kind: "start" | "end" | "action";
  project: ProjectWithDetails;
}

// ── 日付ユーティリティ ───────────────────────────────────────────────────────

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function monthRange(year: number, month: number): [Date, Date] {
  return [new Date(year, month, 1), new Date(year, month + 1, 0)];
}

// ── 案件がこの月に「見える」か ───────────────────────────────────────────────

function projectVisibleInMonth(p: ProjectWithDetails, year: number, month: number): boolean {
  const [first, last] = monthRange(year, month);
  const c = p.construction;
  const start   = toDate(c?.start_date);
  const planned = toDate(c?.planned_end_date);
  const complete = toDate(c?.completion_date);
  const action  = toDate(p.next_action_date);
  const barEnd  = complete ?? planned;

  if (start && barEnd) { if (start <= last && barEnd >= first) return true; }
  else if (start)  { if (start  >= first && start  <= last) return true; }
  else if (barEnd) { if (barEnd >= first && barEnd <= last)  return true; }
  if (action && action >= first && action <= last) return true;
  return false;
}

// ── ガントバー計算 ───────────────────────────────────────────────────────────

function ganttBar(p: ProjectWithDetails, year: number, month: number): { left: number; width: number } | null {
  const [first, last] = monthRange(year, month);
  const total = last.getDate();
  const c = p.construction;
  const start   = toDate(c?.start_date);
  const planned = toDate(c?.planned_end_date);
  const complete = toDate(c?.completion_date);
  const barEnd  = complete ?? planned;
  if (!start && !barEnd) return null;

  const cs = start ? (start < first ? first : start) : first;
  const ce = barEnd ? (barEnd > last ? last : barEnd) : last;

  const left  = ((cs.getDate() - 1) / total) * 100;
  const width = ((ce.getDate() - cs.getDate() + 1) / total) * 100;
  return { left: Math.max(0, left), width: Math.max(2, width) };
}

// ── コンポーネント ───────────────────────────────────────────────────────────

export function CalendarClient() {
  const today = new Date();
  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      setProjects(res.ok ? (await res.json() as ProjectWithDetails[]) : lsGetProjects());
    } catch {
      setProjects(lsGetProjects());
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }

  // 初回データ取得
  useEffect(() => {
    loadProjects();
  }, []);

  // 月移動（選択日はリセット）
  function prevMonth() {
    setSelectedDay(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDay(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setSelectedDay(null);
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const days    = daysInMonth(year, month);
  const firstWd = firstWeekdayOfMonth(year, month);
  const gridCells: (number | null)[] = Array.from({ length: firstWd + days }, (_, i) =>
    i < firstWd ? null : i - firstWd + 1
  );
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  // この月の案件（開始日順）
  const visibleProjects = useMemo(
    () => projects
      .filter(p => projectVisibleInMonth(p, year, month))
      .sort((a, b) => (toDate(a.construction?.start_date)?.getTime() ?? 0) - (toDate(b.construction?.start_date)?.getTime() ?? 0)),
    [projects, year, month]
  );

  // 日 → イベント一覧（プロジェクト参照付き）
  const dayEvents = useMemo(() => {
    const map = new Map<number, DayEvent[]>();
    const [first, last] = monthRange(year, month);

    for (const p of projects) {
      const c = p.construction;
      const start   = toDate(c?.start_date);
      const planned = toDate(c?.planned_end_date);
      const complete = toDate(c?.completion_date);
      const action  = toDate(p.next_action_date);

      const push = (d: Date, kind: DayEvent["kind"]) => {
        if (d < first || d > last) return;
        const day = d.getDate();
        const list = map.get(day) ?? [];
        list.push({ kind, project: p });
        map.set(day, list);
      };

      if (start)    push(start, "start");
      if (complete) push(complete, "end");
      else if (planned) push(planned, "end");
      if (action)   push(action, "action");
    }
    return map;
  }, [projects, year, month]);

  // 選択日のイベント
  const selectedEvents = selectedDay ? (dayEvents.get(selectedDay) ?? []) : [];
  const selectedDateStr = selectedDay
    ? `${month + 1}月${selectedDay}日（${WEEKDAY_JA[(firstWd + selectedDay - 1) % 7]}）`
    : "";

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const dayHeaders = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={prevMonth} className="flex items-center justify-center w-9 h-9 rounded-xl active:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <button onClick={goToday} className="flex flex-col items-center">
            <span className="text-base font-bold text-gray-900">{year}年{month + 1}月</span>
            {!isCurrentMonth && (
              <span className="text-[10px] text-blue-500 font-semibold -mt-0.5">今月に戻る</span>
            )}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center justify-center w-9 h-9 rounded-xl active:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="更新">
              <RefreshCw className={`h-4 w-4 text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={nextMonth} className="flex items-center justify-center w-9 h-9 rounded-xl active:bg-gray-100 transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 凡例 ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-50">
        {(["exterior","reform","interior"] as WorkType[]).map(wt => (
          <span key={wt} className="flex items-center gap-1 text-[11px] text-gray-500">
            <span className={cn("inline-block w-2.5 h-2.5 rounded-sm", WORK_TYPE_BAR[wt].bar)} />
            {WORK_TYPE_LABEL[wt]}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[11px] text-gray-500">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-400" />
          アクション
        </span>
      </div>

      {/* ── ミニカレンダーグリッド ── */}
      <div className="bg-white px-3 pt-3 pb-4 shadow-sm">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {["日","月","火","水","木","金","土"].map((d, i) => (
            <div key={d} className={cn(
              "text-center text-[10px] font-bold pb-1",
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            )}>{d}</div>
          ))}
        </div>

        {/* 日付セル（タップ可能） */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {gridCells.map((day, idx) => {
            if (!day) return <div key={`e${idx}`} />;
            const isToday    = isCurrentMonth && day === today.getDate();
            const isSelected = day === selectedDay;
            const events     = dayEvents.get(day) ?? [];
            const weekday    = (firstWd + day - 1) % 7;
            const hasEvents  = events.length > 0;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "flex flex-col items-center py-1 rounded-xl transition-colors",
                  isSelected
                    ? "bg-blue-600"
                    : hasEvents
                    ? "active:bg-blue-50"
                    : "active:bg-gray-50"
                )}
              >
                <span className={cn(
                  "text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                  isSelected  ? "text-white" :
                  isToday     ? "bg-blue-600 text-white" :
                  weekday === 0 ? "text-red-400" :
                  weekday === 6 ? "text-blue-500" :
                  "text-gray-700"
                )}>
                  {day}
                </span>
                {/* イベントドット（最大3件） */}
                <div className="flex gap-[2px] h-2 items-center mt-0.5">
                  {events.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white/70" :
                        ev.kind === "action" ? "bg-orange-400" :
                        WORK_TYPE_BAR[ev.project.work_type].dot
                      )}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 選択日の詳細パネル ── */}
      {selectedDay !== null && (
        <div className="mx-3 mt-3 rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-150">
          {/* パネルヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600">
            <div>
              <p className="text-white font-bold text-sm">{selectedDateStr}</p>
              <p className="text-blue-200 text-[11px] mt-0.5">
                {selectedEvents.length === 0 ? "予定なし" : `${selectedEvents.length}件の予定`}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 active:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* イベント一覧 */}
          {selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-300">
              <p className="text-2xl mb-1">📅</p>
              <p className="text-sm">この日の予定はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedEvents.map((ev, i) => {
                const p = ev.project;
                const kindInfo = EVENT_KIND_LABEL[ev.kind];
                const colors   = WORK_TYPE_BAR[p.work_type];
                return (
                  <Link
                    key={`${p.id}-${ev.kind}-${i}`}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-blue-50/50 transition-colors"
                  >
                    {/* 工種カラーバー */}
                    <span className={cn("shrink-0 w-1 h-10 rounded-full", colors.bar)} />

                    {/* 情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          kindInfo.color
                        )}>
                          {kindInfo.label}
                        </span>
                        <span className={cn(
                          "text-[10px] font-semibold",
                          colors.text
                        )}>
                          {WORK_TYPE_LABEL[p.work_type]}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">{p.customer_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          SALES_STATUS_COLOR[p.status]
                        )}>
                          {SALES_STATUS_LABEL[p.status]}
                        </span>
                        {p.construction?.start_date && (
                          <span className="text-[10px] text-gray-400">
                            着工: {p.construction.start_date.slice(5).replace("-", "/")}
                          </span>
                        )}
                        {(p.construction?.planned_end_date || p.construction?.completion_date) && (
                          <span className="text-[10px] text-gray-400">
                            完工: {(p.construction.completion_date ?? p.construction.planned_end_date)!.slice(5).replace("-", "/")}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ガントチャート ── */}
      <div className="mt-3 mx-3 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            工程スケジュール
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {visibleProjects.length}件
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-300 text-sm">
            <span className="h-5 w-5 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin mr-2" />
            読み込み中...
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-300 text-sm">
            <p className="text-2xl mb-2">📅</p>
            <p>この月の工程はありません</p>
          </div>
        ) : (
          <>
            {/* 日付ヘッダー */}
            <div className="flex border-b border-gray-100">
              <div className="w-[110px] shrink-0 border-r border-gray-100" />
              <div className="flex-1 relative overflow-hidden">
                <div className="flex">
                  {dayHeaders.map(d => {
                    const isTodayCol = isCurrentMonth && d === today.getDate();
                    const isSelCol   = d === selectedDay;
                    return (
                      <div
                        key={d}
                        className={cn(
                          "flex-1 text-center py-1.5 text-[9px] font-semibold transition-colors",
                          isSelCol  ? "text-blue-600 bg-blue-50" :
                          isTodayCol ? "text-red-500 bg-red-50/50" : "text-gray-300",
                          d % 5 === 1 || d === 1 ? "" : "opacity-0 pointer-events-none select-none"
                        )}
                        style={{ minWidth: 0 }}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 案件行 */}
            {visibleProjects.map((p) => {
              const bar       = ganttBar(p, year, month);
              const action    = toDate(p.next_action_date);
              const isAction  = action && action.getFullYear() === year && action.getMonth() === month;
              const actionDay = action?.getDate() ?? null;
              const colors    = WORK_TYPE_BAR[p.work_type];
              const isHighlighted = selectedDay !== null && (() => {
                const evs = dayEvents.get(selectedDay) ?? [];
                return evs.some(e => e.project.id === p.id);
              })();

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={cn(
                    "flex border-b border-gray-50 last:border-0 transition-colors",
                    isHighlighted ? "bg-blue-50/60 active:bg-blue-100/50" : "active:bg-blue-50/40"
                  )}
                >
                  {/* 案件名列 */}
                  <div className={cn(
                    "w-[110px] shrink-0 px-2.5 py-2.5 border-r flex flex-col justify-center gap-0.5",
                    isHighlighted ? "border-blue-100" : "border-gray-100"
                  )}>
                    <p className="text-[11px] font-bold text-gray-800 leading-tight truncate">
                      {p.customer_name}
                    </p>
                    <span className={cn("self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full", SALES_STATUS_COLOR[p.status])}>
                      {SALES_STATUS_LABEL[p.status]}
                    </span>
                  </div>

                  {/* ガントバー列 */}
                  <div className="flex-1 relative py-3 overflow-hidden">
                    {/* 選択日ハイライト列 */}
                    {selectedDay && (
                      <div
                        className="absolute top-0 bottom-0 bg-blue-400/10 pointer-events-none"
                        style={{
                          left: `${((selectedDay - 1) / days) * 100}%`,
                          width: `${(1 / days) * 100}%`,
                        }}
                      />
                    )}
                    {/* 今日ライン */}
                    {isCurrentMonth && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400/40 pointer-events-none z-10"
                        style={{ left: `${((today.getDate() - 0.5) / days) * 100}%` }}
                      />
                    )}
                    {/* 5日グリッド */}
                    {[5,10,15,20,25].map(d => (
                      <div
                        key={d}
                        className="absolute top-0 bottom-0 w-px bg-gray-100 pointer-events-none"
                        style={{ left: `${((d - 0.5) / days) * 100}%` }}
                      />
                    ))}
                    {/* 施工バー */}
                    {bar && (
                      <div
                        className={cn("absolute top-1/2 -translate-y-1/2 h-4 rounded-full opacity-85", colors.bar)}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                      />
                    )}
                    {/* 端マーカー */}
                    {bar && (
                      <>
                        <div className={cn("absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white z-10", colors.bar)}
                          style={{ left: `calc(${bar.left}% - 4px)` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-400 z-10"
                          style={{ left: `calc(${bar.left + bar.width}% - 8px)` }} />
                      </>
                    )}
                    {/* アクション日マーカー */}
                    {isAction && actionDay && (
                      <div
                        className="absolute top-0.5 w-4 h-4 flex items-center justify-center z-10"
                        style={{ left: `calc(${((actionDay - 0.5) / days) * 100}% - 8px)` }}
                      >
                        <span className="text-orange-500 text-[10px] font-bold leading-none">▲</span>
                      </div>
                    )}
                    {!bar && !isAction && (
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] text-gray-300 font-medium">日程未定</span>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* 凡例フッター */}
            {isCurrentMonth && (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border-t border-gray-100">
                <span className="inline-block w-px h-3 bg-red-400" />
                <span className="text-[10px] text-gray-400">今日</span>
                <span className="ml-3 inline-block w-3 h-1.5 rounded-full bg-blue-500 opacity-85" />
                <span className="text-[10px] text-gray-400">施工期間</span>
                <span className="ml-3 text-orange-500 text-[9px] font-bold">▲</span>
                <span className="text-[10px] text-gray-400">アクション日</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 日程未登録案件 ── */}
      {!loading && (() => {
        const noDate = projects.filter(p =>
          ACTIVE_STATUSES.includes(p.status) &&
          !p.construction?.start_date &&
          !p.construction?.planned_end_date &&
          !projectVisibleInMonth(p, year, month)
        );
        if (noDate.length === 0) return null;
        return (
          <div className="mt-3 mx-3 rounded-2xl border border-orange-100 bg-orange-50/60 overflow-hidden">
            <p className="text-[11px] font-bold text-orange-700 px-4 py-2.5 border-b border-orange-100">
              ⚠️ 日程未登録の案件（{noDate.length}件）
            </p>
            {noDate.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-orange-100/50 last:border-0 active:bg-orange-100/50 transition-colors"
              >
                <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full", WORK_TYPE_BAR[p.work_type].dot)} />
                <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{p.customer_name}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", SALES_STATUS_COLOR[p.status])}>
                  {SALES_STATUS_LABEL[p.status]}
                </span>
              </Link>
            ))}
          </div>
        );
      })()}

      <p className="text-center text-[10px] text-gray-300 mt-6 mb-2">
        着工日・完工予定日は案件 → 編集から登録できます
      </p>
    </div>
  );
}
