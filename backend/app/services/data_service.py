"""
Data management and analytics aggregation service.
Handles CSV ingestion, data validation, database seeding, and business KPIs.
"""
import io
import datetime
import random
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.db_models import Product, Store, Sale, Inventory, Forecast, ModelEvaluation
from app.ml.preprocessing import clean_and_validate_dataframe
from app.schemas.schemas import AnalyticsSummaryResponse, DataImportResponse

SAMPLE_PRODUCTS = [
    {"product_id": "PRD-HEADPHONES", "product_name": "AcousticPro Noise-Cancelling Headphones", "category": "Electronics", "unit_price": 149.99, "lead_time": 7, "stock": 42},
    {"product_id": "PRD-COFFEE", "product_name": "Artisan Colombian Dark Roast (1kg)", "category": "Grocery", "unit_price": 24.50, "lead_time": 4, "stock": 18},
    {"product_id": "PRD-CHAIR", "product_name": "ErgoFlex Ergonomic Lumbar Chair", "category": "Home & Office", "unit_price": 289.00, "lead_time": 14, "stock": 8},
    {"product_id": "PRD-SMARTWATCH", "product_name": "PulseFit Active Smartwatch V2", "category": "Electronics", "unit_price": 199.95, "lead_time": 10, "stock": 65},
    {"product_id": "PRD-BOTTLE", "product_name": "HydroShield Insulated Bottle (32oz)", "category": "Sports & Outdoors", "unit_price": 29.99, "lead_time": 5, "stock": 120},
    {"product_id": "PRD-KEYBOARD", "product_name": "TactilePro Mechanical RGB Keyboard", "category": "Electronics", "unit_price": 119.50, "lead_time": 7, "stock": 5},
    {"product_id": "PRD-YOGAMAT", "product_name": "EcoGrip High-Density Yoga Mat", "category": "Sports & Outdoors", "unit_price": 45.00, "lead_time": 6, "stock": 35},
    {"product_id": "PRD-DESKLAMP", "product_name": "Lumina Smart LED Desk Lamp", "category": "Home & Office", "unit_price": 59.99, "lead_time": 8, "stock": 22},
]

SAMPLE_STORES = [
    {"store_id": "STR-01", "store_name": "Downtown Flagship Store", "location": "New York, NY"},
    {"store_id": "STR-02", "store_name": "Metro Center Mall", "location": "Chicago, IL"},
    {"store_id": "STR-03", "store_name": "Westside Plaza Outlet", "location": "San Francisco, CA"},
]


