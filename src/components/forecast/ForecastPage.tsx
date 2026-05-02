import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, Target, Zap, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/appContext";

type ForecastResult = {
  predictions: { date: string; predicted: number; low: number; high: number }[];
  trend: string;
  trendPercentage: number;
  confidence: number;
  insights: string[];
  totalForecastRevenue: number;
  recommendedAction: string;
};

export function ForecastPage({ onForecast }: { onForecast: (days: number) => Promise<ForecastResult | null> }) {
  const { orders } = useApp();
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadForecast(14);
  }, []);

  const loadForecast = async (days: number) => {
    setLoading(true);
    const result = await onForecast(days);
    setForecast(result);
    setLoading(false);
  };

  const trendIcon = forecast?.trend === "up" ? TrendingUp : forecast?.trend === "down" ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  const chartData = forecast?.predictions.map((p) => ({
    ...p,
    date: p.date.slice(5),
  })) || [];

  return (
    <div className="h-full overflow-y-auto p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Sales Forecast</h2>
            <p className="text-xs text-muted-foreground">14-day revenue prediction with confidence bands</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => loadForecast(d)}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-semibold transition-colors",
                "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Generating forecast...</span>
        </div>
      )}

      {!loading && forecast && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-semibold">Predicted Revenue</span>
              </div>
              <div className="text-2xl font-black text-foreground">
                RM <AnimatedCounter target={forecast.totalForecastRevenue} />
              </div>
            </div>
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendIcon className={cn("h-4 w-4", forecast.trend === "up" ? "text-emerald-500" : "text-rose-500")} />
                <span className="text-xs text-muted-foreground font-semibold">Trend</span>
              </div>
              <div className={cn("text-2xl font-black", forecast.trend === "up" ? "text-emerald-500" : "text-rose-500")}>
                <AnimatedCounter target={forecast.trendPercentage} suffix="%" />
              </div>
            </div>
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground font-semibold">Confidence</span>
              </div>
              <div className="text-2xl font-black text-foreground">
                <AnimatedCounter target={forecast.confidence} suffix="%" />
              </div>
            </div>
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-violet-500" />
                <span className="text-xs text-muted-foreground font-semibold">Peak Day</span>
              </div>
              <div className="text-2xl font-black text-foreground">
                {forecast.predictions.length > 0
                  ? forecast.predictions.reduce((a, b) => a.predicted > b.predicted ? a : b).date.slice(5)
                  : "—"}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-bold text-lg text-foreground">Revenue Forecast</h3>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">AI Powered</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `RM${v}`} />
                <Tooltip formatter={(v: number) => [`RM${v}`, ""]} />
                <Area type="monotone" dataKey="high" stroke="none" fill="url(#bandGrad)" />
                <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={0.8} />
                <Area type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2} fill="url(#predGrad)" strokeDasharray="6 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI Insights
              </h4>
              <ul className="space-y-2">
                {forecast.insights.map((ins, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    {ins}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/15 dark:to-teal-500/15 rounded-2xl border border-emerald-200/50 dark:border-emerald-500/30 p-5">
              <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Recommended Action
              </h4>
              <p className="text-sm text-foreground font-medium">{forecast.recommendedAction}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
