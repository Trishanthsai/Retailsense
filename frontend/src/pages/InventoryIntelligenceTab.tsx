import React, { useState } from "react";
import { 
  Package, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ShoppingCart
} from "lucide-react";
import { InventoryRiskItem } from "../types";

interface InventoryIntelligenceTabProps {
  inventoryRisks: InventoryRiskItem[];
  onRefresh: () => void;
  loading: boolean;
}

export const InventoryIntelligenceTab: React.FC<InventoryIntelligenceTabProps> = ({
  inventoryRisks,
  onRefresh,
  loading
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showFormulaExplanation, setShowFormulaExplanation] = useState<boolean>(false);

  // Status Counts
  const criticalCount = inventoryRisks.filter((r) => r.risk_level === "CRITICAL_STOCKOUT").length;
  const reorderCount = inventoryRisks.filter((r) => r.risk_level === "REORDER_NEEDED").length;
  const healthyCount = inventoryRisks.filter((r) => r.risk_level === "HEALTHY").length;
  const overstockCount = inventoryRisks.filter((r) => r.risk_level === "OVERSTOCK").length;

  const filteredRisks = inventoryRisks.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.risk_level === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRITICAL_STOCKOUT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
            <AlertOctagon className="w-3 h-3 text-rose-400" /> Critical Stockout
          </span>
        );
      case "REORDER_NEEDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Reorder Triggered
          </span>
        );
      case "OVERSTOCK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold">
            <Package className="w-3 h-3 text-blue-400" /> Excess Capital
          </span>
        );
      case "HEALTHY":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Balanced
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              Prescriptive Inventory Intelligence & Replenishment
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Translating machine learning demand projections into actionable purchasing decisions based on supplier lead times.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Statistical Formulas</span>
              {showFormulaExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
              title="Refresh inventory calculations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Statistical Formula Accordion */}
        {showFormulaExplanation && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-3 bg-slate-950/50 p-4 rounded-lg">
            <h4 className="font-semibold text-white">Mathematical Decision Framework (Section 16):</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold block mb-1">Reorder Point (ROP):</span>
                <code>ROP = μ_L + SS = (μ_d × L) + SS</code>
                <p className="text-[11px] text-slate-400 mt-1">
                  Demand during supplier lead time plus stochastic safety stock buffer.
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-sky-400 font-bold block mb-1">Safety Stock (SS):</span>
                <code>SS = z × σ_d × √L</code>
                <p className="text-[11px] text-slate-400 mt-1">
                  Normal quantile z (95% service level = 1.645) × demand standard deviation × root lead time.
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">Days of Supply (DOS):</span>
                <code>DOS = Current Stock / μ_d</code>
                <p className="text-[11px] text-slate-400 mt-1">
                  Number of days before total stockout assuming forecasted run-rate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Health Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterStatus(filterStatus === "CRITICAL_STOCKOUT" ? "ALL" : "CRITICAL_STOCKOUT")}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === "CRITICAL_STOCKOUT"
              ? "bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs font-semibold text-rose-400 uppercase">Critical Stockout</span>
          <div className="text-2xl font-bold text-white mt-1 flex items-center justify-between">
            <span>{criticalCount}</span>
            <AlertOctagon className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Immediate action needed</p>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === "REORDER_NEEDED" ? "ALL" : "REORDER_NEEDED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === "REORDER_NEEDED"
              ? "bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs font-semibold text-amber-400 uppercase">Reorder Needed</span>
          <div className="text-2xl font-bold text-white mt-1 flex items-center justify-between">
            <span>{reorderCount}</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Stock below ROP</p>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === "HEALTHY" ? "ALL" : "HEALTHY")}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === "HEALTHY"
              ? "bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs font-semibold text-emerald-400 uppercase">Optimal Buffer</span>
          <div className="text-2xl font-bold text-white mt-1 flex items-center justify-between">
            <span>{healthyCount}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Within target coverage</p>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === "OVERSTOCK" ? "ALL" : "OVERSTOCK")}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === "OVERSTOCK"
              ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs font-semibold text-blue-400 uppercase">Excess Capital</span>
          <div className="text-2xl font-bold text-white mt-1 flex items-center justify-between">
            <span>{overstockCount}</span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">&gt; 60 days inventory</p>
        </button>
      </div>

      {/* Main Stock Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Stock Buffer & Order Recommendations</h3>
            <p className="text-xs text-slate-400">
              Showing {filteredRisks.length} of {inventoryRisks.length} products
            </p>
          </div>
          {filterStatus !== "ALL" && (
            <button
              onClick={() => setFilterStatus("ALL")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">Daily Demand (μ_d)</th>
                <th className="py-3 px-3 text-right">Lead Time (L)</th>
                <th className="py-3 px-3 text-right">Safety Stock (SS)</th>
                <th className="py-3 px-3 text-right">Reorder Point (ROP)</th>
                <th className="py-3 px-3 text-right">Days of Supply</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Recommended Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredRisks.map((item) => (
                <tr key={item.product_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{item.product_name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{item.product_id} • {item.category}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">{item.current_stock}</td>
                  <td className="py-3 px-3 text-right font-mono">{item.avg_daily_demand} / day</td>
                  <td className="py-3 px-3 text-right">{item.lead_time_days} days</td>
                  <td className="py-3 px-3 text-right font-mono text-sky-400 font-medium">{item.safety_stock}</td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-400 font-semibold">{item.reorder_point}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium">
                    <span className={item.days_of_supply <= 5 ? "text-rose-400 font-bold" : "text-slate-300"}>
                      {item.days_of_supply} d
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">{getStatusBadge(item.risk_level)}</td>
                  <td className="py-3 px-3 text-right">
                    {item.recommended_order_quantity > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <ShoppingCart className="w-3 h-3" /> +{item.recommended_order_quantity} units
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
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
