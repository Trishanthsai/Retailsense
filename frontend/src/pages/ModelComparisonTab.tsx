import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Trophy, 
  TrendingDown, 
  CheckCircle, 
  BarChart3, 
  HelpCircle,
  Clock,
  Zap,
  Filter
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { Product, ModelEvaluation } from "../types";
import { fetchModelEvaluations } from "../services/api";

interface ModelComparisonTabProps {
  products: Product[];
}

export const ModelComparisonTab: React.FC<ModelComparisonTabProps> = ({ products }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const data = await fetchModelEvaluations(selectedProduct || undefined);
      setEvaluations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, [selectedProduct]);

  // Aggregate evaluations by model_name for latest evaluation run
  const modelNames = ["baseline", "sarimax", "random_forest", "xgboost"];
  const latestByModel: { [key: string]: ModelEvaluation } = {};
  
  evaluations.forEach((ev) => {
    if (!latestByModel[ev.model_name]) {
      latestByModel[ev.model_name] = ev;
    }
  });

  const baselineWape = latestByModel["baseline"]?.wape || 30.0;

  // Prepare chart comparison data
  const chartData = modelNames.map((name) => {
    const ev = latestByModel[name];
    const friendlyName = name === "baseline" ? "Baseline" :
                         name === "sarimax" ? "SARIMAX" :
                         name === "random_forest" ? "Random Forest" : "XGBoost";
    return {
      name: friendlyName,
      wape: ev?.wape ?? 0,
      mae: ev?.mae ?? 0,
      rmse: ev?.rmse ?? 0,
      isSelected: ev?.is_selected ?? false
    };
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Comparative Model Performance Leaderboard
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluating Baseline vs Statistical (SARIMAX) vs Machine Learning (RF & XGBoost) on chronological holdout data.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[200px]"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modelNames.map((mKey) => {
          const ev = latestByModel[mKey];
          const isSelected = ev?.is_selected;
          const isBaseline = mKey === "baseline";
          const title = mKey === "baseline" ? "Baseline (Seasonal Naive)" :
                        mKey === "sarimax" ? "SARIMAX Statistical" :
                        mKey === "random_forest" ? "Random Forest Regressor" : "XGBoost Regressor";
          
          const improvement = (!isBaseline && ev && baselineWape > 0)
            ? ((baselineWape - ev.wape) / baselineWape) * 100
            : 0;

          return (
            <div
              key={mKey}
              className={`rounded-xl p-5 border relative transition-all ${
                isSelected
                  ? "bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" /> Best Model
                </div>
              )}

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                {mKey.replace("_", " ")}
              </span>
              <h4 className="text-sm font-bold text-white mb-3">{title}</h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">WAPE Error:</span>
                  <span className="font-bold text-white text-sm">
                    {ev?.wape !== undefined ? `${ev.wape}%` : "Pending Run"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Mean Absolute Error (MAE):</span>
                  <span className="font-medium text-slate-200">
                    {ev?.mae !== undefined ? `${ev.mae} units` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Root Mean Squared (RMSE):</span>
                  <span className="font-medium text-slate-200">
                    {ev?.rmse !== undefined ? `${ev.rmse} units` : "N/A"}
                  </span>
                </div>
              </div>

              {!isBaseline && ev && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-xs">
                  <TrendingDown className={`w-3.5 h-3.5 ${improvement > 0 ? "text-emerald-400" : "text-amber-400"}`} />
                  <span className="text-slate-400">Vs Baseline:</span>
                  <span className={`font-semibold ${improvement > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                    {improvement > 0 ? `+${improvement.toFixed(1)}% accuracy` : `${improvement.toFixed(1)}%`}
                  </span>
                </div>
              )}
              {isBaseline && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 italic">
                  Reference benchmark model
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparative Error Metrics Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-1">Side-by-Side Holdout Error Comparison</h3>
        <p className="text-xs text-slate-400 mb-4">
          Lower scores represent superior forecasting performance on unseen chronological test samples.
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem" }}
                formatter={(val: any, name: any) => {
                  const n = String(name || "");
                  return [
                    n === "wape" ? `${val}%` : `${val} units`, 
                    n.toUpperCase()
                  ];
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                formatter={(value) => <span className="text-slate-300 font-medium">{value.toUpperCase()}</span>}
              />
              <Bar dataKey="wape" fill="#6366f1" radius={[4, 4, 0, 0]} name="WAPE (%)" />
              <Bar dataKey="mae" fill="#06b6d4" radius={[4, 4, 0, 0]} name="MAE" />
              <Bar dataKey="rmse" fill="#f59e0b" radius={[4, 4, 0, 0]} name="RMSE" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Evaluations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-4">Model Validation Evaluation Log</h3>
        
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase bg-slate-950 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Evaluation ID</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Product ID</th>
                <th className="py-2.5 px-3">Holdout Period</th>
                <th className="py-2.5 px-3 text-right">MAE</th>
                <th className="py-2.5 px-3 text-right">RMSE</th>
                <th className="py-2.5 px-3 text-right">WAPE</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {evaluations.map((ev) => (
                <tr key={ev.evaluation_id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono text-slate-400">EV-{ev.evaluation_id}</td>
                  <td className="py-2.5 px-3 font-medium text-white capitalize">{ev.model_name.replace("_", " ")}</td>
                  <td className="py-2.5 px-3 font-mono text-indigo-400">{ev.product_id || "All"}</td>
                  <td className="py-2.5 px-3 text-slate-400">{ev.evaluation_period}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{ev.mae.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{ev.rmse.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-300">{ev.wape.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-center">
                    {ev.is_selected ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                        Selected Best
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Evaluated</span>
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
