"use client";

import { SALES_STATUS_LABEL, SALES_STATUS_ORDER, type SalesStatus } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  selected: SalesStatus | "all";
  onChange: (v: SalesStatus | "all") => void;
  counts: Partial<Record<SalesStatus | "all", number>>;
}

export function StatusFilter({ selected, onChange, counts }: Props) {
  const options: (SalesStatus | "all")[] = ["all", ...SALES_STATUS_ORDER];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {options.map((s) => {
        const isAll = s === "all";
        const label = isAll ? "すべて" : SALES_STATUS_LABEL[s];
        const count = counts[s] ?? 0;
        const active = selected === s;

        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                  active ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
