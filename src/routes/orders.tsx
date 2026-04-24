import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { OrdersPage } from "@/components/orders/OrdersPage";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — BizAssist AI" }] }),
  component: () => (<AppShell><OrdersPage /></AppShell>),
});
