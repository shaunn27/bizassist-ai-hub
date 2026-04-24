import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/components/analytics/DashboardPage";

export const Route = createFileRoute("/")({
  component: () => (
    <AppShell>
      <DashboardPage />
    </AppShell>
  ),
});
