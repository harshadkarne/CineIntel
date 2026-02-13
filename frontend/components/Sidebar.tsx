"use client";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: "dashboard", name: "Executive Dashboard", icon: "" },
    { id: "genre", name: "Genre Intelligence", icon: "" },
    { id: "risk", name: "Financial Risk", icon: "" },
    { id: "combinations", name: "Genre Combinations", icon: "" },
    { id: "simulator", name: "Investment Simulator", icon: "" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-border p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gradient">CineIntel</h2>
        <p className="text-xs text-gray-500 mt-1">Investment Intelligence</p>
      </div>

      <nav className="space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-gray-400 hover:bg-card-hover hover:text-white"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-sm font-medium">{tab.name}</span>
          </button>
        ))}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="glass p-4 rounded-lg text-xs text-gray-500">
          <p className="font-semibold text-white mb-1">Data Period</p>
          <p>2001 - 2019</p>
          <p className="mt-2">196 Movies Analyzed</p>
        </div>
      </div>
    </aside>
  );
}
