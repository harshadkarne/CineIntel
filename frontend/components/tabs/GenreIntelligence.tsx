"use client";

import { useEffect, useState } from "react";
import { getAllGenreAnalytics, getYearlyGenrePerformance } from "@/core/analyticsEngine";
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
  ZAxis,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { TrendingUp, Award, PieChart as PieIcon, BarChart3, Info, Download, Filter, Zap, Target, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight, Minus, Star } from "lucide-react";
import { formatROI, formatVolatility, formatPercent, formatCurrencyCr } from "@/lib/utils";

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

interface Driver {
  title: string;
  roi: number;
  year: number;
}

interface BudgetBand {
  label: string;
  min: number;
  max: number;
  avg_roi: number;
  hit_rate: number;
  count: number;
}

interface GenreData {
  genre: string;
  total_movies: number;
  valid_movies_count: number;
  average_roi: number;
  median_roi: number;
  hit_rate: number;
  flop_rate: number;
  roi_volatility: number;
  investment_score: number;
  budget_intelligence: BudgetBand[];
  roi_growth_5yr: number;
  total_revenue: number;
  avg_budget: number;
  top_drivers: Driver[];
  volume_share: number;
  revenue_share: number;
  lifecycle: string;
  saturation_label: string;
  saturation_index: number;
  confidence: "HIGH" | "LOW";
  confidence_message: string;
  sweet_spot: string;
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
  const [medians, setMedians] = useState({ roi: 2.0, volatility: 1.5 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    setError(null);
    try {
      const engineData = (getAllGenreAnalytics() || []) as any[];

      const overall: GenreData[] = engineData.map((g: any) => {
        return {
          genre: g.genre,
          total_movies: g.totalMovies,
          valid_movies_count: g.validMoviesCount,
          average_roi: g.averageROI,
          median_roi: g.medianROI,
          hit_rate: g.hitRate,
          flop_rate: g.failureRate,           // AUDIT FIX: was g.flopRate (doesn't exist)
          roi_volatility: g.volatility,
          investment_score: g.compositeScore, // AUDIT FIX: was g.investmentScore (mapped differently)
          budget_intelligence: g.budgetIntelligence,
          roi_growth_5yr: g.momentum || 0,   // AUDIT FIX: was g.roiGrowth5Yr (doesn't exist)
          total_revenue: g.totalRevenue,
          avg_budget: g.averageBudget,
          top_drivers: (g.topDrivers || []).map((d: any) => ({ title: d.title, roi: d.roi, year: d.year })),
          volume_share: g.volumeShare || 0,
          revenue_share: g.revenueShare || 0,
          lifecycle: g.lifecycle || 'Stable',
          saturation_label: g.saturationIndex > 1.0 ? 'Saturated' : g.saturationIndex > 0.7 ? 'High Activity' : 'Stable', // AUDIT FIX: was g.saturationLabel (doesn't exist)
          saturation_index: g.saturationIndex || 0,
          confidence: g.confidence,
          confidence_message: g.confidence === 'HIGH' ? 'Statistically significant sample' : 'Limited sample — use with caution', // AUDIT FIX: was g.confidenceMessage (doesn't exist)
          sweet_spot: g.sweetSpot || 'N/A'
        };
      });

      // Compute dynamic medians for quadrant pivots
      const validGenres = overall.filter(g => g.total_movies >= 10);
      if (validGenres.length > 0) {
        const sortedROI = [...validGenres].sort((a, b) => a.average_roi - b.average_roi);
        const sortedVol = [...validGenres].sort((a, b) => a.roi_volatility - b.roi_volatility);
        setMedians({
          roi: sortedROI[Math.floor(sortedROI.length / 2)].average_roi,
          volatility: sortedVol[Math.floor(sortedVol.length / 2)].roi_volatility
        });
      }

      const yearly = getYearlyGenrePerformance();

      setOverallData(overall);
      setYearlyData(yearly as any);
    } catch (error) {
      console.error("Error formatting genre data:", error);
      setError("Failed to process cinematic intelligence locally.");
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
        <div className="glow-card p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all h-full">
          <Target className="text-emerald-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Avg Hit Rate</p>
          <h3 className="text-2xl font-bold text-white">
            {formatPercent((overallData?.reduce((acc: number, curr: GenreData) => acc + (curr?.hit_rate || 0), 0) || 0) / Math.max(1, overallData?.length || 0), 1)}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Weighted Performance</p>
        </div>
        <div className="glow-card p-6 rounded-2xl border border-white/5 hover:border-rose-500/30 transition-all h-full">
          <Activity className="text-rose-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Volatility Index</p>
          <h3 className="text-2xl font-bold text-white">
            {formatVolatility((overallData?.reduce((acc: number, curr: GenreData) => acc + (curr?.roi_volatility || 0), 0) || 0) / Math.max(1, overallData?.length || 0))}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">ROI Standard Deviation</p>
        </div>
        <div className="glow-card p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group relative cursor-help h-full">
          <ShieldCheck className="text-primary mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Budget Efficiency</p>
          <h3 className="text-2xl font-bold text-white">
            {formatROI((overallData?.reduce((acc: number, curr: GenreData) => acc + (curr?.average_roi || 0), 0) || 0) / Math.max(1, overallData?.length || 0))}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Avg ROI per ₹1</p>
          <div className="absolute -top-10 left-0 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
            Profit generated per ₹1 invested (Budget vs Profit margin)
          </div>
        </div>
        <div className="glow-card p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all h-full">
          <TrendingUp className="text-amber-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Investment Score</p>
          <h3 className="text-2xl font-bold text-white">
            {((overallData?.reduce((acc: number, curr: GenreData) => acc + (curr?.investment_score || 0), 0) || 0) / Math.max(1, overallData?.length || 0)).toFixed(1)}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Yield Efficiency Metric</p>
        </div>
        <div className="glow-card p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all h-full">
          <Star className="text-emerald-400 mb-3" size={24} />
          <p className="text-[10px] text-gray-500 uppercase font-black">Top Performers</p>
          <h3 className="text-xs font-bold text-white truncate max-w-full">
            {([...overallData]?.sort((a, b) => b.average_roi - a.average_roi)?.[0]?.genre || "N/A")}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Best Performing Sector</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Leaders (ROI by Genre) */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="text-primary" size={20} /> Performance Leaders
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Average ROI x Genre</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...overallData].sort((a, b) => b.average_roi - a.average_roi).slice(0, 10)}>
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
                          <p className="text-primary font-black text-lg">{formatROI(data.average_roi)}</p>
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
                <Bar dataKey="average_roi" radius={[4, 4, 0, 0]}>
                  {([...overallData]?.sort((a, b) => b.average_roi - a.average_roi)?.slice(0, 10) || []).map((_, index) => (
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
                  data={(() => {
                    const sorted = [...overallData].sort((a, b) => (shareType === 'volume' ? b.volume_share - a.volume_share : b.revenue_share - a.revenue_share));
                    const top8 = sorted.slice(0, 8);
                    const others = sorted.slice(8);
                    if (others.length === 0) return top8.map(g => ({ ...g, value: shareType === 'volume' ? g.volume_share : g.revenue_share }));

                    const othersValue = others.reduce((acc, curr) => acc + (shareType === 'volume' ? curr.volume_share : curr.revenue_share), 0);
                    return [...top8.map(g => ({ ...g, value: shareType === 'volume' ? g.volume_share : g.revenue_share })), { genre: 'Others', value: othersValue }];
                  })()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="genre"
                >
                  {([...overallData]?.slice(0, 9) || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 8 ? '#4b5563' : COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => [`${formatPercent(value)}`, name]}
                  contentStyle={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
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
                <XAxis
                  type="number"
                  dataKey="average_roi"
                  name="Avg ROI"
                  domain={[0, 6]}
                  stroke="#525252"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Average ROI Multiplier', position: 'insideBottomRight', offset: -10, fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  type="number"
                  dataKey="roi_volatility"
                  name="Volatility"
                  domain={[0, 4]}
                  stroke="#525252"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'ROI Volatility (StdDev)', angle: -90, position: 'insideLeft', offset: 10, fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                />
                <ZAxis type="number" dataKey="total_movies" range={[50, 400]} name="Total Movies" />

                {/* Dynamic Quadrant Lines based on Dataset Medians */}
                <ReferenceLine x={medians.roi} stroke="#4ade80" strokeDasharray="5 5" strokeOpacity={0.3} label={{ position: 'top', value: `Median ROI (${medians.roi.toFixed(1)}x)`, fill: '#4ade80', fontSize: 8, opacity: 0.5 }} />
                <ReferenceLine y={medians.volatility} stroke="#f87171" strokeDasharray="5 5" strokeOpacity={0.3} label={{ position: 'right', value: `Median Volatility (${medians.volatility.toFixed(1)})`, fill: '#f87171', fontSize: 8, opacity: 0.5 }} />


                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isSweet = data.average_roi >= medians.roi && data.roi_volatility <= medians.volatility;
                      const isSpec = data.average_roi >= medians.roi && data.roi_volatility > medians.volatility;
                      const isStable = data.average_roi < medians.roi && data.roi_volatility <= medians.volatility;

                      return (
                        <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl max-w-xs backdrop-blur-xl">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-bold text-sm">{data.genre}</p>
                            {data.confidence === "LOW" && <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1 rounded font-bold">Low Confidence</span>}
                          </div>
                          <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border mb-3 inline-block uppercase tracking-tighter ${isSweet ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                            isSpec ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                              isStable ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                'border-rose-500/30 text-rose-400 bg-rose-500/10'
                            }`}>
                            {isSweet ? 'Producer Sweet Spot' : isSpec ? 'Speculative Bets' : isStable ? 'Stable Growth' : 'High Risk zone'}
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                            <div>
                              <p className="text-[8px] text-gray-500 uppercase font-bold">Average ROI</p>
                              <p className="text-white font-black text-sm">{formatROI(data.average_roi)}</p>
                            </div>
                            <div>
                              <p className="text-[8px] text-gray-500 uppercase font-bold">Volatility</p>
                              <p className="text-white font-black text-sm">{formatVolatility(data.roi_volatility)}</p>
                            </div>
                          </div>
                          <p className="text-[8px] text-gray-400 mt-2 font-medium italic">Based on {data.total_movies} cinematic records</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Genres" data={overallData}>
                  {overallData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.confidence === "LOW" ? "#4b5563" : COLORS[index % COLORS.length]}
                      fillOpacity={0.8}
                      strokeWidth={1}
                      stroke="rgba(255,255,255,0.2)"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-amber-400" size={20} />
              <h2 className="text-xl font-bold text-white">Producer Takeaway</h2>
            </div>

            <div className="space-y-6">
              {[...overallData]
                .sort((a, b) => b.investment_score - a.investment_score)
                .slice(0, 3)
                .map((g, i) => (
                  <div key={i} className={`bg-white/5 rounded-2xl p-4 border transition-all ${g.confidence === "LOW" ? "border-white/5 opacity-60" : "border-white/5 hover:border-primary/20"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-primary font-bold text-sm">{g.genre}</p>
                        <p className="text-[8px] text-gray-500 uppercase font-black">{g.lifecycle} Phase</p>
                      </div>
                      <div className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border ${g.saturation_label === 'Underserved' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                        g.saturation_label === 'Oversaturated' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                          'border-white/10 text-gray-400'
                        }`}>
                        {g.saturation_label}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-300 leading-relaxed mb-3">
                      Optimal capital entry: <span className="text-white font-bold">{g.sweet_spot}</span>.
                      {g.roi_growth_5yr > 0 ? ` ROI momentum is ${g.roi_growth_5yr.toFixed(1)}% up.` : ` ROI momentum compressed.`}
                    </p>
                    {g.confidence === "LOW" && (
                      <div className="flex items-center gap-1 text-[8px] text-rose-400 mt-2 bg-rose-400/10 p-1 rounded">
                        <ShieldCheck size={10} /> {g.confidence_message}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-2">Strategic Recommendation</p>
            <p className="text-sm text-gray-200 font-medium">
              Priority deployment recommended for <span className="text-primary font-bold">{[...overallData].sort((a, b) => b.investment_score - a.investment_score)[0]?.genre}</span> films tracking in the budget range of <span className="text-emerald-400">{[...overallData].sort((a, b) => b.investment_score - a.investment_score)[0]?.sweet_spot}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Historical Growth Cycle */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-amber-400" size={20} /> Historical Growth Cycles (3rd Order Smoothing)
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI Evolution Trends (n ≥ 30)</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={Array.from(new Set(yearlyData.map(d => d.year))).sort().map(year => {
                  const yearPoint: any = { year };
                  // Major genres only correctly handles requested threshold
                  [...overallData]
                    .filter(g => g.total_movies >= 30)
                    .sort((a, b) => b.total_movies - a.total_movies)
                    .slice(0, 10) // Show top 10 major genres for clarity
                    .forEach(g => {
                      const stats = yearlyData.find(d => d.year === year && d.genre === g.genre);
                      yearPoint[g.genre] = stats ? stats.avg_roi_smooth : null;
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
                          <p className="text-white font-bold text-xs mb-3">Year: {label}</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {payload.map((p: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-4">
                                <span style={{ color: p.color }} className="text-[10px] font-bold">{p.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-black text-xs">{p.value ? p.value.toFixed(2) + 'x' : 'N/A'}</span>
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
                <Legend iconType="circle" wrapperStyle={{ fontSize: '8px' }} />
                {[...overallData]
                  .filter(g => g.total_movies >= 30)
                  .sort((a, b) => b.total_movies - a.total_movies)
                  .slice(0, 10)
                  .map((g, i) => (
                    <Line key={g.genre} type="monotone" dataKey={g.genre} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre Budget ROI Efficiency (Precision Bands) */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} /> Genre-Budget Efficiency Matrix
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Performance Across Capital Bands</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overallData
                  .filter(g => g.confidence === "HIGH")
                  .sort((a, b) => b.investment_score - a.investment_score)
                  .slice(0, 5)
                  .flatMap(g => g.budget_intelligence.map(b => ({
                    genre: g.genre,
                    band: b.label.split('(')[0].trim(),
                    avg_roi: b.avg_roi,
                    genre_band: `${g.genre} - ${b.label}`
                  })))
                  .filter(d => d.avg_roi > 0)
                }
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="genre_band" hide />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-black/90 p-3 rounded-xl border border-white/10 shadow-2xl">
                          <p className="text-white font-bold text-xs mb-1">{d.genre}</p>
                          <p className="text-gray-400 text-[8px] mb-2">{d.band}</p>
                          <p className="text-primary font-black text-lg">{formatROI(d.avg_roi)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avg_roi" radius={[2, 2, 0, 0]}>
                  {overallData
                    .filter(g => g.confidence === "HIGH")
                    .sort((a, b) => b.investment_score - a.investment_score)
                    .slice(0, 5)
                    .flatMap((g, i) => g.budget_intelligence.filter(b => b.avg_roi > 0).map(() => ({ color: COLORS[i % COLORS.length] })))
                    .map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />)
                  }
                </Bar>
                <Legend content={() => (
                  <div className="flex flex-wrap gap-4 mt-4">
                    {overallData.filter(g => g.confidence === "HIGH")
                      .sort((a, b) => b.investment_score - a.investment_score)
                      .slice(0, 5).map((g, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-[9px] text-gray-400">{g.genre}</span>
                        </div>
                      ))}
                  </div>
                )} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
