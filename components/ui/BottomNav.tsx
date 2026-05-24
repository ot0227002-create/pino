"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderOpen, BarChart2, PlusCircle, Settings, ArrowLeft, ArrowRight } from "lucide-react";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe-bottom">
      {/* ナビゲーション操作バー（戻る・進む・更新） */}
      <div className="flex items-center border-b border-gray-100 px-2 gap-1">
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="flex items-center justify-center w-11 h-11 rounded-xl text-gray-500 active:bg-gray-100 active:text-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => window.history.forward()}
          aria-label="進む"
          className="flex items-center justify-center w-11 h-11 rounded-xl text-gray-500 active:bg-gray-100 active:text-gray-800 transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-300 pr-2">こばかいアプリ</span>
      </div>

      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/projects"
              ? (pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new"))
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                active ? "text-blue-600" : "text-gray-400"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
