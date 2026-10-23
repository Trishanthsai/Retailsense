"""
Unit tests for Inventory Intelligence logic.
Tests Section 16 (Safety stock, Reorder point, Days of supply, and Risk status).
"""
import pytest
from app.models.db_models import Product, Inventory
from app.services.inventory_service import calculate_inventory_metrics

def test_inventory_formulas():
    prod = Product(product_id="TEST-1", product_name="Test Widget", category="Widgets", unit_price=10.0)
    
    # 30 days of sales with constant 10 units/day -> mean=10, std=0 (or floor 0.01)
    sales = [10.0] * 30
    
    # Case 1: Healthy Stock
    # Stock = 100, Lead time = 7, Service level = 0.95 (z=1.645)
    # mu_L = 10 * 7 = 70. SS ~ 0.01 * 1.645 * sqrt(7) ~ 0.04
    # Days of supply = 100 / 10 = 10 days
    inv = Inventory(product_id="TEST-1", stock_quantity=100.0, lead_time_days=7, min_order_quantity=10, service_level=0.95)
    res = calculate_inventory_metrics(prod, inv, sales)

    assert res.avg_daily_demand == 10.0
    assert res.days_of_supply == 10.0
    assert res.risk_level == "HEALTHY"
    assert res.recommended_order_quantity == 0.0

    # Case 2: Reorder Needed
    # Stock is 50, which is below mu_L (70)
    inv.stock_quantity = 50.0
    res_reorder = calculate_inventory_metrics(prod, inv, sales)
    assert res_reorder.risk_level == "REORDER_NEEDED"
    assert res_reorder.recommended_order_quantity > 0.0

    # Case 3: Critical Stockout
    # Stock is 0 or less than 3 days of supply
    inv.stock_quantity = 2.0
    res_critical = calculate_inventory_metrics(prod, inv, sales)
    assert res_critical.risk_level == "CRITICAL_STOCKOUT"
    assert res_critical.recommended_order_quantity > 0.0

    # Case 4: Overstock
    # Stock is 800 (80 days of supply > 60)
    inv.stock_quantity = 800.0
    res_overstock = calculate_inventory_metrics(prod, inv, sales)
    assert res_overstock.risk_level == "OVERSTOCK"
    assert res_overstock.recommended_order_quantity == 0.0
