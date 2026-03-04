/**
 * filterEngine.ts
 * Centralized logic for filtering, searching, and sorting the movies dataset.
 */

export interface Movie {
    id?: string | number;
    title: string;
    year: number;
    genres: string[];
    budget: number;
    revenue: number;
    roi: number;
    imdb_rating?: number;
    runtime?: number;
    poster_url?: string;
    success_label?: string;
    [key: string]: any;
}

export interface FilterState {
    searchQuery: string;
    performance: string; // "All Movies", "Breakout ROI", "Hit", "Stable Asset", "Flop"
    genre: string; // "All Genres", "Action", etc.
    budget: string; // "All Budgets", "Micro", "Low", "Mid", "High"
    risk: string; // "All Risks", "Safe", "Moderate", "High Risk"
    yearRange: [number, number];
    sortBy: string; // "Revenue (High → Low)", "ROI (High → Low)", "Rating", "Newest First", "Budget (High → Low)"
}

export function filterMovies(movies: Movie[], filters: FilterState): Movie[] {
    return movies.filter(movie => {
        // 1. Search Query
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            const matchesTitle = movie.title.toLowerCase().includes(q);
            const matchesGenre = movie.genres.some(g => g.toLowerCase().includes(q));
            if (!matchesTitle && !matchesGenre) return false;
        }

        // 2. Performance Filter (Using prompt specific rules for Explorer)
        if (filters.performance !== "All Movies") {
            const roi = movie.roi;
            if (filters.performance === "Breakout ROI" && roi < 5) return false;
            if (filters.performance === "Hit" && (roi < 2 || roi >= 5)) return false;
            if (filters.performance === "Stable Asset" && (roi < 1 || roi >= 2)) return false;
            if (filters.performance === "Flop" && roi >= 1) return false;
        }

        // 3. Genre Filter
        if (filters.genre !== "All Genres") {
            if (!movie.genres.includes(filters.genre)) return false;
        }

        // 4. Budget Filter
        if (filters.budget !== "All Budgets") {
            const b = movie.budget;
            if (filters.budget === "Micro" && b >= 5) return false;
            if (filters.budget === "Low" && (b < 5 || b >= 30)) return false;
            if (filters.budget === "Mid" && (b < 30 || b >= 100)) return false;
            if (filters.budget === "High" && b < 100) return false;
        }

        // 5. Risk Filter
        if (filters.risk !== "All Risks") {
            const risk = movie.risk_category || "Safe";
            if (filters.risk !== risk) return false;
        }

        // 6. Year Range
        if (movie.year < filters.yearRange[0] || movie.year > filters.yearRange[1]) {
            return false;
        }

        return true;
    }).sort((a, b) => {
        // 7. Sorting
        switch (filters.sortBy) {
            case "Revenue (High → Low)": return (b.revenue || 0) - (a.revenue || 0);
            case "ROI (High → Low)": return (b.roi || 0) - (a.roi || 0);
            case "Rating": return (b.imdb_rating || 0) - (a.imdb_rating || 0);
            case "Newest First": return (b.year || 0) - (a.year || 0);
            case "Budget (High → Low)": return (b.budget || 0) - (a.budget || 0);
            default: return 0;
        }
    });
}