def seed_sample_retail_data(db: Session, num_days: int = 365) -> Dict[str, Any]:
    """
    Seeds database with realistic retail sales, inventory, and product records.
    Features:
    - Weekly seasonality (higher demand Friday - Sunday)
    - Realistic promotional campaigns and occasional demand spikes
    - Supplier lead times and stock levels spanning all inventory risk tiers
    """
    # 1. Insert Stores
    for s_info in SAMPLE_STORES:
        existing_store = db.query(Store).filter(Store.store_id == s_info["store_id"]).first()
        if not existing_store:
            store = Store(**s_info)
            db.add(store)

    # 2. Insert Products and Inventory
    for p_info in SAMPLE_PRODUCTS:
        existing_prod = db.query(Product).filter(Product.product_id == p_info["product_id"]).first()
        if not existing_prod:
            prod = Product(
                product_id=p_info["product_id"],
                product_name=p_info["product_name"],
                category=p_info["category"],
                unit_price=p_info["unit_price"]
            )
            db.add(prod)
            db.flush()

        # Inventory
        existing_inv = db.query(Inventory).filter(Inventory.product_id == p_info["product_id"]).first()
        if not existing_inv:
            inv = Inventory(
                product_id=p_info["product_id"],
                store_id="STR-01",
                stock_quantity=float(p_info["stock"]),
                lead_time_days=p_info["lead_time"],
                min_order_quantity=max(10, int(p_info["lead_time"] * 3)),
                service_level=0.95,
                last_updated=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(inv)

    db.commit()

    # 3. Check if sales already seeded
    existing_sales_count = db.query(Sale).count()
    if existing_sales_count > 500:
        return {
            "status": "already_seeded",
            "message": f"Database already contains {existing_sales_count} sales transactions."
        }

    # Generate synthetic historical transactions
    random.seed(42)
    np.random.seed(42)

    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=num_days)

    sales_to_insert = []
    
    # Base parameters per product
    demand_profiles = {
        "PRD-HEADPHONES": {"base": 8.0, "noise": 3.0, "promo_mult": 2.2},
        "PRD-COFFEE": {"base": 22.0, "noise": 5.0, "promo_mult": 1.6},
        "PRD-CHAIR": {"base": 3.0, "noise": 1.5, "promo_mult": 2.5},
        "PRD-SMARTWATCH": {"base": 10.0, "noise": 4.0, "promo_mult": 2.0},
        "PRD-BOTTLE": {"base": 18.0, "noise": 6.0, "promo_mult": 1.8},
        "PRD-KEYBOARD": {"base": 7.0, "noise": 2.5, "promo_mult": 2.1},
        "PRD-YOGAMAT": {"base": 9.0, "noise": 3.0, "promo_mult": 1.7},
        "PRD-DESKLAMP": {"base": 6.0, "noise": 2.0, "promo_mult": 1.9},
    }

    current_date = start_date
    while current_date <= end_date:
        dow = current_date.weekday()
        # Weekend multiplier: Fri/Sat/Sun sales +25% to +45%
        weekend_mult = 1.35 if dow in [4, 5, 6] else 1.0

        for p_info in SAMPLE_PRODUCTS:
            pid = p_info["product_id"]
            prof = demand_profiles[pid]

            # 8% chance of active promotion
            is_promo = random.random() < 0.08
            promo_boost = prof["promo_mult"] if is_promo else 1.0

            # Price discount on promo
            unit_price = round(p_info["unit_price"] * (0.85 if is_promo else 1.0), 2)

            # Demand generation with Poisson / Normal noise
            mean_demand = prof["base"] * weekend_mult * promo_boost
            qty = max(0, int(round(np.random.normal(loc=mean_demand, scale=prof["noise"]))))

            if qty > 0:
                revenue = round(qty * unit_price, 2)
                sale = Sale(
                    product_id=pid,
                    store_id="STR-01",
                    sale_date=current_date,
                    quantity_sold=float(qty),
                    unit_price=unit_price,
                    revenue=revenue,
                    is_promotion=is_promo
                )
                sales_to_insert.append(sale)

        current_date += datetime.timedelta(days=1)

    # Bulk insert
    db.bulk_save_objects(sales_to_insert)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully seeded {len(sales_to_insert)} sales records across {len(SAMPLE_PRODUCTS)} products over {num_days} days."
    }


def import_sales_data(db: Session, file_content: bytes, filename: str) -> DataImportResponse:
    """
    Ingests user-uploaded CSV file, validates rows, handles duplicates,
    and updates database.
    """
    try:
        df_raw = pd.read_csv(io.BytesIO(file_content))
    except Exception as e:
        return DataImportResponse(
            status="error",
            message=f"Failed to read CSV file: {str(e)}",
            total_rows=0,
            imported_rows=0,
            skipped_rows=0,
            errors=[str(e)]
        )

    try:
        clean_df, warnings = clean_and_validate_dataframe(df_raw)
    except ValueError as val_err:
        return DataImportResponse(
            status="error",
            message=f"Validation error: {str(val_err)}",
            total_rows=len(df_raw),
            imported_rows=0,
            skipped_rows=len(df_raw),
            errors=[str(val_err)]
        )

    # Ingest products and sales
    imported_count = 0
    for _, row in clean_df.iterrows():
        pid = str(row["product_id"]).strip()
        pname = str(row.get("product_name", f"Product {pid}")).strip()
        cat = str(row.get("category", "General")).strip()
        uprice = float(row["unit_price"])

        # Upsert product
        existing_p = db.query(Product).filter(Product.product_id == pid).first()
        if not existing_p:
            new_p = Product(product_id=pid, product_name=pname, category=cat, unit_price=uprice)
            db.add(new_p)
            db.flush()

        # Add Sale
        sale = Sale(
            product_id=pid,
            store_id=str(row["store_id"]).strip() if "store_id" in row and pd.notna(row["store_id"]) else None,
            sale_date=row["sale_date"],
            quantity_sold=float(row["quantity_sold"]),
            unit_price=uprice,
            revenue=float(row["revenue"]),
            is_promotion=bool(row["is_promotion"])
        )
        db.add(sale)
        imported_count += 1

    db.commit()

    return DataImportResponse(
        status="success",
        message=f"Successfully imported {imported_count} sales transactions.",
        total_rows=len(df_raw),
        imported_rows=imported_count,
        skipped_rows=len(df_raw) - imported_count,
        errors=warnings
    )


