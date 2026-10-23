"""
Analytics API routes:
- GET /api/v1/analytics/summary
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import AnalyticsSummaryResponse
from app.services.data_service import get_analytics_summary

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    """Retrieve high-level business analytics, top products, and demand trends."""
    return get_analytics_summary(db)
