"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Banner from "@/components/Banner";
import ExecutiveDashboard from "@/components/tabs/ExecutiveDashboard";
import GenreIntelligence from "@/components/tabs/GenreIntelligence";
import FinancialRisk from "@/components/tabs/FinancialRisk";
import InvestmentSimulator from "@/components/tabs/InvestmentSimulator";
import ModelTransparency from "@/components/tabs/ModelTransparency";
import BenchmarkMode from "@/components/tabs/BenchmarkMode";
import ExportReport from "@/components/tabs/ExportReport";
import MovieExplorer from "@/components/tabs/MovieExplorer";
import PortfolioOptimizer from "@/components/tabs/PortfolioOptimizer";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <ExecutiveDashboard />;
      case "explorer":
        return <MovieExplorer />;
      case "genre":
        return <GenreIntelligence />;
      case "risk":
        return <FinancialRisk />;
      case "portfolio":
        return <PortfolioOptimizer />;
      case "simulator":
        return <InvestmentSimulator />;
      case "transparency":
        return <ModelTransparency />;
      case "benchmark":
        return <BenchmarkMode />;
      case "export":
        return <ExportReport />;
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Banner />

        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header section moved to Sidebar/Banner synergy or kept here? 
                Keeping minimal header here as Banner takes top spot */}

            <div className="animate-fade-in">
              {renderTab()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
