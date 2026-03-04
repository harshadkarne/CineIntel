"use client";

import { useEffect, useState } from "react";
import {
    getGenreSectorComparison,
    getIndustryBenchmarks,
    getAllGenres,
    getGenreComparison,
    getROIEvolution,
    getGenreCombinations
} from "@/core/analyticsEngine";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ScatterChart,
    Scatter,
    ZAxis,
    Legend,
    LineChart as RechartLineChart,
    Line,
    AreaChart,
    Area
} from "recharts";
import {
    TrendingUp,
    Zap,
    BarChart3,
    ArrowUpRight,
    Award,
    Shield,
    Target,
    Boxes,
    LineChart as LineChartIcon,
    Info,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Flame,
    Search,
    History,
    Gauge,
    Layers,
    Activity,
    MinusSquare,
    PlusSquare,
    ArrowDownRight,
    Sword
} from "lucide-react";
import { formatROI, formatCurrency, formatPercent } from "@/lib/utils";

export default function BenchmarkMode() {
    const [sectorData, setSectorData] = useState<any[]>([]);
    const [industryData, setIndustryData] = useState<any>(null);
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Battle State
    const [genreA, setGenreA] = useState("Comedy");
    const [genreB, setGenreB] = useState("Drama");
    const [battleData, setBattleData] = useState<any>(null);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [comboData, setComboData] = useState<any[]>([]);
    const [sortBy, setSortBy] = useState("averageROI");

    useEffect(() => {
        const init = () => {
            try {
                const data = getGenreSectorComparison();
                const industry = getIndustryBenchmarks();
                const genres = getAllGenres();
                const combos = getGenreCombinations();
                setSectorData(data);
                setIndustryData(industry);
                setAllGenres(genres);
                setComboData(combos);
            } catch (e) {
                console.error("Benchmarking initialization error:", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!loading) {
            const comparison = getGenreComparison(genreA, genreB);
            const evolution = getROIEvolution(genreA, genreB);
            setBattleData(comparison);
            setTrendData(evolution);
        }
    }, [genreA, genreB, loading]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Processing Sector Vectors...</p>
            </div>
        );
    }

    const filteredData = sectorData
        .filter(d => d.genre.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b[sortBy] - a[sortBy]);

    // ROI Leaderboard Data
    const leaderboardData = [...filteredData].slice(0, 10);

    // Scatter Plot Data: Volatility vs ROI
    const scatterData = filteredData.map(d => ({
        name: d.genre,
        x: d.volatility,
        y: d.averageROI,
        z: d.totalMovies,
        risk: d.riskLevel
    }));

    return (
        <div className="space-y-8 pb-20 page-transition p-4">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic italic-glow">Genre Benchmarking</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mt-1 pl-1 border-l-2 border-primary/50">Market Sector Performance Comparison</p>
                </div>

                {industryData && (
                    <div className="flex gap-4">
                        <div className="glass px-6 py-3 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1 text-left whitespace-nowrap">Market health</p>
                            <p className="text-xl font-black text-primary">{Math.round(industryData.market_health_score)}%</p>
                        </div>
                        <div className="glass px-6 py-3 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1 text-left whitespace-nowrap">Industry Avg ROI</p>
                            <p className="text-xl font-black text-emerald-400">{industryData.medianROI.toFixed(2)}x</p>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 2 — GENRE VS GENRE COMPARATOR */}
            <div className="glass rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden bg-gradient-to-br from-indigo-500/5 to-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/20 rounded-2xl border border-primary/30 animate-pulse">
                            <Sword size={28} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Genre Battle Engine</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Head-to-Head Direct Intelligence Comparison</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-gray-500 font-black px-2 uppercase">Genre A</span>
                            <select
                                value={genreA}
                                onChange={(e) => setGenreA(e.target.value)}
                                className="bg-transparent text-white font-black text-sm outline-none px-2 py-1 cursor-pointer hover:text-primary transition-colors uppercase"
                            >
                                {allGenres.map(g => <option key={g} value={g} className="bg-neutral-900">{g}</option>)}
                            </select>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-gray-500 font-black px-2 uppercase">Genre B</span>
                            <select
                                value={genreB}
                                onChange={(e) => setGenreB(e.target.value)}
                                className="bg-transparent text-white font-black text-sm outline-none px-2 py-1 cursor-pointer hover:text-primary transition-colors uppercase"
                            >
                                {allGenres.map(g => <option key={g} value={g} className="bg-neutral-900">{g}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {battleData && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        {/* Genre A Stats */}
                        <div className={`p-6 rounded-3xl border transition-all ${battleData.winner === genreA ? 'bg-primary/10 border-primary/30 scale-105 shadow-xl shadow-primary/10' : 'bg-white/5 border-white/5 opacity-80'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="text-xl font-black text-white uppercase italic">{genreA}</h4>
                                {battleData.winner === genreA && <div className="bg-primary text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg animate-bounce">Winner</div>}
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Average ROI</span>
                                    <span className="text-white font-black">{formatROI(battleData.genreA.averageROI)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Hit Rate</span>
                                    <span className="text-emerald-400 font-black">{formatPercent(battleData.genreA.hitRate)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Failure Rate</span>
                                    <span className="text-rose-400 font-black">{formatPercent(battleData.genreA.failureRate)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Stability</span>
                                    <span className="text-amber-400 font-black">{(10 / Math.max(1, battleData.genreA.volatility)).toFixed(1)}/10</span>
                                </div>
                            </div>
                        </div>

                        {/* WINNER REASONING */}
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <Sparkles className="text-primary mb-2" size={32} />
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Winning Factor</h4>
                            <p className="text-lg font-black text-white italic leading-tight">
                                {battleData.winner === genreA ? genreA : genreB} shows
                                {battleData.comparison.roi === battleData.winner ? ' superior ROI efficiency' : ''}
                                {battleData.comparison.hitRate === battleData.winner ? ' higher market hit density' : ''}
                                {battleData.comparison.stability === battleData.winner ? ' better investor stability' : ''}
                            </p>
                            <div className="text-[8px] bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-gray-500 font-bold uppercase max-w-[200px]">
                                Audit Scoring Model: 40% ROI | 30% Hit Rate | -30% Volatility
                            </div>
                        </div>

                        {/* Genre B Stats */}
                        <div className={`p-6 rounded-3xl border transition-all ${battleData.winner === genreB ? 'bg-primary/10 border-primary/30 scale-105 shadow-xl shadow-primary/10' : 'bg-white/5 border-white/5 opacity-80'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="text-xl font-black text-white uppercase italic">{genreB}</h4>
                                {battleData.winner === genreB && <div className="bg-primary text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg animate-bounce">Winner</div>}
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Average ROI</span>
                                    <span className="text-white font-black">{formatROI(battleData.genreB.averageROI)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Hit Rate</span>
                                    <span className="text-emerald-400 font-black">{formatPercent(battleData.genreB.hitRate)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Failure Rate</span>
                                    <span className="text-rose-400 font-black">{formatPercent(battleData.genreB.failureRate)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Stability</span>
                                    <span className="text-amber-400 font-black">{(10 / Math.max(1, battleData.genreB.volatility)).toFixed(1)}/10</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 6 — ROI TREND COMPARISON */}
            <div className="glass rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <LineChartIcon size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">ROI Evolution (1957–2025)</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">3-Year Rolling Average Comparison</p>
                        </div>
                    </div>
                </div>

                <div className="h-80 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartLineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="year"
                                stroke="#525252"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#525252' }}
                            />
                            <YAxis
                                stroke="#525252"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${v}x`}
                            />
                            <Tooltip
                                contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: '12px' }}
                                itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Line
                                type="monotone"
                                dataKey={genreA}
                                stroke="#6366f1"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6 }}
                                animationDuration={1000}
                            />
                            <Line
                                type="monotone"
                                dataKey={genreB}
                                stroke="#f43f5e"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6 }}
                                animationDuration={1000}
                            />
                        </RechartLineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* SECTION 8 — GENRE COMBINATION ANALYZER */}
                <div className="glass rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-emerald-500">
                        <Zap size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-8 text-emerald-400">
                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Layers size={16} /> Top Genre Combinations
                        </h3>
                        <div className="text-[8px] px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-black uppercase tracking-widest">PROFITABILITY MULTIPLIERS</div>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {comboData.slice(0, 10).map((combo, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2">
                                        {combo.genres.map((g: string, i: number) => (
                                            <span key={i} className="text-[8px] px-2 py-0.5 bg-white/10 rounded-full text-white font-heavy uppercase">{g}</span>
                                        ))}
                                    </div>
                                    <span className="text-sm font-black text-white uppercase mt-1 group-hover:text-emerald-400 transition-colors">{combo.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-emerald-400">{combo.avgROI.toFixed(1)}x</p>
                                    <p className="text-[8px] text-gray-500 uppercase font-black">AVG ROI</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ROI Leaderboard (Moved/Consolidated) */}
                <div className="glass rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <TrendingUp size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={16} className="text-primary" /> Sector ROI Leaderboard
                        </h3>
                        <div className="text-[8px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-black uppercase tracking-widest">PROFITABILITY RANKING</div>
                    </div>

                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leaderboardData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                                <YAxis dataKey="genre" type="category" stroke="#fff" fontSize={10} width={80} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: '12px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="averageROI" radius={[0, 4, 4, 0]} barSize={20}>
                                    {leaderboardData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? '#6366f1' : '#312e81'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk vs Reward Scatter */}
                <div className="glass rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Activity size={100} />
                    </div>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Target size={16} className="text-amber-400" /> Sector Risk vs Reward
                        </h3>
                        <div className="text-[8px] px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-black uppercase tracking-widest">VOLATILITY MAPPING</div>
                    </div>

                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                {/* Quadrant Shading/Labels */}
                                <rect x="0" y="50%" width="50%" height="50%" fill="rgba(16, 185, 129, 0.05)" /> {/* Safe Zone */}
                                <rect x="50%" y="50%" width="50%" height="50%" fill="rgba(99, 102, 241, 0.05)" /> {/* Speculative */}

                                <XAxis type="number" dataKey="x" name="Volatility" stroke="#525252" fontSize={10} unit="" label={{ value: 'Risk (Volatility)', position: 'bottom', fill: '#525252', fontSize: 10 }} />
                                <YAxis type="number" dataKey="y" name="Avg ROI" stroke="#525252" fontSize={10} unit="x" label={{ value: 'Performance (ROI)', angle: -90, position: 'left', fill: '#525252', fontSize: 10 }} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Titles" />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl">
                                                    <p className="text-white font-bold text-sm mb-1">{d.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest">{d.z} Films</p>
                                                    <div className="space-y-1 border-t border-white/5 pt-2">
                                                        <p className="text-[10px] text-gray-400 flex justify-between gap-8">Average ROI <span>{d.y.toFixed(2)}x</span></p>
                                                        <p className="text-[10px] text-gray-400 flex justify-between gap-8">Volatility <span>{d.x.toFixed(2)}</span></p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Genres" data={scatterData}>
                                    {scatterData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={(entry.name === genreA || entry.name === genreB) ? '#fff' : (entry.risk === 'LOW' ? '#10b981' : (entry.risk === 'HIGH' ? '#f43f5e' : '#6366f1'))}
                                            stroke={(entry.name === genreA || entry.name === genreB) ? '#6366f1' : 'none'}
                                            strokeWidth={2}
                                            opacity={(entry.name === genreA || entry.name === genreB) ? 1 : 0.6}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* SECTION 11 — PRODUCER STRATEGIC INSIGHT */}
            <div className="glass rounded-[32px] p-8 border border-white/10 bg-gradient-to-tr from-primary/10 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles size={120} className="text-primary" />
                </div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-primary text-black rounded-2xl">
                        <Gauge size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Strategic Producer Intelligence</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Data-Driven Tactical Guidance</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                            <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Info size={14} /> Market Efficiency Analysis
                            </h4>
                            <p className="text-base font-medium text-gray-300 leading-relaxed italic">
                                Based on Cinematic Vector Mapping, <span className="text-white font-black underline underline-offset-4 decoration-primary">{battleData?.winner}</span> represents
                                the most efficient capital deployment sector. Its combination of high success probability
                                and historical ROI stability makes it the primary anchor for institutional portfolios.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Recommended Anchor</p>
                                <p className="text-sm font-black text-white">{genreA}</p>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Recommended Growth</p>
                                <p className="text-sm font-black text-white">{genreB}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Tactical Portfolio Allocation</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-white">{genreA} (PRIMARY)</span>
                                    <span className="text-primary">45%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '45%' }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-white">{genreB} (GROWTH)</span>
                                    <span className="text-indigo-400">30%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: '30%' }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-white">DIVERSIFIED SECTORS</span>
                                    <span className="text-gray-400">25%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/20" style={{ width: '25%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector Comparison Table */}
            <div className="glass rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Boxes size={24} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Sector Performance Metrics</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Exhaustive Genre Benchmarks</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                            <span className="text-[10px] text-gray-500 font-black uppercase whitespace-nowrap">Sort By</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent text-white font-black text-[10px] outline-none cursor-pointer uppercase tracking-widest"
                            >
                                <option value="averageROI" className="bg-neutral-900">ROI</option>
                                <option value="hitRate" className="bg-neutral-900">Hit Rate</option>
                                <option value="totalRevenue" className="bg-neutral-900">Revenue</option>
                                <option value="volatility" className="bg-neutral-900">Volatility</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input
                                type="text"
                                placeholder="FILTER SECTORS..."
                                className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-6 py-2.5 text-[10px] text-white outline-none focus:border-primary/50 w-full md:w-48 uppercase font-bold tracking-widest"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Sector</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Titles</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Avg ROI</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Median ROI</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Hit Rate</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Volatility</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Efficiency</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Risk profile</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm font-medium">
                            {filteredData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${row.riskLevel === 'LOW' ? 'bg-emerald-500' : (row.riskLevel === 'HIGH' ? 'bg-rose-500' : 'bg-primary')}`} />
                                            <span className="text-white font-black uppercase text-base">{row.genre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center text-gray-400 font-bold">{row.totalMovies}</td>
                                    <td className="px-6 py-5 text-center text-white font-black">{row.averageROI.toFixed(2)}x</td>
                                    <td className="px-6 py-5 text-center text-gray-400">{row.medianROI.toFixed(1)}x</td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-emerald-400 font-black">{Math.round(row.hitRate)}%</span>
                                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${row.hitRate}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center text-rose-400 font-bold">{row.volatility?.toFixed(1) || '0.0'}</td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-primary font-black">{row.riskAdjustedROI.toFixed(1)}</span>
                                            <p className="text-[8px] text-gray-600 font-black uppercase whitespace-nowrap">ROI / VOLATILITY</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.riskLevel === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (row.riskLevel === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-primary/10 text-primary border border-primary/20')}`}>
                                            {row.riskLevel} RISK
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Performers by Genre Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Award className="text-primary" size={24} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Top Performing Historical Assets per Sector</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredData.slice(0, 12).map((sector, idx) => (
                        <div key={idx} className="glass p-6 rounded-3xl border border-white/5 shadow-xl space-y-4 hover:border-primary/30 transition-all group">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest group-hover:text-primary transition-colors">{sector.genre}</h4>
                                <Sparkles size={14} className="text-primary/50" />
                            </div>
                            <div className="space-y-3">
                                {sector.topDrivers?.slice(0, 5).map((film: any, fIdx: number) => (
                                    <div key={fIdx} className="flex justify-between items-center text-xs">
                                        <div className="flex flex-col overflow-hidden max-w-[140px]">
                                            <span className="text-white font-bold truncate">{film.title}</span>
                                            <span className="text-[9px] text-gray-500 font-bold uppercase">{film.year} • ₹{film.budget.toFixed(1)} Cr</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-emerald-400 font-black">{film.roi.toFixed(1)}x</span>
                                            <span className="text-[8px] text-gray-600 uppercase font-black">ROI</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