def get_analytics_summary(db: Session) -> AnalyticsSummaryResponse:
    """Computes high-level business analytics, top products, category split, and sales trajectory."""
    total_sales = db.query(
        func.sum(Sale.revenue).label("total_rev"),
        func.sum(Sale.quantity_sold).label("total_qty"),
        func.count(Sale.sale_id).label("total_trans"),
        func.min(Sale.sale_date).label("min_date"),
        func.max(Sale.sale_date).label("max_date")
    ).first()

    total_rev = round(float(total_sales.total_rev or 0.0), 2)
    total_qty = round(float(total_sales.total_qty or 0.0), 1)
    total_trans = int(total_sales.total_trans or 0)
    min_date = str(total_sales.min_date) if total_sales.min_date else None
    max_date = str(total_sales.max_date) if total_sales.max_date else None

    active_products = db.query(Product).count()

    # Top selling products
    top_prods_query = (
        db.query(
            Product.product_id,
            Product.product_name,
            Product.category,
            func.sum(Sale.revenue).label("revenue"),
            func.sum(Sale.quantity_sold).label("units_sold")
        )
        .join(Sale, Product.product_id == Sale.product_id)
        .group_by(Product.product_id, Product.product_name, Product.category)
        .order_by(desc("revenue"))
        .limit(5)
        .all()
    )
    top_products = [{
        "product_id": r.product_id,
        "product_name": r.product_name,
        "category": r.category,
        "revenue": round(float(r.revenue), 2),
        "units_sold": round(float(r.units_sold), 1)
    } for r in top_prods_query]

    # Category Breakdown
    cat_query = (
        db.query(
            Product.category,
            func.sum(Sale.revenue).label("cat_revenue"),
            func.sum(Sale.quantity_sold).label("cat_units")
        )
        .join(Sale, Product.product_id == Sale.product_id)
        .group_by(Product.category)
        .order_by(desc("cat_revenue"))
        .all()
    )
    category_breakdown = [{
        "category": r.category,
        "revenue": round(float(r.cat_revenue), 2),
        "units_sold": round(float(r.cat_units), 1)
    } for r in cat_query]

    # Recent 60-day daily sales trend
    trend_query = (
        db.query(
            Sale.sale_date,
            func.sum(Sale.revenue).label("daily_revenue"),
            func.sum(Sale.quantity_sold).label("daily_units")
        )
        .group_by(Sale.sale_date)
        .order_by(Sale.sale_date.desc())
        .limit(60)
        .all()
    )
    trend_query.reverse()
    recent_trend = [{
        "date": str(r.sale_date),
        "revenue": round(float(r.daily_revenue), 2),
        "units": round(float(r.daily_units), 1)
    } for r in trend_query]

    return AnalyticsSummaryResponse(
        total_revenue=total_rev,
        total_units_sold=total_qty,
        active_products=active_products,
        total_transactions=total_trans,
        date_range_start=min_date,
        date_range_end=max_date,
        top_products=top_products,
        category_breakdown=category_breakdown,
        recent_trend=recent_trend
    )
