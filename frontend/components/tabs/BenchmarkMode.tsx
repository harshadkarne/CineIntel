"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import {
    TrendingUp,
    Activity,
    Zap,
    BarChart3,
    ArrowUpRight,
    Award,
    Shield,
    Target,
    Boxes,
    LineChart,
    Info,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Flame
} from "lucide-react";

export default function BenchmarkMode() {
    const [genres, setGenres] = useState<string[]>([]);
    const [genreA, setGenreA] = useState("Action");
    const [genreB, setGenreB] = useState("Comedy");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAllGenres().then(d => setGenres(d.genres || d || []));
    }, []);

    useEffect(() => {
        if (genres.length > 0) {
            compareGenres();
        }
    }, [genreA, genreB, genres]);

    const compareGenres = async () => {
        setLoading(true);
        try {
            const result = await api.getGenreComparison(genreA, genreB);
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const radarData = data ? [
        { subject: 'ROI Peak', A: data.genre_a.norm_roi_peak * 100, B: data.genre_b.norm_roi_peak * 100, fullMark: 100, desc: "Best performing local ROI historically" },
        { subject: 'Success Yield', A: data.genre_a.norm_success_yield * 100, B: data.genre_b.norm_success_yield * 100, fullMark: 100, desc: "Likelihood of exceeding break-even" },
        { subject: 'Stability', A: data.genre_a.norm_stability * 100, B: data.genre_b.norm_stability * 100, fullMark: 100, desc: "Consistency of returns (low variance)" },
        { subject: 'Market Cap', A: data.genre_a.norm_market_cap * 100, B: data.genre_b.norm_market_cap * 100, fullMark: 100, desc: "Total box office revenue contribution" },
        { subject: 'Momentum', A: data.genre_a.norm_momentum * 100, B: data.genre_b.norm_momentum * 100, fullMark: 100, desc: "Relative growth in the last 5 years" },
    ] : [];

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Calibrating comparison vectors...</p>
            </div>
        );
    }

    if (!data) return null;

    const DimensionBox = ({ title, winner, metrics, icon: Icon }: any) => (
        <div className="glass rounded-2xl border border-white/5 p-4 space-y-3 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity ${winner === genreA ? 'text-primary' : 'text-secondary'}`}>
                <Icon size={96} />
            </div>

            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-white/40">
                    <Icon size={14} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">{title}</h4>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${winner === genreA ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                    Winner: {winner}
                </div>
            </div>

            <div className="space-y-2 relative z-10">
                {metrics.map((m: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[9px] font-bold text-gray-500">
                            <span>{m.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.min(100, (m.a / (m.a + m.b + 0.0001)) * 100)}%` }}
                                />
                                <div
                                    className="h-full bg-secondary"
                                    style={{ width: `${Math.min(100, (m.b / (m.a + m.b + 0.0001)) * 100)}%` }}
                                />
                            </div>
                            <div className="flex gap-2 min-w-[70px] justify-end">
                                <span className={`text-[10px] font-black ${m.a >= m.b ? 'text-primary' : 'text-gray-600'}`}>
                                    {typeof m.a === 'number' ? m.a.toFixed(m.a < 10 && m.a > 0 ? 1 : 0) : m.a}{m.unit}
                                </span>
                                <span className={`text-[10px] font-black ${m.b > m.a ? 'text-secondary' : 'text-gray-600'}`}>
                                    {typeof m.b === 'number' ? m.b.toFixed(m.b < 10 && m.b > 0 ? 1 : 0) : m.b}{m.unit}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 page-transition">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic italic-glow">Benchmark Mode</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mt-1 pl-1 border-l-2 border-primary/50">Comparative Genre Intelligence</p>
                </div>

                <div className="flex items-center gap-4 glass p-2 rounded-2xl border-white/5 border-t border-l shadow-2xl">
                    <select
                        value={genreA}
                        onChange={(e) => setGenreA(e.target.value)}
                        className="bg-primary/20 border border-primary/30 rounded-xl px-4 py-2 text-xs text-primary font-black uppercase outline-none transition-all hover:bg-primary/30"
                    >
                        {genres.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
                    </select>
                    <div className="text-white/20 font-black italic text-sm">VS</div>
                    <select
                        value={genreB}
                        onChange={(e) => setGenreB(e.target.value)}
                        className="bg-secondary/20 border border-secondary/30 rounded-xl px-4 py-2 text-xs text-secondary font-black uppercase outline-none transition-all hover:bg-secondary/30"
                    >
                        {genres.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Verdict and Dimensions */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Verdict Card */}
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[32px] p-8 border border-white/10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap size={100} />
                        </div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                                <Sparkles size={18} />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Strategic Intelligence Summary</h3>
                        </div>

                        <p className="text-xl font-medium text-white/90 leading-relaxed italic mb-8 border-l-4 border-primary/50 pl-6 py-1 relative z-10">
                            "{data.verdict}"
                        </p>

                        <div className="flex flex-wrap gap-3 relative z-10">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border flex items-center gap-2 ${data.tags.a === 'Aggressive' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                {data.tags.a === 'Aggressive' ? <Flame size={12} /> : <Shield size={12} />}
                                {genreA}: {data.tags.a} Genre
                            </span>
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border flex items-center gap-2 ${data.tags.b === 'Aggressive' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                {data.tags.b === 'Aggressive' ? <Flame size={12} /> : <Shield size={12} />}
                                {genreB}: {data.tags.b} Genre
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[10px] font-black uppercase">
                                <Target size={12} />
                                PORTFOLIO SUITABILITY: {genreA}: {data.suitability.a} | {genreB}: {data.suitability.b}
                            </div>
                        </div>
                    </div>

                    {/* Dimension Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DimensionBox
                            title="Performance"
                            winner={data.comparison_matrix.Performance.winner}
                            metrics={data.comparison_matrix.Performance.metrics}
                            icon={TrendingUp}
                        />
                        <DimensionBox
                            title="Risk Analytics"
                            winner={data.comparison_matrix.Risk.winner}
                            metrics={data.comparison_matrix.Risk.metrics}
                            icon={Activity}
                        />
                        <DimensionBox
                            title="Efficiency"
                            winner={data.comparison_matrix["Budget Efficiency"].winner}
                            metrics={data.comparison_matrix["Budget Efficiency"].metrics}
                            icon={Sparkles}
                        />
                        <DimensionBox
                            title="Market Momentum"
                            winner={data.comparison_matrix["Market Momentum"].winner}
                            metrics={data.comparison_matrix["Market Momentum"].metrics}
                            icon={ArrowUpRight}
                        />
                        <DimensionBox
                            title="Stability"
                            winner={data.comparison_matrix.Stability.winner}
                            metrics={data.comparison_matrix.Stability.metrics}
                            icon={Shield}
                        />
                        <div className="glass rounded-2xl border border-dashed border-white/10 p-4 flex flex-col items-center justify-center text-center space-y-2 opacity-30">
                            <Award size={24} className="text-gray-500" />
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Competitive Matrix<br />Live Synchronization</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Radar Chart */}
                <div className="glass rounded-[40px] p-8 border border-white/10 flex flex-col bg-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                    <div className="mb-10 pl-2">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                            <Target className="text-primary" size={20} /> Metric Vector Overlap
                        </h3>
                        <div className="flex gap-4 mt-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#6366f1]" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{genreA} Profiles</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_#ec4899]" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{genreB} Profiles</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name={genreA}
                                    dataKey="A"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.4}
                                    animationDuration={1500}
                                />
                                <Radar
                                    name={genreB}
                                    dataKey="B"
                                    stroke="#ec4899"
                                    fill="#ec4899"
                                    fillOpacity={0.4}
                                    animationDuration={1500}
                                />
                                <Tooltip
                                    content={({ active, payload, label }: any) => {
                                        if (active && payload && payload.length) {
                                            const item = radarData.find(d => d.subject === label);
                                            return (
                                                <div className="bg-slate-950/90 border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-2xl min-w-[220px]">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] text-white font-black uppercase tracking-widest">{label}</p>
                                                        <Info size={12} className="text-gray-500" />
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mb-4 leading-tight border-b border-white/5 pb-2">
                                                        {item?.desc}
                                                    </p>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center group">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                <span className="text-[10px] font-bold text-gray-400">{genreA} Index</span>
                                                            </div>
                                                            <span className="text-xs font-black text-white">{(payload[0].value as number).toFixed(1)}%</span>
                                                        </div>
                                                        <div className="flex justify-between items-center group">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                                                <span className="text-[10px] font-bold text-gray-400">{genreB} Index</span>
                                                            </div>
                                                            <span className="text-xs font-black text-white">{(payload[1].value as number).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2">
                            <Award className="text-amber-500" size={14} />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Global Market Dominance</span>
                        </div>
                        <p className="text-xs font-bold text-white pl-5 uppercase leading-relaxed">
                            {data.genre_a.total_box_office > data.genre_b.total_box_office ? (
                                <><span className="text-primary">{genreA}</span> leads with {data.genre_a.market_share}% total market share contribution.</>
                            ) : (
                                <><span className="text-secondary">{genreB}</span> leads with {data.genre_b.market_share}% total market share contribution.</>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
