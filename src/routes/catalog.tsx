import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CatalogPage } from "@/components/catalog/CatalogPage";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Catalog — BizAssist AI" }] }),
  component: () => (
    <AppShell>
      <CatalogPage />
    </AppShell>
  ),
});
