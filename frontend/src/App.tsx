import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { OverviewTab } from "./pages/OverviewTab";
import { SalesAnalysisTab } from "./pages/SalesAnalysisTab";
import { ForecastExplorerTab } from "./pages/ForecastExplorerTab";
import { ModelComparisonTab } from "./pages/ModelComparisonTab";
import { InventoryIntelligenceTab } from "./pages/InventoryIntelligenceTab";
import { DataManagementTab } from "./pages/DataManagementTab";

import { 
  fetchHealth, 
  fetchProducts, 
  fetchStores, 
  fetchAnalyticsSummary, 
  fetchInventoryRisks 
} from "./services/api";
import { Product, Store, AnalyticsSummary, InventoryRiskItem } from "./types";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [systemHealthy, setSystemHealthy] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [inventoryRisks, setInventoryRisks] = useState<InventoryRiskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAllData = async () => {
    try {
      // 1. Health check
      const health = await fetchHealth().catch(() => null);
      setSystemHealthy(health?.status === "healthy");

      // 2. Load Core Data
      const [prodsData, storesData, summaryData, risksData] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchStores().catch(() => []),
        fetchAnalyticsSummary().catch(() => null),
        fetchInventoryRisks().catch(() => [])
      ]);

      setProducts(prodsData);
      setStores(storesData);
      setSummary(summaryData);
      setInventoryRisks(risksData);
    } catch (err) {
      console.error("Failed to load initial data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        systemHealthy={systemHealthy} 
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <OverviewTab
            summary={summary}
            inventoryRisks={inventoryRisks}
            onNavigateTab={setActiveTab}
            loading={loading}
          />
        )}

        {activeTab === "sales" && (
          <SalesAnalysisTab
            products={products}
            stores={stores}
          />
        )}

        {activeTab === "forecast" && (
          <ForecastExplorerTab
            products={products}
          />
        )}

        {activeTab === "models" && (
          <ModelComparisonTab
            products={products}
          />
        )}

        {activeTab === "inventory" && (
          <InventoryIntelligenceTab
            inventoryRisks={inventoryRisks}
            onRefresh={loadAllData}
            loading={loading}
          />
        )}

        {activeTab === "data" && (
          <DataManagementTab
            onDataModified={loadAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white">RetailSense</span>
            <span>—</span>
            <span>Machine Learning Demand Planning & Inventory Decision Support</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>FastAPI • PostgreSQL • Scikit-Learn • XGBoost • SARIMAX • React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
