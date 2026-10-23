"""
Unit tests for Machine Learning and Forecasting components.
Tests Section 13, 14, and 15 (Preprocessing, Features, Evaluation, and Forecast Models).
"""
import numpy as np
import pandas as pd
import pytest
import datetime

from app.ml.evaluate import calculate_mae, calculate_rmse, calculate_wape, evaluate_forecast
from app.ml.preprocessing import clean_and_validate_dataframe, build_daily_time_series, chronological_split
from app.ml.features import generate_features, prepare_supervised_data
from app.ml.train import train_and_evaluate_all_models
from app.ml.predict import generate_future_forecast

def test_evaluation_metrics():
    y_true = np.array([10.0, 20.0, 30.0, 40.0])
    y_pred = np.array([12.0, 18.0, 33.0, 37.0])
    # Absolute errors: [2, 2, 3, 3] -> MAE = 2.5
    # Squared errors: [4, 4, 9, 9] -> MSE = 6.5 -> RMSE = sqrt(6.5) ~ 2.5495
    # Sum actual = 100. Sum abs error = 10 -> WAPE = 10.0%
    mae = calculate_mae(y_true, y_pred)
    rmse = calculate_rmse(y_true, y_pred)
    wape = calculate_wape(y_true, y_pred)

    assert pytest.approx(mae, 0.01) == 2.5
    assert pytest.approx(rmse, 0.01) == 2.55
    assert pytest.approx(wape, 0.01) == 10.0


def test_data_cleaning_and_validation():
    # Valid and invalid rows
    data = {
        "sale_date": ["2026-01-01", "2026-01-02", "bad-date", "2026-01-03", "2026-01-03"],
        "product_id": ["P1", "P1", "P1", "P1", "P1"],
        "quantity_sold": [5.0, -10.0, 15.0, 20.0, 20.0],  # -10 is invalid, duplicate row 4 & 5
        "unit_price": [10.0, 10.0, 10.0, 10.0, 10.0]
    }
    df = pd.DataFrame(data)
    clean_df, warnings = clean_and_validate_dataframe(df)

    # Negative quantity and invalid date should be cleaned, duplicate removed
    assert len(clean_df) == 2
    assert (clean_df["quantity_sold"] >= 0).all()
    assert len(warnings) > 0


def test_build_daily_time_series_gap_filling():
    # Has a missing day on 2026-01-02
    data = {
        "sale_date": [datetime.date(2026, 1, 1), datetime.date(2026, 1, 3)],
        "product_id": ["P1", "P1"],
        "quantity_sold": [10.0, 20.0],
        "unit_price": [15.0, 15.0],
        "revenue": [150.0, 300.0],
        "is_promotion": [False, False]
    }
    df = pd.DataFrame(data)
    daily = build_daily_time_series(df, product_id="P1")

    # Should have 3 consecutive days (Jan 1, Jan 2, Jan 3)
    assert len(daily) == 3
    # Jan 2 should have quantity 0
    jan2 = daily[daily["date"] == pd.Timestamp("2026-01-02")]
    assert len(jan2) == 1
    assert jan2["quantity_sold"].iloc[0] == 0.0


def test_no_data_leakage_in_features():
    # Verify that rolling mean shifted by 1 does NOT contain current day's quantity
    dates = pd.date_range("2026-01-01", periods=10, freq="D")
    df = pd.DataFrame({
        "date": dates,
        "quantity_sold": [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0],
        "unit_price": [5.0] * 10,
        "is_promotion": [0] * 10
    })
    featured = generate_features(df)
    
    # On day index 1 (date 2026-01-02, qty 20.0), rolling_mean_7 should equal lag_1 which is 10.0 (NOT (10+20)/2)
    row_1 = featured.iloc[1]
    assert row_1["rolling_mean_7"] == 10.0
    assert row_1["lag_1"] == 10.0


def test_train_and_evaluate_all_models():
    # Create 90 days of synthetic continuous daily sales
    np.random.seed(42)
    dates = pd.date_range("2026-01-01", periods=90, freq="D")
    base_demand = 15.0
    # Add weekly pattern
    qty = [max(1.0, base_demand + (5.0 if d.weekday() in [5, 6] else 0.0) + np.random.normal(0, 2)) for d in dates]
    
    df = pd.DataFrame({
        "date": dates,
        "sale_date": [d.date() for d in dates],
        "quantity_sold": qty,
        "unit_price": [25.0] * 90,
        "revenue": [q * 25.0 for q in qty],
        "is_promotion": [0] * 90
    })

    models, metrics, best_model = train_and_evaluate_all_models(df, test_days=14)

    assert "baseline" in metrics
    assert "sarimax" in metrics
    assert "random_forest" in metrics
    assert "xgboost" in metrics

    for m_name, m_res in metrics.items():
        assert m_res["mae"] >= 0.0
        assert m_res["rmse"] >= 0.0
        assert m_res["wape"] >= 0.0

    assert best_model in ["baseline", "sarimax", "random_forest", "xgboost"]


def test_forecast_horizon_generation():
    dates = pd.date_range("2026-01-01", periods=60, freq="D")
    df = pd.DataFrame({
        "date": dates,
        "sale_date": [d.date() for d in dates],
        "quantity_sold": [10.0 + (i % 7) for i in range(60)],
        "unit_price": [20.0] * 60,
        "revenue": [200.0] * 60,
        "is_promotion": [0] * 60
    })

    preds = generate_future_forecast(df, model_name="xgboost", horizon_days=14)
    assert len(preds) == 14
    for p in preds:
        assert "date" in p
        assert p["predicted_quantity"] >= 0.0
        assert p["upper_bound"] >= p["predicted_quantity"]
        assert p["predicted_quantity"] >= p["lower_bound"]
