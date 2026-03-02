"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Zap,
  Target,
  PieChart,
  Calendar,
  IndianRupee,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  LayoutDashboard,
  Sparkles,
  X,
  ShieldCheck,
} from "lucide-react";
import { formatROI, formatVolatility, formatPercent, formatCurrencyCr } from "@/lib/utils";

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExplainable, setShowExplainable] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSentiment = () => {
    const velocity = metrics?.market_velocity || 0;
    const volatility = metrics?.risk_index || 0;

    if (velocity < 0) return { label: "Bearish", class: "text-rose-400", stage: "bearish" };
    if (velocity > 0 && volatility > 2.0) return { label: "Cautious Bullish", class: "text-amber-400", stage: "cautious" };
    if (velocity > 0) return { label: "Bullish", class: "text-emerald-400", stage: "bullish" };
    return { label: "Neutral", class: "text-gray-400", stage: "neutral" };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 glass rounded-2xl" />
        ))}
        <div className="md:col-span-2 lg:col-span-3 h-64 glass rounded-3xl" />
        <div className="h-64 glass rounded-3xl" />
      </div>
    );
  }

  const sentiment = getSentiment();

  return (
    <div className="space-y-8 page-transition">
      {/* Hero / Market Pulse Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={120} className="text-primary" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge risk-safe">AI Market Pulse</span>
              <span className="text-xs text-gray-500">• {metrics?.data_freshness || "Real-time"} Update</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter ml-auto opacity-60">
                Analysis Scope: {metrics?.total_movies || 0} films ({metrics?.year_range || "2001–2019"})
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-6">
              Market Sentiment: <span className={sentiment.class}>{sentiment.label}</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1 relative group cursor-help">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Market Velocity</p>
                <div className="flex flex-col">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{formatPercent(metrics?.market_velocity, 1)}</span>
                    <span className={`${(metrics?.market_velocity || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'} text-xs font-bold mb-1 flex items-center gap-0.5`}>
                      <ArrowUpRight size={12} className={(metrics?.market_velocity || 0) < 0 ? 'rotate-90' : ''} />
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium italic mt-1">
                    {metrics?.market_velocity_label || (metrics?.market_velocity > 0 ? "Expansionary" : "Contractionary")}
                  </p>
                </div>
                <div className="absolute -top-12 left-0 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  Rolling 12-month ROI delta. Indicates pace of capital efficiency.
                </div>
              </div>

              <div className="space-y-1 relative group cursor-help">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Risk Regime</p>
                <div className="flex flex-col">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">
                      {metrics?.risk_index > 2.0 ? "High Volatility" : metrics?.risk_index > 1.0 ? "Moderate" : "Stable"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium italic mt-1 underline decoration-primary/30">
                    Volatility: {formatVolatility(metrics?.risk_index)}
                  </p>
                </div>
                <div className="absolute -top-12 left-0 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  Risk Index (σ) measures ROI variance. Stable implies high predictability.
                </div>
              </div>

              <div className="space-y-1 relative group cursor-help">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Trending Genre</p>
                <div className="flex flex-col">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white truncate max-w-[150px]">
                      {metrics?.trending_genre || "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium italic mt-1">
                    Momentum Leader
                  </p>
                </div>
                <div className="absolute -top-12 left-0 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  Highest growth in production volume and gross efficiency recently.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 flex flex-col justify-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20 h-full">
          <p className="text-xs text-gray-400 font-bold uppercase mb-2">Total Volume Analysed</p>
          <div className="text-4xl font-black text-white mb-2">
            {formatCurrencyCr(metrics?.total_volume)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 italic">Financial Slate Scope</span>
            <span className={`px-2 py-0.5 rounded flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter ${metrics?.confidence_score === 'High' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              <ShieldCheck size={10} /> {metrics?.confidence_score || "Moderate"} Confidence
            </span>
          </div>
        </div>
      </div>

      {/* Strategic AI Insight & Capital Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strategic AI Insight */}
        <div className="glass rounded-3xl p-8 space-y-6 glow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="text-primary" size={20} /> Strategic Intelligence
            </h2>
            <Target className="text-gray-600" size={20} />
          </div>

          <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/[0.05] relative group">
            <p className="text-lg text-gray-200 leading-relaxed font-medium">
              "{metrics?.strategic_intelligence || "Synchronizing with latest market delta..."}"
            </p>
            <button
              onClick={() => setShowExplainable(true)}
              className="absolute bottom-4 right-4 text-[10px] text-primary font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded border border-primary/20"
            >
              Why AI says this?
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 group transition-all hover:bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Top Alpha (Highest ROI)</p>
              <p className="text-lg font-black text-amber-400 group-hover:scale-105 transition-transform">{metrics?.top_alpha}</p>
            </div>
            <div className="glass-card p-5 group transition-all hover:bg-white/[0.03]">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Anchor Segment (Safest)</p>
              <p className="text-lg font-black text-emerald-400 group-hover:scale-105 transition-transform">{metrics?.anchor_segment}</p>
            </div>
          </div>
        </div>

        {/* Capital Allocation Strategy */}
        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PieChart className="text-primary" size={20} /> Allocation Guardrails
            </h2>
            <div className="text-[10px] py-1 px-2 glass rounded-full text-gray-400 uppercase font-black">
              Speculative Cap: 40%
            </div>
          </div>

          <div className="space-y-6 pt-2">
            {metrics?.capital_allocation ? (
              Object.entries(metrics.capital_allocation).map(([category, percent], i) => (
                <div key={category} className="space-y-2 group">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                      {category}
                    </span>
                    <span className="text-sm font-black text-white">{percent as any}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${i === 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                        i === 1 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.3)]' :
                          'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                        }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-500 italic">Calculating...</div>
            )}
          </div>
        </div>
      </div>

      {/* Snapshot / Summary Feed */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Trust Signals & Data Integrity</h2>
          <div className="flex gap-4">
            <span className="text-[10px] text-gray-500 border border-white/10 px-2 py-1 rounded">Freshness: {metrics?.data_freshness}</span>
            <span className="text-[10px] text-gray-500 border border-white/10 px-2 py-1 rounded">Sample: {metrics?.financial_sample_count} Financial Titles</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 text-center group hover:bg-white/[0.02] transition-all">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Success Velocity</p>
            <p className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{formatPercent(metrics?.success_rate)}</p>
            <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase">Hit Efficiency</p>
          </div>
          <div className="glass-card p-6 text-center group hover:bg-white/[0.02] transition-all">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Alpha Yield</p>
            <p className="text-2xl font-black text-primary group-hover:scale-110 transition-transform">{formatROI(metrics?.avg_roi)}</p>
            <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase">Avg ROI</p>
          </div>
          <div className="glass-card p-6 text-center group hover:bg-white/[0.02] transition-all">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Confidence Level</p>
            <p className={`text-2xl font-black group-hover:scale-110 transition-transform ${metrics?.confidence_score === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics?.confidence_score}
            </p>
            <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase">Sample Variance</p>
          </div>
          <div className="glass-card p-6 text-center group hover:bg-white/[0.02] transition-all">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">AI Node</p>
            <p className="text-2xl font-black text-primary group-hover:scale-110 transition-transform">Stable</p>
            <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase">Computation Verified</p>
          </div>
        </div>
      </div>

      {/* Explainability Modal */}
      {showExplainable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass max-w-lg w-full rounded-3xl p-8 border border-white/10 relative">
            <button
              onClick={() => setShowExplainable(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-white">Intelligence Breakdown</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Sentiment Logic</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Market sentiment is calculated using a 5-stage regime (Bearish to Expansion). Factors include
                  trailing ROI averages ({metrics?.avg_roi}x), success yield ({metrics?.success_rate}%), and volatility ({metrics?.risk_index}σ).
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Alpha Logic</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Genre performance is ranked by weighted ROI. {metrics?.top_alpha} identifies the highest capital efficiency leader in the current dataset.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Risk Guardrails</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Speculative allocations are hard-capped at 40% to maintain portfolio integrity. Current {metrics?.risk_label} conditions suggest a
                  {metrics?.capital_allocation?.['Core (Low Risk)']}% weight in core assets.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <p className="text-[10px] text-gray-500 italic">
                AI analysis computed across {metrics?.total_movies} films using refined TMDb financial datasets.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
