"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Search,
    Filter,
    TrendingUp,
    Star,
    Zap,
    Target,
    ShieldCheck,
    ArrowUpRight,
    Activity,
    AlertCircle,
    ChevronDown,
    LayoutGrid,
    Sparkles,
    Calendar
} from "lucide-react";
import { MOVIE_DATABASE, getAllGenres, getExplorerInsights, getROIClassification } from "@/core/analyticsEngine";
import { filterMovies, FilterState } from "@/core/filterEngine";
import { formatROI, formatCurrencyCr, isValidNumber, formatPercent } from "@/lib/utils";

// --- Types ---
interface Movie {
    title: string;
    year: number;
    genres: string[];
    roi: number;
    budget: number;
    revenue: number;
    poster_url: string;
    imdb_rating: number;
    risk_category: string;
    risk_score: number;
    success_label: string;
}

// --- Memoized Components ---

const MovieAssetCard = React.memo(({ movie }: { movie: Movie }) => {
    const roiClass = getROIClassification(movie.roi);

    const getBadgeStyle = (label: string) => {
        switch (label) {
            case "Breakout ROI": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
            case "Hit": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
            case "Stable Asset": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "Flop": return "bg-rose-500/20 text-rose-400 border-rose-500/30";
            default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
        }
    };

    return (
        <div className="group relative glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-white/5 flex flex-col h-full bg-gray-900/40">
            {/* Poster Section (Fixed Aspect Ratio) */}
            <div className="aspect-[2/3] relative overflow-hidden bg-gray-800">
                <img
                    src={movie.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400&auto=format&fit=crop"}
                    alt={movie.title}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400&auto=format&fit=crop"; }}
                />

                {/* Minimal Overlay Info (Visible on hover) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Budget</p>
                            <p className="text-sm font-black text-white">{formatCurrencyCr(movie.budget)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Revenue</p>
                            <p className="text-sm font-black text-white">{formatCurrencyCr(movie.revenue)}</p>
                        </div>
                    </div>
                </div>

                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border backdrop-blur-md ${getBadgeStyle(roiClass)}`}>
                        {roiClass}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase border border-white/10 bg-black/40 text-gray-300 backdrop-blur-md">
                        {movie.year}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-black text-white line-clamp-1 group-hover:text-primary transition-colors">{movie.title}</h3>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">
                        {movie.genres.join(" • ")}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">ROI Multiple</span>
                        <span className={`text-lg font-black ${movie.roi >= 2 ? 'text-emerald-400' : movie.roi >= 1 ? 'text-blue-400' : 'text-rose-400'}`}>
                            {movie.roi.toFixed(2)}x
                        </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Rating & Confidence</span>
                        <div className="flex items-center gap-1">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs font-black text-white">{movie.imdb_rating?.toFixed(1) || "7.0"}</span>
                            <span className="text-[10px] text-gray-600">({Math.round((movie.imdb_rating || 7) * 10)}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- Main Component ---

export default function MovieExplorer() {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [genreFilter, setGenreFilter] = useState("All Genres");
    const [budgetFilter, setBudgetFilter] = useState("All Budgets");
    const [performanceFilter, setPerformanceFilter] = useState("All Movies");
    const [riskFilter, setRiskFilter] = useState("All Risks");
    const [sortFilter, setSortFilter] = useState("Newest First");
    const [yearRange, setYearRange] = useState<[number, number]>([1957, 2025]);

    const [visibleCount, setVisibleCount] = useState(24);
    const observerTarget = useRef(null);

    // Debounce search
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(h);
    }, [searchTerm]);

    // Data filtering
    const allMovies = MOVIE_DATABASE as unknown as Movie[];
    const genres = useMemo(() => getAllGenres(), []);

    const filteredMovies = useMemo(() => {
        return filterMovies(allMovies, {
            searchQuery: debouncedSearch,
            performance: performanceFilter,
            genre: genreFilter,
            budget: budgetFilter,
            risk: riskFilter,
            yearRange: yearRange,
            sortBy: sortFilter
        }) as Movie[];
    }, [debouncedSearch, performanceFilter, genreFilter, budgetFilter, riskFilter, yearRange, sortFilter]);

    // Insights derived from filtered data
    const insights = useMemo(() => getExplorerInsights(filteredMovies), [filteredMovies]);

    // Intersection Observer for Virtualized/Lazy Loading
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => Math.min(prev + 24, filteredMovies.length));
            }
        }, { threshold: 0.1 });

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [filteredMovies.length]);

    // Reset pagination on filter change
    useEffect(() => {
        setVisibleCount(24);
    }, [debouncedSearch, performanceFilter, genreFilter, budgetFilter, riskFilter, yearRange, sortFilter]);

    const clearFilters = () => {
        setSearchTerm("");
        setGenreFilter("All Genres");
        setBudgetFilter("All Budgets");
        setPerformanceFilter("All Movies");
        setRiskFilter("All Risks");
        setSortFilter("Newest First");
        setYearRange([1957, 2025]);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* 1. Discovery Controls (Sticky) */}
            <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/10 px-6 py-4 -mx-6 transition-all duration-300">
                <div className="max-w-[1600px] mx-auto space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search cinematic assets by title or genre..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {/* Performance Filter */}
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
                                value={performanceFilter}
                                onChange={(e) => setPerformanceFilter(e.target.value)}
                            >
                                <option className="bg-gray-900">All Movies</option>
                                <option className="bg-gray-900">Breakout ROI</option>
                                <option className="bg-gray-900">Hit</option>
                                <option className="bg-gray-900">Stable Asset</option>
                                <option className="bg-gray-900">Flop</option>
                            </select>

                            {/* Genre Filter */}
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
                                value={genreFilter}
                                onChange={(e) => setGenreFilter(e.target.value)}
                            >
                                <option className="bg-gray-900">All Genres</option>
                                {genres.map(g => (
                                    <option key={g} className="bg-gray-900">{g}</option>
                                ))}
                            </select>

                            {/* Budget Filter */}
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
                                value={budgetFilter}
                                onChange={(e) => setBudgetFilter(e.target.value)}
                            >
                                <option className="bg-gray-900">All Budgets</option>
                                <option className="bg-gray-900" value="Micro">Micro (₹0 - 5 Cr)</option>
                                <option className="bg-gray-900" value="Low">Low (₹5 - 30 Cr)</option>
                                <option className="bg-gray-900" value="Mid">Mid (₹30 - 100 Cr)</option>
                                <option className="bg-gray-900" value="High">High (&gt; ₹100 Cr)</option>
                            </select>

                            {/* Risk Filter */}
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
                                value={riskFilter}
                                onChange={(e) => setRiskFilter(e.target.value)}
                            >
                                <option className="bg-gray-900">All Risks</option>
                                <option className="bg-gray-900" value="Safe">Stable</option>
                                <option className="bg-gray-900" value="Moderate">Moderate</option>
                                <option className="bg-gray-900" value="High Risk">High Risk</option>
                            </select>

                            {/* Sort Filter */}
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
                                value={sortFilter}
                                onChange={(e) => setSortFilter(e.target.value)}
                            >
                                <option className="bg-gray-900">Newest First</option>
                                <option className="bg-gray-900">ROI (High → Low)</option>
                                <option className="bg-gray-900">Revenue (High → Low)</option>
                                <option className="bg-gray-900">Rating</option>
                                <option className="bg-gray-900">Budget (High → Low)</option>
                            </select>

                            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 gap-2">
                                <Calendar size={14} className="text-gray-500" />
                                <input
                                    type="number"
                                    min="1950"
                                    max="2025"
                                    value={yearRange[0]}
                                    onChange={(e) => setYearRange([parseInt(e.target.value), yearRange[1]])}
                                    className="w-12 bg-transparent text-xs font-bold text-white focus:outline-none"
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="number"
                                    min="1950"
                                    max="2025"
                                    value={yearRange[1]}
                                    onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
                                    className="w-12 bg-transparent text-xs font-bold text-white focus:outline-none"
                                />
                            </div>

                            <button
                                onClick={clearFilters}
                                className="bg-primary/20 hover:bg-primary/30 text-primary rounded-xl px-4 py-3 text-sm font-bold transition-colors"
                            >
                                Reset Analysis
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Strategic Insight Cards */}
            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass p-6 rounded-3xl border border-white/5 space-y-1 group hover:border-primary/30 transition-colors">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Top Performing Genre</p>
                        <p className="text-2xl font-black text-white flex items-center gap-2 group-hover:text-primary transition-colors">
                            {insights.topGenre} <TrendingUp size={18} className="text-emerald-400" />
                        </p>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-white/5 space-y-1 group hover:border-primary/30 transition-colors">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Optimal Budget Range</p>
                        <p className="text-2xl font-black text-white flex items-center gap-2 group-hover:text-primary transition-colors">
                            {insights.optimalBudget} <ShieldCheck size={18} className="text-blue-400" />
                        </p>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-white/5 space-y-1 group hover:border-primary/30 transition-colors">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Highest ROI Asset</p>
                        <p className="text-2xl font-black text-amber-400 truncate max-w-full">
                            {insights.highestROIAsset?.title || "N/A"}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">Multiplier: {insights.highestROIAsset?.roi.toFixed(1)}x</p>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-white/5 space-y-1 group hover:border-primary/30 transition-colors">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Weakest Segment</p>
                        <p className="text-2xl font-black text-gray-300">
                            {insights.weakestSegment}
                        </p>
                        <p className="text-[10px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                            <AlertCircle size={10} /> Market Underperformer
                        </p>
                    </div>
                </div>
            )}

            {/* 3. Cinematic Asset Grid (Virtualized) */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 italic uppercase">
                    <Activity className="text-primary" size={24} />
                    Quantifying {filteredMovies.length} Cinematic Assets
                </h2>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Execution Mode: Client-side Engine
                </div>
            </div>

            {filteredMovies.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                        {filteredMovies.slice(0, visibleCount).map((movie, idx) => (
                            <MovieAssetCard key={`${movie.title}-${movie.year}-${idx}`} movie={movie} />
                        ))}
                    </div>

                    {/* Intersection Target */}
                    {visibleCount < filteredMovies.length && (
                        <div ref={observerTarget} className="h-40 flex flex-col items-center justify-center text-gray-500">
                            <Zap className="animate-pulse text-primary mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synthesizing theatrical slates...</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 space-y-6 glass rounded-[48px] border-dashed border-white/10">
                    <LayoutGrid size={64} className="text-gray-700 opacity-20" />
                    <div className="text-center">
                        <h3 className="text-xl font-black text-gray-400 italic">No cinematic assets match the current strategy.</h3>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-[0.2em] mt-2">Adjust fiscal filters to recalibrate the matrix</p>
                    </div>
                </div>
            )}

            {/* 4. AI Cluster Insights (Bottom Section) */}
            {filteredMovies.length > 0 && (
                <div className="pt-20 space-y-8">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <Sparkles className="text-primary" size={20} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">AI Cluster Discovery Patterns</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="glass p-8 rounded-[40px] border border-white/5 space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ArrowUpRight size={80} />
                            </div>
                            <h4 className="text-lg font-black text-white italic">High-ROI Micro Clusters</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">Identify genres like Horror or Crime with budgets under ₹10Cr that consistently deliver 5x+ ROI multiples. These are your alpha drivers.</p>
                        </div>
                        <div className="glass p-8 rounded-[40px] border border-white/5 space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ShieldCheck size={80} />
                            </div>
                            <h4 className="text-lg font-black text-white italic">The Stability Anchor</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">Mid-budget Drama (₹30-70Cr) exhibits the lowest volatility. Ideal for core slate cushioning in uncertain market cycles.</p>
                        </div>
                        <div className="glass p-8 rounded-[40px] border border-white/5 space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity size={80} />
                            </div>
                            <h4 className="text-lg font-black text-white italic">The Fat Tail Risk</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">Action and Sci-Fi Tentpoles (&gt;₹150Cr) exhibit high variance. Require rigorous success window analysis before capital commitment.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
