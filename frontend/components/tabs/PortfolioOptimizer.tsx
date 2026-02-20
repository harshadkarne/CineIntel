"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Shield, TrendingUp, AlertTriangle, Info, Zap } from "lucide-react";

export default function PortfolioOptimizer() {
    const [riskLevel, setRiskLevel] = useState(50);
    const [allocation, setAllocation] = useState<any[]>([]);
    const [insights, setInsights] = useState<string>("");

    useEffect(() => {
        // Simulated dynamic allocation based on risk slider
        const calculateAllocation = (risk: number) => {
            const highRisk = Math.min(60, risk * 0.8);
            const safe = Math.max(10, 100 - risk * 1.2);
            const moderate = 100 - highRisk - safe;

            return [
                { name: "Safe Haven (Low Risk)", value: Math.round(safe), color: "#10b981" },
                { name: "Growth (Moderate)", value: Math.round(moderate), color: "#6366f1" },
                { name: "Speculative (High Risk)", value: Math.round(highRisk), color: "#f43f5e" },
            ];
        };

        setAllocation(calculateAllocation(riskLevel));

        // Fetch AI insights for the strategy
        fetch("http://localhost:8000/api/dashboard/strategic-insight")
            .then(res => res.json())
            .then(data => setInsights(data.text))
            .catch(err => console.error(err));
    }, [riskLevel]);

    return (
        <div className="space-y-8 page-transition">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Portfolio Optimizer</h1>
                <p className="text-gray-400">Model your investment strategy by balancing risk and expected returns.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-8 rounded-3xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Risk Appetite</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskLevel < 30 ? "risk-safe" : riskLevel < 70 ? "risk-moderate" : "risk-high"
                                }`}>
                                {riskLevel < 30 ? "Conservative" : riskLevel < 70 ? "Balanced" : "Aggressive"}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={riskLevel}
                                onChange={(e) => setRiskLevel(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                <span>Low Risk</span>
                                <span>Maximum Alpha</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            {allocation.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm text-gray-300">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-white">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-3xl border-l-4 border-primary">
                        <div className="flex gap-4">
                            <Zap className="text-primary shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-white mb-1">AI Recommendation</h4>
                                <p className="text-xs text-gray-400 leading-relaxed italic">
                                    "{insights || "Calculating best allocation strategy based on current market pulse..."}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 glass rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <h3 className="text-xl font-bold text-white mb-8 text-center">Capital Allocation Modeling</h3>

                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={1000}
                                >
                                    {allocation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8">
                        <div className="glass-card p-4 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Expected ROI</p>
                            <p className="text-xl font-bold text-emerald-400">{(1.2 + (riskLevel / 100) * 0.8).toFixed(2)}x</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Success Prob.</p>
                            <p className="text-xl font-bold text-primary">{Math.round(75 - (riskLevel / 100) * 20)}%</p>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Volatility</p>
                            <p className="text-xl font-bold text-rose-400">{(0.4 + (riskLevel / 100) * 1.2).toFixed(1)}σ</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
