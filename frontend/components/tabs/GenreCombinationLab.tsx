"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Info, AlertTriangle, ShieldCheck } from "lucide-react";

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

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'High') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck size={10} /> High
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <AlertTriangle size={10} /> Low
      </span>
    );
  };

  if (loading) return <div className="text-center text-gray-400 py-20">Loading combination data...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gradient">Genre Combination Lab</h2>
        <div className="p-3 glass rounded-lg flex items-center gap-3 text-xs text-gray-400">
          <Info size={14} className="text-primary" />
          <span>Combinations are analyzed from multi-genre metadata.</span>
        </div>
      </div>

      {/* Top Performing Combinations */}
      <div className="glass p-6 rounded-xl border-t-2 border-emerald-500/30">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Top Performing Combinations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 uppercase text-[10px] font-bold text-gray-400 tracking-wider">
                <th className="py-4 px-4">Combination</th>
                <th className="py-4 px-4 text-center">N (Samples)</th>
                <th className="py-4 px-4 text-center">ROI</th>
                <th className="py-4 px-4 text-right">Total Revenue</th>
                <th className="py-4 px-4 text-center">AI Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {combinations?.top_10?.map((combo: any, idx: number) => (
                <tr key={idx} className="hover:bg-card-hover/30 transition-colors">
                  <td className="py-4 px-4 text-white font-medium">{combo.combination}</td>
                  <td className="py-4 px-4 text-center text-gray-300">{combo.total_movies}</td>
                  <td className="py-4 px-4 text-center text-emerald-400 font-bold">{combo.avg_roi.toFixed(2)}x</td>
                  <td className="py-4 px-4 text-right text-gray-300">₹{(combo.total_revenue / 10000000).toFixed(1)}Cr</td>
                  <td className="py-4 px-4 text-center">
                    {getConfidenceBadge(combo.confidence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* High-Risk / Poor Performing */}
      <div className="glass p-6 rounded-xl border-t-2 border-rose-500/30">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Bottom Performing Combinations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 uppercase text-[10px] font-bold text-gray-400 tracking-wider">
                <th className="py-4 px-4">Combination</th>
                <th className="py-4 px-4 text-center">N (Samples)</th>
                <th className="py-4 px-4 text-center">ROI</th>
                <th className="py-4 px-4 text-right">Total Revenue</th>
                <th className="py-4 px-4 text-center">AI Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {combinations?.bottom_10?.map((combo: any, idx: number) => (
                <tr key={idx} className="hover:bg-card-hover/30 transition-colors">
                  <td className="py-4 px-4 text-white font-medium">{combo.combination}</td>
                  <td className="py-4 px-4 text-center text-gray-300">{combo.total_movies}</td>
                  <td className="py-4 px-4 text-center text-rose-400 font-bold">{combo.avg_roi.toFixed(2)}x</td>
                  <td className="py-4 px-4 text-right text-gray-300">₹{(combo.total_revenue / 10000000).toFixed(1)}Cr</td>
                  <td className="py-4 px-4 text-center">
                    {getConfidenceBadge(combo.confidence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-xl">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Laboratory Notes</h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Combinations with <b>Low Confidence</b> carry high statistical variance.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Successful combinations often pair a niche genre with a high-budget commercial genre.</span>
            </li>
          </ul>
        </div>
        <div className="glass p-6 rounded-xl">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Global Reach</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{combinations?.all_combinations?.length || 0}</p>
              <p className="text-xs text-gray-500">Unique Combinations Identified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
