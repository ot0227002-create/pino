import type { ConstructionDetails, ProfitSummary } from "@/types";

export function calcProfit(d: ConstructionDetails): ProfitSummary {
  const contractAmount = d.contract_amount ?? 0;
  const subcontractor = d.subcontractor_cost ?? 0;
  const material = d.material_cost ?? 0;
  const other = d.other_cost ?? 0;

  const totalCost = subcontractor + material + other;
  const profit = contractAmount - totalCost;
  const profitRate = contractAmount > 0 ? (profit / contractAmount) * 100 : 0;

  return {
    contract_amount: contractAmount,
    total_cost: totalCost,
    profit,
    profit_rate: Math.round(profitRate * 10) / 10,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
