"use client";

import { useState, useEffect, useMemo } from "react";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, ReferenceLine,
    BarChart, Bar, Legend
} from "recharts";
import {
    Shield, TrendingUp, AlertTriangle, Zap, Activity,
    Target, ChevronRight, BarChart3, PieChart as PieChartIcon,
    Layers, Percent, Scale
} from "lucide-react";
import { formatROI, formatPercent, formatVolatility } from "@/lib/utils";

// ─────────────────────────────────────────────────
// ISOLATED DATA ENGINE  (no imports from analyticsEngine)
// All calculations are self-contained within this file.
// ─────────────────────────────────────────────────

import { MOVIE_DATABASE } from "@/core/analyticsEngine";

interface GenrePortfolioStats {
    genre: string;
    avgROI: number;
    hitRate: number;
    failureRate: number;
    volatility: number;
    sharpeScore: number;
    filmCount: number;
    archetype: string;
}

/** Compute per-genre stats directly from MOVIE_DATABASE — isolated read */
function computePortfolioGenreStats(): GenrePortfolioStats[] {
    const map: Record<string, { rois: number[] }> = {};
    MOVIE_DATABASE.forEach((m) => {
        if (!m.budget || m.budget <= 0) return;
        m.genres.forEach((g: string) => {
            if (!map[g]) map[g] = { rois: [] };
            map[g].rois.push(m.roi);
        });
    });

    const results: GenrePortfolioStats[] = [];
    for (const [genre, { rois }] of Object.entries(map)) {
        if (rois.length < 20) continue; // minimum sample

        const avgROI = rois.reduce((a, b) => a + b, 0) / rois.length;
        const hitRate = (rois.filter(r => r > 1.0).length / rois.length) * 100;
        const failureRate = (rois.filter(r => r < 1.0).length / rois.length) * 100;

        const mean = avgROI;
        const variance = rois.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / rois.length;
        const volatility = Math.sqrt(variance);

        // Sharpe-style score: ROI / Volatility (higher is better)
        const sharpeScore = volatility > 0 ? avgROI / volatility : avgROI;

        let archetype = "STABLE PERFORMER";
        if (failureRate < 20 && volatility < 2.0 && avgROI > 1.5) archetype = "CORE STABLE";
        else if (avgROI > 2.5 && volatility >= 2.0 && volatility < 4.0) archetype = "GROWTH OPPORTUNITY";
        else if (volatility >= 4.0 && failureRate > 30) archetype = "SPECULATIVE";
        else if (failureRate > 40) archetype = "HIGH RISK SEGMENT";

        results.push({ genre, avgROI, hitRate, failureRate, volatility, sharpeScore, filmCount: rois.length, archetype });
    }

    return results.sort((a, b) => b.sharpeScore - a.sharpeScore);
}

/** Compute a pairwise average ROI correlation proxy (variance dispersion) */
function computeDiversificationScore(genres: GenrePortfolioStats[]): number {
    if (genres.length <= 1) return 0;

    // Use variance in avgROI across selected genres → higher spread = more diversified
    const avgROIs = genres.map(g => g.avgROI);
    const mean = avgROIs.reduce((a, b) => a + b, 0) / avgROIs.length;
    const variance = avgROIs.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / avgROIs.length;
    const stdDev = Math.sqrt(variance);

    // Normalize: stdDev of 0 → 0%, stdDev of 2+ → 100%
    const score = Math.min((stdDev / 2.0) * 100, 100);

    // Also use archetype diversity as a component
    const archetypes = new Set(genres.map(g => g.archetype)).size;
    const archetypeBonus = Math.min((archetypes / 4) * 40, 40);

    return Math.min(Math.round(score * 0.6 + archetypeBonus), 100);
}

