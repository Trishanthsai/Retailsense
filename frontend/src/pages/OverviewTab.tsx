import React from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { AnalyticsSummary, InventoryRiskItem } from "../types";

interface OverviewTabProps {
  summary: AnalyticsSummary | null;
  inventoryRisks: InventoryRiskItem[];
  onNavigateTab: (tab: string) => void;
  loading: boolean;
}

const CATEGORY_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

export const OverviewTab: React.FC<OverviewTabProps> = ({
  summary,
  inventoryRisks,
  onNavigateTab,
  loading
}) => {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Aggregating real-time retail intelligence...</p>
        </div>
      </div>
    );
  }

  const criticalRisksCount = inventoryRisks.filter(
    (r) => r.risk_level === "CRITICAL_STOCKOUT" || r.risk_level === "REORDER_NEEDED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Stockout Risks Exist */}
      {criticalRisksCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-300">
                Action Required: {criticalRisksCount} Products At Inventory Risk
              </h4>
              <p className="text-xs text-amber-200/70">
                Projected demand exceeds current safety stock threshold based on supplier lead times.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("inventory")}
            className="px-3.5 py-1.5 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-1"
          >
            Review Risks <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Revenue
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              ${summary.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>{summary.total_transactions.toLocaleString()} verified transactions</span>
            </p>
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Units Sold
            </span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary.total_units_sold.toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Across active stores & online channels
            </p>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Catalog SKUs
            </span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary.active_products} Products
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Spanning {summary.category_breakdown.length} retail merchandise categories
            </p>
          </div>
        </div>

        {/* Inventory Health State */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Inventory Status
            </span>
            <div className={`p-2 rounded-lg ${
              criticalRisksCount === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
            }`}>
              {criticalRisksCount === 0 ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {criticalRisksCount === 0 ? "Optimal" : `${criticalRisksCount} Alerts`}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Safety stock & lead time monitoring active
            </p>
          </div>
        </div>
      </div>

      {/* Main Trends and Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Trajectory Chart (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Daily Revenue Trajectory</h3>
              <p className="text-xs text-slate-400">Recent 60-day aggregate sales performance</p>
            </div>
            <button
              onClick={() => onNavigateTab("forecast")}
              className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium hover:bg-indigo-600/30 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Explore Forecast
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.recent_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickFormatter={(val) => val.slice(5)} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "12px" }}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#revenueGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Revenue Breakdown (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Category Revenue Share</h3>
            <p className="text-xs text-slate-400 mb-4">Total revenue contribution by sector</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.category_breakdown} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={11} width={110} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem" }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {summary.category_breakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
            {summary.category_breakdown.map((c, i) => (
              <div key={c.category} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                <span className="text-slate-300 truncate">{c.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing SKUs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Top Revenue Generating Products</h3>
            <p className="text-xs text-slate-400">High volume inventory items ranked by gross revenue</p>
          </div>
          <button
            onClick={() => onNavigateTab("sales")}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            View All Sales <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Product ID</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {summary.top_products.map((item, idx) => (
                <tr key={item.product_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-indigo-400 font-medium">
                    {item.product_id}
                  </td>
                  <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      #{idx + 1}
                    </span>
                    {item.product_name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {item.units_sold.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                    ${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
