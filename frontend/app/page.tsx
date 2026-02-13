"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ExecutiveDashboard from "@/components/tabs/ExecutiveDashboard";
import GenreIntelligence from "@/components/tabs/GenreIntelligence";
import FinancialRisk from "@/components/tabs/FinancialRisk";
import GenreCombinationLab from "@/components/tabs/GenreCombinationLab";
import InvestmentSimulator from "@/components/tabs/InvestmentSimulator";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <ExecutiveDashboard />;
      case "genre":
        return <GenreIntelligence />;
      case "risk":
        return <FinancialRisk />;
      case "combinations":
        return <GenreCombinationLab />;
      case "simulator":
        return <InvestmentSimulator />;
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gradient mb-2">
              CineIntel
            </h1>
            <p className="text-gray-400">
              Bollywood Investment Intelligence Platform
            </p>
          </div>

          <div className="animate-fade-in">
            {renderTab()}
          </div>

          <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-gray-500">
            <p className="mb-2">
              <strong>Historical Analysis (2001-2019)</strong> - Based on 196 Bollywood films
            </p>
            <p>
              Future Scope: Integration with live TMDb data and OTT streaming analytics
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
