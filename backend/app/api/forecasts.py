"""
Forecast API routes:
- POST /api/v1/forecasts/generate
- GET /api/v1/forecasts
- GET /api/v1/forecasts/{id}
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import (
    ForecastGenerateRequest, 
    ForecastResponse, 
    ForecastSummaryItem
)
from app.services.forecast_service import (
    execute_forecast_pipeline, 
    list_forecast_runs, 
    get_forecast_by_id
)

router = APIRouter(prefix="/forecasts", tags=["Forecasting"])

@router.post("/generate", response_model=List[ForecastResponse])
def generate_forecasts(
    request: ForecastGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Triggers comparative model training across Baseline, SARIMAX, Random Forest, and XGBoost.
    Validates on historical holdout, records error metrics, selects best model,
    and produces future predictions for the requested horizon.
    """
    try:
        results = execute_forecast_pipeline(db, request)
        if not results:
            raise HTTPException(
                status_code=400,
                detail="Could not generate forecasts. Ensure sufficient historical sales data is available."
            )
        return results
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")


@router.get("", response_model=List[ForecastSummaryItem])
def get_forecasts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve history of saved forecast runs."""
    return list_forecast_runs(db, limit=limit)


@router.get("/{forecast_id}", response_model=ForecastResponse)
def get_forecast_detail(
    forecast_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve detailed points and actual sales anchor for a specific forecast run."""
    fc = get_forecast_by_id(db, forecast_id)
    if not fc:
        raise HTTPException(status_code=404, detail=f"Forecast with ID '{forecast_id}' not found.")
    return fc
