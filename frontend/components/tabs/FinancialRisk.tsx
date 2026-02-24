"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine
} from "recharts";
import { AlertTriangle, ShieldCheck, Zap, Info, TrendingUp, BarChart3, Search, Filter, PieChart, Briefcase, ChevronRight, Activity, Percent } from "lucide-react";

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
  normalized_volatility: number;
  budget_efficiency: number;
  momentum: number;
  momentum_label: string;
}

export default function FinancialRisk() {
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRiskData();
      setRiskData(data || []);
    } catch (error) {
      console.error("Error loading risk data:", error);
      setError("Failed to initialize risk intelligence engine.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (category: string) => {
    switch (category) {
      case 'SAFE':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase"><ShieldCheck size={10} /> Safe</span>;
      case 'MODERATE':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase"><Zap size={10} /> Moderate</span>;
      case 'HIGH RISK':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold uppercase"><AlertTriangle size={10} /> High Risk</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold uppercase">{category}</span>;
    }
  };

  const getArchetypeColor = (archetype: string) => {
    switch (archetype) {
      case 'Blockbuster-driven': return 'text-primary';
      case 'Consistent performer': return 'text-emerald-400';
      case 'Lottery genre': return 'text-rose-400';
      case 'Safe niche': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
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

  // Portfolio Summary Logic
  const coreStable = riskData.filter(d => d.risk_category === 'SAFE').slice(0, 3);
  const growthOpp = riskData.filter(d => d.momentum > 15 && d.risk_category !== 'HIGH RISK').slice(0, 3);
  const speculative = riskData.filter(d => d.archetype === 'Blockbuster-driven' || d.archetype === 'Lottery genre').slice(0, 3);

  // Constants for medians (simple average for now)
  const medianROI = riskData.length ? riskData.reduce((acc, curr) => acc + curr.avg_roi, 0) / riskData.length : 1.0;
  const medianVol = riskData.length ? riskData.reduce((acc, curr) => acc + curr.roi_volatility, 0) / riskData.length : 2.0;

  return (
    <div className="space-y-8 page-transition pb-20 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Financial Risk Intelligence</h1>
          <p className="text-gray-400">Actuarial portfolio analysis using composite risk scoring (Volatility + Downside + Failure).</p>
        </div>
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
              <div key={d.genre} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-white">{d.genre}</span>
                <span className="text-[10px] text-emerald-400 font-bold">{d.avg_roi}x</span>
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
              <div key={d.genre} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-white">{d.genre}</span>
                <span className="text-[10px] text-primary font-bold">+{d.momentum}%</span>
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
            <Percent size={12} /> Speculative
          </p>
          <div className="space-y-2">
            {speculative.map(d => (
              <div key={d.genre} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-white">{d.genre}</span>
                <span className="text-[10px] text-amber-400 font-bold">High Yield</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-primary uppercase font-black mb-2">Recommendation</p>
            <p className="text-sm text-gray-200 font-medium leading-relaxed">
              Maintain a <span className="text-white font-black italic">60/30/10</span> allocation. Heavy focus on {coreStable[0]?.genre || "Stable"} for downside protection.
            </p>
          </div>
          <button className="mt-4 flex items-center gap-2 text-primary font-bold text-xs hover:gap-3 transition-all">
            Full Portfolio Strategy <ChevronRight size={14} />
          </button>
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
              <BarChart data={[...riskData].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10)} layout="vertical">
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
                        <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl">
                          <p className="text-white font-bold text-sm mb-2">{d.genre}</p>
                          <div className="space-y-1.5 border-t border-white/5 pt-2">
                            <p className="text-[10px] text-gray-400 flex justify-between gap-8">Volatility Weight (0.4) <span>{((d.normalized_volatility || 0) * 0.4).toFixed(2)}</span></p>
                            <p className="text-[10px] text-gray-400 flex justify-between gap-8">Downside Weight (0.3) <span>{((d.downside_risk || 0) * 0.3).toFixed(2)}</span></p>
                            <p className="text-[10px] text-gray-400 flex justify-between gap-8">Failure Weight (0.3) <span>{(((d.failure_rate || 0) / 100) * 0.3).toFixed(2)}</span></p>
                            <p className="text-sm font-black text-rose-400 flex justify-between gap-8 mt-2 pt-2 border-t border-white/5">Risk Score <span>{d.risk_score || 0}</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                  {[...riskData].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk_category === 'HIGH RISK' ? '#ef4444' : entry.risk_category === 'MODERATE' ? '#f59e0b' : '#14b8a6'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Frontier Plot with Quad Shading */}
        <div className="glass rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute inset-x-8 inset-y-16 opacity-5 pointer-events-none grid grid-cols-2 grid-rows-2">
            <div className="bg-emerald-500 border-r border-b border-white/10" />
            <div className="bg-amber-500 border-b border-white/10" />
            <div className="bg-rose-500 border-r border-white/10" />
            <div className="bg-blue-500" />
          </div>
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
                <XAxis type="number" dataKey="avg_roi" name="Average ROI" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Avg ROI', position: 'insideBottom', offset: -5, fill: '#525252', fontSize: 10 }} />
                <YAxis type="number" dataKey="roi_volatility" name="Volatility" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'ROI Volatility (σ)', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10 }} />
                <ZAxis type="number" dataKey="total_movies" range={[50, 400]} name="Volume" />
                <ReferenceLine x={medianROI} stroke="#6366f1" strokeDasharray="5 5" strokeOpacity={0.3} label={{ value: 'Median ROI', position: 'top', fill: '#6366f1', fontSize: 8 }} />
                <ReferenceLine y={medianVol} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.3} label={{ value: 'Median Vol', position: 'right', fill: '#f59e0b', fontSize: 8 }} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as RiskData;
                      return (
                        <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl max-w-xs">
                          <p className="text-white font-bold text-sm mb-1">{d.genre}</p>
                          <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border mb-3 inline-block ${getArchetypeColor(d.archetype)} bg-white/5 border-white/10 uppercase`}>{d.archetype}</div>
                          <div className="space-y-2 border-t border-white/5 pt-2">
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-gray-500 uppercase font-black">ROI Stability</span>
                              <span className="text-[10px] text-white font-bold">{d.roi_volatility < 1.5 ? 'Very Stable' : d.roi_volatility < 4 ? 'Moderate' : 'Extreme Risk'}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-gray-500 uppercase font-black">Sample Size</span>
                              <span className="text-[10px] text-white font-bold">{d.total_movies} Films</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-gray-500 uppercase font-black">Success %</span>
                              <span className="text-[10px] text-emerald-400 font-black">{(100 - (d.failure_rate || 0)).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Genres" data={riskData}>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.7} />
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
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Avg ROI</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Volatility</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Composite Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...riskData].sort((a, b) => b.total_movies - a.total_movies).slice(0, 15).map((row) => (
                <tr key={row.genre} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${getArchetypeColor(row.archetype)}`}>{row.archetype.split('-')[0]}</span>
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
                        <div className="h-full bg-rose-500/50" style={{ width: `${row.failure_rate || 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-rose-400/80">{(row.failure_rate || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-secondary text-sm">
                    {(row.avg_roi || 0).toFixed(2)}x
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400 font-mono">
                    σ {(row.roi_volatility || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center space-y-2">
                    <div className="flex justify-center">{getRiskBadge(row.risk_category)}</div>
                    <div className="text-[8px] text-gray-500 font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                      {(row.risk_score || 0) > 0.7 ? 'High Volatility Drive' : (row.failure_rate || 0) > 50 ? 'Low Hit Efficiency' : 'Stable Performant'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
