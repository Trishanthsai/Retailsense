export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  unit_price: number;
}

export interface Store {
  store_id: string;
  store_name: string;
  location?: string;
}

export interface Sale {
  sale_id: number;
  product_id: string;
  store_id?: string;
  sale_date: string;
  quantity_sold: number;
  unit_price: number;
  revenue: number;
  is_promotion: boolean;
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_units_sold: number;
  active_products: number;
  total_transactions: number;
  date_range_start?: string;
  date_range_end?: string;
  top_products: Array<{
    product_id: string;
    product_name: string;
    category: string;
    revenue: number;
    units_sold: number;
  }>;
  category_breakdown: Array<{
    category: string;
    revenue: number;
    units_sold: number;
  }>;
  recent_trend: Array<{
    date: string;
    revenue: number;
    units: number;
  }>;
}

export interface ForecastPoint {
  date: string;
  predicted_quantity: number;
  lower_bound?: number;
  upper_bound?: number;
  actual_quantity?: number;
}

export interface ForecastResponse {
  forecast_id: string;
  product_id: string;
  product_name: string;
  category: string;
  store_id?: string;
  model_name: string;
  model_version: string;
  horizon_days: number;
  generated_at: string;
  metrics: Record<string, any>;
  points: ForecastPoint[];
}

export interface ForecastSummaryItem {
  forecast_id: string;
  product_id: string;
  product_name?: string;
  store_id?: string;
  model_name: string;
  horizon_days: number;
  generated_at: string;
  total_predicted_units: number;
}

export interface ModelEvaluation {
  evaluation_id: number;
  model_name: string;
  model_version: string;
  product_id?: string;
  evaluation_period: string;
  mae: number;
  rmse: number;
  wape: number;
  horizon_days: number;
  is_selected: boolean;
  created_at: string;
}

export interface InventoryRiskItem {
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  lead_time_days: number;
  avg_daily_demand: number;
  std_daily_demand: number;
  safety_stock: number;
  reorder_point: number;
  days_of_supply: number;
  risk_level: "CRITICAL_STOCKOUT" | "REORDER_NEEDED" | "HEALTHY" | "OVERSTOCK";
  recommended_order_quantity: number;
  service_level: number;
}

export interface DataImportResponse {
  status: string;
  message: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  errors: string[];
}
