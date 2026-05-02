import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CopilotPage } from "@/components/copilot/CopilotPage";
import { useAI } from "@/hooks/useAI";

function CopilotRoute() {
  const { chatCopilot } = useAI();
  return (
    <AppShell>
      <CopilotPage onChat={chatCopilot} />
    </AppShell>
  );
}

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — BizAssist AI" }] }),
  component: CopilotRoute,
});
