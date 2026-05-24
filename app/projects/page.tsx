import { getProjectsWithDetails } from "@/lib/mock-data";
import { ProjectListClient } from "./ProjectListClient";

export default function ProjectsPage() {
  const projects = getProjectsWithDetails();
  return <ProjectListClient projects={projects} />;
}
