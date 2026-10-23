"""
Forecasting coordination service.
Integrates data retrieval, comparative model training, evaluation persistence,
and future forecast generation.
"""
import uuid
import datetime
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.db_models import Product, Sale, Forecast, ModelEvaluation
from app.schemas.schemas import (
    ForecastGenerateRequest, 
    ForecastResponse, 
    ForecastPoint,
    ForecastSummaryItem,
    ModelEvaluationResponse
)
from app.ml.preprocessing import build_daily_time_series
from app.ml.train import train_and_evaluate_all_models
from app.ml.predict import generate_future_forecast

def execute_forecast_pipeline(
    db: Session,
    request: ForecastGenerateRequest
) -> List[ForecastResponse]:
    """
    Executes end-to-end forecasting pipeline:
    1. Loads sales history
    2. Builds daily continuous series
    3. Fits & compares candidate models
    4. Records evaluation metrics
    5. Forecasts future horizon
    6. Persists forecasts
    """
    # Determine target products
    if request.product_ids and len(request.product_ids) > 0:
        products = db.query(Product).filter(Product.product_id.in_(request.product_ids)).all()
    else:
        products = db.query(Product).all()

    if not products:
        raise ValueError("No products found to forecast.")

    responses = []
    run_timestamp = datetime.datetime.now(datetime.timezone.utc)

    for product in products:
        # Fetch sales records for product
        query = db.query(Sale).filter(Sale.product_id == product.product_id)
        if request.store_id:
            query = query.filter(Sale.store_id == request.store_id)
        sales_records = query.order_by(Sale.sale_date.asc()).all()

        if not sales_records or len(sales_records) < 14:
            # Need minimum 14 days of data to build meaningful time series
            continue

        # Convert to DataFrame
        data = [{
            "sale_date": s.sale_date,
            "product_id": s.product_id,
            "quantity_sold": s.quantity_sold,
            "unit_price": s.unit_price,
            "revenue": s.revenue,
            "is_promotion": s.is_promotion
        } for s in sales_records]
        raw_df = pd.DataFrame(data)

        # Build continuous daily time series
        daily_df = build_daily_time_series(raw_df, product_id=product.product_id)

        # Determine evaluation holdout length (up to 30 days or 20% of data)
        eval_days = min(30, max(7, int(len(daily_df) * 0.2)))
        
        # Train and evaluate all candidate models
        fitted_models, eval_metrics, best_model_name = train_and_evaluate_all_models(
            daily_df, test_days=eval_days
        )

        # Persist model evaluations to DB
        model_version = f"v1.0-{run_timestamp.strftime('%Y%m%d%H%M')}"
        for m_name, m_metrics in eval_metrics.items():
            db_eval = ModelEvaluation(
                model_name=m_name,
                model_version=model_version,
                product_id=product.product_id,
                evaluation_period=f"Holdout last {eval_days} days",
                mae=m_metrics["mae"],
                rmse=m_metrics["rmse"],
                wape=m_metrics["wape"],
                horizon_days=request.horizon_days,
                is_selected=(m_name == best_model_name),
                created_at=run_timestamp
            )
            db.add(db_eval)

        # Generate future predictions using the winning model
        future_preds = generate_future_forecast(
            daily_df,
            model_name=best_model_name,
            horizon_days=request.horizon_days
        )

        forecast_run_id = f"FC-{uuid.uuid4().hex[:8].upper()}"

        # Persist future forecast points
        forecast_points = []
        for fp in future_preds:
            f_date = datetime.datetime.strptime(fp["date"], "%Y-%m-%d").date()
            db_forecast = Forecast(
                forecast_id=forecast_run_id,
                product_id=product.product_id,
                store_id=request.store_id,
                forecast_date=f_date,
                predicted_quantity=fp["predicted_quantity"],
                lower_bound=fp["lower_bound"],
                upper_bound=fp["upper_bound"],
                model_name=best_model_name,
                model_version=model_version,
                horizon_days=request.horizon_days,
                generated_at=run_timestamp
            )
            db.add(db_forecast)
            forecast_points.append(ForecastPoint(
                date=fp["date"],
                predicted_quantity=fp["predicted_quantity"],
                lower_bound=fp["lower_bound"],
                upper_bound=fp["upper_bound"],
                actual_quantity=None
            ))

        # Include recent actual historical points (last 30 days) for seamless chart anchoring
        recent_actuals = daily_df.tail(30)
        for _, row in recent_actuals.iterrows():
            d_str = row["date"].strftime("%Y-%m-%d")
            # If point not in forecast, add historical actual point
            forecast_points.insert(0, ForecastPoint(
                date=d_str,
                predicted_quantity=float(row["quantity_sold"]),
                lower_bound=None,
                upper_bound=None,
                actual_quantity=float(row["quantity_sold"])
            ))

        # Sort combined points chronologically
        forecast_points.sort(key=lambda x: x.date)

        resp = ForecastResponse(
            forecast_id=forecast_run_id,
            product_id=product.product_id,
            product_name=product.product_name,
            category=product.category,
            store_id=request.store_id,
            model_name=best_model_name,
            model_version=model_version,
            horizon_days=request.horizon_days,
            generated_at=run_timestamp.isoformat(),
            metrics=eval_metrics[best_model_name],
            points=forecast_points
        )
        responses.append(resp)

    db.commit()
    return responses


