import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { IntelligencePage } from "@/components/intelligence/IntelligencePage";
import { useAI } from "@/hooks/useAI";

function IntelRoute() {
  const { getCompetitorIntel } = useAI();
  return (
    <AppShell>
      <IntelligencePage onAnalyze={getCompetitorIntel} />
    </AppShell>
  );
}

export const Route = createFileRoute("/intelligence")({
  head: () => ({ meta: [{ title: "Competitive Intel — BizAssist AI" }] }),
  component: IntelRoute,
});
