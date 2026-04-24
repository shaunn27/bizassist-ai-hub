import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingsPage } from "@/components/meetings/MeetingsPage";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — BizAssist AI" }] }),
  component: () => (
    <AppShell>
      <MeetingsPage />
    </AppShell>
  ),
});
