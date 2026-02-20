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

  async getTopGenresByYear(year: number) {
    const response = await fetch(`${API_BASE_URL}/api/genre/top-by-year?year=${year}`);
    return response.json();
  },

  async getGenreYearly() {
    const res = await fetch(`${API_BASE_URL}/api/genre/yearly`);
    if (!res.ok) throw new Error('Failed to fetch genre yearly stats');
    return res.json();
  },

  async getGenreOverall() {
    const res = await fetch(`${API_BASE_URL}/api/genre/overall`);
    if (!res.ok) throw new Error('Failed to fetch genre overall stats');
    return res.json();
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
  async getRiskData() {
    const res = await fetch(`${API_BASE_URL}/api/risk/genre`);
    if (!res.ok) throw new Error('Failed to fetch risk data');
    return res.json();
  },

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
  async predictInvestment(data: { genre: string, budget: number, runtime: number, release_month: number }) {
    const res = await fetch(`${API_BASE_URL}/api/predict/simulator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to compute success vector');
    return res.json();
  },

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

  // NEW SAAS ENDPOINTS
  async getModelTransparency() {
    const res = await fetch(`${API_BASE_URL}/api/model/transparency`);
    if (!res.ok) throw new Error('Failed to fetch model transparency');
    return res.json();
  },

  async comparePlans(plans: { plan_a: any, plan_b: any }) {
    const res = await fetch(`${API_BASE_URL}/api/predict/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plans),
    });
    if (!res.ok) throw new Error('Failed to compare investment plans');
    return res.json();
  },

  async getStrategicInsight() {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/strategic-insight`);
    if (!res.ok) throw new Error('Failed to fetch strategic insight');
    return res.json();
  },

  async getCapitalAllocation() {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/capital-allocation`);
    if (!res.ok) throw new Error('Failed to fetch capital allocation');
    return res.json();
  },

  async exportReport() {
    const res = await fetch(`${API_BASE_URL}/api/report/export`);
    if (!res.ok) throw new Error('Failed to export report');
    return res.json();
  },

  async getMarketPulse() {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/market-pulse`);
    if (!res.ok) throw new Error('Failed to fetch market pulse');
    return res.json();
  },

  async getTopPerformers(limit: number = 12) {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/top-performers?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch top performers');
    return res.json();
  },

  async getMovies(params: {
    page?: number;
    limit?: number;
    search?: string;
    genre?: string;
    success_label?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.genre) query.append('genre', params.genre);
    if (params.success_label) query.append('success_label', params.success_label);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);

    const res = await fetch(`${API_BASE_URL}/api/movies/explore?${query}`);
    if (!res.ok) throw new Error('Failed to fetch movies');
    return res.json();
  },

  async getBenchmark(genreA: string, genreB: string) {
    const res = await fetch(
      `${API_BASE_URL}/api/genre/benchmark?genre_a=${encodeURIComponent(genreA)}&genre_b=${encodeURIComponent(genreB)}`
    );
    if (!res.ok) throw new Error('Failed to fetch benchmark data');
    return res.json();
  }
};
