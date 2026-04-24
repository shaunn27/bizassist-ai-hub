import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { AnalyticsPage } from "@/components/analytics/AnalyticsPage";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — BizAssist AI" }] }),
  component: () => (
    <AppShell>
      <AnalyticsPage />
    </AppShell>
  ),
});
