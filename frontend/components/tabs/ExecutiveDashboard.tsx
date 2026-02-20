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
  ArrowUpRight
} from "lucide-react";

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [marketPulse, setMarketPulse] = useState<any>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryData, pulseData, genresData] = await Promise.all([
        api.getDashboardSummary(),
        api.getMarketPulse(),
        api.getAllGenres(),
      ]);
      setSummary(summaryData);
      setMarketPulse(pulseData);
      setGenres(genresData.genres || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
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
              <span className="text-xs text-gray-500">• Real-time Analytics</span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-6">
              Market Sentiment: <span className="text-gradient">{marketPulse?.sentiment || "Neutral"}</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Market Velocity</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">{marketPulse?.roi_velocity || 0}x</span>
                  <span className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-0.5">
                    <ArrowUpRight size={12} /> 12%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Risk Index</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">{marketPulse?.risk_index || 0}σ</span>
                  <span className="text-amber-400 text-xs font-bold mb-1 italic">Stable</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Rising Segment</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white truncate max-w-[150px]">
                    {marketPulse?.top_growing_segment || "Drama"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 flex flex-col justify-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <p className="text-xs text-gray-400 font-bold uppercase mb-2">Total Managed Volume</p>
          <div className="text-4xl font-black text-white mb-2">
            ₹{(summary?.total_revenue / 10000000).toFixed(0)}<span className="text-primary text-2xl">Cr</span>
          </div>
          <p className="text-[10px] text-gray-500 italic">Historical box office aggregate ({summary?.total_movies} titles)</p>
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

          <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/[0.05]">
            <p className="text-lg text-gray-200 leading-relaxed font-medium">
              "{summary?.strategic_insight?.text || "Synchronizing with latest market delta..."}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Top Alpha</p>
              <p className="text-lg font-bold text-secondary">{summary?.strategic_insight?.top_roi_genre}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Anchor Segment</p>
              <p className="text-lg font-bold text-emerald-400">{summary?.strategic_insight?.safest_genre}</p>
            </div>
          </div>
        </div>

        {/* Capital Allocation Strategy */}
        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PieChart className="text-primary" size={20} /> Capital Allocation
            </h2>
            <div className="text-[10px] py-1 px-2 glass rounded-full text-gray-400 uppercase font-black">
              Phase: {summary?.strategic_insight?.market_phase || "Expansion"}
            </div>
          </div>

          <div className="space-y-6 pt-2">
            {summary?.capital_allocation ? (
              Object.entries(summary.capital_allocation).map(([category, percent], i) => (
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
          <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Market Snapshot / Monthly Pulse</h2>
          <button className="text-xs text-primary font-bold hover:underline">View All Intelligence</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Avg. Sample Size</p>
            <p className="text-2xl font-bold text-white">{(summary?.total_movies / 19).toFixed(0)}</p>
            <p className="text-[10px] text-gray-600">Per Genre Segment</p>
          </div>
          <div className="glass-card p-6 text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Success Rate</p>
            <p className="text-2xl font-bold text-primary">{summary?.overall_success_rate}%</p>
            <p className="text-[10px] text-gray-600">Global Average</p>
          </div>
          <div className="glass-card p-6 text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Peak Year</p>
            <p className="text-2xl font-bold text-white">2019</p>
            <p className="text-[10px] text-gray-600">Revenue Dominance</p>
          </div>
          <div className="glass-card p-6 text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">AI Confidence</p>
            <p className="text-2xl font-bold text-emerald-400">High</p>
            <p className="text-[10px] text-gray-600">Data Reliability</p>
          </div>
        </div>
      </div>
    </div>
  );
}