def list_forecast_runs(db: Session, limit: int = 50) -> List[ForecastSummaryItem]:
    """Retrieves summaries of saved forecast runs."""
    subquery = (
        db.query(
            Forecast.forecast_id,
            Forecast.product_id,
            Forecast.model_name,
            Forecast.horizon_days,
            Forecast.generated_at,
            Forecast.store_id
        )
        .distinct()
        .order_by(Forecast.generated_at.desc())
        .limit(limit)
        .all()
    )

    summaries = []
    for row in subquery:
        prod = db.query(Product).filter(Product.product_id == row.product_id).first()
        # Sum predicted units for this run
        total_pred = db.query(Forecast.predicted_quantity).filter(
            Forecast.forecast_id == row.forecast_id
        ).all()
        total_units = sum(p[0] for p in total_pred)

        summaries.append(ForecastSummaryItem(
            forecast_id=row.forecast_id,
            product_id=row.product_id,
            product_name=prod.product_name if prod else row.product_id,
            store_id=row.store_id,
            model_name=row.model_name,
            horizon_days=row.horizon_days,
            generated_at=row.generated_at.isoformat(),
            total_predicted_units=round(total_units, 1)
        ))

    return summaries


def get_forecast_by_id(db: Session, forecast_id: str) -> Optional[ForecastResponse]:
    """Retrieves a specific forecast run by ID with historical anchor points."""
    points = db.query(Forecast).filter(Forecast.forecast_id == forecast_id).order_by(Forecast.forecast_date.asc()).all()
    if not points:
        return None

    first = points[0]
    prod = db.query(Product).filter(Product.product_id == first.product_id).first()

    # Get recent actual sales
    recent_sales = (
        db.query(Sale)
        .filter(Sale.product_id == first.product_id)
        .order_by(Sale.sale_date.desc())
        .limit(30)
        .all()
    )
    recent_sales.reverse()

    chart_points = []
    for s in recent_sales:
        chart_points.append(ForecastPoint(
            date=s.sale_date.strftime("%Y-%m-%d"),
            predicted_quantity=s.quantity_sold,
            actual_quantity=s.quantity_sold
        ))

    for p in points:
        chart_points.append(ForecastPoint(
            date=p.forecast_date.strftime("%Y-%m-%d"),
            predicted_quantity=p.predicted_quantity,
            lower_bound=p.lower_bound,
            upper_bound=p.upper_bound,
            actual_quantity=None
        ))

    return ForecastResponse(
        forecast_id=first.forecast_id,
        product_id=first.product_id,
        product_name=prod.product_name if prod else first.product_id,
        category=prod.category if prod else "General",
        store_id=first.store_id,
        model_name=first.model_name,
        model_version=first.model_version,
        horizon_days=first.horizon_days,
        generated_at=first.generated_at.isoformat(),
        metrics={"info": "Historical model evaluation metrics available in Model Evaluations tab"},
        points=chart_points
    )
