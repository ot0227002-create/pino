"use client";

import Link from "next/link";
import {
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProfitCard } from "@/components/ui/ProfitCard";
import { WORK_TYPE_LABEL } from "@/types";
import type { ProjectWithDetails } from "@/types";

interface Props {
  project: ProjectWithDetails;
}

export function ProjectCard({ project }: Props) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 詳細ページへのナビゲーション領域 */}
      <Link
        href={`/projects/${project.id}`}
        className="block p-4 pb-3 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">
              {project.customer_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{WORK_TYPE_LABEL[project.work_type]}</p>
              {project.target_month && (
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 leading-none">
                  {project.target_month.replace(/^(\d{4})-0?(\d+)$/, "$2月")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={project.status} />
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
        </div>

        {project.next_action_date && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>次回アクション: {project.next_action_date}</span>
          </div>
        )}

        {project.profit && project.profit.contract_amount > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <ProfitCard profit={project.profit} compact />
          </div>
        )}
      </Link>

      {/* 電話 / マップ ワンタップ操作バー */}
      <div className="flex border-t border-gray-100 divide-x divide-gray-100">
        <a
          href={`tel:${project.phone}`}
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold text-blue-600 active:bg-blue-50 transition-colors"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{project.phone || "電話番号なし"}</span>
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 py-3 px-2 text-xs font-semibold text-emerald-600 active:bg-emerald-50 transition-colors"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{project.address || "住所なし"}</span>
        </a>
      </div>
    </div>
  );
}
