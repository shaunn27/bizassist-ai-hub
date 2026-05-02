import { useState } from "react";
import { Swords, Sparkles, Target, AlertTriangle, TrendingUp, Shield, Zap } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/appContext";

type IntelResult = {
  competitorProfile: { name: string; estimatedSize: string; keyProducts: string[] };
  comparison: { categories: { name: string; yourScore: number; competitorScore: number }[] };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  recommendations: { action: string; priority: string; rationale: string }[];
};

export function IntelligencePage({ onAnalyze }: { onAnalyze: (info: string) => Promise<IntelResult | null> }) {
  const { business, products, orders, customers } = useApp();
  const [competitorInput, setCompetitorInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intel, setIntel] = useState<IntelResult | null>(null);

  const analyze = async () => {
    if (!competitorInput.trim()) return;
    setLoading(true);
    const result = await onAnalyze(competitorInput);
    setIntel(result);
    setLoading(false);
  };

  const radarData = intel?.comparison.categories.map((c) => ({
    category: c.name,
    You: c.yourScore,
    Competitor: c.competitorScore,
  })) || [];

  const priorityColor = (p: string) =>
    p === "high" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" :
    p === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
    "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300";

  return (
    <div className="h-full overflow-y-auto p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
          <Swords className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Competitor Intelligence</h2>
          <p className="text-xs text-muted-foreground">AI-powered competitive analysis with radar comparison & SWOT</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
        <label className="text-sm font-semibold text-foreground mb-2 block">Describe your competitor</label>
        <div className="flex gap-3">
          <textarea
            value={competitorInput}
            onChange={(e) => setCompetitorInput(e.target.value)}
            placeholder="e.g. Sweet Dreams Bakery - a local bakery in PJ specializing in custom cakes and pastries. They have strong Instagram presence..."
            className="flex-1 h-24 p-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={analyze}
            disabled={!competitorInput.trim() || loading}
            className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 disabled:opacity-40 hover:bg-primary-dark transition-colors self-end"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="h-6 w-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Analyzing competitor...</span>
        </div>
      )}

      {!loading && intel && (
        <>
          {/* Profile + Radar */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-rose-500" />
                <h3 className="font-bold text-foreground">Competitor Profile</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Name</span>
                  <p className="text-sm font-bold text-foreground">{intel.competitorProfile.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estimated Size</span>
                  <p className="text-sm font-semibold text-foreground capitalize">{intel.competitorProfile.estimatedSize}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Key Products</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intel.competitorProfile.keyProducts.map((p, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-medium">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 p-5 shadow-sm">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Swords className="h-5 w-5 text-violet-500" />
                Comparison Radar
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Radar name="You" dataKey="You" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Radar name="Competitor" dataKey="Competitor" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SWOT Grid */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-500" />
              SWOT Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "Strengths", items: intel.swot.strengths, color: "border-emerald-400 dark:border-emerald-600", bg: "bg-emerald-50/50 dark:bg-emerald-900/20", icon: TrendingUp },
                { title: "Weaknesses", items: intel.swot.weaknesses, color: "border-rose-400 dark:border-rose-600", bg: "bg-rose-50/50 dark:bg-rose-900/20", icon: AlertTriangle },
                { title: "Opportunities", items: intel.swot.opportunities, color: "border-sky-400 dark:border-sky-600", bg: "bg-sky-50/50 dark:bg-sky-900/20", icon: Sparkles },
                { title: "Threats", items: intel.swot.threats, color: "border-amber-400 dark:border-amber-600", bg: "bg-amber-50/50 dark:bg-amber-900/20", icon: Zap },
              ].map((section) => (
                <div key={section.title} className={cn("rounded-2xl border-2 p-4", section.color, section.bg)}>
                  <h4 className="font-bold text-sm text-foreground mb-2">{section.title}</h4>
                  <ul className="space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {intel.recommendations.map((r, i) => (
                <div key={i} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-xl border border-white/60 dark:border-slate-800/60 p-4 flex items-start gap-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold mt-0.5", priorityColor(r.priority))}>{r.priority.toUpperCase()}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
