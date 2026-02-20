"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, TrendingUp, Calendar, Star, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
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
}

export default function MovieExplorer() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [genreFilter, setGenreFilter] = useState("All");
    const [successFilter, setSuccessFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [genres, setGenres] = useState<string[]>([]);

    const fetchMovies = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getMovies({
                page,
                limit: 20,
                search: searchTerm,
                genre: genreFilter,
                success_label: successFilter,
                sort_by: "roi",
                sort_order: "desc"
            });
            setMovies(data.movies);
            setTotalPages(data.total_pages);
            setTotalCount(data.total_count);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm, genreFilter, successFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMovies();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchMovies]);

    useEffect(() => {
        api.getAllGenres().then(data => setGenres(data.genres || [])).catch(console.error);
    }, []);

    const getSuccessColor = (label: string) => {
        switch (label) {
            case "Hit": return "risk-safe";
            case "Average": return "risk-moderate";
            case "Flop": return "risk-high";
            default: return "glass";
        }
    };

    const usdToCrore = (value: number) => ((value / 1000000) * 8.3).toFixed(1);

    return (
        <div className="space-y-8 page-transition pb-20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 underline decoration-primary/30 underline-offset-8">Movie Explorer</h1>
                    <p className="text-gray-400">Deep-dive into historical performance vectors across the master intelligence slate.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search cinematic intelligence..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="relative">
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer min-w-[140px]"
                                value={genreFilter}
                                onChange={(e) => {
                                    setGenreFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="All">All Genres</option>
                                {genres.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>

                        <div className="relative">
                            <select
                                className="bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer min-w-[140px]"
                                value={successFilter}
                                onChange={(e) => {
                                    setSuccessFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="All">All Outcomes</option>
                                <option value="Hit">Hit</option>
                                <option value="Average">Average</option>
                                <option value="Flop">Flop</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 glass-card px-6 py-4 rounded-2xl">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-primary" />
                        Showing <span className="text-white font-bold">{movies.length}</span> of {totalCount} records
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="p-2 glass rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/20 transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-white px-4">
                        Page <span className="font-bold">{page}</span> of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                        className="p-2 glass rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/20 transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-96 glass rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {movies.map((movie, i) => (
                        <div key={i} className="group relative glass-card overflow-hidden glow-card border-white/5 hover:border-primary/30">
                            <div className="aspect-[2/3] relative overflow-hidden">
                                <img
                                    src={movie.poster_url || "/fallback.jpg"}
                                    alt={movie.title}
                                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/fallback.jpg";
                                    }}
                                />

                                <div className="absolute top-3 left-3 flex flex-col gap-2">
                                    <span className={`badge ${getSuccessColor(movie.success_label)} backdrop-blur-md`}>
                                        {movie.success_label}
                                    </span>
                                    <span className="badge bg-black/60 text-amber-400 border-amber-400/30 flex items-center gap-1 backdrop-blur-md">
                                        <Star size={10} fill="currentColor" /> {movie.imdb_rating}
                                    </span>
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                    <div className="flex flex-col gap-1 mb-2">
                                        <div className="text-[10px] uppercase tracking-tighter text-primary font-black">Success Analysis</div>
                                        <div className="text-xl font-black text-white">{movie.roi}x ROI</div>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 italic">{movie.genres}</p>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="text-base font-black text-white truncate mb-1 group-hover:text-primary transition-colors">{movie.title}</h3>
                                <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-500" /> {movie.year}</span>
                                    <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 font-bold">
                                        ₹{usdToCrore(movie.box_office)}Cr
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && movies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl border-dashed border-white/10">
                    <Filter size={48} className="text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg font-medium">No results found in the master intelligence slate.</p>
                    <button
                        onClick={() => { setSearchTerm(""); setGenreFilter("All"); setSuccessFilter("All"); }}
                        className="mt-4 text-primary hover:text-white transition-colors"
                    >
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Footer Pagination */}
            {!loading && movies.length > 0 && (
                <div className="mt-12 flex justify-center">
                    <div className="flex items-center gap-2 glass p-2 rounded-xl">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-3 glass rounded-lg disabled:opacity-20 hover:bg-primary transition-all text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex gap-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                let pageNum = page;
                                if (page <= 3) pageNum = i + 1;
                                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = page - 2 + i;

                                if (pageNum <= 0 || pageNum > totalPages) return null;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg font-bold transition-all ${page === pageNum ? 'bg-primary text-white scale-110 shadow-lg' : 'hover:bg-white/10 text-gray-400'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-3 glass rounded-lg disabled:opacity-20 hover:bg-primary transition-all text-white"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
