export const runtime = "edge";

import { SummaryClient } from "./SummaryClient";
import { AuthGuard } from "@/components/ui/AuthGuard";

export default function SummaryPage() {
  return (
    <AuthGuard>
      <SummaryClient />
    </AuthGuard>
  );
}
