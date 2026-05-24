"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, formatRate } from "@/lib/profit";
import type { ProfitSummary } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  profit: ProfitSummary;
  compact?: boolean;
}

export function ProfitCard({ profit, compact }: Props) {
  const isPositive = profit.profit > 0;
  const isNegative = profit.profit < 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const rateColor = isPositive
    ? "text-emerald-600"
    : isNegative
    ? "text-red-600"
    : "text-gray-500";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", rateColor)} />
        <span className={cn("text-sm font-semibold", rateColor)}>
          {formatRate(profit.profit_rate)}
        </span>
        <span className="text-xs text-gray-500">
          ({formatCurrency(profit.profit)})
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-500">利益サマリー</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400">請負金額</p>
          <p className="text-sm font-bold text-gray-900">
            {formatCurrency(profit.contract_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">原価合計</p>
          <p className="text-sm font-bold text-gray-900">
            {formatCurrency(profit.total_cost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">利益額</p>
          <p className={cn("text-sm font-bold", rateColor)}>
            {formatCurrency(profit.profit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">利益率</p>
          <div className={cn("flex items-center gap-1", rateColor)}>
            <Icon className="h-4 w-4" />
            <p className="text-sm font-bold">{formatRate(profit.profit_rate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
