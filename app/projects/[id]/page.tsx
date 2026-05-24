import { notFound } from "next/navigation";
import { getProjectWithDetails } from "@/lib/mock-data";
import { ProjectDetailClient } from "./ProjectDetailClient";

interface Props {
  params: { id: string };
}

export default function ProjectDetailPage({ params }: Props) {
  const project = getProjectWithDetails(params.id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
