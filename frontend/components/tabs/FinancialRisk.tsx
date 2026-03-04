"use client";

import { useEffect, useState } from "react";
import { getAllGenreAnalytics, getMarketRiskAnalysis, getOptimizedPortfolio, getMarketBenchmarks } from "@/core/analyticsEngine";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine, ReferenceArea
} from "recharts";
import { AlertTriangle, ShieldCheck, Zap, Info, TrendingUp, BarChart3, Search, Filter, PieChart, Briefcase, ChevronRight, Activity, Percent, ArrowDownRight, Target } from "lucide-react";
import { formatROI, formatVolatility, formatPercent } from "@/lib/utils";

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

interface RiskData {
  genre: string;
  total_movies: number;
  weighted_roi: number;
  avg_roi: number;
  roi_volatility: number;
  risk_score: number;
  risk_category: string;
  archetype: string;
  failure_rate: number;
  downside_risk: number;
  loss_severity: number;
  risk_adjusted_roi: number;
  normalized_volatility: number;
  budget_efficiency: number;
  momentum: number;
  momentum_label: string;
}

export default function FinancialRisk() {
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [marketRisk, setMarketRisk] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    setError(null);
    try {
      // Step 5: Initialization Fix - Wait until dataset loads (simulated by core engine pre-init)
      const engineData = getAllGenreAnalytics() || [];
      const marketData = getMarketRiskAnalysis();
      const bench = getMarketBenchmarks();
      const port = getOptimizedPortfolio(50);

      if (!marketData || engineData.length === 0) {
        setError("Risk analytics temporarily unavailable");
        return;
      }

      setMarketRisk(marketData);
      setBenchmarks(bench);
      setPortfolio(port);

      const mapped = engineData.map((g: any) => {
        return {
          genre: g.genre,
          total_movies: g.totalMovies || 0,
          weighted_roi: g.averageROI,
          avg_roi: g.averageROI,
          roi_volatility: g.volatility,
          risk_score: g.compositeScore,
          risk_category: g.riskCategory,
          archetype: g.archetype,
          failure_rate: g.failureRate,
          downside_risk: g.downsideProbability,
          loss_severity: g.lossSeverity,
          risk_adjusted_roi: g.riskAdjustedROI,
          normalized_volatility: Math.min(g.volatility / 10, 1.0),
          budget_efficiency: g.averageROI,
          momentum: g.momentum || 0,
          momentum_label: g.lifecycle || "Stable",
          is_insufficient: (g.totalMovies || 0) < 5
        };
      });
      setRiskData(mapped as any);
    } catch (error) {
      console.error("Error loading risk data:", error);
      setError("Risk analytics temporarily unavailable");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (category: string) => {
    switch (category) {
      case 'LOW RISK':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-tighter"><ShieldCheck size={10} /> Low Risk</span>;
      case 'MODERATE':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-tighter"><Zap size={10} /> Moderate</span>;
      case 'HIGH RISK':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-tighter"><AlertTriangle size={10} /> High Risk</span>;
      case 'INSUFFICIENT DATA':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-black uppercase tracking-tighter"><Info size={10} /> Insufficient Data</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold uppercase">{category}</span>;
    }
  };

  const getArchetypeColor = (archetype: string) => {
    const a = (archetype || "").toUpperCase();
    if (a.includes('CONSISTENT')) return 'text-emerald-400';
    if (a.includes('BREAKOUT')) return 'text-primary';
    if (a.includes('SPECULATIVE')) return 'text-amber-400';
    if (a.includes('HIGH RISK')) return 'text-rose-400';
    return 'text-gray-400';
  };

  if (loading) return (
    <div className="space-y-8 animate-pulse p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[450px] glass rounded-3xl" />
        <div className="h-[450px] glass rounded-3xl" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl border-dashed border-white/10">
      <Info size={48} className="text-rose-500 mb-4" />
      <p className="text-white text-lg font-medium">{error}</p>
      <button onClick={loadData} className="mt-4 px-6 py-2 bg-primary/20 hover:bg-primary/40 text-primary rounded-xl transition-all font-bold">
        Retry Analysis
      </button>
    </div>
  );

  // Section 9: Filtered data for primary charts
  const primaryRiskData = riskData.filter(d => d.total_movies >= 5);
  const insufficientData = riskData.filter(d => d.total_movies < 5);

  // Portfolio Summary Logic from Dynamic Optimization
  const coreStable = primaryRiskData.filter(d => d.archetype.includes('STABLE')).slice(0, 3);
  const growthOpp = primaryRiskData.filter(d => d.archetype.includes('GROWTH') || d.archetype.includes('BREAKOUT')).slice(0, 3);
  const speculative = primaryRiskData.filter(d => d.archetype.includes('SPECULATIVE')).slice(0, 3);

  const medianROI = benchmarks?.medianROI || 1.6;
  const medianVol = benchmarks?.medianVol || 2.5;

  return (
    <div className="space-y-8 page-transition pb-20 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Financial Risk Intelligence</h1>
          <p className="text-gray-400">Actuarial portfolio analysis using composite risk scoring (Volatility + Downside + Failure).</p>
        </div>

        {marketRisk && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6 w-full lg:w-auto">
            <div className="glass px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Market Risk</p>
              <p className={`text-xl font-black ${marketRisk.risk_level.includes('HIGH') ? 'text-rose-500' : (marketRisk.risk_level.includes('LOW') ? 'text-emerald-400' : 'text-amber-400')}`}>
                {marketRisk.risk_level}
              </p>
            </div>
            <div className="glass px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Mean ROI</p>
              <p className="text-xl font-black text-white">{formatROI(marketRisk.mean_roi)}</p>
            </div>
            <div className="glass px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Median ROI</p>
              <p className="text-xl font-black text-white">{formatROI(marketRisk.median_roi)}</p>
            </div>
            <div className="glass px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">ROI Volatility</p>
              <p className="text-xl font-black text-rose-400">{formatVolatility(marketRisk.volatility)}</p>
            </div>
            <div className="glass px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Downside Prob.</p>
              <p className="text-xl font-black text-amber-400">{formatPercent(marketRisk.downside_probability)}</p>
            </div>
            <div className="glass px-6 py-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Capital Loss Prob.</p>
              <p className="text-xl font-black text-rose-500">{formatPercent(marketRisk.capital_loss_probability)}</p>
            </div>
          </div>
        )}
      </div>

      {/* PORTFOLIO INTELLIGENCE PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldCheck size={48} className="text-emerald-400" />
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-black mb-3 flex items-center gap-2">
            <Briefcase size={12} /> Core Stable
          </p>
          <div className="space-y-2">
            {coreStable.map(d => (
              <div key={d.genre || Math.random()} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-white">{d.genre || "N/A"}</span>
                <span className="text-[10px] text-emerald-400 font-bold">{formatROI(d.avg_roi)}</span>
              </div>
            ))}
            {!coreStable.length && <p className="text-[10px] text-gray-500 italic">No low-risk anchors identified.</p>}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={48} className="text-primary" />
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-black mb-3 flex items-center gap-2">
            <Activity size={12} /> Growth Opps
          </p>
          <div className="space-y-2">
            {growthOpp.map(d => (
              <div key={d.genre || Math.random()} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-white">{d.genre || "N/A"}</span>
                <span className="text-[10px] text-primary font-bold">+{formatPercent(d.momentum)}</span>
              </div>
            ))}
            {!growthOpp.length && <p className="text-[10px] text-gray-500 italic">Market velocity is currently stable.</p>}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Zap size={48} className="text-amber-400" />
          </div>
          <p className="text-[10px] text-gray-500 uppercase font-black mb-3 flex items-center gap-2">
            <Briefcase size={12} /> Speculative
          </p>
          <div className="space-y-2">
            {speculative.map(d => (
              <div key={d.genre || Math.random()} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-white">{d.genre || "N/A"}</span>
                <span className="text-[10px] text-amber-400 font-bold">High Yield</span>
              </div>
            ))}
            {!speculative.length && <p className="text-[10px] text-gray-500 italic">Market volatility is currently stable.</p>}
          </div>
        </div>

        <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-primary uppercase font-black mb-2">Portfolio Strategy</p>
            <p className="text-sm text-gray-200 font-medium leading-relaxed">
              Recommended allocation: <span className="text-white font-black italic">55/30/15</span> spread. {portfolio?.portfolio?.[0]?.genre ? `Top weighted asset: ${portfolio.portfolio[0].genre}.` : "Diversifying across stable anchors."}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {portfolio?.portfolio?.slice(0, 4).map((p: any) => (
              <span key={p.genre} className="px-2 py-0.5 bg-black/40 rounded text-[9px] text-gray-400 border border-white/5 font-bold">
                {p.genre} {Math.round(p.weight)}%
              </span>
            )) || <p className="text-[10px] text-gray-500 italic">Computing optimized spreads...</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Scores Bar Chart */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-primary" size={20} /> Composite Risk Index
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Score (0.4v + 0.3d + 0.3f)</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...primaryRiskData].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
                <YAxis dataKey="genre" type="category" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as RiskData;
                      return (
                        <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl">
                          <p className="text-white font-bold text-sm mb-1">{d.genre}</p>
                          <p className="text-[10px] text-gray-500 font-bold mb-3 uppercase tracking-widest">{d.total_movies} Films</p>
                          <div className="space-y-1.5 border-t border-white/5 pt-2">
                            <p className="text-[10px] text-gray-400 flex justify-between gap-8">Avg ROI <span>{formatROI(d.avg_roi)}</span></p>
                            <p className="text-[10px] text-gray-400 flex justify-between gap-8">Volatility <span>{formatVolatility(d.roi_volatility)}</span></p>
                            <p className="text-[10px] text-gray-400 flex justify-between gap-8">Failure Rate <span>{formatPercent(d.failure_rate)}</span></p>
                            <p className="text-sm font-black text-rose-400 flex justify-between gap-8 mt-2 pt-2 border-t border-white/5">
                              Risk Score <span>{d.risk_score.toFixed(2)} ({d.risk_category})</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                  {[...primaryRiskData].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk_category === 'HIGH RISK' ? '#ef4444' : entry.risk_category === 'MODERATE' ? '#f59e0b' : '#14b8a6'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Frontier Plot with Quad Shading */}
        <div className="glass rounded-3xl p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-primary" size={20} /> Efficiency Frontier
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI Consistency Analysis</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="avg_roi"
                  name="Average ROI"
                  domain={[0, 5]}
                  stroke="#525252"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Performance (Avg ROI)', position: 'insideBottom', offset: -5, fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  type="number"
                  dataKey="roi_volatility"
                  name="Volatility"
                  domain={[0, 10]}
                  stroke="#525252"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Risk (ROI Volatility σ)', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                />
                <ZAxis type="number" dataKey="total_movies" range={[50, 400]} name="Volume" />

                {/* Shaded Quadrants (Section 6) */}
                <ReferenceArea x1={medianROI} x2={5} y1={0} y2={medianVol} fill="#10b981" fillOpacity={0.05} /> {/* SAFE ZONE */}
                <ReferenceArea x1={medianROI} x2={5} y1={medianVol} y2={10} fill="#f59e0b" fillOpacity={0.05} /> {/* SPECULATIVE */}
                <ReferenceArea x1={0} x2={medianROI} y1={medianVol} y2={10} fill="#ef4444" fillOpacity={0.05} /> {/* INEFFICIENT */}
                <ReferenceArea x1={0} x2={medianROI} y1={0} y2={medianVol} fill="#3b82f6" fillOpacity={0.05} /> {/* VOLATILE GROWTH */}

                {/* Reference Lines for Median Context */}
                <ReferenceLine x={medianROI} stroke="#6366f1" strokeDasharray="5 5" strokeOpacity={0.5} label={{ value: 'Median ROI', position: 'top', fill: '#6366f1', fontSize: 10, fontWeight: 'bold' }} />
                <ReferenceLine y={medianVol} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.5} label={{ value: 'Median Vol', position: 'right', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />

                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as RiskData;
                      return (
                        <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl max-w-xs">
                          <p className="text-white font-bold text-sm mb-1">{d.genre}</p>
                          <p className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest">{d.total_movies} Films</p>
                          <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border mb-3 inline-block uppercase tracking-tighter ${getArchetypeColor(d.archetype)} bg-white/5 border-white/10`}>
                            {d.archetype}
                          </div>
                          <div className="space-y-1.5 border-t border-white/5 pt-2">
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-gray-400 uppercase font-black">Avg ROI</span>
                              <span className="text-[10px] text-white font-bold">{formatROI(d.avg_roi)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-gray-400 uppercase font-black">Volatility</span>
                              <span className="text-[10px] text-white font-bold">{formatVolatility(d.roi_volatility)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-gray-400 uppercase font-black">Failure Rate</span>
                              <span className="text-[10px] text-rose-400 font-black">{formatPercent(d.failure_rate)}</span>
                            </div>
                            <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-white/5">
                              <span className="text-[10px] text-gray-400 uppercase font-black">Risk Score</span>
                              <span className={`text-[10px] font-black ${d.risk_category === 'LOW RISK' ? 'text-emerald-400' : d.risk_category === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'}`}>
                                {d.risk_score.toFixed(2)} ({d.risk_category})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Genres" data={primaryRiskData}>
                  {primaryRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.7} strokeWidth={1} stroke="rgba(255,255,255,0.2)" />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 mt-6 gap-2">
            <div className="text-[8px] text-emerald-400 font-bold bg-emerald-500/5 p-1 border border-emerald-500/10 text-center uppercase tracking-tighter">Safe Zone</div>
            <div className="text-[8px] text-amber-400 font-bold bg-amber-500/5 p-1 border border-amber-500/10 text-center uppercase tracking-tighter">Speculative</div>
            <div className="text-[8px] text-rose-400 font-bold bg-rose-500/5 p-1 border border-rose-500/10 text-center uppercase tracking-tighter">Inefficient</div>
            <div className="text-[8px] text-blue-400 font-bold bg-blue-500/5 p-1 border border-blue-500/10 text-center uppercase tracking-tighter">Volatile Growth</div>
          </div>
        </div>
      </div>

      {/* Risk Analysis Table */}
      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="text-primary" size={18} /> Detailed Matrix & Portfolio Labeling
          </h3>
          <span className="text-[10px] text-gray-500 uppercase font-black">N = {riskData.reduce((acc, curr) => acc + curr.total_movies, 0)} Sample Slate</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Archetype</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Genre</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Failure Rate</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Avg Loss</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Avg ROI</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Risk Adj ROI</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Composite Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...primaryRiskData].sort((a, b) => b.total_movies - a.total_movies).map((row) => (
                <tr key={row.genre} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${getArchetypeColor(row.archetype)}`}>
                      {row.archetype}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{row.genre}</span>
                      <span className="text-[10px] text-gray-500 uppercase">{row.total_movies} Films</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500/50" style={{ width: `${Math.min(100, row.failure_rate)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-rose-400/80">{formatPercent(row.failure_rate)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-rose-500 text-sm">
                    {row.loss_severity ? `${row.loss_severity.toFixed(1)}%` : "0.0%"}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-white text-sm">
                    {formatROI(row.avg_roi)}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-primary font-mono font-bold">
                    {row.risk_adjusted_roi.toFixed(2)}x
                  </td>
                  <td className="px-6 py-4 text-center space-y-2">
                    <div className="flex justify-center">{getRiskBadge(row.risk_category)}</div>
                    <div className="text-[8px] text-gray-500 font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                      {(row.risk_score * 100).toFixed(1)} / 100
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insufficient Data Section (Section 3) */}
      <div className="glass rounded-3xl overflow-hidden border border-white/5 opacity-60">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-400 flex items-center gap-2">
            <AlertTriangle size={18} /> Insufficient Sample Pool
          </h3>
          <span className="text-[10px] text-gray-500 uppercase font-black">n &lt; 20 threshold</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-6 py-3 text-[9px] font-black text-gray-500 uppercase">Genre</th>
                <th className="px-6 py-3 text-[9px] font-black text-gray-500 uppercase text-center">Count</th>
                <th className="px-6 py-3 text-[9px] font-black text-gray-500 uppercase text-center">Avg ROI</th>
                <th className="px-6 py-3 text-[9px] font-black text-gray-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {insufficientData.map(d => (
                <tr key={d.genre} className="border-t border-white/5">
                  <td className="px-6 py-3 text-xs text-gray-400 font-bold">{d.genre}</td>
                  <td className="px-6 py-3 text-xs text-gray-500 text-center">{d.total_movies}</td>
                  <td className="px-6 py-3 text-xs text-gray-500 text-center">{formatROI(d.avg_roi)}</td>
                  <td className="px-6 py-3 text-[9px] text-amber-500/50 text-center font-black uppercase">Unstable Pool</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
