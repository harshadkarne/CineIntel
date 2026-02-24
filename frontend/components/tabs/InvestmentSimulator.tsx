"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from "recharts";
import {
  Calculator, AlertTriangle, Zap, Info, TrendingUp, Clock,
  LayoutDashboard, Activity, ShieldCheck, Calendar, Check,
  ChevronDown, X, Sparkles, Target, Landmark, ArrowRight, TrendingDown, Plus, Minus
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function InvestmentSimulator() {
  const [genres, setGenres] = useState<string[]>([]);
  const [plan, setPlan] = useState({
    genres: ["Action"] as string[],
    budget: 35, // ₹ Crores
    runtime: 130,
    releaseMonth: 12,
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenreSearch, setShowGenreSearch] = useState(false);
  const [genreSearchQuery, setGenreSearchQuery] = useState("");

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

  const toggleGenre = (genre: string) => {
    setPlan(prev => {
      const exists = prev.genres.includes(genre);
      if (exists) {
        if (prev.genres.length === 1) return prev; // Keep at least one
        return { ...prev, genres: prev.genres.filter(g => g !== genre) };
      }
      return { ...prev, genres: [...prev.genres, genre] };
    });
  };

  const handlePredict = async () => {
    if (plan.runtime < 60 || plan.runtime > 240) {
      setError("Runtime must be between 60 and 240 minutes.");
      return;
    }
    if (plan.budget < 0.5 || plan.budget > 1500) {
      setError("Budget must be between ₹0.5 Cr and ₹1500 Cr.");
      return;
    }

    setLoading(true);
    setPrediction(null);
    setError(null);
    try {
      const result = await api.predictInvestment({
        genres: plan.genres,
        budget: plan.budget,
        runtime: plan.runtime,
        release_month: plan.releaseMonth,
      });
      setPrediction(result);
    } catch (error) {
      console.error("Simulation failed:", error);
      setError("Critical failure in success projection manifold.");
    } finally {
      setLoading(false);
    }
  };

  const ScoreGauge = ({ value }: { value: number }) => {
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (value / 100) * circumference;
    const color = value > 75 ? "#10b981" : value > 50 ? "#6366f1" : value > 30 ? "#f59e0b" : "#ef4444";

    return (
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r="54" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
          <circle
            cx="80" cy="80" r="54"
            fill="transparent"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white">{value}</span>
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">Greenlight Score</span>
        </div>
        {value > 0 && (
          <div className="absolute -bottom-2 w-full flex justify-center">
            <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
              <ShieldCheck size={10} className="text-primary" />
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Confidence: {value}%</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const BudgetPercentileBar = ({ percentile }: { percentile: number }) => {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-gray-500">Budget Percentile</span>
          <span className="text-primary">{percentile}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
            style={{ width: `${percentile}%` }}
          />
          {/* Milestone markers */}
          <div className="absolute top-0 left-1/4 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-3/4 h-full w-px bg-white/10" />
        </div>
        <div className="flex justify-between text-[8px] text-gray-600 font-bold uppercase tracking-tighter">
          <span>Low</span>
          <span>Mid-Range</span>
          <span>High Capital</span>
        </div>
      </div>
    );
  };

  const BudgetOptimizationTip = ({ intelligence }: { intelligence: any }) => {
    if (!intelligence) return null;
    const [min, max] = intelligence.hit_range || [0, 0];
    const isWithin = intelligence.percentile >= 40 && intelligence.percentile <= 75;

    return (
      <div className="mt-4 p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-3">
        <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white uppercase">Optimization Target</p>
          <p className="text-xs text-gray-300 leading-relaxed">
            {isWithin
              ? `Budget is optimal. Median hit for this cluster is ₹${intelligence.median} Cr.`
              : `Consider adjusting budget towards the hit-range: ₹${min} Cr - ₹${max} Cr for maximum feasibility.`
            }
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 underline decoration-primary/30 underline-offset-8">AI Greenlight Engine</h1>
          <p className="text-gray-400">Cinematic production simulator with precision-budgeting and risk benchmarking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit">
          <div className="glass rounded-3xl p-8 shadow-2xl relative group glow-card backdrop-blur-none bg-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calculator size={80} />
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Production Parameters</h3>
              </div>

              <div className="space-y-5">
                {/* Genre Multi-Select */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Activity size={10} /> Selected Genres</span>
                    <span className="text-primary">{plan.genres.length} Selected</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {plan.genres.map(g => (
                      <span key={g} className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-lg border border-primary/30 flex items-center gap-1">
                        {g} <X size={10} className="cursor-pointer" onClick={() => toggleGenre(g)} />
                      </span>
                    ))}
                  </div>
                  <div className="relative z-[60]">
                    <button
                      onClick={() => setShowGenreSearch(!showGenreSearch)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-left text-sm flex items-center justify-between hover:bg-white/[0.05] transition-colors focus:ring-1 focus:ring-primary"
                    >
                      <span className="text-gray-400">Add Genres...</span>
                      <ChevronDown size={14} className={`text-gray-500 transition-transform ${showGenreSearch ? 'rotate-180' : ''}`} />
                    </button>

                    {showGenreSearch && (
                      <div className="absolute top-full left-0 w-full mt-2 glass border border-white/10 rounded-2xl p-2 shadow-2xl animate-in zoom-in-95 duration-200 backdrop-blur-3xl overflow-hidden">
                        <div className="p-2 border-b border-white/5 mb-2">
                          <div className="relative">
                            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Search genres..."
                              value={genreSearchQuery}
                              onChange={(e) => setGenreSearchQuery(e.target.value)}
                              className="w-full bg-white/[0.05] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1 max-h-[240px] overflow-y-auto custom-scrollbar p-1">
                          {genres
                            .filter(g => !plan.genres.includes(g))
                            .filter(g => g.toLowerCase().includes(genreSearchQuery.toLowerCase()))
                            .map(g => (
                              <button
                                key={g}
                                onClick={() => {
                                  toggleGenre(g);
                                  setGenreSearchQuery("");
                                  setShowGenreSearch(false);
                                }}
                                className="text-left text-xs text-gray-400 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-lg flex items-center justify-between group transition-colors"
                              >
                                {g}
                                <Plus size={12} className="opacity-0 group-hover:opacity-100 text-primary" />
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Precise Budget Input */}
                <div className="space-y-2 relative z-10">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5 justify-between">
                    <span className="flex items-center gap-1.5"><Landmark size={10} /> Budget (₹ Crores)</span>
                    {prediction && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${prediction.budget_intelligence.risk_level === 'Low' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                        prediction.budget_intelligence.risk_level === 'Moderate' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                          'border-rose-500/30 text-rose-400 bg-rose-500/10'
                        }`}>
                        {prediction.budget_intelligence.risk_level} Risk
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={plan.budget === 0 ? "" : plan.budget}
                      step="0.5"
                      min="0.5"
                      max="1500"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setPlan({ ...plan, budget: 0 });
                        else setPlan({ ...plan, budget: parseFloat(val) });
                      }}
                      className={`w-full bg-white/[0.03] border ${plan.budget > 500 ? 'border-amber-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none text-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder="0.5"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-black">₹ CR</div>
                  </div>
                  {plan.budget > 500 && (
                    <div className="flex items-center gap-1.5 px-1 mt-1 text-[9px] text-amber-400 font-bold">
                      <AlertTriangle size={10} />
                      High Capital Warning: Budget exceeds standard Bollywood benchmarks.
                    </div>
                  )}
                  {prediction ? (
                    <p className="text-[9px] text-gray-500 flex items-center justify-between px-1">
                      <span>Median: ₹{prediction.budget_intelligence.median} Cr</span>
                      <span>Hit Range: {prediction.budget_intelligence.suggested_range}</span>
                    </p>
                  ) : (
                    <p className="text-[9px] text-gray-600 font-medium px-1 flex items-center gap-1">
                      <Info size={8} /> Run simulation to see genre-aware budget benchmarks.
                    </p>
                  )}
                </div>

                {/* Runtime Slider */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5">
                      <Clock size={10} /> Runtime Constraint
                    </label>
                    <span className={`text-xs font-bold ${plan.runtime < 90 || plan.runtime > 210 ? 'text-rose-400' : 'text-white'}`}>
                      {plan.runtime} Mins
                    </span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="240"
                    value={plan.runtime}
                    onChange={(e) => setPlan({ ...plan, runtime: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1.5 relative z-10">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1.5">
                    <Calendar size={10} /> Targeted Release Window
                  </label>
                  <select
                    value={plan.releaseMonth}
                    onChange={(e) => setPlan({ ...plan, releaseMonth: parseInt(e.target.value) })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1} className="bg-black">{m}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-rose-500 shrink-0" size={16} />
                  <p className="text-[11px] text-rose-200">{error}</p>
                </div>
              )}

              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full mt-2 py-5 rounded-2xl bg-primary hover:brightness-110 text-white font-black uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.2)]"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
                {loading ? "Initializing..." : "Run Production Simulation"}
              </button>
            </div>
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="glass rounded-3xl h-[650px] p-12 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <div className="h-full flex flex-col items-center justify-center text-center relative z-10">
                <div className="relative mb-8">
                  <div className="w-32 h-32 border-2 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                  <Activity className="absolute inset-0 m-auto text-primary animate-pulse" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">AI SUCCESS PROJECTION</h3>
                <p className="text-gray-500 text-sm max-w-sm">Benchmarking your budget against historical {plan.genres.join(' + ')} performers...</p>
                <div className="mt-8 flex gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          ) : prediction ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Score Panel */}
                <div className="md:col-span-4 glass-card p-8 flex flex-col items-center justify-center">
                  <ScoreGauge value={prediction.greenlight_score} />
                  <div className={`mt-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${prediction.greenlight_score > 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    prediction.greenlight_score > 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                    {prediction.greenlight_score > 75 ? 'Optimal Investment' :
                      prediction.greenlight_score > 50 ? 'Strong Feasibility' :
                        prediction.greenlight_score > 30 ? 'Risk Caution' : 'Critical Budget Risk'}
                  </div>
                </div>

                {/* Probability Distribution */}
                <div className="md:col-span-8 glass-card p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Target size={14} className="text-primary" /> Success Probability
                    </h3>
                    {prediction.confidence_score && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] rounded-full border border-white/5">
                        <span className="text-[8px] text-gray-500 font-black uppercase">Data Confidence</span>
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${prediction.confidence_score}%` }} />
                        </div>
                        <span className="text-[10px] text-white font-bold">{prediction.confidence_score}%</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {['hit', 'average', 'flop'].map(type => (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">{type}</span>
                          <span className="text-xl font-black text-white">{prediction.probabilities[type]}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${type === 'hit' ? 'bg-emerald-500' : type === 'average' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            style={{ width: `${prediction.probabilities[type]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Expected ROI</p>
                        <p className="text-2xl font-black text-white">{prediction.financials.expected_roi}x</p>
                      </div>
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <TrendingUp size={20} className="text-emerald-400" />
                      </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between group relative">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-[9px] text-gray-500 font-black uppercase">Break-Even @ {prediction.financials.break_even_multiplier}x</p>
                          <div className="group/tip relative cursor-help">
                            <ShieldCheck size={10} className="text-gray-600" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[8px] text-gray-400 opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 pointer-events-none">
                              Includes P&A spend, distribution fees, and theatrical splits.
                            </div>
                          </div>
                        </div>
                        <p className="text-2xl font-black text-amber-400">₹{(prediction.financials.break_even / 10000000).toFixed(1)}Cr</p>
                        <p className="text-[8px] text-gray-600 mt-1 italic font-medium">Budget + Marketing & Distribution costs</p>
                      </div>
                      <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                        <Landmark size={20} className="text-amber-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Intelligence Visualization */}
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Landmark size={14} className="text-primary" /> Budget Intelligence Analysis
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] text-gray-500 font-black uppercase">Genre Median</span>
                      <span className="text-xs font-bold text-white">₹{prediction.budget_intelligence.median} Cr</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] text-gray-500 font-black uppercase">Historical Peak</span>
                      <span className="text-xs font-bold text-white">₹{prediction.budget_intelligence.max_successful} Cr</span>
                    </div>
                  </div>
                </div>

                <BudgetPercentileBar percentile={prediction.budget_intelligence.percentile} />

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl"><Zap size={16} className="text-primary" /></div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Budget risk classification</h4>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${prediction.budget_intelligence.risk_level === 'Low' ? 'bg-emerald-500' :
                        prediction.budget_intelligence.risk_level === 'Moderate' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                      <span className="text-sm font-black text-white uppercase italic">{prediction.budget_intelligence.risk_level} Risk Profile</span>
                      <ArrowRight size={12} className="text-gray-600 ml-auto" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 rounded-xl"><Target size={16} className="text-secondary" /></div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Hit-Based production range</h4>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      <span className="text-sm font-black text-white uppercase underline decoration-primary/50 underline-offset-4">₹{prediction.budget_intelligence.hit_range[0]} Cr - ₹{prediction.budget_intelligence.hit_range[1]} Cr</span>
                      <span className="text-[10px] text-gray-500 italic ml-auto">P25-P75 Hits</span>
                    </div>
                  </div>
                </div>
                <BudgetOptimizationTip intelligence={prediction.budget_intelligence} />
              </div>

              {/* Optimization Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-t-2 border-primary/40 group hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-primary" />
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Market Timing</h4>
                  </div>
                  <p className="text-sm font-bold text-gray-200">Optimal Release: {MONTHS[prediction.recommendations.best_month - 1]}</p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">Historically higher market appetite for selected genres during this window.</p>
                </div>

                <div className="glass-card p-6 border-t-2 border-secondary/40 group hover:bg-white/[0.02] transition-colors relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-secondary" />
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Runtime Precision</h4>
                    <span className={`ml-auto text-[8px] font-black px-1.5 py-0.5 rounded border ${prediction.recommendations.runtime_risk === 'Optimal' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                      prediction.recommendations.runtime_risk === 'Neutral' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                        'border-rose-500/30 text-rose-400 bg-rose-500/10'
                      }`}>
                      {prediction.recommendations.runtime_risk}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-200">Sweet Spot: {prediction.recommendations.recommended_runtime} Mins</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-tighter">
                    Deviation: <span className={prediction.recommendations.runtime_deviation <= 20 ? 'text-emerald-400' : prediction.recommendations.runtime_deviation <= 40 ? 'text-amber-400' : 'text-rose-400'}>{prediction.recommendations.runtime_deviation} mins</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-relaxed italic">Hit median for this cluster is {prediction.recommendations.recommended_runtime}m.</p>
                </div>

                <div className="glass-card p-6 border-t-2 border-amber-500/40 group hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={18} className="text-amber-500" />
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Volatility Check</h4>
                  </div>
                  <p className={`text-sm font-bold ${prediction.budget_intelligence.show_volatility_warning ? 'text-rose-400' : 'text-amber-400'}`}>
                    {prediction.budget_intelligence.volatility_label}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                    {prediction.budget_intelligence.show_volatility_warning
                      ? "High-budget peaks are volatile. Portfolio balancing recommended."
                      : prediction.budget_intelligence.volatility < 1.0
                        ? "Stable ROI zone identified for this investment tier."
                        : "Moderate ROI variability detected within historical data."
                    }
                  </p>
                </div>
              </div>

              {/* Genre Performance Insight Panel */}
              {prediction.genre_insights && prediction.genre_insights.length > 0 && (
                <div className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <TrendingUp className="text-emerald-400" size={20} /> Genre Intelligence Panel
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {prediction.genre_insights.map((insight: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-black text-white italic">{insight.genre}</h4>
                          <div className="text-right">
                            <span className="text-[8px] text-gray-500 font-black uppercase block">Avg ROI</span>
                            <span className={`text-sm font-bold ${insight.avg_roi >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>{insight.avg_roi}x</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                            <span className="text-[8px] text-gray-500 font-black uppercase block">Titles</span>
                            <span className="text-xs font-bold text-white">{insight.total_count}</span>
                          </div>
                          <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10 text-center">
                            <span className="text-[8px] text-emerald-500/50 font-black uppercase block">Hits</span>
                            <span className="text-xs font-bold text-emerald-400">{insight.hit_count}</span>
                          </div>
                          <div className="bg-rose-500/5 p-2 rounded-xl border border-rose-500/10 text-center">
                            <span className="text-[8px] text-rose-500/50 font-black uppercase block">Flops</span>
                            <span className="text-xs font-bold text-rose-400">{insight.flop_count}</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-[9px] text-gray-400 font-black uppercase mb-2 flex items-center gap-1.5"><TrendingUp size={10} className="text-emerald-400" /> Top Performers</p>
                            <div className="space-y-1.5">
                              {insight.top_hits.map((m: any, i: number) => (
                                <div key={i} className="flex justify-between text-[10px]">
                                  <span className="text-gray-300 truncate max-w-[140px]">{m.title}</span>
                                  <span className="text-emerald-400 font-bold">{m.roi}x</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 font-black uppercase mb-2 flex items-center gap-1.5"><TrendingDown size={10} className="text-rose-400" /> High Risk Titles</p>
                            <div className="space-y-1.5">
                              {insight.top_flops.map((m: any, i: number) => (
                                <div key={i} className="flex justify-between text-[10px]">
                                  <span className="text-gray-300 truncate max-w-[140px]">{m.title}</span>
                                  <span className="text-rose-400 font-bold">{m.roi}x</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Producer Advisor Panel */}
              <div className="p-8 glass rounded-3xl border border-primary/20 bg-primary/[0.03] shadow-inner relative overflow-hidden ring-1 ring-white/10">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] rotate-12">
                  <Sparkles size={160} />
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-primary/20 rounded-2xl shadow-lg border border-primary/30">
                    <Sparkles size={24} className="text-primary animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-[0.1em]">AI Producer Advisor</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">Strategic Production Guidance</p>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  {prediction.recommendations.advisor_guidance?.map((guidance: string, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start bg-black/20 p-4 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                      <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                      <p className="text-sm text-gray-300 font-medium leading-relaxed italic">
                        "{guidance}"
                      </p>
                    </div>
                  ))}
                  {prediction.recommendations.advisor_guidance?.length === 0 && (
                    <p className="text-sm text-gray-500 italic">Production budget appears perfectly optimized for the selected genre cluster.</p>
                  )}
                </div>
              </div>

              {/* Historical Proxies (Refined) */}
              <div className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden group h-fit">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LayoutDashboard className="text-primary" size={20} /> Historical Success Proxies
                  </h2>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Match Condition: Any Genre | Budget ±40% | Runtime ±30m</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prediction.similar_movies?.map((movie: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between">
                      <div className="mb-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-black text-white uppercase italic leading-tight max-w-[70%]">{movie.title}</p>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${movie.success_label === 'Hit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            movie.success_label === 'Average' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                            {movie.success_label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{movie.year}</p>
                      </div>

                      <div className="flex justify-between items-end pt-4 border-t border-white/5">
                        <div>
                          <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Budget</p>
                          <p className="text-xs font-bold text-gray-300">₹{movie.budget_cr || 0} Cr</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">ROI</p>
                          <p className={`text-sm font-black ${movie.roi >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>{(movie.roi || 0).toFixed(1)}x</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {prediction.similar_movies?.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full py-8 text-center italic">No direct budget proxies found for this specific runtime/genre cluster mapping.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass h-[650px] rounded-3xl flex flex-col items-center justify-center text-center p-20 group">
              <div className="w-24 h-24 bg-white/[0.02] rounded-full flex items-center justify-center mb-10 border border-white/10 transition-transform group-hover:scale-110 duration-500 shadow-inner">
                <Calculator className="text-gray-600 group-hover:text-primary transition-colors" size={48} />
              </div>
              <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-[0.2em] animate-pulse">Engine Standby</h3>
              <p className="text-gray-500 max-w-sm text-sm leading-relaxed">Adjust your production budget and genre components to initialize the precision greenlight manifold.</p>
              <div className="mt-12 flex flex-wrap justify-center gap-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><ShieldCheck size={12} /> Model V4.5 Precise</span>
                <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Landmark size={12} /> ₹ Numeric Logic</span>
                <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Sparkles size={12} /> AI Advisor Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility for formatting
function round(num: number, precision: number) {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}
