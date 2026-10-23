"""
Pydantic schemas for request validation and response serialization.
Pydantic V2 compliant with ConfigDict.
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Product Schemas ---
class ProductBase(BaseModel):
    product_id: str
    product_name: str
    category: str
    unit_price: float = Field(ge=0.0)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Store Schemas ---
class StoreBase(BaseModel):
    store_id: str
    store_name: str
    location: Optional[str] = None

class StoreCreate(StoreBase):
    pass

class StoreResponse(StoreBase):
    model_config = ConfigDict(from_attributes=True)


# --- Sale Schemas ---
class SaleBase(BaseModel):
    product_id: str
    store_id: Optional[str] = None
    sale_date: date
    quantity_sold: float = Field(ge=0.0)
    unit_price: float = Field(ge=0.0)
    revenue: Optional[float] = None
    is_promotion: bool = False

class SaleCreate(SaleBase):
    pass

class SaleResponse(SaleBase):
    sale_id: int
    revenue: float
    model_config = ConfigDict(from_attributes=True)


# --- Inventory Schemas ---
class InventoryBase(BaseModel):
    product_id: str
    store_id: Optional[str] = None
    stock_quantity: float = Field(ge=0.0)
    lead_time_days: int = Field(default=7, ge=1)
    min_order_quantity: int = Field(default=10, ge=1)
    service_level: float = Field(default=0.95, ge=0.5, le=0.999)

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    stock_quantity: Optional[float] = None
    lead_time_days: Optional[int] = None
    min_order_quantity: Optional[int] = None
    service_level: Optional[float] = None

class InventoryResponse(InventoryBase):
    inventory_id: int
    last_updated: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# --- Forecast Schemas ---
class ForecastGenerateRequest(BaseModel):
    product_ids: Optional[List[str]] = None
    store_id: Optional[str] = None
    horizon_days: int = Field(default=30, ge=7, le=180)
    models: Optional[List[str]] = Field(
        default=["baseline", "sarimax", "random_forest", "xgboost"],
        description="Candidate models to train and evaluate"
    )

class ForecastPoint(BaseModel):
    date: str
    predicted_quantity: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    actual_quantity: Optional[float] = None

class ForecastResponse(BaseModel):
    forecast_id: str
    product_id: str
    product_name: str
    category: str
    store_id: Optional[str] = None
    model_name: str
    model_version: str
    horizon_days: int
    generated_at: str
    metrics: Dict[str, float]
    points: List[ForecastPoint]

class ForecastSummaryItem(BaseModel):
    forecast_id: str
    product_id: str
    product_name: Optional[str] = None
    store_id: Optional[str] = None
    model_name: str
    horizon_days: int
    generated_at: str
    total_predicted_units: float


# --- Model Evaluation Schemas ---
class ModelEvaluationResponse(BaseModel):
    evaluation_id: int
    model_name: str
    model_version: str
    product_id: Optional[str] = None
    evaluation_period: str
    mae: float
    rmse: float
    wape: float
    horizon_days: int
    is_selected: bool
    created_at: str
    model_config = ConfigDict(from_attributes=True)


# --- Inventory Risk Schemas ---
class InventoryRiskItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    current_stock: float
    lead_time_days: int
    avg_daily_demand: float
    std_daily_demand: float
    safety_stock: float
    reorder_point: float
    days_of_supply: float
    risk_level: str  # "CRITICAL_STOCKOUT", "REORDER_NEEDED", "HEALTHY", "OVERSTOCK"
    recommended_order_quantity: float
    service_level: float


# --- Analytics Summary Schemas ---
class AnalyticsSummaryResponse(BaseModel):
    total_revenue: float
    total_units_sold: float
    active_products: int
    total_transactions: int
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    top_products: List[Dict[str, Any]]
    category_breakdown: List[Dict[str, Any]]
    recent_trend: List[Dict[str, Any]]


# --- Data Import Schemas ---
class DataImportResponse(BaseModel):
    status: str
    message: str
    total_rows: int
    imported_rows: int
    skipped_rows: int
    errors: List[str] = []
