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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { TrendingUp, Award, PieChart as PieIcon, BarChart3, Info, Download, Filter } from "lucide-react";

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function GenreIntelligence() {
  const [overallData, setOverallData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-80 glass rounded-3xl" />
        <div className="h-80 glass rounded-3xl" />
      </div>
      <div className="h-96 glass rounded-3xl" />
      <div className="h-80 glass rounded-3xl" />
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
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Genre Intelligence</h1>
          <p className="text-gray-400">Deep-dive into genre performance cycles and historical ROI clusters.</p>
        </div>
        <div className="flex gap-3">
          <button className="glass p-3 rounded-xl text-gray-400 hover:text-white transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Leaders (ROI by Genre) */}
        <div className="glass rounded-3xl p-8 group">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="text-primary" size={20} /> Performance Leaders
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI x GENRE</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallData.sort((a, b) => b.avg_roi - a.avg_roi).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="genre"
                  stroke="#525252"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="avg_roi" radius={[4, 4, 0, 0]}>
                  {overallData.sort((a, b) => b.avg_roi - a.avg_roi).slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Share (Movies per Genre) */}
        <div className="glass rounded-3xl p-8 group">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PieIcon className="text-emerald-400" size={20} /> Market Share
            </h2>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Volume Distribution</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overallData.sort((a, b) => b.total_movies - a.total_movies).slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total_movies"
                >
                  {overallData.sort((a, b) => b.total_movies - a.total_movies).slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROI Archetypes Scatter (ROI vs Volatility) */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-primary" size={20} /> ROI Archetypes & Risk
          </h2>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI vs Volatility (Bubble = Vol)</div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="avg_roi" name="Average ROI" unit="x" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="roi_volatility" name="Volatility" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
              <ZAxis type="number" dataKey="total_movies" range={[50, 400]} name="Total Movies" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Scatter name="Genres" data={overallData} fill="#6366f1" fillOpacity={0.6}>
                {overallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Growth Cycle (ROI over time per Genre) */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-amber-400" size={20} /> Historical Growth Cycles
          </h2>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ROI Evolution</div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={Array.from(new Set(yearlyData.map(d => d.year))).sort().map(year => {
                const yearPoint: any = { year };
                overallData.sort((a, b) => b.total_movies - a.total_movies).slice(0, 5).forEach(g => {
                  const stats = yearlyData.find(d => d.year === year && d.genre === g.genre);
                  yearPoint[g.genre] = stats ? stats.avg_roi : 0;
                });
                return yearPoint;
              })}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Legend iconType="circle" />
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
