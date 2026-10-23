"""
Sales API routes:
- GET /api/v1/sales
- POST /api/v1/sales/import
- GET /api/v1/products
- GET /api/v1/stores
- POST /api/v1/seed
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.db_models import Sale, Product, Store
from app.schemas.schemas import (
    SaleResponse, 
    ProductResponse, 
    StoreResponse, 
    DataImportResponse
)
from app.services.data_service import (
    import_sales_data, 
    seed_sample_retail_data
)

router = APIRouter(tags=["Sales & Catalog"])

@router.get("/sales", response_model=List[SaleResponse])
def get_sales(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    store_id: Optional[str] = Query(None, description="Filter by store ID"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve historical sales transactions with optional filters."""
    query = db.query(Sale)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    if store_id:
        query = query.filter(Sale.store_id == store_id)
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)

    query = query.order_by(Sale.sale_date.desc()).offset(offset).limit(limit)
    return query.all()


@router.post("/sales/import", response_model=DataImportResponse)
async def upload_sales_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import sales dataset from CSV file and perform validation checks."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    result = import_sales_data(db, contents, file.filename)
    return result


@router.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    """Retrieve catalog of all products."""
    return db.query(Product).order_by(Product.category, Product.product_name).all()


@router.get("/stores", response_model=List[StoreResponse])
def get_stores(db: Session = Depends(get_db)):
    """Retrieve list of retail stores."""
    return db.query(Store).order_by(Store.store_id).all()


@router.post("/seed")
def seed_database(
    days: int = Query(365, ge=30, le=730),
    db: Session = Depends(get_db)
):
    """Seeds the database with realistic retail sales, products, and inventory records."""
    res = seed_sample_retail_data(db, num_days=days)
    return res