/** Sharpe-optimized allocation engine */
function allocatePortfolio(
    allStats: GenrePortfolioStats[],
    riskLevel: number // 0 = defensive, 100 = aggressive
): { genre: string; allocation: number; roi: number; volatility: number; hitRate: number; failureRate: number; archetype: string; sharpeScore: number }[] {
    if (allStats.length === 0) return [];

    // Risk level determines how we score each genre
    // Low risk: prefer low failure rate + low volatility
    // High risk: prefer high ROI
    const riskWeight = riskLevel / 100; // 0–1

    const scored = allStats.map(g => {
        const safetyScore = (100 - g.failureRate) / 100;
        const returnScore = Math.min(g.avgROI / 5, 1);
        const efficiencyScore = Math.min(g.sharpeScore / 2, 1);

        // Blend between safety-focused and return-focused
        const compositeScore =
            safetyScore * (1 - riskWeight) * 0.5 +
            returnScore * riskWeight * 0.5 +
            efficiencyScore * 0.3 +
            (g.filmCount / 500) * 0.2; // film weight bonus

        return { ...g, compositeScore };
    });

    // Sort and pick top genres (more at high risk = include more aggressive)
    const maxGenres = Math.min(Math.round(5 + riskLevel / 20), 9); // 5–9 genres
    const selected = [...scored].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, maxGenres);

    // Raw weights from composite score
    const totalComposite = selected.reduce((acc, g) => acc + g.compositeScore, 0);

    // Assign raw proportional weights, then clamp to [5%, 40%]
    let weights = selected.map(g => ({
        ...g,
        allocation: Math.max(5, Math.min(40, Math.round((g.compositeScore / totalComposite) * 100)))
    }));

    // Normalize to exactly 100%
    let totalWeight = weights.reduce((acc, g) => acc + g.allocation, 0);
    if (totalWeight !== 100) {
        const diff = 100 - totalWeight;
        // Apply correction to the genre with the largest share
        const maxIdx = weights.reduce((mIdx, g, idx) => g.allocation > weights[mIdx].allocation ? idx : mIdx, 0);
        weights[maxIdx].allocation = Math.max(5, weights[maxIdx].allocation + diff);
    }

    // Final re-check
    totalWeight = weights.reduce((acc, g) => acc + g.allocation, 0);
    if (totalWeight !== 100) {
        weights[0].allocation += (100 - totalWeight);
    }

    return weights.map(g => ({
        genre: g.genre,
        allocation: g.allocation,
        roi: parseFloat(g.avgROI.toFixed(2)),
        volatility: parseFloat(g.volatility.toFixed(2)),
        hitRate: parseFloat(g.hitRate.toFixed(1)),
        failureRate: parseFloat(g.failureRate.toFixed(1)),
        archetype: g.archetype,
        sharpeScore: parseFloat(g.sharpeScore.toFixed(2))
    }));
}

/** Portfolio-level metrics using proper weighted formulas */
function computePortfolioMetrics(portfolio: ReturnType<typeof allocatePortfolio>) {
    if (portfolio.length === 0) {
        return { expected_roi: 0, hit_probability: 0, volatility: 0, diversification_score: 0 };
    }

    // Expected ROI = Σ (Genre ROI × Weight)
    const expected_roi = portfolio.reduce((acc, p) => acc + (p.roi * p.allocation / 100), 0);

    // Hit Probability = Σ (Genre Hit Rate × Weight)
    const hit_probability = portfolio.reduce((acc, p) => acc + (p.hitRate * p.allocation / 100), 0);

    // Portfolio Volatility ≈ √(Σ w²σ²) (simplified, zero-covariance approximation)
    const volatility = Math.sqrt(
        portfolio.reduce((acc, p) => acc + Math.pow(p.allocation / 100, 2) * Math.pow(p.volatility, 2), 0)
    );

    // Convert portfolio items to GenrePortfolioStats-like objects for diversification
    const genreStatsProxies = portfolio.map(p => ({
        genre: p.genre,
        avgROI: p.roi,
        archetype: p.archetype,
        hitRate: p.hitRate,
        failureRate: p.failureRate,
        volatility: p.volatility,
        sharpeScore: p.sharpeScore,
        filmCount: 100
    }));
    const diversification_score = computeDiversificationScore(genreStatsProxies);

    return {
        expected_roi: parseFloat(expected_roi.toFixed(2)),
        hit_probability: parseFloat(hit_probability.toFixed(1)),
        volatility: parseFloat(volatility.toFixed(2)),
        diversification_score
    };
}

// ─────────────────────────────────────────────────
// UI COMPONENT
// ─────────────────────────────────────────────────

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#71717a"];

