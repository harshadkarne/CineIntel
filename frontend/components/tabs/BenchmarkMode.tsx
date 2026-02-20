"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell
} from "recharts";
import {
    Scale,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Activity,
    Zap,
    ArrowRight,
    ChevronRight,
    Target
} from "lucide-react";

export default function BenchmarkMode() {
    const [genres, setGenres] = useState<string[]>([]);
    const [genreA, setGenreA] = useState("Action");
    const [genreB, setGenreB] = useState("Comedy");
    const [statsA, setStatsA] = useState<any>(null);
    const [statsB, setStatsB] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (genres.length > 0) {
            compareGenres();
        }
    }, [genreA, genreB, genres]);

    const loadInitialData = async () => {
        try {
            const gData = await api.getAllGenres();
            setGenres(gData.genres || []);
        } catch (e) { console.error(e); }
    };

    const compareGenres = async () => {
        setLoading(true);
        try {
            const riskData = await api.getRiskAnalysis();
            const a = riskData.find((g: any) => g.genre === genreA);
            const b = riskData.find((g: any) => g.genre === genreB);
            setStatsA(a);
            setStatsB(b);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const StatGrid = ({ stats, color, title }: any) => (
        <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }} />
                {title} Profile
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: "Avg ROI", value: stats?.avg_roi?.toFixed(2), unit: "x", icon: TrendingUp },
                    { label: "Success Rate", value: stats?.success_rate?.toFixed(1), unit: "%", icon: CheckCircle2 },
                    { label: "Risk Score", value: stats?.risk_score?.toFixed(1), unit: "", icon: Target },
                    { label: "Volatility", value: stats?.roi_volatility?.toFixed(2), unit: "", icon: Activity }
                ].map((s, i) => (
                    <div key={i} className="glass p-5 rounded-2xl border-t border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <s.icon size={12} className="text-gray-500" />
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{s.label}</span>
                        </div>
                        <p className="text-2xl font-black text-white">{s.value}<span className="text-xs text-gray-500 ml-1">{s.unit}</span></p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-10 page-transition pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 decoration-primary/30 underline underline-offset-8">Market Benchmarking</h1>
                    <p className="text-gray-400">Head-to-head performance analysis of primary genre vectors.</p>
                </div>

                <div className="flex items-center gap-4 glass p-2 rounded-2xl border-white/5 shadow-2xl">
                    <select
                        value={genreA}
                        onChange={(e) => setGenreA(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-primary font-black uppercase tracking-widest outline-none transition-all hover:bg-white/10"
                    >
                        {genres.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
                    </select>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-500 italic">VS</div>
                    <select
                        value={genreB}
                        onChange={(e) => setGenreB(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-secondary font-black uppercase tracking-widest outline-none transition-all hover:bg-white/10"
                    >
                        {genres.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        <StatGrid stats={statsA} color="#6366f1" title={genreA} />
                        <StatGrid stats={statsB} color="#ec4899" title={genreB} />
                    </div>

                    {/* Insights Card */}
                    <div className="glass rounded-[32px] p-8 border-t border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Scale size={120} />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                            <Zap size={20} className="text-amber-500 fill-amber-500/20" /> Strategic Benchmarking Verdict
                        </h3>

                        <div className="space-y-6 relative z-10">
                            {statsA && statsB && (
                                <>
                                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">A</div>
                                        <div>
                                            <p className="text-sm text-white font-bold mb-1">{statsA.avg_roi > statsB.avg_roi ? genreA : genreB} Efficiency Leader</p>
                                            <p className="text-xs text-gray-500 leading-relaxed italic">Historical data suggests {statsA.avg_roi > statsB.avg_roi ? genreA : genreB} delivers a higher capital return velocity per investment cycle.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-secondary/10 flex items-center justify-center font-black text-secondary">B</div>
                                        <div>
                                            <p className="text-sm text-white font-bold mb-1">{statsA.risk_score < statsB.risk_score ? genreA : genreB} Stability Choice</p>
                                            <p className="text-xs text-gray-500 leading-relaxed italic">For risk-averse portfolios, {statsA.risk_score < statsB.risk_score ? genreA : genreB} offers significant volatility dampening while maintaining market presence.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Comparison Chart */}
                <div className="glass rounded-[40px] p-8 lg:p-10 border-t border-white/5 flex flex-col items-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-12 self-start flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <div className="w-4 h-4 rounded-full bg-primary border-2 border-background" />
                            <div className="w-4 h-4 rounded-full bg-secondary border-2 border-background" />
                        </div>
                        Normalized Performance Vectors
                    </h3>

                    <div className="w-full h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'ROI Peak', A: statsA?.avg_roi, B: statsB?.avg_roi },
                                { name: 'Success Yield', A: statsA?.success_rate / 10, B: statsB?.success_rate / 10 },
                                { name: 'Stability', A: (10 - statsA?.risk_score), B: (10 - statsB?.risk_score) },
                                { name: 'Market Cap', A: statsA?.roi_volatility, B: statsB?.roi_volatility }
                            ]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="rgba(255,255,255,0.2)"
                                    fontSize={10}
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontSize: '10px' }}
                                />
                                <Bar dataKey="A" fill="url(#colorA)" radius={[10, 10, 0, 0]} barSize={24} />
                                <Bar dataKey="B" fill="url(#colorB)" radius={[10, 10, 0, 0]} barSize={24} />
                                <defs>
                                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                                    </linearGradient>
                                    <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={1} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex gap-8 mt-8 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-md bg-primary" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{genreA}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-md bg-secondary" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{genreB}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
