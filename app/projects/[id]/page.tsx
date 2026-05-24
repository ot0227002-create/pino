export const runtime = "edge";

import { ProjectDetailClient } from "./ProjectDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProjectDetailClient id={id} />;
}
