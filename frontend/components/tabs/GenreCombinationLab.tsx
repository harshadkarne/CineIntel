"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function GenreCombinationLab() {
  const [combinations, setCombinations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getGenreCombinations();
      setCombinations(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top 10 Best Combinations */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Top 10 Best Genre Combinations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-gray-400">Combination</th>
                <th className="text-right py-3 px-4 text-gray-400">Movies</th>
                <th className="text-right py-3 px-4 text-gray-400">Avg ROI</th>
                <th className="text-right py-3 px-4 text-gray-400">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {combinations?.top_10?.map((combo: any, idx: number) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{combo.combination}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{combo.total_movies}</td>
                  <td className="py-3 px-4 text-right text-accent font-semibold">{combo.avg_roi.toFixed(2)}x</td>
                  <td className="py-3 px-4 text-right text-gray-300">₹{(combo.total_revenue / 1000000).toFixed(1)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 10 Worst Combinations */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Bottom 10 Worst Genre Combinations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-gray-400">Combination</th>
                <th className="text-right py-3 px-4 text-gray-400">Movies</th>
                <th className="text-right py-3 px-4 text-gray-400">Avg ROI</th>
                <th className="text-right py-3 px-4 text-gray-400">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {combinations?.bottom_10?.map((combo: any, idx: number) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{combo.combination}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{combo.total_movies}</td>
                  <td className="py-3 px-4 text-right text-red-400 font-semibold">{combo.avg_roi.toFixed(2)}x</td>
                  <td className="py-3 px-4 text-right text-gray-300">₹{(combo.total_revenue / 1000000).toFixed(1)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl">
          <h3 className="text-sm text-gray-400 mb-2">Total Combinations</h3>
          <p className="text-3xl font-bold text-white">{combinations?.all_combinations?.length || 0}</p>
        </div>
        <div className="glass p-6 rounded-xl">
          <h3 className="text-sm text-gray-400 mb-2">Best Combination</h3>
          <p className="text-lg font-bold text-green-400">{combinations?.top_10?.[0]?.combination || "N/A"}</p>
          <p className="text-sm text-gray-400 mt-1">{combinations?.top_10?.[0]?.avg_roi?.toFixed(2)}x ROI</p>
        </div>
        <div className="glass p-6 rounded-xl">
          <h3 className="text-sm text-gray-400 mb-2">Worst Combination</h3>
          <p className="text-lg font-bold text-red-400">{combinations?.bottom_10?.[0]?.combination || "N/A"}</p>
          <p className="text-sm text-gray-400 mt-1">{combinations?.bottom_10?.[0]?.avg_roi?.toFixed(2)}x ROI</p>
        </div>
      </div>
    </div>
  );
}
