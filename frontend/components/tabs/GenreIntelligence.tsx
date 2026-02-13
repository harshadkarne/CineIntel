"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function GenreIntelligence() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [roiData, setRoiData] = useState<any[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(2017); // Default to a recent year with good data
  const [topGenres, setTopGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate year options
  const years = Array.from({ length: 2019 - 2001 + 1 }, (_, i) => 2001 + i);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      const genresData = await api.getAllGenres();
      setGenres(genresData.genres || []);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      // Use selectedYear for both the podium and the revenue chart context if needed, 
      // but revenue chart usually shows trend. Let's keep revenue chart showing full history 
      // or maybe filtered? The request said "change filter section to one dropdown... select only one year".
      // This implies the whole tab might be focused on that year? 
      // OR just the podium? 
      // "and below that rather than showing a graph , change it to top 3...". 
      // The "Highest Grossing Genre Per Year" chart below that usually shows a trend. 
      // Let's keep the trend charts showing the full range (2001-2019) for context, 
      // but the Top section is governed by the specific year selector.
      
      const [top, rev, roi] = await Promise.all([
        api.getTopGenresByYear(selectedYear),
        api.getHighestGrossing(2001, 2019), // Keep full history for context
        api.getROI(),
      ]);

      setTopGenres(top);
      setRevenueData(rev);
      setRoiData(roi);
    } catch (error) {
      console.error("Error loading charts:", error);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>;
  }

  // Custom tooltips
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-xl">
          <p className="font-bold text-white mb-1">{label}</p>
          <p className="text-sm text-gray-300">Genre: <span className="text-white font-semibold">{data.genre}</span></p>
          <p className="text-sm text-gray-300">Top Movie: <span className="text-accent font-semibold">{data.top_movie}</span></p>
          <p className="text-sm text-gray-300">Revenue: <span className="text-green-400">₹{data.total_box_office.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  // Podium Helpers
  const getPodiumOrder = (genres: any[]) => {
    // Expected order for display: 2nd, 1st, 3rd (Silver, Gold, Bronze)
    if (genres.length < 3) return genres;
    return [genres[1], genres[0], genres[2]];
  };

  const podiumData = getPodiumOrder(topGenres);

  return (
    <div className="space-y-8">
      {/* Filters - Single Year */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Filters</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Select Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-card border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Genre Podium */}
      <div className="glass p-8 rounded-xl min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
        <h2 className="text-2xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400">
          Top Genres of {selectedYear}
        </h2>
        
        {/* Spotlight Effect Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/4 w-32 h-full bg-white blur-[100px] transform -rotate-12"></div>
          <div className="absolute top-0 right-1/4 w-32 h-full bg-white blur-[100px] transform rotate-12"></div>
        </div>

        {topGenres.length === 0 ? (
           <p className="text-gray-400">No data available for this year.</p>
        ) : (
          <div className="flex items-end justify-center gap-4 md:gap-8 z-10 w-full max-w-2xl">
            {/* 2nd Place */}
            {podiumData[0] && (
              <div className="flex flex-col items-center w-1/3 group">
                <div className="mb-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="font-bold text-silver-400 text-lg">{podiumData[0].genre}</p>
                  <p className="text-sm text-gray-400">{podiumData[0].formatted_revenue}</p>
                </div>
                <div className="w-full bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-lg h-32 md:h-48 relative flex items-center justify-center shadow-[0_0_20px_rgba(192,192,192,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(192,192,192,0.5)]">
                  <span className="text-4xl md:text-5xl font-bold text-gray-800 opacity-50">2</span>
                  <div className="absolute bottom-4 left-0 right-0 text-center px-2">
                     <p className="text-xs md:text-sm font-bold text-gray-900 truncate">{podiumData[0].genre}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
             {podiumData[1] && (
              <div className="flex flex-col items-center w-1/3 group -mt-8">
                <div className="mb-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-2">
                   <p className="font-bold text-yellow-400 text-xl">{podiumData[1].genre}</p>
                   <p className="text-sm text-gray-400">{podiumData[1].formatted_revenue}</p>
                </div>
                <div className="w-full bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-t-lg h-40 md:h-64 relative flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,215,0,0.6)] border-t-2 border-yellow-200">
                  <div className="absolute -top-6 text-3xl">👑</div>
                  <span className="text-5xl md:text-7xl font-bold text-yellow-800 opacity-50">1</span>
                  <div className="absolute bottom-6 left-0 right-0 text-center px-2">
                     <p className="text-sm md:text-base font-bold text-yellow-900 truncate">{podiumData[1].genre}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {podiumData[2] && (
              <div className="flex flex-col items-center w-1/3 group">
                <div className="mb-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <p className="font-bold text-orange-400 text-lg">{podiumData[2].genre}</p>
                   <p className="text-sm text-gray-400">{podiumData[2].formatted_revenue}</p>
                </div>
                <div className="w-full bg-gradient-to-b from-orange-400 to-amber-700 rounded-t-lg h-24 md:h-36 relative flex items-center justify-center shadow-[0_0_20px_rgba(205,127,50,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(205,127,50,0.5)]">
                  <span className="text-4xl md:text-5xl font-bold text-orange-900 opacity-50">3</span>
                  <div className="absolute bottom-4 left-0 right-0 text-center px-2">
                     <p className="text-xs md:text-sm font-bold text-amber-900 truncate">{podiumData[2].genre}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Highest Grossing Genre Per Year */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Highest Grossing Genre Per Year (History)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="year" stroke="#888" />
            <YAxis stroke="#888" tickFormatter={(val) => `₹${(val/10000000).toFixed(0)}Cr`} />
            <Tooltip content={<CustomBarTooltip />} />
            <Legend />
            <Bar dataKey="total_box_office" name="Total Revenue" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average ROI by Genre */}
      <div className="glass p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Average ROI by Genre</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={roiData.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="genre" stroke="#888" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }} />
            <Legend />
            <Bar dataKey="avg_roi" name="Average ROI" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
