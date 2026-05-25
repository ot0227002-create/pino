"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { lsGetProjects } from "@/lib/local-store";
import type { ProjectWithDetails, WorkType, SalesStatus } from "@/types";
import {
  WORK_TYPE_LABEL,
  SALES_STATUS_LABEL,
  SALES_STATUS_COLOR,
} from "@/types";

// ── カラー設定 ──────────────────────────────────────────────────────────────

const WORK_TYPE_BAR: Record<WorkType, { bar: string; dot: string; bg: string }> = {
  exterior: { bar: "bg-blue-500",    dot: "bg-blue-400",   bg: "bg-blue-50"   },
  reform:   { bar: "bg-emerald-500", dot: "bg-emerald-400",bg: "bg-emerald-50"},
  interior: { bar: "bg-violet-500",  dot: "bg-violet-400", bg: "bg-violet-50" },
};

const ACTIVE_STATUSES: SalesStatus[] = ["contracted", "in_progress", "completed"];

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
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// 月の [1 日, 末日] のDate
function monthRange(year: number, month: number): [Date, Date] {
  return [new Date(year, month, 1), new Date(year, month + 1, 0)];
}

// ── 案件がこの月に「見える」か ───────────────────────────────────────────────

function projectVisibleInMonth(
  p: ProjectWithDetails,
  year: number,
  month: number
): boolean {
  const [first, last] = monthRange(year, month);
  const c = p.construction;

  const start     = toDate(c?.start_date);
  const planned   = toDate(c?.planned_end_date);
  const complete  = toDate(c?.completion_date);
  const action    = toDate(p.next_action_date);

  // 施工期間がこの月と重なる
  const barStart = start;
  const barEnd   = complete ?? planned;
  if (barStart && barEnd) {
    if (barStart <= last && barEnd >= first) return true;
  } else if (barStart) {
    if (barStart >= first && barStart <= last) return true;
  } else if (barEnd) {
    if (barEnd >= first && barEnd <= last) return true;
  }

  // 次回アクション日がこの月
  if (action && action >= first && action <= last) return true;

  return false;
}

// ── ガントバー計算 ───────────────────────────────────────────────────────────

function ganttBar(
  p: ProjectWithDetails,
  year: number,
  month: number
): { left: number; width: number } | null {
  const [first, last] = monthRange(year, month);
  const total = last.getDate();
  const c = p.construction;
  const start   = toDate(c?.start_date);
  const planned = toDate(c?.planned_end_date);
  const complete = toDate(c?.completion_date);
  const barEnd = complete ?? planned;

  if (!start && !barEnd) return null;

  // 月内にクリップ
  const clampedStart = start ? (start < first ? first : start) : first;
  const clampedEnd   = barEnd ? (barEnd > last ? last : barEnd) : last;

  const startDay = clampedStart.getDate();
  const endDay   = clampedEnd.getDate();

  const left  = ((startDay - 1) / total) * 100;
  const width = ((endDay - startDay + 1) / total) * 100;

  return { left: Math.max(0, left), width: Math.max(2, width) };
}

// ── コンポーネント ───────────────────────────────────────────────────────────

