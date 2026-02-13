"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function InvestmentSimulator() {
  const [genres, setGenres] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    genre: "",
    budget: "",
    year: "2019",
    imdb_rating: "",
    runtime: "",
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      const data = await api.getAllGenres();
      setGenres(data.genres || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handlePredict = async () => {
    if (!formData.genre || !formData.budget || !formData.year || !formData.imdb_rating || !formData.runtime) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await api.predictMovie({
        genre: formData.genre,
        budget: parseFloat(formData.budget),
        year: parseInt(formData.year),
        imdb_rating: parseFloat(formData.imdb_rating),
        runtime: parseInt(formData.runtime),
      });
      setPrediction(result);
    } catch (error) {
      console.error("Error:", error);
      alert("Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Prediction Form */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Movie Investment Simulator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Genre</label>
            <select
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Genre</option>
              {genres.slice(0, 30).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Budget (₹)</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="e.g., 5000000"
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              placeholder="e.g., 2019"
              min="2001"
              max="2025"
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Expected IMDb Rating</label>
            <input
              type="number"
              step="0.1"
              value={formData.imdb_rating}
              onChange={(e) => setFormData({ ...formData, imdb_rating: e.target.value })}
              placeholder="e.g., 7.5"
              min="1"
              max="10"
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Runtime (minutes)</label>
            <input
              type="number"
              value={formData.runtime}
              onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
              placeholder="e.g., 130"
              className="w-full bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handlePredict}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white rounded-lg px-6 py-2 font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Predicting..." : "Predict"}
            </button>
          </div>
        </div>
      </div>

      {/* Prediction Results */}
      {prediction && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass glow-card p-6 rounded-xl">
              <h3 className="text-sm text-gray-400 mb-2">Prediction</h3>
              <p className={`text-2xl font-bold ${
                prediction.prediction === 'Hit' ? 'text-green-400' :
                prediction.prediction === 'Average' ? 'text-yellow-400' : 'text-red-400'
              }`}>{prediction.prediction}</p>
            </div>
            <div className="glass glow-card p-6 rounded-xl">
              <h3 className="text-sm text-gray-400 mb-2">Hit Probability</h3>
              <p className="text-2xl font-bold text-accent">{prediction.hit_probability}%</p>
            </div>
            <div className="glass glow-card p-6 rounded-xl">
              <h3 className="text-sm text-gray-400 mb-2">Expected ROI</h3>
              <p className="text-2xl font-bold text-primary">{prediction.expected_roi}x</p>
            </div>
            <div className="glass glow-card p-6 rounded-xl">
              <h3 className="text-sm text-gray-400 mb-2">Risk Level</h3>
              <p className={`text-2xl font-bold ${
                prediction.risk_level === 'High' ? 'text-red-400' :
                prediction.risk_level === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
              }`}>{prediction.risk_level}</p>
            </div>
          </div>

          {/* Probability Breakdown */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Probability Breakdown</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(prediction.probabilities || {}).map(([label, prob]: [string, any]) => (
                <div key={label} className="text-center">
                  <p className="text-gray-400 text-sm mb-2">{label}</p>
                  <div className="relative h-32 bg-card rounded-lg overflow-hidden">
                    <div
                      className={`absolute bottom-0 w-full transition-all duration-500 ${
                        label === 'Hit' ? 'bg-green-500' :
                        label === 'Average' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ height: `${prob}%` }}
                    />
                  </div>
                  <p className="text-white font-bold mt-2">{prob}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Movies */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Top 5 Similar Historical Movies</h2>
            <div className="space-y-3">
              {prediction.similar_movies?.map((movie: any, idx: number) => (
                <div key={idx} className="glass-hover p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{movie.title} ({movie.year})</p>
                    <p className="text-sm text-gray-400">{movie.genre}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      movie.success_label === 'Hit' ? 'text-green-400' :
                      movie.success_label === 'Average' ? 'text-yellow-400' : 'text-red-400'
                    }`}>{movie.success_label}</p>
                    <p className="text-sm text-gray-400">{movie.roi.toFixed(2)}x ROI</p>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </>
      )}
    </div>
  );
}
