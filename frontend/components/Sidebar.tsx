"use client";

import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  GitMerge,
  Calculator,
  BrainCircuit,
  SplitSquareHorizontal,
  FileDown
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: "dashboard", name: "Executive Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "explorer", name: "Movie Explorer", icon: <BrainCircuit size={20} /> },
    { id: "genre", name: "Genre Intelligence", icon: <TrendingUp size={20} /> },
    { id: "risk", name: "Financial Risk", icon: <AlertTriangle size={20} /> },
    { id: "portfolio", name: "Portfolio Optimizer", icon: <SplitSquareHorizontal size={20} /> },
    { id: "simulator", name: "Investment Simulator", icon: <Calculator size={20} /> },
    { id: "transparency", name: "Model Transparency", icon: <GitMerge size={20} /> },
    { id: "benchmark", name: "Benchmark Mode", icon: <TrendingUp size={20} className="rotate-90" /> },
    { id: "export", name: "Export Report", icon: <FileDown size={20} /> },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-border p-6 flex flex-col z-40">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gradient">CineIntel</h2>
        <p className="text-xs text-gray-500 mt-1">Investment Intelligence</p>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${activeTab === tab.id
              ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
              : "text-gray-400 hover:bg-card-hover hover:text-white"
              }`}
          >
            <span className={`${activeTab === tab.id ? "text-white" : "text-gray-500 group-hover:text-primary transition-colors"}`}>
              {tab.icon}
            </span>
            <span className="text-sm font-medium">{tab.name}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-border/50">
        <div className="glass p-4 rounded-lg text-xs text-gray-400 shadow-inner">
          <p className="font-semibold text-white mb-1">CineIntel SaaS</p>
          <p>Decision intelligence for film investors & strategists.</p>
        </div>
      </div>
    </aside>
  );
}
