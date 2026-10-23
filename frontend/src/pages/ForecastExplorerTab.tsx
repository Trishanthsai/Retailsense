import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  Clock, 
  BarChart2, 
  TrendingUp, 
  Zap,
  Info
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { Product, ForecastResponse, ForecastSummaryItem } from "../types";
import { generateForecast, fetchForecastHistory, fetchForecastDetail } from "../services/api";

interface ForecastExplorerTabProps {
  products: Product[];
}

export const ForecastExplorerTab: React.FC<ForecastExplorerTabProps> = ({ products }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [activeForecast, setActiveForecast] = useState<ForecastResponse | null>(null);
  const [historyRuns, setHistoryRuns] = useState<ForecastSummaryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0].product_id);
    }
    loadForecastHistory();
  }, [products]);

  const loadForecastHistory = async () => {
    try {
      const runs = await fetchForecastHistory();
      setHistoryRuns(runs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const responses = await generateForecast({
        product_ids: [selectedProduct],
        horizon_days: horizonDays,
        models: ["baseline", "sarimax", "random_forest", "xgboost"]
      });
      if (responses.length > 0) {
        setActiveForecast(responses[0]);
        loadForecastHistory();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate forecast.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectHistoryRun = async (runId: string) => {
    try {
      const detail = await fetchForecastDetail(runId);
      setActiveForecast(detail);
      setSelectedProduct(detail.product_id);
      setHorizonDays(detail.horizon_days);
    } catch (err) {
      console.error(err);
    }
  };

  // Prepare chart series: distinguishing actual vs predicted
  const chartPoints = activeForecast?.points || [];
  
  // Calculate aggregate forecast KPIs
  const futurePoints = chartPoints.filter((p) => p.actual_quantity === undefined || p.actual_quantity === null);
  const totalForecastedUnits = futurePoints.reduce((acc, p) => acc + p.predicted_quantity, 0);
  const avgDailyDemand = futurePoints.length > 0 ? (totalForecastedUnits / futurePoints.length).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Control Configuration Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Machine Learning Demand Forecasting
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative training across Baseline, SARIMAX, Random Forest, and XGBoost with zero data leakage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Target Product Picker */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[220px]"
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>

            {/* Forecast Horizon Pills */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setHorizonDays(days)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    horizonDays === days
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {days}d Horizon
                </button>
              ))}
            </div>

            {/* Generate Trigger Button */}
            <button
              onClick={handleGenerateForecast}
              disabled={isGenerating || !selectedProduct}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Models...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Run Model Comparison & Forecast</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Active Forecast Summary Metrics */}
      {activeForecast && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Winning Algorithm</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-indigo-400 capitalize">
                {activeForecast.model_name.replace("_", " ")}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                Rank #1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Version: {activeForecast.model_version}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Holdout WAPE Error</span>
            <div className="text-xl font-bold text-white mt-1">
              {activeForecast.metrics.wape !== undefined ? `${activeForecast.metrics.wape}%` : "Calculated"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              MAE: {activeForecast.metrics.mae ?? "N/A"} | RMSE: {activeForecast.metrics.rmse ?? "N/A"}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Projected Horizon Demand</span>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {Math.round(totalForecastedUnits).toLocaleString()} units
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across next {activeForecast.horizon_days} calendar days</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Avg Daily Run-Rate</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {avgDailyDemand} units / day
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Informs safety stock & lead time replenishment</p>
          </div>
        </div>
      )}

      {/* Main Forecast Visualizer Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {activeForecast ? `${activeForecast.product_name} — Demand Projection` : "Forecast Visualization"}
            </h3>
            <p className="text-xs text-slate-400">
              Historical actual sales alongside future predictions and 90% confidence bands.
            </p>
          </div>
          {activeForecast && (
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-0.5 bg-slate-400" /> Historical Sales
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <span className="w-3 h-0.5 bg-indigo-500" /> Model Forecast
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3 h-2 bg-sky-500/20 border border-sky-400/40 rounded-xs" /> 90% Confidence Band
              </span>
            </div>
          )}
        </div>

        {chartPoints.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickFormatter={(val) => val.slice(5)} 
                />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "12px" }}
                  formatter={(val: any, name: any) => {
                    const n = String(name || "");
                    if (n === "predicted_quantity") return [`${Number(val).toFixed(1)} units`, "Forecasted Demand"];
                    if (n === "actual_quantity") return [`${Number(val).toFixed(1)} units`, "Actual Sales"];
                    if (n === "upper_bound") return [`${Number(val).toFixed(1)} units`, "Upper Bound (90%)"];
                    if (n === "lower_bound") return [`${Number(val).toFixed(1)} units`, "Lower Bound (90%)"];
                    return [val, n];
                  }}
                />
                {/* 90% Confidence Interval */}
                <Area 
                  type="monotone" 
                  dataKey="upper_bound" 
                  stroke="transparent" 
                  fill="url(#confidenceBand)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="lower_bound" 
                  stroke="transparent" 
                  fill="#0b0f19" 
                />
                {/* Actual Historical Line */}
                <Line 
                  type="monotone" 
                  dataKey="actual_quantity" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  dot={{ r: 2 }}
                />
                {/* Forecast Line */}
                <Line 
                  type="monotone" 
                  dataKey="predicted_quantity" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
            <BarChart2 className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
            <p className="text-sm font-medium text-slate-300">No Forecast Generated Yet</p>
            <p className="text-xs text-slate-500 mt-1">Select a product and horizon above, then click 'Run Model Comparison & Forecast'.</p>
          </div>
        )}
      </div>

      {/* Prior Forecast History Runs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-1">Forecast Execution History</h3>
        <p className="text-xs text-slate-400 mb-4">Saved prediction runs recorded in PostgreSQL database</p>

        {historyRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Winning Model</th>
                  <th className="py-2.5 px-3">Horizon</th>
                  <th className="py-2.5 px-3 text-right">Projected Units</th>
                  <th className="py-2.5 px-3">Generated At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {historyRuns.map((run) => (
                  <tr key={run.forecast_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">{run.forecast_id}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{run.product_name || run.product_id}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize font-mono text-[11px]">
                        {run.model_name.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{run.horizon_days} days</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                      {run.total_predicted_units.toLocaleString()} units
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{run.generated_at.slice(0, 19).replace("T", " ")}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleSelectHistoryRun(run.forecast_id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 font-semibold rounded text-[11px] transition-colors"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No forecast runs recorded yet.</p>
        )}
      </div>
    </div>
  );
};
