"""
Model Performance & Evaluations API routes:
- GET /api/v1/models/evaluations
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.db_models import ModelEvaluation
from app.schemas.schemas import ModelEvaluationResponse

router = APIRouter(prefix="/models", tags=["Model Evaluation"])

@router.get("/evaluations", response_model=List[ModelEvaluationResponse])
def get_evaluations(
    product_id: Optional[str] = Query(None, description="Filter evaluations by product ID"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve comparative error metrics (MAE, RMSE, WAPE) across candidate models."""
    query = db.query(ModelEvaluation)
    if product_id:
        query = query.filter(ModelEvaluation.product_id == product_id)

    records = query.order_by(ModelEvaluation.created_at.desc()).limit(limit).all()
    
    return [
        ModelEvaluationResponse(
            evaluation_id=r.evaluation_id,
            model_name=r.model_name,
            model_version=r.model_version,
            product_id=r.product_id,
            evaluation_period=r.evaluation_period,
            mae=r.mae,
            rmse=r.rmse,
            wape=r.wape,
            horizon_days=r.horizon_days,
            is_selected=r.is_selected,
            created_at=r.created_at.isoformat()
        )
        for r in records
    ]
