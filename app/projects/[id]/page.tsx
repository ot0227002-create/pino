import { notFound } from "next/navigation";
import { getProjectWithDetails } from "@/lib/mock-data";
import { ProjectDetailClient } from "./ProjectDetailClient";

export const runtime = "edge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = getProjectWithDetails(id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
