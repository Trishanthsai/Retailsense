import React, { useState, useEffect } from "react";
import { Filter, Search, Calendar, Tag, RefreshCw } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Product, Store, Sale } from "../types";
import { fetchSales } from "../services/api";

interface SalesAnalysisTabProps {
  products: Product[];
  stores: Store[];
}

export const SalesAnalysisTab: React.FC<SalesAnalysisTabProps> = ({ products, stores }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const data = await fetchSales({
        product_id: selectedProduct || undefined,
        store_id: selectedStore || undefined,
        limit: 200,
      });
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [selectedProduct, selectedStore]);

  // Filter by search query
  const filteredSales = sales.filter((s) => {
    if (!searchQuery) return true;
    return (
      s.product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sale_date.includes(searchQuery)
    );
  });

  // Calculate slice metrics
  const totalQty = filteredSales.reduce((acc, curr) => acc + curr.quantity_sold, 0);
  const totalRev = filteredSales.reduce((acc, curr) => acc + curr.revenue, 0);
  const promoCount = filteredSales.filter((s) => s.is_promotion).length;

  // Chart aggregation (group by date)
  const chartDataMap: { [date: string]: { date: string; units: number; revenue: number } } = {};
  filteredSales.forEach((s) => {
    if (!chartDataMap[s.sale_date]) {
      chartDataMap[s.sale_date] = { date: s.sale_date, units: 0, revenue: 0 };
    }
    chartDataMap[s.sale_date].units += s.quantity_sold;
    chartDataMap[s.sale_date].revenue += s.revenue;
  });
  const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Demand Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Product Selector */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} ({p.product_id})
                </option>
              ))}
            </select>

            {/* Store Selector */}
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>
                  {s.store_name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search transaction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none w-44"
              />
            </div>

            <button
              onClick={loadSalesData}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Refresh Sales"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filtered Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Filtered Units Sold</span>
          <p className="text-xl font-bold text-white mt-1">{totalQty.toLocaleString()} units</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Filtered Gross Revenue</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            ${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Promotional Days</span>
          <p className="text-xl font-bold text-indigo-400 mt-1">{promoCount} campaigns</p>
        </div>
      </div>

      {/* Time-Series Line Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-1">Historical Daily Sales Pattern</h3>
        <p className="text-xs text-slate-400 mb-4">Volume fluctuations over the selected timeframe</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.5rem" }}
                formatter={(val: any) => [`${val} units`, "Units Sold"]}
              />
              <Line 
                type="monotone" 
                dataKey="units" 
                stroke="#38bdf8" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 5 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white mb-4">Historical Transaction Logs</h3>
        
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase bg-slate-950 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Product ID</th>
                <th className="py-2.5 px-3 text-right">Quantity Sold</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
                <th className="py-2.5 px-3 text-center">Promotion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredSales.map((s) => (
                <tr key={s.sale_id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {s.sale_date}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-indigo-400">{s.product_id}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-white">{s.quantity_sold}</td>
                  <td className="py-2.5 px-3 text-right">${s.unit_price.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">${s.revenue.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {s.is_promotion ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                        <Tag className="w-2.5 h-2.5" /> Promo
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Standard</span>
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
