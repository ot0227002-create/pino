"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, FolderOpen, PlusCircle, Settings, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/summary",      icon: BarChart2,  label: "サマリー" },
  { href: "/projects",     icon: FolderOpen, label: "案件" },
  { href: "/projects/new", icon: PlusCircle, label: "新規" },
  { href: "/settings",     icon: Settings,   label: "設定" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      {/* 戻る・進む */}
      <div className="flex items-center h-8 border-b border-gray-100 px-3 gap-0.5">
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 active:bg-gray-100 active:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => window.history.forward()}
          aria-label="進む"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 active:bg-gray-100 active:text-gray-700 transition-colors">
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        <span className="text-[9px] text-gray-300 pr-1">こばかいアプリ</span>
      </div>

      {/* タブバー — pb-safe-bottom でホームバーの上に逃がす */}
      <div className="flex pb-safe-bottom">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/projects"
              ? pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new")
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2.5 text-[10px] font-medium transition-colors select-none",
                active ? "text-blue-600" : "text-gray-400"
              )}
            >
              <Icon
                className={cn("h-6 w-6", active ? "stroke-[2.2]" : "stroke-[1.7]")}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