export function CalendarClient() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading]   = useState(true);

  // データ取得
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json() as ProjectWithDetails[];
          setProjects(data);
        } else {
          setProjects(lsGetProjects());
        }
      } catch {
        setProjects(lsGetProjects());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 月移動
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  // カレンダーグリッド用データ
  const days = daysInMonth(year, month);
  const firstWd = firstWeekdayOfMonth(year, month);
  const gridCells = Array.from({ length: firstWd + days }, (_, i) =>
    i < firstWd ? null : i - firstWd + 1
  );
  // 6行に揃える
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  // この月に表示する案件
  const visibleProjects = useMemo(
    () => projects
      .filter(p => projectVisibleInMonth(p, year, month))
      .sort((a, b) => {
        const sa = toDate(a.construction?.start_date)?.getTime() ?? 0;
        const sb = toDate(b.construction?.start_date)?.getTime() ?? 0;
        return sa - sb;
      }),
    [projects, year, month]
  );

  // カレンダーセルのイベントマーカー（日 → 案件リスト）
  const dayEvents = useMemo(() => {
    const map = new Map<number, { type: WorkType; kind: "start"|"end"|"action" }[]>();
    const [first, last] = monthRange(year, month);

    for (const p of projects) {
      const c = p.construction;
      const start    = toDate(c?.start_date);
      const planned  = toDate(c?.planned_end_date);
      const complete = toDate(c?.completion_date);
      const action   = toDate(p.next_action_date);

      const addTo = (d: Date, kind: "start"|"end"|"action") => {
        if (d >= first && d <= last) {
          const day = d.getDate();
          const list = map.get(day) ?? [];
          list.push({ type: p.work_type, kind });
          map.set(day, list);
        }
      };

      if (start)    addTo(start, "start");
      if (complete) addTo(complete, "end");
      else if (planned) addTo(planned, "end");
      if (action)   addTo(action, "action");
    }
    return map;
  }, [projects, year, month]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // ── 日付ヘッダー（ガント用） ────────────────────────────────────────────────
  const dayHeaders = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-12">
          {/* 月移動 */}
          <button onClick={prevMonth} className="flex items-center justify-center w-9 h-9 rounded-xl active:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>

          <button onClick={goToday} className="flex flex-col items-center">
            <span className="text-base font-bold text-gray-900">
              {year}年{month + 1}月
            </span>
            {!isCurrentMonth && (
              <span className="text-[10px] text-blue-500 font-semibold -mt-0.5">今月に戻る</span>
            )}
          </button>

          <button onClick={nextMonth} className="flex items-center justify-center w-9 h-9 rounded-xl active:bg-gray-100 transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
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
          次回アクション
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

        {/* 日付セル */}
        <div className="grid grid-cols-7 gap-y-1">
          {gridCells.map((day, idx) => {
            if (!day) return <div key={`e${idx}`} />;
            const isToday = isCurrentMonth && day === today.getDate();
            const events  = dayEvents.get(day) ?? [];
            const weekday = (firstWd + day - 1) % 7;

            return (
              <div key={day} className="flex flex-col items-center gap-0.5">
                <span className={cn(
                  "text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                  isToday   ? "bg-blue-600 text-white" :
                  weekday === 0 ? "text-red-400" :
                  weekday === 6 ? "text-blue-500" :
                  "text-gray-700"
                )}>
                  {day}
                </span>
                {/* イベントドット (最大3件) */}
                <div className="flex gap-[2px] h-2 items-center">
                  {events.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        ev.kind === "action"
                          ? "bg-orange-400"
                          : WORK_TYPE_BAR[ev.type].dot
                      )}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ガントチャート ── */}
      <div className="mt-3 mx-3 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">

        {/* タイトル */}
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
            {/* 日付ヘッダー（ガント列） */}
            <div className="flex border-b border-gray-100">
              {/* 案件名列 */}
              <div className="w-[110px] shrink-0 border-r border-gray-100" />
              {/* 日付バー */}
              <div className="flex-1 relative overflow-hidden">
                <div className="flex">
                  {dayHeaders.map(d => {
                    const isToday = isCurrentMonth && d === today.getDate();
                    return (
                      <div
                        key={d}
                        className={cn(
                          "flex-1 text-center py-1.5 text-[9px] font-semibold",
                          isToday ? "text-blue-600 bg-blue-50" : "text-gray-300",
                          d % 5 === 1 || d === 1 ? "" : "opacity-0 pointer-events-none"
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
              const c = p.construction;
              const bar      = ganttBar(p, year, month);
              const action   = toDate(p.next_action_date);
              const isAction = action && action.getFullYear() === year && action.getMonth() === month;
              const actionDay = action ? action.getDate() : null;
              const colors   = WORK_TYPE_BAR[p.work_type];

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex border-b border-gray-50 last:border-0 active:bg-blue-50/40 transition-colors"
                >
                  {/* 案件名列 */}
                  <div className="w-[110px] shrink-0 px-2.5 py-2.5 border-r border-gray-100 flex flex-col justify-center gap-0.5">
                    <p className="text-[11px] font-bold text-gray-800 leading-tight truncate">
                      {p.customer_name}
                    </p>
                    <span className={cn(
                      "self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                      SALES_STATUS_COLOR[p.status]
                    )}>
                      {SALES_STATUS_LABEL[p.status]}
                    </span>
                  </div>

                  {/* ガントバー列 */}
                  <div className="flex-1 relative py-3 overflow-hidden">
                    {/* 今日ライン */}
                    {isCurrentMonth && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400/40 pointer-events-none z-10"
                        style={{ left: `${((today.getDate() - 0.5) / days) * 100}%` }}
                      />
                    )}

                    {/* 5日ごとのグリッド線 */}
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
                        style={{
                          left: `${bar.left}%`,
                          width: `${bar.width}%`,
                        }}
                      />
                    )}

                    {/* 着工・完工の端マーカー */}
                    {bar && (
                      <>
                        {/* 着工マーカー（▶） */}
                        <div
                          className={cn("absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white", colors.bar)}
                          style={{ left: `calc(${bar.left}% - 4px)` }}
                        />
                        {/* 完工マーカー（◀） */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-400"
                          style={{ left: `calc(${bar.left + bar.width}% - 8px)` }}
                        />
                      </>
                    )}

                    {/* 次回アクション日マーカー */}
                    {isAction && actionDay && (
                      <div
                        className="absolute top-0.5 w-4 h-4 flex items-center justify-center"
                        style={{ left: `calc(${((actionDay - 0.5) / days) * 100}% - 8px)` }}
                        title={`次回アクション: ${actionDay}日`}
                      >
                        <span className="text-orange-500 text-[10px] font-bold leading-none">▲</span>
                      </div>
                    )}

                    {/* バーがない場合のラベル */}
                    {!bar && !isAction && (
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] text-gray-300 font-medium">
                        日程未定
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* 今日ライン説明 */}
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

      {/* ── 日程なし案件（施工中・契約済のみ） ── */}
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
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-orange-100/50 last:border-0 active:bg-orange-100/50 transition-colors"
              >
                <span className={cn(
                  "shrink-0 w-1.5 h-1.5 rounded-full",
                  WORK_TYPE_BAR[p.work_type].dot
                )} />
                <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
                  {p.customer_name}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  SALES_STATUS_COLOR[p.status]
                )}>
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
