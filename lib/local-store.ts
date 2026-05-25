/**
 * localStorage-based persistence layer for offline/mock mode.
 * Used when hasSupabase is false.
 *
 * Keys:
 *   ls_projects_v2     – Project[]
 *   ls_constructions_v2 – ConstructionDetails[]
 *   lsphotos_${id}     – LocalPhoto[] (managed by PhotoUpload component)
 */

import type {
  Project,
  ConstructionDetails,
  ProjectWithDetails,
  WorkItem,
} from "@/types";
import { calcProfit } from "./profit";

// ── Seed data (only used on first run when localStorage is empty) ──
import { PROJECTS as SEED_PROJECTS, CONSTRUCTIONS as SEED_CONSTRUCTIONS } from "./mock-data";

const KEY_PROJECTS = "ls_projects_v2";
const KEY_CONSTRUCTIONS = "ls_constructions_v2";
const KEY_WORK_ITEMS = "ls_work_items_v1"; // { [projectId]: WorkItem[] }

// ── Low-level helpers ─────────────────────────────────────────────

function readProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY_PROJECTS);
    if (raw) return JSON.parse(raw) as Project[];
  } catch { /* ignore */ }
  // First launch: seed with demo data
  const seed = [...SEED_PROJECTS];
  writeProjects(seed);
  return seed;
}

function writeProjects(list: Project[]) {
  try {
    localStorage.setItem(KEY_PROJECTS, JSON.stringify(list));
  } catch (e) {
    console.error("[local-store] writeProjects failed", e);
  }
}

function readConstructions(): ConstructionDetails[] {
  try {
    const raw = localStorage.getItem(KEY_CONSTRUCTIONS);
    if (raw) return JSON.parse(raw) as ConstructionDetails[];
  } catch { /* ignore */ }
  // First launch: seed with demo data
  const seed = [...SEED_CONSTRUCTIONS];
  writeConstructions(seed);
  return seed;
}

function writeConstructions(list: ConstructionDetails[]) {
  try {
    localStorage.setItem(KEY_CONSTRUCTIONS, JSON.stringify(list));
  } catch (e) {
    console.error("[local-store] writeConstructions failed", e);
  }
}

function readAllWorkItems(): Record<string, WorkItem[]> {
  try {
    const raw = localStorage.getItem(KEY_WORK_ITEMS);
    if (raw) return JSON.parse(raw) as Record<string, WorkItem[]>;
  } catch { /* ignore */ }
  return {};
}

function writeAllWorkItems(map: Record<string, WorkItem[]>) {
  try {
    localStorage.setItem(KEY_WORK_ITEMS, JSON.stringify(map));
  } catch (e) {
    console.error("[local-store] writeWorkItems failed", e);
  }
}

function readLocalPhotos(projectId: string) {
  try {
    return JSON.parse(localStorage.getItem(`lsphotos_${projectId}`) ?? "[]");
  } catch { return []; }
}

function buildWithDetails(projects: Project[]): ProjectWithDetails[] {
  const constructions = readConstructions();
  return projects
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.created_at).getTime();
      const tb = new Date(b.updated_at ?? b.created_at).getTime();
      return tb - ta; // newest first
    })
    .map((p) => {
      const construction = constructions.find((c) => c.project_id === p.id);
      const photos = readLocalPhotos(p.id);
      const images = photos.map((ph: { id: string; dataUrl: string; category: string; createdAt: string }) => ({
        id: ph.id,
        project_id: p.id,
        image_url: ph.dataUrl,
        category: ph.category,
        created_at: ph.createdAt,
      }));
      const workItemsMap = readAllWorkItems();
      const work_items: WorkItem[] = workItemsMap[p.id] ?? [];
      const profit = construction ? calcProfit(construction) : undefined;
      return {
        ...p,
        construction: construction ? { ...construction, work_items } : undefined,
        images,
        profit,
      };
    });
}

// ── PUBLIC CRUD API ───────────────────────────────────────────────

/** 全案件を取得（最新順） */
export function lsGetProjects(): ProjectWithDetails[] {
  return buildWithDetails(readProjects());
}

/** 1件取得 */
export function lsGetProject(id: string): ProjectWithDetails | undefined {
  return lsGetProjects().find((p) => p.id === id);
}

/** 新規案件作成。作成された Project を返す */
export function lsCreateProject(
  data: Omit<Project, "id" | "created_at" | "updated_at">
): Project {
  const projects = readProjects();
  const now = new Date().toISOString();
  const project: Project = {
    ...data,
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: now,
    updated_at: now,
  };
  projects.unshift(project);
  writeProjects(projects);
  return project;
}

/** 案件を更新 */
export function lsUpdateProject(
  id: string,
  data: Partial<Omit<Project, "id" | "created_at">>
): void {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return;
  projects[idx] = {
    ...projects[idx],
    ...data,
    updated_at: new Date().toISOString(),
  };
  writeProjects(projects);
}

/** 案件を削除（工事情報・工事項目・写真も連動削除） */
export function lsDeleteProject(id: string): void {
  writeProjects(readProjects().filter((p) => p.id !== id));
  writeConstructions(readConstructions().filter((c) => c.project_id !== id));
  const wm = readAllWorkItems();
  delete wm[id];
  writeAllWorkItems(wm);
  try { localStorage.removeItem(`lsphotos_${id}`); } catch { /* ignore */ }
}

/** 工事情報を取得 */
export function lsGetConstruction(projectId: string): ConstructionDetails | undefined {
  return readConstructions().find((c) => c.project_id === projectId);
}

/** 工事情報を保存（存在すれば更新、なければ新規） */
export function lsUpsertConstruction(
  data: Partial<ConstructionDetails> & { project_id: string }
): void {
  const list = readConstructions();
  const idx = list.findIndex((c) => c.project_id === data.project_id);
  const now = new Date().toISOString();

  const defaults: Omit<ConstructionDetails, "id" | "created_at" | "updated_at"> = {
    project_id: data.project_id,
    description: null,
    construction_period: null,
    start_date: null,
    planned_end_date: null,
    completion_date: null,
    site_memo: null,
    is_contracted: false,
    contract_date: null,
    contract_amount: null,
    subcontractor_cost: null,
    material_cost: null,
    other_cost: null,
  };

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...data, updated_at: now };
  } else {
    list.push({
      ...defaults,
      ...data,
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: now,
      updated_at: now,
    });
  }
  writeConstructions(list);
}

/** 工事項目を保存（全置き換え） */
export function lsSaveWorkItems(projectId: string, items: WorkItem[]): void {
  const map = readAllWorkItems();
  map[projectId] = items.map((item, i) => ({ ...item, sort_order: i }));
  writeAllWorkItems(map);
}

/** 工事項目を取得 */
export function lsGetWorkItems(projectId: string): WorkItem[] {
  return readAllWorkItems()[projectId] ?? [];
}
