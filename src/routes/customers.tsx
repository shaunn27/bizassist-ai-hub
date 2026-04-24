import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CustomersPage } from "@/components/customers/CustomersPage";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — BizAssist AI" }] }),
  component: () => (
    <AppShell>
      <CustomersPage />
    </AppShell>
  ),
});
