"use client";

import { useState, useEffect } from "react";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    Legend, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, ReferenceLine
} from "recharts";
import {
    Shield, TrendingUp, AlertTriangle, Info, Zap, Activity,
    Target, Users, ChevronRight, BarChart3, PieChart as PieChartIcon,
    Layers, Percent, Scale
} from "lucide-react";
import { api } from "@/lib/api";

interface AllocationItem {
    genre: string;
    allocation: number;
    roi: number;
    volatility: number;
    hit_rate: number;
    risk_category: string;
    archetype: string;
}

interface PortfolioData {
    strategy: string;
    portfolio: AllocationItem[];
    metrics: {
        expected_roi: number;
        volatility: number;
        hit_probability: number;
        diversification_score: number;
    };
    highlights: {
        defensive: string;
        most_efficient: string;
        high_alpha: string;
        best_diversifier: string;
    };
    recommendation: string;
    warnings: string[];
}

export default function PortfolioOptimizer() {
    const [riskLevel, setRiskLevel] = useState(50);
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllocation = async () => {
            setLoading(true);
            try {
                // riskIntensity is 0-1
                const intensity = riskLevel / 100;
                const result = await api.getCapitalAllocation(intensity);
                setData(result);
            } catch (err) {
                console.error("Failed to fetch capital allocation:", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchAllocation, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [riskLevel]);

    const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899", "#71717a"];

    if (!data && loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 font-bold animate-pulse">Running Allocation Engine...</p>
                </div>
            </div>
        );
    }

    const portfolio = data?.portfolio || [];
    const metrics = data?.metrics || { expected_roi: 0, volatility: 0, hit_probability: 0, diversification_score: 0 };
    const highlights = data?.highlights || { defensive: "", most_efficient: "", high_alpha: "", best_diversifier: "" };

    return (
        <div className="space-y-8 page-transition">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Portfolio Optimizer</h1>
                    <p className="text-gray-400">Cinematic Capital Allocation Engine</p>
                </div>
                {data?.warnings.map((warning, i) => (
                    <div key={i} className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-2 animate-bounce">
                        <AlertTriangle className="text-rose-500" size={16} />
                        <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest">{warning}</span>
                    </div>
                ))}
            </div>

            {/* Top Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 glass p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Risk Appetite</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${data?.strategy === 'Conservative' ? "bg-emerald-500/10 text-emerald-400" :
                                data?.strategy === 'Balanced' ? "bg-blue-500/10 text-blue-400" :
                                    "bg-rose-500/10 text-rose-400"
                            }`}>
                            {data?.strategy}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={riskLevel}
                            onChange={(e) => setRiskLevel(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            <span>Defensive</span>
                            <span>Max Alpha</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <div className="flex items-start gap-3">
                            <Zap className="text-primary shrink-0" size={18} />
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Recommendation</h4>
                                <p className="text-xs text-gray-300 leading-relaxed italic">
                                    "{data?.recommendation}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Score Cards */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Expected ROI</p>
                        <p className="text-3xl font-black text-emerald-400 group-hover:scale-110 transition-transform">{metrics.expected_roi}x</p>
                        <p className="text-[8px] text-emerald-500/50 font-bold mt-1">Weighted Mean</p>
                    </div>
                    <div className="glass p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Hit Probability</p>
                        <p className="text-3xl font-black text-primary group-hover:scale-110 transition-transform">{metrics.hit_probability}%</p>
                        <p className="text-[8px] text-primary/50 font-bold mt-1">Efficiency Match</p>
                    </div>
                    <div className="glass p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Volatility</p>
                        <p className="text-3xl font-black text-rose-400 group-hover:scale-110 transition-transform">{metrics.volatility}σ</p>
                        <p className="text-[8px] text-rose-500/50 font-bold mt-1">Portfolio Variance</p>
                    </div>
                    <div className="glass p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 -translate-y-full group-hover:translate-y-0 transition-transform" />
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Diversification</p>
                        <p className="text-3xl font-black text-amber-400 group-hover:scale-110 transition-transform">{metrics.diversification_score}/100</p>
                        <div className="w-full bg-white/5 h-1 mt-3 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full transition-all duration-1000" style={{ width: `${metrics.diversification_score}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Allocation Pie Chart */}
                <div className="glass p-8 rounded-3xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <PieChartIcon className="text-primary" size={20} /> Capital Allocation
                        </h3>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">By Genre Weight</span>
                    </div>

                    <div className="h-[300px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={portfolio}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={2}
                                    dataKey="allocation"
                                    nameKey="genre"
                                    animationDuration={1500}
                                >
                                    {portfolio.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.05)" />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload as AllocationItem;
                                            return (
                                                <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl">
                                                    <p className="text-white font-bold text-sm mb-1">{d.genre}</p>
                                                    <p className="text-[10px] text-primary font-black uppercase">{d.archetype}</p>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Allocation:</span>
                                                            <span className="text-white font-bold">{d.allocation}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Avg ROI:</span>
                                                            <span className="text-emerald-400 font-bold">{d.roi}x</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        {portfolio.slice(0, 8).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-300 truncate w-20">{item.genre}</span>
                                    <span className="text-[8px] font-black text-white">{item.allocation}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk-Return Quadrant */}
                <div className="glass p-8 rounded-3xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                        <div className="h-full w-full grid grid-cols-2 grid-rows-2">
                            <div className="border-r border-b border-white/10 bg-emerald-500/10" />
                            <div className="border-b border-white/10 bg-blue-500/10" />
                            <div className="border-r border-white/10 bg-rose-500/10" />
                            <div className="bg-amber-500/10" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Layers className="text-primary" size={20} /> Optimization Quadrant
                        </h3>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Risk vs. Reward</span>
                    </div>

                    <div className="h-[300px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    type="number"
                                    dataKey="roi"
                                    name="ROI"
                                    stroke="transparent"
                                    domain={[0, 'auto']}
                                    label={{ value: 'Expected ROI', position: 'insideBottom', offset: -5, fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="volatility"
                                    name="Volatility"
                                    stroke="transparent"
                                    domain={[0, 'auto']}
                                    label={{ value: 'Volatility', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <ZAxis type="number" dataKey="allocation" range={[100, 1000]} />
                                <RechartsTooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-black/95 p-3 rounded-xl border border-white/10 shadow-2xl">
                                                    <p className="text-white font-bold text-xs">{d.genre}</p>
                                                    <div className="mt-1 flex gap-3">
                                                        <span className="text-[10px] text-emerald-400">{d.roi}x ROI</span>
                                                        <span className="text-[10px] text-rose-400">{d.volatility}σ Vol</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Portfolio" data={portfolio} fill="#6366f1">
                                    {portfolio.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} stroke={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                                <ReferenceLine x={metrics.expected_roi} stroke="#6366f1" strokeDasharray="3 3" opacity={0.3} />
                                <ReferenceLine y={metrics.volatility} stroke="#6366f1" strokeDasharray="3 3" opacity={0.3} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-4 mt-4 relative z-10">
                        <div className="text-[8px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">Safe Haven</div>
                        <div className="text-[8px] text-blue-400 font-bold bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">Growth</div>
                        <div className="text-[8px] text-rose-400 font-bold bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">Underperformer</div>
                        <div className="text-[8px] text-amber-400 font-bold bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">High Volatility</div>
                    </div>
                </div>
            </div>

            {/* Strategic Highlight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass p-6 rounded-3xl group cursor-pointer hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Defensive</p>
                            <h4 className="text-lg font-black text-white">{highlights.defensive}</h4>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">Minimum failure rate anchor for portfolio stability.</p>
                </div>

                <div className="glass p-6 rounded-3xl group cursor-pointer hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Scale size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Most Efficient</p>
                            <h4 className="text-lg font-black text-white">{highlights.most_efficient}</h4>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">Optimal profit generation per budget rupee across slates.</p>
                </div>

                <div className="glass p-6 rounded-3xl group cursor-pointer hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">High Alpha</p>
                            <h4 className="text-lg font-black text-white">{highlights.high_alpha}</h4>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">Maximum return potential despite increased risk exposure.</p>
                </div>

                <div className="glass p-6 rounded-3xl group cursor-pointer hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <Percent size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Best Diversifier</p>
                            <h4 className="text-lg font-black text-white">{highlights.best_diversifier}</h4>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">Low correlation asset to reduce overall portfolio variance.</p>
                </div>
            </div>
        </div>
    );
}
