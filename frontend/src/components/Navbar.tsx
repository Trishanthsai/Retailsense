import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Package, 
  UploadCloud, 
  Activity, 
  Sparkles 
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, systemHealthy }) => {
  const navItems = [
    { id: "overview", label: "Executive Overview", icon: BarChart3 },
    { id: "sales", label: "Sales Analysis", icon: TrendingUp },
    { id: "forecast", label: "Forecast Explorer", icon: Sparkles },
    { id: "models", label: "Model Leaderboard", icon: Layers },
    { id: "inventory", label: "Inventory Intelligence", icon: Package },
    { id: "data", label: "Data Management", icon: UploadCloud },
  ];

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                RetailSense
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  ML Engine v1.0
                </span>
              </span>
              <p className="text-xs text-slate-400">Intelligent Sales Forecasting & Decision Support</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* System Health Status Indicator */}
          <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                systemHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-slate-300 font-medium">
              {systemHealthy ? "FastAPI ML Core Active" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex overflow-x-auto py-2 px-3 bg-slate-900 border-t border-slate-800 space-x-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium ${
                isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