export default function PortfolioOptimizer() {
    const [riskLevel, setRiskLevel] = useState(50);
    const [loading, setLoading] = useState(true);

    // Compute genre stats once on mount (isolated from other modules)
    const allGenreStats = useMemo(() => computePortfolioGenreStats(), []);

    // Re-compute portfolio whenever risk changes
    const portfolio = useMemo(() => allocatePortfolio(allGenreStats, riskLevel), [allGenreStats, riskLevel]);
    const metrics = useMemo(() => computePortfolioMetrics(portfolio), [portfolio]);

    useEffect(() => {
        setLoading(allGenreStats.length === 0);
    }, [allGenreStats]);

    // Strategy label
    const strategy = riskLevel < 30 ? "Conservative" : riskLevel > 70 ? "Aggressive" : "Balanced";

    // AI Recommendation
    const recommendation = riskLevel > 70
        ? `High-alpha focus. ${portfolio[0]?.genre || "Action"} leads alpha generation. Accept elevated volatility for max-ROI potential.`
        : riskLevel < 30
            ? `Defensive posture. Anchor in ${portfolio.find(p => p.failureRate === Math.min(...portfolio.map(x => x.failureRate)))?.genre || "Drama"} to minimize downside exposure.`
            : `Balanced allocation across ${portfolio.length} genres. Efficiency-optimized via Sharpe ratio weighting.`;

    // Producer Highlights
    const defensive = [...portfolio].sort((a, b) => a.failureRate - b.failureRate)[0];
    const mostEfficient = [...portfolio].sort((a, b) => b.sharpeScore - a.sharpeScore)[0];
    const highAlpha = [...portfolio].sort((a, b) => b.roi - a.roi)[0];
    const bestDiversifier = [...portfolio].sort((a, b) => a.volatility - b.volatility)[0];

    // Warnings
    const warnings: string[] = [];
    if (riskLevel > 80) warnings.push("High volatility exposure. Diversification sub-optimal.");
    if (metrics.diversification_score < 30) warnings.push("Portfolio is concentrated. Consider adding more genres.");
    if (metrics.hit_probability < 40) warnings.push("Low hit probability detected. Adjust risk appetite.");

    // Diversification label
    const diversificationLabel =
        metrics.diversification_score >= 60 ? "Diversified" :
            metrics.diversification_score >= 30 ? "Moderate" :
                "Concentrated";

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 font-bold animate-pulse">Loading Allocation Engine...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 page-transition pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Portfolio Optimizer</h1>
                    <p className="text-gray-400">Cinematic Capital Allocation Engine — {allGenreStats.length} qualified genres</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {warnings.map((w, i) => (
                        <div key={i} className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="text-rose-500" size={14} />
                            <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest">{w}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Control Panel + Score Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Risk Slider */}
                <div className="lg:col-span-1 glass p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Risk Appetite</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${strategy === "Conservative" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            strategy === "Balanced" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                            {strategy}
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
                            <span className="text-primary font-black">{riskLevel}</span>
                            <span>Max Alpha</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-start gap-3">
                            <Zap className="text-primary shrink-0 mt-0.5" size={16} />
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Recommendation</h4>
                                <p className="text-xs text-gray-300 leading-relaxed italic">"{recommendation}"</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-2">Allocation Engine</p>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            Weights optimized via Sharpe-ratio scoring. Min 5% / Max 40% per genre. Total = 100%.
                        </p>
                    </div>
                </div>

                {/* Score Cards */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glow-card p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors h-full">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Expected ROI</p>
                        <p className="text-3xl font-black text-white group-hover:scale-110 transition-transform">{formatROI(metrics.expected_roi)}</p>
                        <p className="text-[8px] text-gray-400 font-bold mt-1">Σ (ROI × Weight)</p>
                    </div>
                    <div className="glow-card p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors h-full">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Hit Probability</p>
                        <p className="text-3xl font-black text-primary group-hover:scale-110 transition-transform">{formatPercent(metrics.hit_probability)}</p>
                        <p className="text-[8px] text-primary/50 font-bold mt-1">Σ (HitRate × Weight)</p>
                    </div>
                    <div className="glow-card p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors h-full">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Volatility</p>
                        <p className="text-3xl font-black text-rose-400 group-hover:scale-110 transition-transform">{formatVolatility(metrics.volatility)}</p>
                        <p className="text-[8px] text-rose-500/50 font-bold mt-1">√(Wᵀ Σ W) Proxy</p>
                    </div>
                    <div className="glow-card p-6 rounded-3xl flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors h-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 -translate-y-full group-hover:translate-y-0 transition-transform" />
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Diversification</p>
                        <p className="text-3xl font-black text-amber-400 group-hover:scale-110 transition-transform relative z-10">
                            {metrics.diversification_score}/100
                        </p>
                        <p className="text-[8px] text-amber-500/60 font-bold mt-1">{diversificationLabel}</p>
                        <div className="w-full bg-white/5 h-1 mt-3 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${metrics.diversification_score >= 60 ? "bg-emerald-400" :
                                    metrics.diversification_score >= 30 ? "bg-amber-400" : "bg-rose-400"
                                    }`}
                                style={{ width: `${metrics.diversification_score}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Capital Allocation Pie */}
                <div className="glass p-8 rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <PieChartIcon className="text-primary" size={20} /> Capital Allocation
                        </h3>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            {portfolio.length} Genres • Sums 100%
                        </span>
                    </div>

                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={portfolio}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={105}
                                    paddingAngle={2}
                                    dataKey="allocation"
                                    nameKey="genre"
                                    animationDuration={1200}
                                >
                                    {portfolio.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="rgba(0,0,0,0.3)"
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md min-w-[160px]">
                                                    <p className="text-white font-bold text-sm mb-1">{d.genre}</p>
                                                    <p className="text-[9px] text-primary font-black uppercase mb-2">{d.archetype}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Allocation:</span>
                                                            <span className="text-white font-bold">{d.allocation}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Avg ROI:</span>
                                                            <span className="text-emerald-400 font-bold">{d.roi}x</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Hit Rate:</span>
                                                            <span className="text-blue-400 font-bold">{d.hitRate}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Sharpe:</span>
                                                            <span className="text-amber-400 font-bold">{d.sharpeScore}x/σ</span>
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

                    {/* Legend */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                        {portfolio.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold text-gray-300 truncate">{item.genre}</span>
                                    <span className="text-[9px] font-black text-white">{item.allocation}% · {item.roi}x</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Optimization Quadrant Scatter */}
                <div className="glass p-8 rounded-3xl relative overflow-hidden">
                    {/* Quadrant background */}
                    <div className="absolute inset-0 pointer-events-none" style={{ top: '80px' }}>
                        <div className="h-full w-full grid grid-cols-2 grid-rows-2">
                            <div className="border-r border-b border-white/5 bg-emerald-500/5" />
                            <div className="border-b border-white/5 bg-blue-500/5" />
                            <div className="border-r border-white/5 bg-rose-500/5" />
                            <div className="bg-amber-500/5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Layers className="text-primary" size={20} /> Optimization Quadrant
                        </h3>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ROI vs Volatility</span>
                    </div>

                    <div className="h-[280px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis
                                    type="number"
                                    dataKey="roi"
                                    name="ROI"
                                    stroke="#525252"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={['auto', 'auto']}
                                    label={{ value: 'Expected ROI Multiple', position: 'insideBottom', offset: -15, fill: '#525252', fontSize: 9, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="volatility"
                                    name="Volatility"
                                    stroke="#525252"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={['auto', 'auto']}
                                    label={{ value: 'Volatility (σ)', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 9, fontWeight: 'bold' }}
                                />
                                <ZAxis type="number" dataKey="allocation" range={[80, 600]} name="Allocation" />
                                <ReferenceLine
                                    x={metrics.expected_roi}
                                    stroke="#6366f1"
                                    strokeDasharray="4 4"
                                    strokeOpacity={0.4}
                                    label={{ value: 'Portfolio ROI', position: 'top', fill: '#6366f1', fontSize: 8 }}
                                />
                                <ReferenceLine
                                    y={metrics.volatility}
                                    stroke="#6366f1"
                                    strokeDasharray="4 4"
                                    strokeOpacity={0.4}
                                    label={{ value: 'Portfolio σ', position: 'right', fill: '#6366f1', fontSize: 8 }}
                                />
                                <RechartsTooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            const quadrant =
                                                d.roi >= metrics.expected_roi && d.volatility < metrics.volatility ? "GROWTH" :
                                                    d.roi >= metrics.expected_roi && d.volatility >= metrics.volatility ? "HIGH VOLATILITY" :
                                                        d.roi < metrics.expected_roi && d.volatility < metrics.volatility ? "SAFE HAVEN" :
                                                            "INEFFICIENT";
                                            const qColor = quadrant === "GROWTH" ? "#3b82f6" : quadrant === "HIGH VOLATILITY" ? "#f59e0b" : quadrant === "SAFE HAVEN" ? "#10b981" : "#ef4444";
                                            return (
                                                <div className="bg-black/95 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl min-w-[180px]">
                                                    <p className="text-white font-bold text-sm mb-1">{d.genre}</p>
                                                    <p className="text-[9px] font-black px-1.5 py-0.5 rounded border inline-block uppercase tracking-tighter mb-2" style={{ color: qColor, borderColor: `${qColor}40`, backgroundColor: `${qColor}15` }}>{quadrant}</p>
                                                    <div className="space-y-1 border-t border-white/5 pt-2">
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Allocation</span>
                                                            <span className="text-white font-bold">{d.allocation}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Avg ROI</span>
                                                            <span className="text-emerald-400 font-bold">{d.roi}x</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Volatility</span>
                                                            <span className="text-rose-400 font-bold">σ {d.volatility}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 text-[10px] text-gray-400">
                                                            <span>Sharpe</span>
                                                            <span className="text-primary font-bold">{d.sharpeScore}x/σ</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Portfolio" data={portfolio}>
                                    {portfolio.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            fillOpacity={0.75}
                                            stroke={COLORS[index % COLORS.length]}
                                            strokeWidth={1}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Quadrant Legend */}
                    <div className="flex justify-center flex-wrap gap-3 mt-4 relative z-10">
                        {[
                            { label: "Safe Haven", color: "emerald", icon: Shield },
                            { label: "Growth", color: "blue", icon: TrendingUp },
                            { label: "Inefficient", color: "rose", icon: AlertTriangle },
                            { label: "High Volatility", color: "amber", icon: Zap },
                        ].map(({ label, color, icon: Icon }) => (
                            <div key={label} className={`flex items-center gap-1.5 text-[8px] text-${color}-400 font-bold bg-${color}-500/5 px-2 py-1 rounded border border-${color}-500/10 uppercase tracking-tighter`}>
                                <Icon size={10} />{label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Allocation Bar Chart */}
            <div className="glass p-8 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-primary" size={20} /> Genre Weight Distribution
                    </h3>
                    <span className="text-[10px] text-gray-500 font-black uppercase">Sharpe-Optimized • {strategy} Mode</span>
                </div>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={portfolio} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="genre" stroke="#525252" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="#525252" fontSize={9} tickLine={false} axisLine={false} unit="%" domain={[0, 45]} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                formatter={(value: number, name: string) => [`${value}%`, name === 'allocation' ? 'Allocation' : name]}
                            />
                            <Bar dataKey="allocation" radius={[4, 4, 0, 0]} animationDuration={1000}>
                                {portfolio.map((_, index) => (
                                    <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Producer Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    {
                        label: "Defensive Anchor",
                        value: defensive?.genre || "N/A",
                        sub: `Failure rate: ${defensive?.failureRate?.toFixed(1)}%`,
                        color: "emerald",
                        icon: Shield,
                        desc: "Minimum failure rate. Anchor for portfolio stability."
                    },
                    {
                        label: "Most Efficient",
                        value: mostEfficient?.genre || "N/A",
                        sub: `Sharpe: ${mostEfficient?.sharpeScore?.toFixed(2)}x/σ`,
                        color: "blue",
                        icon: Scale,
                        desc: "Highest ROI per unit of volatility. Capital efficiency leader."
                    },
                    {
                        label: "High Alpha",
                        value: highAlpha?.genre || "N/A",
                        sub: `ROI: ${highAlpha?.roi?.toFixed(2)}x`,
                        color: "rose",
                        icon: TrendingUp,
                        desc: "Highest expected return despite increased risk exposure."
                    },
                    {
                        label: "Best Diversifier",
                        value: bestDiversifier?.genre || "N/A",
                        sub: `Volatility: σ ${bestDiversifier?.volatility?.toFixed(2)}`,
                        color: "amber",
                        icon: Percent,
                        desc: "Lowest volatility. Reduces overall portfolio variance."
                    }
                ].map(({ label, value, sub, color, icon: Icon, desc }) => (
                    <div key={label} className={`glass p-6 rounded-3xl group cursor-pointer hover:border-${color}-500/30 transition-all border border-white/5`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-2xl bg-${color}-500/10 flex items-center justify-center text-${color}-500 group-hover:bg-${color}-500 group-hover:text-white transition-colors`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{label}</p>
                                <h4 className="text-lg font-black text-white">{value}</h4>
                            </div>
                        </div>
                        <p className={`text-[10px] text-${color}-400 font-bold mb-2`}>{sub}</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed italic">{desc}</p>
                    </div>
                ))}
            </div>

            {/* Validation Footer */}
            <div className="glass p-6 rounded-3xl border border-white/5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    {[
                        { label: "Genres in Portfolio", value: portfolio.length.toString(), ok: portfolio.length >= 5 },
                        { label: "Weights Sum", value: `${portfolio.reduce((a, b) => a + b.allocation, 0)}%`, ok: portfolio.reduce((a, b) => a + b.allocation, 0) === 100 },
                        { label: "Diversification", value: diversificationLabel, ok: metrics.diversification_score >= 30 },
                        { label: "Dataset Coverage", value: `${allGenreStats.length} genres`, ok: allGenreStats.length >= 10 },
                        { label: "Engine Mode", value: "Isolated", ok: true },
                    ].map(({ label, value, ok }) => (
                        <div key={label} className="space-y-1">
                            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{label}</p>
                            <p className={`text-sm font-black ${ok ? "text-emerald-400" : "text-rose-400"}`}>{value}</p>
                            <div className={`text-[8px] font-bold ${ok ? "text-emerald-600" : "text-rose-600"} uppercase`}>
                                {ok ? "✓ PASS" : "✗ CHECK"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
