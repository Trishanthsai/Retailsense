"""
Inventory Intelligence API routes:
- GET /api/v1/inventory/risks
- PUT /api/v1/inventory/{product_id}
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.db_models import Inventory, Product
from app.schemas.schemas import InventoryRiskItem, InventoryUpdate, InventoryResponse
from app.services.inventory_service import compute_all_inventory_risks

router = APIRouter(prefix="/inventory", tags=["Inventory Intelligence"])

@router.get("/risks", response_model=List[InventoryRiskItem])
def get_inventory_risks(
    store_id: Optional[str] = Query(None, description="Optional store filter"),
    db: Session = Depends(get_db)
):
    """
    Computes stockout risk indicators, safety stock, reorder point,
    and replenishment recommendations based on forecasted demand and supplier lead times.
    """
    return compute_all_inventory_risks(db, store_id=store_id)


@router.put("/{product_id}", response_model=InventoryResponse)
def update_product_inventory(
    product_id: str,
    update_data: InventoryUpdate,
    db: Session = Depends(get_db)
):
    """Updates current stock level, supplier lead time, or service level for a product."""
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        prod = db.query(Product).filter(Product.product_id == product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")
        inv = Inventory(product_id=product_id)
        db.add(inv)

    if update_data.stock_quantity is not None:
        inv.stock_quantity = update_data.stock_quantity
    if update_data.lead_time_days is not None:
        inv.lead_time_days = update_data.lead_time_days
    if update_data.min_order_quantity is not None:
        inv.min_order_quantity = update_data.min_order_quantity
    if update_data.service_level is not None:
        inv.service_level = update_data.service_level

    db.commit()
    db.refresh(inv)
    return inv
