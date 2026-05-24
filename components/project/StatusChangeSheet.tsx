"use client";

import { X } from "lucide-react";
import {
  SALES_STATUS_LABEL,
  SALES_STATUS_COLOR,
  SALES_STATUS_ORDER,
  type SalesStatus,
} from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  current: SalesStatus;
  onSelect: (status: SalesStatus) => void;
  onClose: () => void;
}

export function StatusChangeSheet({ current, onSelect, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">ステータス変更</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-3 pb-safe-bottom space-y-2 overflow-y-auto max-h-[60vh]">
          {SALES_STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                current === s
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "bg-gray-50 active:bg-gray-100"
              )}
            >
              <span className="text-gray-800">{SALES_STATUS_LABEL[s]}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs",
                  SALES_STATUS_COLOR[s]
                )}
              >
                {current === s ? "現在" : "変更"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
