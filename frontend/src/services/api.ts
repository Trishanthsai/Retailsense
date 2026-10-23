import {
  Product,
  Store,
  Sale,
  AnalyticsSummary,
  ForecastResponse,
  ForecastSummaryItem,
  ModelEvaluation,
  InventoryRiskItem,
  DataImportResponse
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function fetchStores(): Promise<Store[]> {
  const res = await fetch(`${API_BASE}/stores`);
  if (!res.ok) throw new Error("Failed to fetch stores");
  return res.json();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) throw new Error("Failed to fetch analytics summary");
  return res.json();
}

export async function fetchSales(params?: {
  product_id?: string;
  store_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<Sale[]> {
  const query = new URLSearchParams();
  if (params?.product_id) query.append("product_id", params.product_id);
  if (params?.store_id) query.append("store_id", params.store_id);
  if (params?.start_date) query.append("start_date", params.start_date);
  if (params?.end_date) query.append("end_date", params.end_date);
  if (params?.limit) query.append("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/sales?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch sales transactions");
  return res.json();
}

export async function generateForecast(payload: {
  product_ids?: string[];
  store_id?: string;
  horizon_days: number;
  models?: string[];
}): Promise<ForecastResponse[]> {
  const res = await fetch(`${API_BASE}/forecasts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Forecast generation failed");
  }
  return res.json();
}

export async function fetchForecastHistory(): Promise<ForecastSummaryItem[]> {
  const res = await fetch(`${API_BASE}/forecasts`);
  if (!res.ok) throw new Error("Failed to fetch forecast runs");
  return res.json();
}

export async function fetchForecastDetail(forecastId: string): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE}/forecasts/${forecastId}`);
  if (!res.ok) throw new Error("Failed to fetch forecast detail");
  return res.json();
}

export async function fetchModelEvaluations(productId?: string): Promise<ModelEvaluation[]> {
  const url = productId
    ? `${API_BASE}/models/evaluations?product_id=${encodeURIComponent(productId)}`
    : `${API_BASE}/models/evaluations`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch model evaluations");
  return res.json();
}

export async function fetchInventoryRisks(storeId?: string): Promise<InventoryRiskItem[]> {
  const url = storeId
    ? `${API_BASE}/inventory/risks?store_id=${encodeURIComponent(storeId)}`
    : `${API_BASE}/inventory/risks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch inventory risks");
  return res.json();
}

export async function uploadSalesCsv(file: File): Promise<DataImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/sales/import`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function seedDemoData(days: number = 365): Promise<any> {
  const res = await fetch(`${API_BASE}/seed?days=${days}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to seed demo data");
  return res.json();
}
