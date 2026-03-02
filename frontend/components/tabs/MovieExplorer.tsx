"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Filter, TrendingUp, Calendar, Star, BarChart3, AlertCircle, Info, Flame, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatROI, formatCurrencyCr, isValidNumber, formatPercent } from "@/lib/utils";

interface Movie {
    title: string;
    year: number;
    genres: string[];
    roi: number;
    box_office: number;
    budget: number;
    revenue: number;
    poster_url: string;
    imdb_rating: number;
    success_label: string;
    vote_count?: number;
    trending_score?: number;
    intelligence_tags?: string[];
    budget_percentile?: number;
    financial_status?: 'complete' | 'incomplete';
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
            // Deduplicate Discovery Rows across all rows to prevent same movie in multiple categories if desired, 
            // but at minimum deduplicate within the row itself.
            const seenTitles = new Set();
            const cleanedRows = (data.rows || []).map((row: DiscoveryRow) => {
                const uniqueMovies = row.movies.filter(m => {
                    if (seenTitles.has(m.title)) return false;
                    seenTitles.add(m.title);
                    return true;
                });
                return { ...row, movies: uniqueMovies };
            });
            setDiscoveryRows(cleanedRows);
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

            // Deduplicate main grid result
            setMovies(prev => {
                const combined = isReset ? data.movies : [...prev, ...data.movies];
                const seen = new Set();
                return combined.filter((m: Movie) => {
                    const key = `${m.title}-${m.year}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }) as Movie[];
            });
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
    }, [page, fetchMovies]);

    const usdToCrore = (value: number) => ((value / 1000000) * 8.3).toFixed(1);

    const MovieCard = ({ movie, isRef = false }: { movie: Movie, isRef?: boolean }) => {
        const isTrending = movie.trending_score && movie.trending_score >= 0.8;
        const currentYear = 2019; // Latest year in dataset
        const isRecent = movie.year >= (currentYear - 5);

        return (
            <div
                ref={isRef ? lastMovieElementRef : null}
                className="group relative glass-card overflow-hidden glow-card border-white/5 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col"
            >
                <div className="aspect-[2/3] relative overflow-hidden bg-white/5 shrink-0">
                    <img
                        src={movie.poster_url || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1000&auto=format&fit=crop"}
                        alt={movie.title}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1000&auto=format&fit=crop";
                        }}
                        loading="lazy"
                    />

                    {/* Top Left Badges - Standardized */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start z-30 w-full pr-6 pointer-events-none">
                        {currentYear === movie.year && (
                            <span className="badge bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-tighter border border-purple-500/30 backdrop-blur-md px-1.5 py-0.5 rounded shadow-xl flex items-center gap-1">
                                <Sparkles size={8} /> Recent Discovery
                            </span>
                        )}
                        {movie.success_label === 'Hit' && (
                            <span className="badge bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-tighter border border-emerald-500/30 backdrop-blur-md px-1.5 py-0.5 rounded shadow-xl flex items-center gap-1">
                                <TrendingUp size={8} /> Recent Hit
                            </span>
                        )}
                        {movie.intelligence_tags && movie.intelligence_tags
                            .filter(tag => tag !== "Recent Hit" && tag !== "Recent Discovery") // Filters out duplicates
                            .slice(0, 1).map((tag, idx) => (
                                <span key={idx} className="badge bg-primary/20 text-primary text-[9px] font-black uppercase tracking-tighter border border-primary/30 backdrop-blur-md px-1.5 py-0.5 rounded shadow-xl">
                                    {tag}
                                </span>
                            ))}
                    </div>

                    {/* Top Right Signals */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end z-30">
                        {isTrending && (
                            <div className="bg-orange-500/20 text-orange-400 p-1 rounded-full border border-orange-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.5)]" title="High Momentum">
                                <Flame size={12} className="animate-pulse" />
                            </div>
                        )}
                        <span className="badge bg-black/70 text-amber-400 border border-amber-400/30 flex items-center gap-1 backdrop-blur-md font-black px-1.5 py-0.5 rounded text-[9px]">
                            <Star size={10} fill="currentColor" /> {movie.imdb_rating || "—"}
                        </span>
                    </div>

                    {/* Bottom Hover Overlay - Fixed ROI Logic */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/95 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5 z-20 border-b-2 border-primary/50">
                        <div className="flex flex-col gap-2 mb-3 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <div className="text-[9px] uppercase tracking-wider text-primary font-black">Performance Multiple</div>
                                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold italic">ROI: {formatROI(movie.roi)}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-2xl font-black text-white">
                                    {movie.financial_status === 'incomplete' || !isValidNumber(movie.roi) ? (
                                        <span className="text-xs text-gray-500">Financial Data Unavailable</span>
                                    ) : (
                                        <span className={
                                            Number(movie.roi) >= 2.0 ? 'text-emerald-400' :
                                                Number(movie.roi) >= 1.0 ? 'text-amber-400' : 'text-rose-400'
                                        }>
                                            {formatROI(movie.roi)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-gray-300">
                                    {movie.financial_status === 'incomplete' ? "—" : (movie.budget_percentile ? `Top ${100 - movie.budget_percentile}%` : 'Standard')}
                                </div>
                            </div>

                            {/* New Hover Metrics */}
                            <div className="grid grid-cols-2 gap-2 mt-1 border-t border-white/10 pt-2">
                                <div>
                                    <div className="text-[8px] uppercase text-gray-500 font-bold">Budget</div>
                                    <div className="text-[10px] text-white font-bold">₹{movie.budget || 0} Cr</div>
                                </div>
                                <div>
                                    <div className="text-[8px] uppercase text-gray-500 font-bold">Revenue</div>
                                    <div className="text-[10px] text-white font-bold">₹{movie.revenue || movie.box_office || 0} Cr</div>
                                </div>
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-white/10 mb-3" />

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-tighter ${movie.success_label === 'Hit' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : movie.success_label === 'Flop' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                                    {movie.success_label || "Unknown"}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold">{movie.year}</span>
                            </div>
                            <p className="text-[9px] text-primary font-medium truncate italic mt-1">
                                {Array.isArray(movie.genres) ? movie.genres.join(' • ') : movie.genres}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-900/40 flex-1 flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-white truncate mb-2 group-hover:text-primary transition-colors">{movie.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium border-t border-white/5 pt-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 truncate">{movie.year}</span>
                            <span className="text-gray-700">|</span>
                            {movie.financial_status === 'incomplete' ? (
                                <span className="text-gray-600 italic">Financials Pending</span>
                            ) : (
                                <span className="text-emerald-400/80">{formatCurrencyCr(movie.box_office)}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-white/5">
                            <span className="font-bold">ROI:</span>
                            <span className={
                                movie.financial_status === 'incomplete' || !isValidNumber(movie.roi) ? 'text-gray-600' :
                                    Number(movie.roi) >= 2.0 ? 'text-emerald-400' :
                                        Number(movie.roi) >= 1.0 ? 'text-amber-400' : 'text-rose-400'
                            }>
                                {movie.financial_status === 'incomplete' || !isValidNumber(movie.roi) ? "N/A" : formatROI(movie.roi)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Netflix-style Search Logic
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    // Debounce searchTerm
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Client-side filtering logic
    const filteredMovies = movies.filter(movie => {
        if (!debouncedSearchTerm) return true;

        const searchLower = debouncedSearchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
        const titleLower = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '');

        return titleLower.includes(searchLower);
    });

    const isSearching = searchTerm.trim().length > 0;

    return (
        <div className="space-y-8 page-transition pb-20 relative min-h-screen">
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

            {/* Filter Engine - Anchor for Search Content - MOVED TO TOP */}
            <div className="glass-card p-5 rounded-2xl flex flex-col lg:flex-row flex-wrap gap-4 items-center justify-between sticky top-4 z-40 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="relative flex-1 min-w-[300px] w-full lg:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search titles or franchise keywords..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    <div className="relative shrink-0">
                        <select
                            className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-4 pr-10 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium w-40"
                            value={sortFilter}
                            onChange={(e) => setSortFilter(e.target.value)}
                        >
                            <option value="Recent Hits">🔥 Recent Hits</option>
                            <option value="ROI">📈 Sort by ROI</option>
                            <option value="Revenue">💰 Sort by Revenue</option>
                            <option value="Rating">⭐ Sort by Rating</option>
                            <option value="Release Year">📅 Release Year</option>
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
                            <option value="Low Budget">Low Budget (&lt; 20 Cr)</option>
                            <option value="Mid Budget">Mid Budget (20-80 Cr)</option>
                            <option value="High Budget">High Budget (&gt; 80 Cr)</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>

                    <div className="relative shrink-0">
                        <select
                            className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-4 pr-10 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium w-40"
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                        >
                            <option value="All">Any Risk Level</option>
                            <option value="Low Risk">Low Risk (ROI &gt; 2)</option>
                            <option value="Medium Risk">Medium Risk (ROI 1-2)</option>
                            <option value="High Risk">High Risk (ROI &lt; 1)</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>

                    {(searchTerm || genreFilter !== "All" || budgetFilter !== "All" || riskFilter !== "All") && (
                        <button
                            onClick={() => { setSearchTerm(""); setGenreFilter("All"); setBudgetFilter("All"); setRiskFilter("All"); setSortFilter("Recent Hits"); }}
                            className="text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors px-2"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Results Section - Smooth Transition Grid - MOVED UP */}
            <div className="min-h-[400px]">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                            {isSearching ? "Search Intelligence Results" : "Cinematic Asset Grid"}
                        </h2>
                        <p className="text-gray-400 text-xs">
                            {isSearching ? `Matched ${filteredMovies.length} assets` : `Showing ${filteredMovies.length} movies`}
                        </p>
                    </div>
                </div>

                <div key={debouncedSearchTerm} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-4 animate-fade-scale">
                    {filteredMovies.map((movie, i) => (
                        <MovieCard
                            key={`${movie.title}-${movie.year}-${i}`}
                            movie={movie}
                            isRef={!isSearching && i === movies.length - 1}
                        />
                    ))}
                </div>

                {/* Loading States & Empty States */}
                {loading && page === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-[2/3] glass rounded-xl animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && filteredMovies.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 glass rounded-3xl border-dashed border-white/10 mt-8 animate-fade-scale">
                        <Search size={48} className="text-gray-600 mb-4" />
                        <p className="text-gray-400 text-lg font-medium italic">No cinematic assets match your query.</p>
                        <button
                            onClick={() => { setSearchTerm(""); setGenreFilter("All"); setSortFilter("Recent Hits"); setBudgetFilter("All"); setRiskFilter("All"); }}
                            className="mt-6 text-primary hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                        >
                            Reset Discovery Filters
                        </button>
                    </div>
                )}
            </div>

            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

            {/* Discovery Carousels (AI Rows) - Static Background, hidden when searching - MOVED DOWN */}
            {!isSearching && !loading && (
                <div className="space-y-12 animate-fade-scale">
                    {discoveryRows.map((row, idx) => (
                        <div key={idx} className="space-y-4">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter italic">
                                    {row.title === 'Recently Hit Movies' ? <Flame className="text-orange-500" /> : <BarChart3 className="text-primary" />}
                                    {row.title}
                                </h2>
                                <p className="text-sm text-gray-400 font-medium italic">{row.description}</p>
                            </div>

                            <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {row.movies.map((movie, midx) => (
                                    <div key={midx} className="min-w-[240px] max-w-[240px] snap-start shrink-0">
                                        <MovieCard movie={movie} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Infinite Scroll Loader - Only in Discovery mode */}
            {!isSearching && loadingMore && (
                <div className="py-10 flex justify-center w-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            )}
        </div>
    );
}
