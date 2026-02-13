"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [aiRec, setAiRec] = useState<any>(null);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetOpt, setBudgetOpt] = useState<any>(null);
  const [releaseTiming, setReleaseTiming] = useState<any>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryData, aiData, genresData] = await Promise.all([
        api.getDashboardSummary(),
        api.getAIRecommendation(),
        api.getAllGenres(),
      ]);
      setSummary(summaryData);
      setAiRec(aiData);
      setGenres(genresData.genres || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetOptimization = async () => {
    if (!selectedGenre || !budget) return;
    try {
      const data = await api.getBudgetOptimization(selectedGenre, parseFloat(budget));
      setBudgetOpt(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleReleaseTiming = async () => {
    if (!selectedGenre) return;
    try {
      const data = await api.getReleaseTiming(selectedGenre);
      setReleaseTiming(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-shimmer glass p-8 rounded-lg">
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass glow-card p-6 rounded-xl animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Movies</h3>
          </div>
          <p className="text-3xl font-bold text-white">{summary?.total_movies || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Analyzed (2001-2019)</p>
        </div>

        <div className="glass glow-card p-6 rounded-xl animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Highest ROI Genre</h3>
          </div>
          <p className="text-xl font-bold text-secondary">{summary?.highest_roi_genre?.genre || "N/A"}</p>
          <p className="text-xs text-gray-500 mt-1">{summary?.highest_roi_genre?.avg_roi || 0}x ROI</p>
        </div>

        <div className="glass glow-card p-6 rounded-xl animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">2019 Top Genre</h3>
          </div>
          <p className="text-xl font-bold text-primary">{summary?.latest_trend?.top_genre || "N/A"}</p>
          <p className="text-xs text-gray-500 mt-1">Latest Market Trend</p>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          AI Recommendation Engine
        </h2>
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/30 rounded-lg p-6">
          <p className="text-lg leading-relaxed">{aiRec?.recommendation || "Loading..."}</p>
          {aiRec && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Top Genre</p>
                <p className="font-semibold text-white">{aiRec.top_genre}</p>
              </div>
              <div>
                <p className="text-gray-400">ROI Volatility</p>
                <p className="font-semibold text-white">{aiRec.roi_volatility}</p>
              </div>
              <div>
                <p className="text-gray-400">Risk Level</p>
                <p className={`font-semibold ${
                  aiRec.risk_level === 'High' ? 'text-red-400' :
                  aiRec.risk_level === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
                }`}>{aiRec.risk_level}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget Optimization */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Budget Optimization Suggestion
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Genre</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Enter budget (₹)"
            className="bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleBudgetOptimization}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2 font-semibold transition-colors"
          >
            Analyze
          </button>
        </div>
        {budgetOpt && (
          <div className={`p-4 rounded-lg ${
            budgetOpt.status === 'above_average' ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'
          }`}>
            <p className="text-white">{budgetOpt.message}</p>
          </div>
        )}
      </div>

      {/* Release Timing */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Release Timing Suggestion
        </h2>
        <div className="flex gap-4 mb-4">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Genre</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button
            onClick={handleReleaseTiming}
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2 font-semibold transition-colors"
          >
            Get Timing
          </button>
        </div>
        {releaseTiming && (
          releaseTiming.error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">{releaseTiming.error}</p>
            </div>
          ) : (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <p className="text-white mb-4">{releaseTiming.message}</p>
              <div className="grid grid-cols-3 gap-4">
                {releaseTiming.monthly_data?.map((m: any) => (
                  <div key={m.month} className="text-center">
                    <p className="text-gray-400 text-sm">{m.month}</p>
                    <p className="text-white font-semibold">{m.avg_roi}x ROI</p>
                  </div>
                ))}
            </div>
          </div>
          )
        )}
      </div>
    </div>
  );
}
