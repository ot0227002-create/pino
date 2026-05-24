import { createClient } from "@supabase/supabase-js";
import type {
  Project,
  ConstructionDetails,
  ProjectImage,
} from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Projects ──────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(
  payload: Omit<Project, "id" | "created_at" | "updated_at">
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  payload: Partial<Omit<Project, "id" | "created_at" | "updated_at">>
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── ConstructionDetails ───────────────────────────

export async function fetchConstruction(
  projectId: string
): Promise<ConstructionDetails | null> {
  const { data, error } = await supabase
    .from("construction_details")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertConstruction(
  payload: Omit<ConstructionDetails, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): Promise<ConstructionDetails> {
  const { data, error } = await supabase
    .from("construction_details")
    .upsert({ ...payload, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── ProjectImages ─────────────────────────────────

export async function fetchImages(projectId: string): Promise<ProjectImage[]> {
  const { data, error } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadImage(
  projectId: string,
  file: File,
  category: ProjectImage["category"]
): Promise<ProjectImage> {
  const ext = file.name.split(".").pop();
  const path = `${projectId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("project-images")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("project-images")
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from("project_images")
    .insert({ project_id: projectId, image_url: publicUrl, category })
    .select()
    .single();
  if (error) throw error;
  return data;
}
