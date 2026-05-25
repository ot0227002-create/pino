"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, FolderOpen, PlusCircle, Settings, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/summary",      icon: BarChart2,     label: "収益"   },
  { href: "/projects",     icon: FolderOpen,    label: "案件"   },
  { href: "/projects/new", icon: PlusCircle,    label: "新規",  accent: true },
  { href: "/calendar",     icon: CalendarDays,  label: "工程"   },
  { href: "/settings",     icon: Settings,      label: "設定"   },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white"
      style={{
        borderTop: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.04), 0 -4px 16px rgba(0,0,0,0.05)",
      }}
    >
      <div
        className="flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {NAV.map(({ href, icon: Icon, label, accent }) => {
          const active =
            href === "/projects"
              ? pathname === "/projects" ||
                (pathname.startsWith("/projects/") && pathname !== "/projects/new")
              : pathname === href || (href !== "/projects/new" && href !== "/projects" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 select-none transition-colors duration-100",
                active
                  ? "text-blue-600"
                  : accent
                  ? "text-blue-500"
                  : "text-gray-400"
              )}
            >
              {accent ? (
                <span
                  className={cn(
                    "flex items-center justify-center rounded-xl transition-all",
                    active
                      ? "bg-blue-600 text-white w-10 h-10"
                      : "bg-blue-50 text-blue-500 w-10 h-10"
                  )}
                >
                  <Icon className="h-[22px] w-[22px] stroke-[1.8]" />
                </span>
              ) : (
                <Icon
                  className={cn(
                    "h-[26px] w-[26px] transition-all",
                    active ? "stroke-[2.2]" : "stroke-[1.6]"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-[11px] font-semibold leading-none",
                  active ? "text-blue-600" : accent ? "text-blue-500" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
