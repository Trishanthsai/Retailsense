"""
Inventory Intelligence Service.
Implements Section 16 (Safety Stock, Reorder Point, Stockout Risk, and Replenishment Recommendations).
Formulas:
- SS = z * sigma_d * sqrt(L)
- ROP = mu_L + SS = (mu_d * L) + SS
- Days of Supply = Current Stock / mu_d
"""
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.db_models import Product, Inventory, Sale
from app.schemas.schemas import InventoryRiskItem

# Service level z-scores
SERVICE_LEVEL_Z = {
    0.90: 1.282,
    0.95: 1.645,
    0.98: 2.054,
    0.99: 2.326
}

def get_z_score(service_level: float) -> float:
    """Returns the normal distribution quantile z-factor for a given target service level."""
    for sl, z in sorted(SERVICE_LEVEL_Z.items()):
        if service_level <= sl + 0.01:
            return z
    return 1.645


def calculate_inventory_metrics(
    product: Product,
    inv: Optional[Inventory],
    recent_sales_quantities: List[float]
) -> InventoryRiskItem:
    """
    Computes statistical safety stock, reorder point, days of supply, and risk state.
    """
    current_stock = inv.stock_quantity if inv else 0.0
    lead_time_days = inv.lead_time_days if inv else 7
    min_order_qty = inv.min_order_quantity if inv else 10
    service_level = inv.service_level if inv else 0.95

    # Calculate average daily demand (mu_d) and standard deviation (sigma_d)
    if recent_sales_quantities and len(recent_sales_quantities) > 0:
        mu_d = float(sum(recent_sales_quantities) / len(recent_sales_quantities))
        # Population / sample std
        variance = sum((q - mu_d) ** 2 for q in recent_sales_quantities) / max(1, len(recent_sales_quantities) - 1)
        sigma_d = math.sqrt(variance)
    else:
        mu_d = 1.0
        sigma_d = 0.5

    mu_d = max(mu_d, 0.01) # Avoid division by zero
    sigma_d = max(sigma_d, 0.01)

    # Lead time demand: mu_L = mu_d * L
    mu_L = mu_d * lead_time_days

    # Safety stock: SS = z * sigma_d * sqrt(L)
    z = get_z_score(service_level)
    safety_stock = round(z * sigma_d * math.sqrt(lead_time_days), 1)

    # Reorder point: ROP = mu_L + SS
    reorder_point = round(mu_L + safety_stock, 1)

    # Days of supply: Stock / mu_d
    days_of_supply = round(current_stock / mu_d, 1)

    # Determine risk category
    if current_stock == 0 or days_of_supply <= min(3.0, lead_time_days * 0.5):
        risk_level = "CRITICAL_STOCKOUT"
        # Immediate replenishment needed
        recommended_order = math.ceil(max(reorder_point - current_stock + (mu_d * 14), min_order_qty))
    elif current_stock <= reorder_point:
        risk_level = "REORDER_NEEDED"
        recommended_order = math.ceil(max(reorder_point - current_stock + (mu_d * 14), min_order_qty))
    elif days_of_supply > 60:
        risk_level = "OVERSTOCK"
        recommended_order = 0.0
    else:
        risk_level = "HEALTHY"
        recommended_order = 0.0

    return InventoryRiskItem(
        product_id=product.product_id,
        product_name=product.product_name,
        category=product.category,
        current_stock=round(current_stock, 1),
        lead_time_days=lead_time_days,
        avg_daily_demand=round(mu_d, 2),
        std_daily_demand=round(sigma_d, 2),
        safety_stock=safety_stock,
        reorder_point=reorder_point,
        days_of_supply=days_of_supply,
        risk_level=risk_level,
        recommended_order_quantity=float(recommended_order),
        service_level=service_level
    )


def compute_all_inventory_risks(db: Session, store_id: Optional[str] = None) -> List[InventoryRiskItem]:
    """Evaluates inventory risk across all products in the database."""
    products = db.query(Product).all()
    results = []

    for product in products:
        inv_query = db.query(Inventory).filter(Inventory.product_id == product.product_id)
        if store_id:
            inv_query = inv_query.filter(Inventory.store_id == store_id)
        inv = inv_query.first()

        # Fetch last 30-60 sales records to compute realistic demand variance
        sales = (
            db.query(Sale.quantity_sold)
            .filter(Sale.product_id == product.product_id)
            .order_by(Sale.sale_date.desc())
            .limit(60)
            .all()
        )
        sales_quantities = [s[0] for s in sales]

        risk_item = calculate_inventory_metrics(product, inv, sales_quantities)
        results.append(risk_item)

    # Sort so that CRITICAL_STOCKOUT and REORDER_NEEDED appear at the top
    priority_order = {"CRITICAL_STOCKOUT": 0, "REORDER_NEEDED": 1, "OVERSTOCK": 2, "HEALTHY": 3}
    results.sort(key=lambda r: (priority_order.get(r.risk_level, 4), r.days_of_supply))

    return results
