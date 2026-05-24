"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, LogOut } from "lucide-react";
import { ProjectCard } from "@/components/project/ProjectCard";
import { StatusFilter } from "@/components/project/StatusFilter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase, hasSupabase } from "@/lib/supabase-client";
import { getProjectsWithDetails } from "@/lib/mock-data";
import { calcProfit } from "@/lib/profit";
import type { ProjectWithDetails, SalesStatus } from "@/types";

export function ProjectListClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SalesStatus | "all">("all");
  const [query, setQuery] = useState("");

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      if (!hasSupabase) {
        setProjects(getProjectsWithDetails());
        return;
      }

      const { data: projectData, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const ids = projectData.map((p: { id: string }) => p.id);
      const [{ data: constructions }, { data: images }] = await Promise.all([
        supabase.from("construction_details").select("*").in("project_id", ids),
        supabase.from("project_images").select("*").in("project_id", ids),
      ]);

      const combined: ProjectWithDetails[] = projectData.map((p: ProjectWithDetails) => {
        const construction = constructions?.find(
          (c: { project_id: string }) => c.project_id === p.id
        );
        const projectImages =
          images?.filter((i: { project_id: string }) => i.project_id === p.id) ?? [];
        const profit = construction ? calcProfit(construction) : undefined;
        return { ...p, construction, images: projectImages, profit };
      });

      setProjects(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus =
        statusFilter === "all" || p.status === statusFilter;
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
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-safe-top">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-bold text-gray-900">案件一覧</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center rounded-lg p-2 text-gray-400 active:text-gray-600"
              aria-label="ログアウト"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <Link
              href="/projects/new"
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              新規
            </Link>
          </div>
        </div>
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
        <div className="pb-3">
          <StatusFilter
            selected={statusFilter}
            onChange={setStatusFilter}
            counts={counts}
          />
        </div>
      </header>

      <main className="px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">該当する案件がありません</p>
          </div>
        ) : (
          filtered.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
      </main>

      <Link
        href="/projects/new"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg"
        aria-label="新規案件"
      >
        <Plus className="h-6 w-6 text-white" />
      </Link>
    </div>
  );
}
