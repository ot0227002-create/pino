"use client";

export function LoadingSpinner({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
