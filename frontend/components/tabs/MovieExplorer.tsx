"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Filter, TrendingUp, Calendar, Star, BarChart3, AlertCircle, Info, Flame } from "lucide-react";
import { api } from "@/lib/api";

interface Movie {
    title: string;
    year: number;
    genres: string;
    roi: number;
    box_office: number;
    poster_url: string;
    imdb_rating: number;
    success_label: string;
    vote_count?: number;
    trending_score?: number;
    intelligence_tags?: string[];
    budget_percentile?: number;
}

interface DiscoveryRow {
    title: string;
    type: "carousel" | "row";
    description: string;
    movies: Movie[];
}

export default function MovieExplorer() {
    // State
    const [movies, setMovies] = useState<Movie[]>([]);
    const [discoveryRows, setDiscoveryRows] = useState<DiscoveryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [genreFilter, setGenreFilter] = useState("All");
    const [successFilter, setSuccessFilter] = useState("All");
    const [budgetFilter, setBudgetFilter] = useState("All");
    const [riskFilter, setRiskFilter] = useState("All");
    const [sortFilter, setSortFilter] = useState("Recent Hits");

    // Pagination & Data
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [genres, setGenres] = useState<string[]>([]);

    // Observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastMovieElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore]);

    // Initial Data Fetch
    useEffect(() => {
        api.getAllGenres().then(data => setGenres(data.genres || [])).catch(console.error);

        api.getDiscoveryData().then(data => {
            setDiscoveryRows(data.rows || []);
        }).catch(console.error);
    }, []);

    // Main Fetch Logic
    const fetchMovies = useCallback(async (pageNum: number, isReset: boolean = false) => {
        if (isReset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const data = await api.getMovies({
                page: pageNum,
                limit: 20,
                search: searchTerm,
                genre: genreFilter,
                success_label: successFilter,
                sort_by: sortFilter,
                sort_order: "desc",
                budget_tier: budgetFilter,
                risk_level: riskFilter
            });

            setMovies(prev => isReset ? data.movies : [...prev, ...data.movies]);
            setHasMore(pageNum < data.total_pages);
            setTotalCount(data.total_count);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchTerm, genreFilter, successFilter, sortFilter, budgetFilter, riskFilter]);

    // Trigger fetch on filter change (reset)
    useEffect(() => {
        setPage(1);
        const timer = setTimeout(() => {
            fetchMovies(1, true);
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchMovies, searchTerm, genreFilter, successFilter, sortFilter, budgetFilter, riskFilter]);

    // Trigger fetch on scroll (append)
    useEffect(() => {
        if (page > 1) {
            fetchMovies(page, false);
        }
    }, [page]); // intentional shallow dependency

    const usdToCrore = (value: number) => ((value / 1000000) * 8.3).toFixed(1);

    const MovieCard = ({ movie, isRef = false }: { movie: Movie, isRef?: boolean }) => {
        const isTrending = movie.trending_score && movie.trending_score >= 0.8;

        return (
            <div
                ref={isRef ? lastMovieElementRef : null}
                className="group relative glass-card overflow-hidden glow-card border-white/5 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1"
            >
                <div className="aspect-[2/3] relative overflow-hidden bg-white/5">
                    <img
                        src={movie.poster_url || "/fallback.jpg"}
                        alt={movie.title}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "/fallback.jpg";
                        }}
                        loading="lazy"
                    />

                    {/* Top Left Intelligence Tags */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 items-start z-10 w-full pr-6">
                        {movie.intelligence_tags && movie.intelligence_tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="badge bg-black/70 text-xs text-white border-white/10 backdrop-blur-md px-2 py-1 shadow-xl">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Top Right Signals */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
                        {isTrending && (
                            <div className="bg-orange-500/20 text-orange-400 p-1.5 rounded-full border border-orange-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.5)]" title={`Trending Score: ${movie.trending_score}`}>
                                <Flame size={14} className="animate-pulse" />
                            </div>
                        )}
                        <span className="badge bg-black/70 text-amber-400 border-amber-400/30 flex items-center gap-1 backdrop-blur-md font-bold px-2 py-1">
                            <Star size={10} fill="currentColor" /> {movie.imdb_rating}
                        </span>
                    </div>

                    {/* Bottom Hover Overlay - Intelligence Data */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                        <div className="flex flex-col gap-2 mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-wider text-primary font-black">ROI Multiple</div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Budget Tier</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-2xl font-black text-white">{movie.roi}x</div>
                                <div className="text-sm font-bold text-gray-300">{movie.budget_percentile ? `Top ${100 - movie.budget_percentile}%` : 'N/A'}</div>
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-white/10 mb-3" />

                        <div className="flex justify-between items-center">
                            <p className="text-[11px] text-gray-400 font-medium truncate max-w-[70%]">{movie.genres}</p>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${movie.success_label === 'Hit' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : movie.success_label === 'Flop' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                {movie.success_label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-900/40">
                    <h3 className="text-sm font-bold text-white truncate mb-1.5 group-hover:text-primary transition-colors">{movie.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar size={12} className="text-gray-500" /> {movie.year}</span>
                        <span>Rev: ₹{usdToCrore(movie.box_office)}Cr</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 page-transition pb-20">
            {/* Header section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        Discovery Engine
                        <span className="text-xs font-semibold px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center gap-1">
                            <TrendingUp size={12} /> Live Signals
                        </span>
                    </h1>
                    <p className="text-gray-400">Intelligence-driven market discovery and smart cinematic cohorts.</p>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-400 glass px-4 py-2 rounded-xl">
                    <Info size={16} className="text-primary" />
                    <span>Intelligence logic considers <strong className="text-white">ROI multiple, budget percentile, and genre momentum.</strong></span>
                </div>
            </div>

            {/* Discovery Carousels (AI Rows) */}
            {!loading && page === 1 && discoveryRows.map((row, idx) => (
                <div key={idx} className="space-y-4 mb-10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {row.type === 'carousel' ? <Flame className="text-orange-500" /> : <BarChart3 className="text-primary" />}
                            {row.title}
                        </h2>
                        <p className="text-sm text-gray-400">{row.description}</p>
                    </div>

                    <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {row.movies.map((movie, midx) => (
                            <div key={midx} className="min-w-[220px] max-w-[220px] snap-start shrink-0">
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

            {/* Filter Engine */}
            <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between sticky top-4 z-40 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="relative flex-1 min-w-[250px] w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search specific titles or franchises..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {/* Discovery Sort */}
                    <div className="relative shrink-0">
                        <select
                            className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-4 pr-10 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium"
                            value={sortFilter}
                            onChange={(e) => setSortFilter(e.target.value)}
                        >
                            <option value="Recent Hits">🔥 Recent Hits</option>
                            <option value="Highest ROI">📈 Highest ROI</option>
                            <option value="Most Volatile">⚠️ Most Volatile</option>
                            <option value="Undervalued Gems">💎 Undervalued Gems</option>
                            <option value="Flop to Cult">🔄 Flop to Cult</option>
                            <option value="Genre Momentum">⚡ Genre Momentum</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>

                    <div className="relative shrink-0">
                        <select
                            className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-4 pr-10 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium w-36"
                            value={genreFilter}
                            onChange={(e) => setGenreFilter(e.target.value)}
                        >
                            <option value="All">All Genres</option>
                            {genres.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>

                    <div className="relative shrink-0">
                        <select
                            className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-4 pr-10 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium w-36"
                            value={budgetFilter}
                            onChange={(e) => setBudgetFilter(e.target.value)}
                        >
                            <option value="All">All Budgets</option>
                            <option value="Indie">Boutique / Indie</option>
                            <option value="Mid-Budget">Mid-Tier</option>
                            <option value="Blockbuster">Blockbuster</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>

                    <div className="relative shrink-0">
                        <select
                            className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-4 pr-10 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium w-36"
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                        >
                            <option value="All">Any Risk Level</option>
                            <option value="Low Risk">Low Risk (Stable)</option>
                            <option value="High Risk">High Risk (Volatile)</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mt-8">
                {movies.map((movie, i) => (
                    <MovieCard
                        key={`${movie.title}-${i}`}
                        movie={movie}
                        isRef={i === movies.length - 1}
                    />
                ))}
            </div>

            {/* Loading States & Empty States */}
            {loading && page === 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] glass rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && movies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 glass rounded-3xl border-dashed border-white/10 mt-8">
                    <Filter size={48} className="text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg font-medium">No intelligence vectors matched your query.</p>
                    <button
                        onClick={() => { setSearchTerm(""); setGenreFilter("All"); setSortFilter("Recent Hits"); setBudgetFilter("All"); setRiskFilter("All"); }}
                        className="mt-4 text-primary hover:text-white transition-colors"
                    >
                        Reset Engine Filters
                    </button>
                </div>
            )}

            {/* Infinite Scroll Loader */}
            {loadingMore && (
                <div className="py-10 flex justify-center w-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            )}

            {!hasMore && movies.length > 0 && (
                <div className="py-10 text-center text-gray-500 text-sm font-medium">
                    End of available intelligence slate.
                </div>
            )}
        </div>
    );
}
