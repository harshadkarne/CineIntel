"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from "recharts";
import {
  Calculator, AlertTriangle, Zap, Info, TrendingUp, Clock,
  LayoutDashboard, Activity, ShieldCheck, Calendar
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function InvestmentSimulator() {
  const [genres, setGenres] = useState<string[]>([]);
  const [plan, setPlan] = useState({
    genre: "Action",
    budget: "50000000",
    runtime: "130",
    releaseMonth: 12,
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      const data = await api.getAllGenres();
      setGenres(data.genres || []);
    } catch (error) {
      console.error("Error loading genres:", error);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setPrediction(null);
    setError(null);
    try {
      const result = await api.predictInvestment({
        genre: plan.genre,
        budget: parseFloat(plan.budget),
        runtime: parseInt(plan.runtime),
        release_month: plan.releaseMonth,
      });
      setPrediction(result);
    } catch (error) {
      console.error("Prediction failed:", error);
      setError("Failed to initialize neural success projector.");
    } finally {
      setLoading(false);
    }
  };

  const ProbabilityGauge = ({ value }: { value: number }) => {
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (value / 100) * circumference;
    const color = value > 60 ? "#10b981" : value > 35 ? "#f59e0b" : "#ef4444";

    return (
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
          <circle
            cx="64" cy="64" r="40"
            fill="transparent"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{value}%</span>
          <span className="text-[8px] text-gray-500 font-black uppercase">Confidence</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 underline decoration-primary/30 underline-offset-8">Simulation Engine</h1>
          <p className="text-gray-400">Data-driven success modeling using market feature weights and release periodicity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit">
          <div className="glass rounded-3xl p-8 shadow-2xl relative overflow-hidden group glow-card">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calculator size={80} />
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Model Inputs</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5">
                    <Activity size={10} /> Core Genre
                  </label>
                  <select
                    value={plan.genre}
                    onChange={(e) => setPlan({ ...plan, genre: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                  >
                    {genres.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5">
                    <Zap size={10} /> Capital Allocation (₹)
                  </label>
                  <input
                    type="number"
                    value={plan.budget}
                    onChange={(e) => setPlan({ ...plan, budget: (e.target.value) })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm focus:border-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5">
                      <Clock size={10} /> Runtime
                    </label>
                    <input
                      type="number"
                      value={plan.runtime}
                      onChange={(e) => setPlan({ ...plan, runtime: (e.target.value) })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm"
                      placeholder="Mins"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5">
                      <Calendar size={10} /> Release
                    </label>
                    <select
                      value={plan.releaseMonth}
                      onChange={(e) => setPlan({ ...plan, releaseMonth: parseInt(e.target.value) })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i + 1} className="bg-background">{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full mt-4 py-5 rounded-2xl bg-primary hover:brightness-110 text-white font-black uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.2)]"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Activity size={14} />}
                {loading ? "Computing Vector..." : "Run Simulator"}
              </button>
            </div>
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="glass rounded-3xl h-[550px] flex flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                <Zap className="absolute inset-0 m-auto text-primary animate-pulse" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-tighter">Analyzing Behavioral Signals</h3>
              <p className="text-gray-500 text-sm max-w-xs">Simulating market response dimensions using RandomForest ensemble...</p>
            </div>
          ) : prediction ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* Primary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-4">
                  <ProbabilityGauge value={prediction.success_probability} />
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">Success Projection</p>
                </div>

                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-2">
                  <TrendingUp className="text-secondary mb-2" size={32} />
                  <p className="text-5xl font-black text-white italic tracking-tighter">{prediction.expected_roi}x</p>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Expected ROI</p>
                </div>

                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-2">
                  <ShieldCheck className={prediction.risk_score > 50 ? "text-rose-500 mb-2" : "text-emerald-500 mb-2"} size={32} />
                  <p className="text-5xl font-black text-white italic tracking-tighter">{prediction.risk_score}%</p>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Risk Index</p>
                </div>
              </div>

              {/* Similar Movies Cluster */}
              <div className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <LayoutDashboard size={100} />
                </div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LayoutDashboard className="text-primary" size={20} /> Historical Market Proxies
                  </h2>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black group-hover:text-white transition-colors">N=10 Similar Films</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {prediction.similar_movies?.map((movie: any, idx: number) => (
                    <div key={idx} className="glass rounded-2xl p-5 bg-white/[0.02] border border-white/5 group hover:border-primary/40 hover:bg-white/[0.04] transition-all cursor-crosshair">
                      <p className="text-[11px] font-black text-white truncate mb-2 group-hover:text-primary transition-colors uppercase italic">{movie.title}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-gray-500 font-black uppercase">{movie.year}</span>
                        <span className={`text-[10px] font-black ${movie.success_label === 'Hit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {movie.roi.toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy Note */}
              <div className="p-6 glass rounded-3xl border-l-4 border-primary/50 bg-primary/[0.05] flex gap-4 items-start shadow-xl">
                <div className="p-2 bg-primary/10 rounded-xl"><Info size={20} className="text-primary" /></div>
                <div>
                  <h4 className="text-sm font-black text-white mb-2 uppercase tracking-wide">AI Recommendation Engine</h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed italic">
                    "Based on the {plan.genre} profile and {MONTHS[plan.releaseMonth - 1]} release window, the model indicates a
                    {prediction.success_probability > 60 ? " high probability of commercial success " : prediction.success_probability > 35 ? " moderate market resonance " : " higher barrier to entry "}.
                    Our neural weights suggest that {prediction.risk_score > 50 ? " mitigating budget inflation " : " capitalizing on the current timing "} will be crucial for the final performance manifold."
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass h-[550px] rounded-3xl flex flex-col items-center justify-center text-center p-20 group">
              <div className="w-24 h-24 bg-white/[0.02] rounded-full flex items-center justify-center mb-10 border border-white/10 transition-transform group-hover:scale-110 duration-500 shadow-inner">
                <Calculator className="text-gray-600 group-hover:text-primary transition-colors" size={48} />
              </div>
              <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-[0.2em]">Engine Standby</h3>
              <p className="text-gray-500 max-w-sm text-sm leading-relaxed">Adjust your production parameters to initialize the neural success projector and generate risk-adjusted ROI clusters.</p>
              <div className="mt-12 flex items-center gap-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Clock size={12} /> 12ms Inference</span>
                <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><LayoutDashboard size={12} /> 1k+ Samples</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
