"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function FinancialRisk() {
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getRiskAnalysis();
      setRiskData(data);
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


      {/* Risk Ranking Table */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Risk Ranking by Genre</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-gray-400">Genre</th>
                <th className="text-right py-3 px-4 text-gray-400">Avg Budget</th>
                <th className="text-right py-3 px-4 text-gray-400">ROI Volatility</th>
                <th className="text-right py-3 px-4 text-gray-400">Risk Score</th>
                <th className="text-center py-3 px-4 text-gray-400">Category</th>
              </tr>
            </thead>
            <tbody>
              {riskData?.genres?.slice(0, 20).map((genre: any, idx: number) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="py-3 px-4 text-white">{genre.genre}</td>
                  <td className="py-3 px-4 text-right text-gray-300">₹{(genre.avg_budget / 1000000).toFixed(1)}M</td>
                  <td className="py-3 px-4 text-right text-gray-300">{genre.roi_volatility.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-white">{genre.risk_score.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      genre.risk_category === 'High Risk' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {genre.risk_category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
