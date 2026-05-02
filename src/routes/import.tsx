import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ImportPage } from "@/components/import/ImportPage";
import { useAI } from "@/hooks/useAI";

function ImportRoute() {
  const { parseWhatsApp } = useAI();
  return (
    <AppShell>
      <ImportPage onParse={parseWhatsApp} />
    </AppShell>
  );
}

export const Route = createFileRoute("/import")({
  head: () => ({ meta: [{ title: "AI Import — BizAssist AI" }] }),
  component: ImportRoute,
});
