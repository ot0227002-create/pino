"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, LayoutDashboard, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/projects", icon: FolderOpen, label: "案件" },
  { href: "/projects/new", icon: PlusCircle, label: "新規" },
  { href: "/dashboard", icon: LayoutDashboard, label: "集計" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe-bottom">
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/projects"
              ? pathname === "/projects" || pathname.startsWith("/projects/") && pathname !== "/projects/new"
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
