export const runtime = "edge";

import { ProjectListClient } from "./ProjectListClient";
import { AuthGuard } from "@/components/ui/AuthGuard";

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectListClient />
    </AuthGuard>
  );
}
