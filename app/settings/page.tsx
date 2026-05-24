export const runtime = "edge";

import { SettingsClient } from "./SettingsClient";
import { AuthGuard } from "@/components/ui/AuthGuard";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
  );
}
