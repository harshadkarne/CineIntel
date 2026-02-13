// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  // Dashboard endpoints
  async getDashboardSummary() {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  async getAIRecommendation() {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/ai-recommendation`);
    if (!res.ok) throw new Error('Failed to fetch AI recommendation');
    return res.json();
  },

  async getBudgetOptimization(genre: string, budget: number) {
    const res = await fetch(
      `${API_BASE_URL}/api/dashboard/budget-optimization?genre=${encodeURIComponent(genre)}&budget=${budget}`
    );
    if (!res.ok) throw new Error('Failed to fetch budget optimization');
    return res.json();
  },

  async getReleaseTiming(genre: string) {
    const res = await fetch(
      `${API_BASE_URL}/api/dashboard/release-timing?genre=${encodeURIComponent(genre)}`
    );
    if (!res.ok) throw new Error('Failed to fetch release timing');
    return res.json();
  },

  // Genre endpoints
  async getGenrePopularity(yearStart?: number, yearEnd?: number, genres?: string[]) {
    const params = new URLSearchParams();
    if (yearStart) params.append('year_start', yearStart.toString());
    if (yearEnd) params.append('year_end', yearEnd.toString());
    if (genres && genres.length > 0) params.append('genres', genres.join(','));

    const res = await fetch(`${API_BASE_URL}/api/genre/popularity?${params}`);
    if (!res.ok) throw new Error('Failed to fetch genre popularity');
    return res.json();
  },

  async getHighestGrossing(yearStart?: number, yearEnd?: number) {
    const params = new URLSearchParams();
    if (yearStart) params.append('year_start', yearStart.toString());
    if (yearEnd) params.append('year_end', yearEnd.toString());

    const res = await fetch(`${API_BASE_URL}/api/genre/revenue?${params}`);
    if (!res.ok) throw new Error('Failed to fetch highest grossing');
    return res.json();
  },

  async getSuccessRate(genres?: string[]) {
    const params = new URLSearchParams();
    if (genres && genres.length > 0) params.append('genres', genres.join(','));

    const res = await fetch(`${API_BASE_URL}/api/genre/success-rate?${params}`);
    if (!res.ok) throw new Error('Failed to fetch success rate');
    return res.json();
  },

  async getROI(genres?: string[]) {
    const params = new URLSearchParams();
    if (genres && genres.length > 0) params.append('genres', genres.join(','));

    const res = await fetch(`${API_BASE_URL}/api/genre/roi?${params}`);
    if (!res.ok) throw new Error('Failed to fetch ROI');
    return res.json();
  },

  async  getTopGenresByYear(year: number) {
    const response = await fetch(`${API_BASE_URL}/api/genre/top-by-year?year=${year}`);
    return response.json();
  },

  async getAllGenres() {
    const res = await fetch(`${API_BASE_URL}/api/genre/list`);
    if (!res.ok) throw new Error('Failed to fetch genres');
    return res.json();
  },

  async getYearRange() {
    const res = await fetch(`${API_BASE_URL}/api/genre/year-range`);
    if (!res.ok) throw new Error('Failed to fetch year range');
    return res.json();
  },

  // Risk endpoints
  async getRiskAnalysis() {
    const res = await fetch(`${API_BASE_URL}/api/risk/analysis`);
    if (!res.ok) throw new Error('Failed to fetch risk analysis');
    return res.json();
  },

  // Combinations endpoint
  async getGenreCombinations() {
    const res = await fetch(`${API_BASE_URL}/api/combinations`);
    if (!res.ok) throw new Error('Failed to fetch genre combinations');
    return res.json();
  },

  // Prediction endpoint
  async predictMovie(data: {
    genre: string;
    budget: number;
    year: number;
    imdb_rating: number;
    runtime: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to predict movie');
    return res.json();
  },
};
