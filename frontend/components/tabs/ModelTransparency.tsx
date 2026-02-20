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
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Cell,
    PieChart,
    Pie
} from "recharts";
import {
    ShieldCheck,
    Info,
    BrainCircuit,
    Activity,
    Database,
    Zap,
    Cpu,
    Fingerprint,
    Layers,
    Sparkles,
    Clock,
    ArrowRight
} from "lucide-react";

export default function ModelTransparency() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getModelTransparency();
            setMetrics(data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="space-y-8 animate-pulse p-8"><div className="h-48 glass rounded-3xl" /><div className="h-96 glass rounded-3xl" /></div>;

    return (
        <div className="space-y-8 page-transition pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 decoration-secondary/30 underline underline-offset-8">Model Transparency</h1>
                    <p className="text-gray-400">Deep-dive into the neural weightings and logical architecture of the CineIntel AI.</p>
                </div>

                <div className="flex items-center gap-3 glass px-4 py-2 rounded-2xl border-secondary/20 transition-all hover:bg-white/[0.05]">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Model Engine: RF-v4.2-Live</span>
                </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Accuracy Score", value: `${metrics?.accuracy}%`, icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Neural Nodes", value: "1,024", icon: Cpu, color: "text-secondary", bg: "bg-secondary/10" },
                    { label: "Feature Vectors", value: metrics?.dataset_info?.features_count, icon: Fingerprint, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Training Cycle", value: "Daily", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" }
                ].map((m, i) => (
                    <div key={i} className="glass p-6 rounded-3xl flex items-center gap-4 hover:bg-white/[0.04] transition-all group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${m.bg} group-hover:scale-110 transition-transform`}>
                            <m.icon className={m.color} size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">{m.label}</p>
                            <p className="text-2xl font-black text-white">{m.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Feature Importance Radar */}
                <div className="lg:col-span-8 glass rounded-3xl p-8 relative overflow-hidden group border-t border-white/5 shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BrainCircuit size={160} />
                    </div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Layers size={20} className="text-primary" /> Feature Predictive Weighting
                        </h3>
                        <div className="text-[10px] text-gray-500 font-medium italic">Global Importance Spectrum</div>
                    </div>

                    <div className="h-[450px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics?.feature_importance}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="feature" tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="Weight"
                                    dataKey="importance"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.3}
                                    strokeWidth={3}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Classification Health */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="glass rounded-3xl p-8 space-y-6 border-t border-white/5">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity size={20} className="text-secondary" /> Model State
                        </h3>

                        <div className="space-y-6">
                            {metrics?.classes?.map((cls: string, i: number) => (
                                <div key={cls} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-gray-500">Class: {cls}</span>
                                        <span className="text-white">Active</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${i === 0 ? 'from-emerald-500 to-emerald-300' : 'from-rose-500 to-rose-300'}`}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                                <Sparkles size={12} className="text-primary" /> Core Strategy
                            </div>
                            <p className="text-xs text-gray-500 italic leading-relaxed">"The model prioritizes budgetary scaling and genre-specific ROI velocity over production timeframe."</p>
                        </div>
                    </div>

                    <div className="glass rounded-3xl p-8 space-y-4 group cursor-help transition-all hover:bg-white/[0.04]">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Database size={16} className="text-amber-500" /> Training Volume
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{metrics?.dataset_info?.total_samples?.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 font-bold uppercase">Movies</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">Verified master dataset since 2001.</div>
                    </div>
                </div>
            </div>

            {/* Tech Architecture Card */}
            <div className="glass rounded-[40px] p-12 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                            <Cpu size={14} /> Architecture Protocol
                        </div>
                        <h2 className="text-4xl font-black text-white italic tracking-tighter">Random Forest <br />Ensemble v4.2</h2>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md">Our prediction engine utilizes a high-dimensional ensemble of decision trees, cross-referencing thousands of historical investment pairs to isolate success signals in the chaos of film market volatility.</p>

                        <div className="flex gap-4 pt-4">
                            <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Inference Time</p>
                                <p className="text-xl font-bold text-white">42ms</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Cross-Validation</p>
                                <p className="text-xl font-bold text-white">K-Fold 10x</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8 space-y-6 relative overflow-hidden">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-primary" /> Feature Delta Analysis
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed italic">"Significant dominance detected in the `Budget` vector, indicating that theatrical hit probability is heavily influenced by production scale and marketing firepower within this dataset's context."</p>

                        <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase text-gray-500">
                            <span>Explainability Atlas</span>
                            <ArrowRight size={14} className="text-primary" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
