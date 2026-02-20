"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell
} from "recharts";
import { AlertTriangle, ShieldCheck, Zap, Info, TrendingUp, BarChart3, Search, Filter } from "lucide-react";

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function FinancialRisk() {
  const [riskData, setRiskData] = useState<any[]>([]);
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
      // Calculate risk_score: roi_volatility / (avg_roi + 1)
      const processedData = (data || []).map((item: any) => ({
        ...item,
        risk_score: item.roi_volatility / (item.avg_roi + 1),
        risk_category: item.roi_volatility / (item.avg_roi + 1) > 1.5 ? 'High Risk' :
          item.roi_volatility / (item.avg_roi + 1) > 0.8 ? 'Moderate Risk' : 'Safe'
      }));
      setRiskData(processedData);
    } catch (error) {
      console.error("Error loading risk data:", error);
      setError("Failed to initialize risk intelligence engine.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (category: string) => {
    switch (category) {
      case 'Safe':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase"><ShieldCheck size={10} /> Safe</span>;
      case 'Moderate Risk':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase"><Zap size={10} /> Moderate</span>;
      case 'High Risk':
        return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold uppercase"><AlertTriangle size={10} /> High Risk</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold uppercase">{category}</span>;
    }
  };

  if (loading) return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[450px] glass rounded-3xl" />
        <div className="h-[450px] glass rounded-3xl" />
      </div>
      <div className="h-96 glass rounded-3xl" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl border-dashed border-white/10">
      <Info size={48} className="text-rose-500 mb-4" />
      <p className="text-white text-lg font-medium">{error}</p>
      <button
        onClick={loadData}
        className="mt-4 px-6 py-2 bg-primary/20 hover:bg-primary/40 text-primary rounded-xl transition-all font-bold"
      >
        Retry Analysis
      </button>
    </div>
  );

  if (!riskData.length) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl border-dashed border-white/10">
      <Filter size={48} className="text-gray-600 mb-4" />
      <p className="text-gray-400 text-lg font-medium">No financial risk signatures detected in the current dataset.</p>
    </div>
  );

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Financial Risk Intelligence</h1>
          <p className="text-gray-400">Actuarial analysis of genre clusters using ROI volatility vs performance yields.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Scores Bar Chart */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-primary" size={20} /> Aggregate Risk by Genre
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Composite Score</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData.sort((a, b) => b.risk_score - a.risk_score).slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="genre" type="category" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                  {riskData.sort((a, b) => b.risk_score - a.risk_score).slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk_category === 'High Risk' ? '#ef4444' : entry.risk_category === 'Moderate Risk' ? '#f59e0b' : '#14b8a6'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk vs ROI Scatter Plot */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-primary" size={20} /> Efficiency Frontier
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI vs Risk (Bubble = Volume)</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="avg_roi" name="Average ROI" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Avg ROI', position: 'insideBottom', offset: -5, fill: '#525252', fontSize: 10 }} />
                <YAxis type="number" dataKey="roi_volatility" name="Volatility" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Volatility', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10 }} />
                <ZAxis type="number" dataKey="total_movies" range={[50, 400]} name="Total Movies" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Scatter name="Genres" data={riskData}>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Risk Analysis Table */}
      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="text-primary" size={18} /> Detailed Matrix
          </h3>
          <span className="text-[10px] text-gray-500 uppercase font-black">N = {riskData.reduce((acc, curr) => acc + curr.total_movies, 0)} Movies</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Genre</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Success Rate</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Avg ROI</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Volatility</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Composite Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {riskData.sort((a, b) => b.total_movies - a.total_movies).slice(0, 15).map((row) => (
                <tr key={row.genre} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{row.genre}</span>
                      <span className="text-[10px] text-gray-500 uppercase">{row.total_movies} Sample Films</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${row.success_rate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-300">{row.success_rate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-secondary text-sm">
                    {row.avg_roi.toFixed(2)}x
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400 font-mono">
                    σ {row.roi_volatility.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 flex justify-center">
                    {getRiskBadge(row.risk_category)}
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
