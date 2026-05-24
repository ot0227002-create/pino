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
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm active:bg-gray-50 transition-colors"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">
              {project.customer_name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {WORK_TYPE_LABEL[project.work_type]}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={project.status} />
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{project.address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>{project.phone}</span>
          </div>
          {project.next_action_date && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>次回アクション: {project.next_action_date}</span>
            </div>
          )}
        </div>

        {/* Profit row */}
        {project.profit && project.profit.contract_amount > 0 && (
          <div className="pt-1 border-t border-gray-100">
            <ProfitCard profit={project.profit} compact />
          </div>
        )}
      </div>
    </Link>
  );
}
