import { FileRoute } from "@tanstack/react-router";
import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";

export const Route = new FileRoute("/integrations").createRoute({
  component: IntegrationsPage,
});
