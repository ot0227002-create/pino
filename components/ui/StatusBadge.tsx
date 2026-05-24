"use client";

import { SALES_STATUS_COLOR, SALES_STATUS_LABEL, type SalesStatus } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  status: SalesStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        SALES_STATUS_COLOR[status],
        className
      )}
    >
      {SALES_STATUS_LABEL[status]}
    </span>
  );
}
