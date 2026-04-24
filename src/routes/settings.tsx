import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsPage } from "@/components/shared/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — BizAssist AI" }] }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});
