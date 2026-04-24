import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesPage } from "@/components/chat/MessagesPage";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — BizAssist AI" }] }),
  component: () => (
    <AppShell>
      <MessagesPage />
    </AppShell>
  ),
});
