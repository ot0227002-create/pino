"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ProjectCard } from "@/components/project/ProjectCard";
import { StatusFilter } from "@/components/project/StatusFilter";
import type { ProjectWithDetails, SalesStatus } from "@/types";

interface Props {
  projects: ProjectWithDetails[];
}

export function ProjectListClient({ projects }: Props) {
  const [statusFilter, setStatusFilter] = useState<SalesStatus | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        p.customer_name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.phone.includes(q);
      return matchStatus && matchQuery;
    });
  }, [projects, statusFilter, query]);

  const counts = useMemo(() => {
    const result: Partial<Record<SalesStatus | "all", number>> = {
      all: projects.length,
    };
    projects.forEach((p) => {
      result[p.status] = (result[p.status] ?? 0) + 1;
    });
    return result;
  }, [projects]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-bold text-gray-900">案件一覧</h1>
          <Link
            href="/projects/new"
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white active:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新規
          </Link>
        </div>
        {/* Search */}
        <div className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="顧客名・住所・電話番号で検索"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {/* Status filter chips */}
        <div className="pb-3">
          <StatusFilter
            selected={statusFilter}
            onChange={setStatusFilter}
            counts={counts}
          />
        </div>
      </header>

      {/* List */}
      <main className="px-4 py-4 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">該当する案件がありません</p>
          </div>
        ) : (
          filtered.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
      </main>

      {/* FAB */}
      <Link
        href="/projects/new"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg active:bg-blue-700"
        aria-label="新規案件"
      >
        <Plus className="h-6 w-6 text-white" />
      </Link>
    </div>
  );
}
