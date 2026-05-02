import { useState, useEffect } from "react";
import { X, Sparkles, TrendingUp, Clock, MessageCircle, Star, AlertTriangle, Zap, Gift } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { cn } from "@/lib/utils";
import type { Customer } from "@/data/mockCustomers";

type Profile360 = {
  personality: string;
  personalityDescription: string;
  churnRisk: string;
  churnReason: string;
  predictedLTV: number;
  bestContactTime: string;
  communicationStyle: string;
  recommendedActions: { action: string; priority: string; expectedImpact: string }[];
  purchasePattern: string;
  sentimentTrend: { date: string; score: number }[];
  nextBestOffer: string;
  vipPotential: number;
};

const churnColor = (r: string) =>
  r === "low" ? "text-emerald-500" : r === "medium" ? "text-amber-500" : r === "high" ? "text-orange-500" : "text-rose-500";
const churnPct = (r: string) =>
  r === "low" ? 20 : r === "medium" ? 50 : r === "high" ? 75 : 90;
const churnGaugeColor = (r: string) =>
  r === "low" ? "#10b981" : r === "medium" ? "#f59e0b" : r === "high" ? "#f97316" : "#ef4444";

export function Customer360Modal({
  customer,
  onClose,
  onGenerate,
}: {
  customer: Customer;
  onClose: () => void;
  onGenerate: (c: Customer) => Promise<Profile360 | null>;
}) {
  const [profile, setProfile] = useState<Profile360 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    onGenerate(customer).then((r) => { setProfile(r); setLoading(false); });
  }, [customer.id]);

  const circumference = 2 * Math.PI * 40;
  const pct = profile ? churnPct(profile.churnRisk) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[80] bg-foreground/40 flex justify-end animate-fade-in" onClick={onClose}>
      <div className="w-[520px] bg-card border-l border-border h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full text-white font-bold flex items-center justify-center text-lg" style={{ background: customer.avatarColor }}>
              {customer.initials}
            </div>
            <div>
              <div className="font-bold text-foreground">{customer.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-violet-500" />
                AI 360° Profile
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Generating AI profile...</span>
            </div>
          )}

          {!loading && profile && (
            <>
              {/* Personality + Churn */}
              <div className="flex gap-4">
                <div className="flex-1 bg-gradient-to-r from-violet-500/10 to-sky-500/10 dark:from-violet-500/15 dark:to-sky-500/15 rounded-xl p-4 border border-violet-200/50 dark:border-violet-500/30">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">Personality</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-black text-foreground">{profile.personality}</span>
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{profile.personalityDescription}</p>
                </div>

                <div className="flex flex-col items-center bg-white/40 dark:bg-slate-900/40 rounded-xl p-4 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Churn Risk</span>
                  <div className="relative" style={{ width: 90, height: 90 }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-slate-700" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={churnGaugeColor(profile.churnRisk)} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-[1.5s] ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn("text-sm font-black", churnColor(profile.churnRisk))}>{profile.churnRisk.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center max-w-[80px]">{profile.churnReason}</p>
                </div>
              </div>

              {/* LTV + Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-3 border border-border text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Predicted LTV</span>
                  <div className="text-xl font-black text-foreground mt-1">
                    RM <AnimatedCounter target={profile.predictedLTV} />
                  </div>
                </div>
                <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-3 border border-border text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Best Time</span>
                  <div className="text-sm font-bold text-foreground mt-1 flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {profile.bestContactTime}
                  </div>
                </div>
                <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-3 border border-border text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">VIP Potential</span>
                  <div className="mt-1">
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-[1.5s]" style={{ width: `${profile.vipPotential}%` }} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{profile.vipPotential}%</span>
                  </div>
                </div>
              </div>

              {/* Communication Style */}
              <div className="bg-primary-soft border border-primary/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Communication Style
                </div>
                <p className="text-xs text-foreground">{profile.communicationStyle}</p>
              </div>

              {/* Sentiment Trend */}
              {profile.sentimentTrend.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-foreground">Sentiment Trend</span>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={profile.sentimentTrend}>
                      <XAxis dataKey="date" tick={{ fontSize: 8 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recommended Actions */}
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Recommended Actions
                </span>
                <div className="space-y-2">
                  {profile.recommendedActions.map((a, i) => (
                    <div key={i} className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-border flex items-start gap-2">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 mt-0.5",
                        a.priority === "high" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" :
                        a.priority === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                        "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
                      )}>{a.priority}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{a.action}</p>
                        <p className="text-[10px] text-muted-foreground">{a.expectedImpact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Best Offer */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/15 dark:to-orange-500/15 rounded-xl p-3 border border-amber-200/50 dark:border-amber-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                  <Gift className="h-3.5 w-3.5" />
                  Next Best Offer
                </div>
                <p className="text-xs text-foreground font-medium">{profile.nextBestOffer}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
