"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { TrendingUp, Award, PieChart as PieIcon, BarChart3, Info, Download, Filter, Zap, Target, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Minus, Star } from "lucide-react";

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

interface Driver {
  title: string;
  roi: number;
  year: number;
}

interface GenreData {
  genre: string;
  total_movies: number;
  weighted_roi: number;
  roi_volatility: number;
  volatility_index: number;
  success_rate: number;
  hit_rate: number;
  budget_efficiency: number;
  momentum: number;
  momentum_label: string;
  total_box_office: number;
  avg_budget: number;
  top_drivers: Driver[];
  quadrant: string;
  volume_share?: number;
  bo_share?: number;
}

interface YearlyData {
  year: number;
  genre: string;
  avg_roi: number;
  avg_roi_smooth: number;
  trend: string;
}

export default function GenreIntelligence() {
  const [overallData, setOverallData] = useState<GenreData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareType, setShareType] = useState<'volume' | 'revenue'>('volume');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overall, yearly] = await Promise.all([
        api.getGenreOverall(),
        api.getGenreYearly(),
      ]);
      setOverallData(overall);
      setYearlyData(yearly);
    } catch (error) {
      console.error("Error fetching genre data:", error);
      setError("Failed to load cinematic intelligence. Please check backend connectivity.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get top driver for a genre
  const getTopDriver = (genreName: string) => {
    const genre = overallData.find(g => g.genre === genreName);
    return genre?.top_drivers?.[0]?.title || "N/A";
  };

  if (loading) return (
    <div className="space-y-8 animate-pulse p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-80 glass rounded-3xl" />
        <div className="h-80 glass rounded-3xl" />
      </div>
      <div className="h-96 glass rounded-3xl" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl border-dashed border-white/10">
      <Info size={48} className="text-rose-500 mb-4" />
      <p className="text-white text-lg font-medium">{error}</p>
      <button onClick={loadData} className="mt-4 px-6 py-2 bg-primary/20 hover:bg-primary/40 text-primary rounded-xl transition-all font-bold">
        Retry Connection
      </button>
    </div>
  );

  if (!overallData.length && !yearlyData.length) return (
    <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl border-dashed border-white/10">
      <Filter size={48} className="text-gray-600 mb-4" />
      <p className="text-gray-400 text-lg font-medium">No genre intelligence records found in the master slate.</p>
    </div>
  );

  return (
    <div className="space-y-8 page-transition pb-20 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Genre Intelligence</h1>
          <p className="text-gray-400">Producer-grade insights powered by real dataset aggregation.</p>
        </div>
        <div className="flex gap-3">
          <button className="glass p-3 rounded-xl text-gray-400 hover:text-white transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* STRATEGIC INSIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
          <Target className="text-emerald-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Avg Hit Rate</p>
          <h3 className="text-2xl font-bold text-white">{(overallData.reduce((acc: number, curr: GenreData) => acc + curr.hit_rate, 0) / overallData.length).toFixed(1)}%</h3>
          <p className="text-[10px] text-gray-400 mt-1">Weighted Performance</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-rose-500/30 transition-all">
          <Activity className="text-rose-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Volatility Index</p>
          <h3 className="text-2xl font-bold text-white">{(overallData.reduce((acc: number, curr: GenreData) => acc + curr.volatility_index, 0) / overallData.length).toFixed(2)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">ROI Standard Deviation</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
          <ShieldCheck className="text-primary mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Budget Efficiency</p>
          <h3 className="text-2xl font-bold text-white">₹{(overallData.reduce((acc: number, curr: GenreData) => acc + curr.budget_efficiency, 0) / overallData.length).toFixed(2)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Profit generated per ₹1</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all">
          <TrendingUp className="text-amber-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Trend Momentum</p>
          <h3 className="text-2xl font-bold text-white">↑ Rising</h3>
          <p className="text-[10px] text-gray-400 mt-1">5-Year Growth Indicator</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all">
          <Star className="text-emerald-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Top Driver</p>
          <h3 className="text-xs font-bold text-white truncate max-w-full">
            {overallData.sort((a, b) => b.weighted_roi - a.weighted_roi)[0]?.top_drivers[0]?.title || "N/A"}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Highest ROI Catalyst</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Leaders (ROI by Genre) */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="text-primary" size={20} /> Performance Leaders
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Weighted ROI x Genre</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...overallData].sort((a, b) => b.weighted_roi - a.weighted_roi).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="genre" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as GenreData;
                      return (
                        <div className="bg-black/90 p-3 rounded-xl border border-white/10 shadow-2xl">
                          <p className="text-white font-bold text-xs mb-1">{data.genre}</p>
                          <p className="text-primary font-black text-lg">{data.weighted_roi}x ROI</p>
                          <p className="text-gray-400 text-[10px] mt-1">Total Movies: {data.total_movies}</p>
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <p className="text-[8px] text-gray-500 uppercase font-black">Key Driver</p>
                            <p className="text-emerald-400 text-[10px] italic">"{data.top_drivers[0]?.title}"</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="weighted_roi" radius={[4, 4, 0, 0]}>
                  {[...overallData].sort((a, b) => b.weighted_roi - a.weighted_roi).slice(0, 8).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Share (Movies vs BO) */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PieIcon className="text-emerald-400" size={20} /> Market Share
            </h2>
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setShareType('volume')}
                className={`text-[8px] px-2 py-1 rounded font-black uppercase tracking-tighter transition-all ${shareType === 'volume' ? 'bg-primary text-white' : 'text-gray-500'}`}
              >Volume</button>
              <button
                onClick={() => setShareType('revenue')}
                className={`text-[8px] px-2 py-1 rounded font-black uppercase tracking-tighter transition-all ${shareType === 'revenue' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}
              >Revenue</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[...overallData].sort((a, b) => (shareType === 'volume' ? b.total_movies - a.total_movies : b.total_box_office - a.total_box_office)).slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey={shareType === 'volume' ? 'total_movies' : 'total_box_office'}
                  nameKey="genre"
                >
                  {[...overallData].sort((a, b) => (shareType === 'volume' ? b.total_movies - a.total_movies : b.total_box_office - a.total_box_office)).slice(0, 8).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => {
                    const total = overallData.reduce((acc: number, curr: GenreData) => acc + (shareType === 'volume' ? curr.total_movies : curr.total_box_office), 0);
                    const percent = ((value / total) * 100).toFixed(1);
                    return [`${shareType === 'volume' ? value : '₹' + (value / 1e7).toFixed(1) + 'Cr'} (${percent}%)`, name];
                  }}
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ROI Archetypes Scatter */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-1/2 bottom-1/2 left-0 bg-emerald-500" />
            <div className="absolute top-0 right-0 bottom-1/2 left-1/2 bg-amber-500" />
            <div className="absolute top-1/2 right-1/2 bottom-0 left-0 bg-blue-500" />
            <div className="absolute top-1/2 right-0 bottom-0 left-1/2 bg-rose-500" />
          </div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-primary" size={20} /> ROI Archetypes & Segmentation
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Quadrant Cluster Analysis</div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="weighted_roi" name="Weighted ROI" domain={[0, 'auto']} stroke="#525252" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Weighted ROI', position: 'insideBottomRight', offset: 0, fill: '#525252', fontSize: 10 }} />
                <YAxis type="number" dataKey="volatility_index" name="Volatility" domain={[0, 'auto']} stroke="#525252" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Volatility Index', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10 }} />
                <ZAxis type="number" dataKey="total_movies" range={[50, 600]} name="Total Movies" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black/90 p-4 rounded-xl border border-white/10 shadow-2xl max-w-xs">
                          <p className="text-white font-bold text-sm mb-1">{data.genre}</p>
                          <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border mb-3 inline-block ${data.quadrant === 'Producer Sweet Spot' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                            data.quadrant === 'Speculative Bets' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                              data.quadrant === 'Safe but weak' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                'border-rose-500/30 text-rose-400 bg-rose-500/10'
                            }`}>{data.quadrant}</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] text-gray-500 uppercase font-bold">ROI</p>
                              <p className="text-white font-black">{data.weighted_roi}x</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-gray-500 uppercase font-bold">Risk</p>
                              <p className="text-white font-black">{data.volatility_index}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Genres" data={overallData}>
                  {overallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Producer Takeaway Panel */}
        <div className="glass rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-amber-400" size={20} />
              <h2 className="text-xl font-bold text-white">Producer Takeaway</h2>
            </div>

            <div className="space-y-6">
              {overallData.sort((a, b) => b.weighted_roi - a.weighted_roi).slice(0, 3).map((g, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-primary font-bold text-sm">{g.genre}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      <ArrowUpRight size={12} /> {g.momentum}%
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    "{g.genre} shows {g.weighted_roi > 1.5 ? 'superior' : 'stable'} ROI efficiency ({g.weighted_roi}x) with {g.volatility_index < 0.8 ? 'managed' : 'high'} volatility. Ideal for {g.avg_budget < 50000000 ? 'mid-budget' : 'high-capital'} distribution."
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-2">Strategic Recommendation</p>
            <p className="text-sm text-gray-200 font-medium">
              Allocate capital towards <span className="text-primary font-bold">{overallData.find(g => g.quadrant === 'Producer Sweet Spot')?.genre || 'Diversified'}</span> projects for optimal balance of risk and yield.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Growth Cycle */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-amber-400" size={20} /> Historical Growth Cycles (3-Year Smoothing)
          </h2>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI Evolution & Trend Direction</div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={Array.from(new Set(yearlyData.map(d => d.year))).sort().map(year => {
                const yearPoint: any = { year };
                overallData.sort((a, b) => b.total_movies - a.total_movies).slice(0, 5).forEach(g => {
                  const stats = yearlyData.find(d => d.year === year && d.genre === g.genre);
                  yearPoint[g.genre] = stats ? stats.avg_roi_smooth : 0;
                  yearPoint[`${g.genre}_trend`] = stats ? stats.trend : '→';
                });
                return yearPoint;
              })}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/90 p-3 rounded-xl border border-white/10 shadow-2xl">
                        <p className="text-white font-bold text-xs mb-3">Release Year: {label}</p>
                        <div className="space-y-2">
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                              <span style={{ color: p.color }} className="text-[10px] font-bold">{p.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-black text-xs">{p.value.toFixed(2)}x</span>
                                <span className={p.payload[`${p.name}_trend`] === '↑' ? 'text-emerald-400' : p.payload[`${p.name}_trend`] === '↓' ? 'text-rose-400' : 'text-gray-500'}>
                                  {p.payload[`${p.name}_trend`]}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              {overallData.sort((a, b) => b.total_movies - a.total_movies).slice(0, 5).map((g, i) => (
                <Line
                  key={g.genre}
                  type="monotone"
                  dataKey={g.genre}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
