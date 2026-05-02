import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ForecastPage } from "@/components/forecast/ForecastPage";
import { useAI } from "@/hooks/useAI";

function ForecastRoute() {
  const { getForecast } = useAI();
  return (
    <AppShell>
      <ForecastPage onForecast={getForecast} />
    </AppShell>
  );
}

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Sales Forecast — BizAssist AI" }] }),
  component: ForecastRoute,
});
