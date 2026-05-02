import { Zap, Link, MessageCircle, ShoppingBag, ArrowRight } from "lucide-react";

export function IntegrationsPage() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto p-8 animate-fade-in">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Integrations</h1>
          <p className="text-slate-500 dark:text-slate-400">Connect your channels to the BizAssist AI Core.</p>
        </div>

        <div className="relative flex flex-col items-center justify-center p-12 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-3xl shadow-xl overflow-hidden">
          {/* Animated SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {/* WhatsApp to Core */}
            <path
              d="M 200 150 Q 400 150 500 250"
              fill="none"
              stroke="currentColor"
              className="text-emerald-500/30"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
            <path
              d="M 200 150 Q 400 150 500 250"
              fill="none"
              stroke="currentColor"
              className="text-emerald-500 animate-[dash_2s_linear_infinite]"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
            {/* Instagram to Core */}
            <path
              d="M 200 350 Q 400 350 500 250"
              fill="none"
              stroke="currentColor"
              className="text-pink-500/30"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
            <path
              d="M 200 350 Q 400 350 500 250"
              fill="none"
              stroke="currentColor"
              className="text-pink-500 animate-[dash_2s_linear_infinite]"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
            {/* Core to Shopify */}
            <path
              d="M 600 250 Q 700 250 800 250"
              fill="none"
              stroke="currentColor"
              className="text-indigo-500/30"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
            <path
              d="M 600 250 Q 700 250 800 250"
              fill="none"
              stroke="currentColor"
              className="text-indigo-500 animate-[dash_2s_linear_infinite]"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
          </svg>

          <style>{`
            @keyframes dash {
              to {
                stroke-dashoffset: -16;
              }
            }
          `}</style>

          <div className="relative z-10 w-full flex justify-between items-center px-10">
            {/* Sources */}
            <div className="flex flex-col gap-12">
              <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-emerald-100 dark:border-emerald-900/50 hover:scale-105 transition-transform cursor-pointer group">
                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">WhatsApp</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-pink-100 dark:border-pink-900/50 hover:scale-105 transition-transform cursor-pointer group">
                <div className="h-12 w-12 bg-pink-100 dark:bg-pink-900/50 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Instagram DM</div>
                  <div className="text-xs text-slate-400 font-medium">Click to connect</div>
                </div>
              </div>
            </div>

            {/* AI Core */}
            <div className="relative">
              <div className="absolute inset-0 bg-sky-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="bg-slate-900 dark:bg-white p-6 rounded-3xl shadow-2xl relative flex flex-col items-center border-4 border-slate-800 dark:border-slate-100">
                <Zap className="h-12 w-12 text-sky-500 mb-2 animate-bounce" />
                <div className="font-black text-xl text-white dark:text-slate-900">BizAssist Core</div>
                <div className="text-xs font-medium text-slate-400 dark:text-slate-500">Processing Node</div>
              </div>
            </div>

            {/* Destinations */}
            <div className="flex flex-col gap-12">
              <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-900/50 hover:scale-105 transition-transform cursor-pointer group">
                <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Shopify</div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> Syncing Inventory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Link className="h-4 w-4" />
            Add New Integration
          </button>
        </div>
      </div>
    </div>
  );
}
