"""
Model training and comparative evaluation across candidate algorithms:
- Baseline (Seasonal Naive)
- Statistical (SARIMAX / ARIMA)
- Machine Learning (Random Forest)
- Gradient Boosting (XGBoost)
Implements Section 14 (Methodology) and Section 15 (Evaluation).
"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from statsmodels.tsa.statespace.sarimax import SARIMAX

from app.ml.features import FEATURE_COLUMNS, generate_features, prepare_supervised_data
from app.ml.evaluate import evaluate_forecast
from app.ml.preprocessing import chronological_split

logger = logging.getLogger(__name__)

class BaselineForecaster:
    """Baseline Model: Seasonal Naive with 7-day periodicity or fallback to last 7-day rolling mean."""
    def __init__(self):
        self.last_observations = None
        self.rolling_mean = 0.0

    def fit(self, y: pd.Series):
        self.last_observations = y.values[-7:] if len(y) >= 7 else y.values
        self.rolling_mean = float(np.mean(self.last_observations)) if len(self.last_observations) > 0 else 0.0
        return self

    def predict(self, steps: int) -> np.ndarray:
        if len(self.last_observations) == 0:
            return np.zeros(steps)
        # Tile 7-day seasonality
        reps = int(np.ceil(steps / len(self.last_observations)))
        preds = np.tile(self.last_observations, reps)[:steps]
        return np.maximum(preds, 0.0)


class SarimaxForecaster:
    """Statistical Model: SARIMAX capturing weekly seasonality and autoregressive demand."""
    def __init__(self):
        self.model_res = None
        self.last_train_end = None
        self.fitted = False

    def fit(self, y: pd.Series):
        try:
            # Fit SARIMAX with weekly seasonal order (1, 0, 0, 7)
            # Enforce stationarity False prevents non-invertible matrix crashes on sparse data
            model = SARIMAX(
                y.values,
                order=(1, 1, 1),
                seasonal_order=(1, 0, 0, 7),
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            self.model_res = model.fit(disp=False, maxiter=50)
            self.fitted = True
        except Exception as e:
            logger.warning(f"SARIMAX full fit failed: {e}. Falling back to simple AR(1).")
            try:
                model = SARIMAX(y.values, order=(1, 1, 0), enforce_stationarity=False, enforce_invertibility=False)
                self.model_res = model.fit(disp=False, maxiter=30)
                self.fitted = True
            except Exception as e2:
                logger.error(f"Fallback AR(1) also failed: {e2}")
                self.fitted = False
        return self

    def predict(self, steps: int) -> np.ndarray:
        if not self.fitted or self.model_res is None:
            return np.zeros(steps)
        try:
            preds = self.model_res.forecast(steps=steps)
            return np.maximum(preds, 0.0)
        except Exception as e:
            logger.error(f"SARIMAX forecast failed: {e}")
            return np.zeros(steps)


def train_and_evaluate_all_models(
    daily_df: pd.DataFrame,
    test_days: int = 30
) -> Tuple[Dict[str, Any], Dict[str, Dict[str, float]], str]:
    """
    Splits time-series chronologically, fits all 4 candidate models,
    evaluates on test holdout, and identifies the best model by WAPE.
    Returns:
        models: dict of fitted model instances
        metrics: dict of {model_name: {mae, rmse, wape}}
        best_model_name: string
    """
    train_df, test_df = chronological_split(daily_df, test_days=test_days)
    y_test = test_df["quantity_sold"].values
    test_steps = len(y_test)

    fitted_models = {}
    eval_metrics = {}

    # 1. Baseline Model
    baseline = BaselineForecaster()
    baseline.fit(train_df["quantity_sold"])
    baseline_preds = baseline.predict(steps=test_steps)
    fitted_models["baseline"] = baseline
    eval_metrics["baseline"] = evaluate_forecast(y_test, baseline_preds)

    # 2. SARIMAX Statistical Model
    sarimax = SarimaxForecaster()
    sarimax.fit(train_df["quantity_sold"])
    sarimax_preds = sarimax.predict(steps=test_steps)
    fitted_models["sarimax"] = sarimax
    eval_metrics["sarimax"] = evaluate_forecast(y_test, sarimax_preds)

    # 3. Supervised Features for ML (Random Forest & XGBoost)
    featured_df = generate_features(daily_df)
    # Filter for training set rows where 28-day lag is ready
    train_mask = (featured_df["date"] <= train_df["date"].max()) & featured_df["lag_28"].notna()
    X_train = featured_df.loc[train_mask, FEATURE_COLUMNS]
    y_train = featured_df.loc[train_mask, "quantity_sold"]

    # Filter for test set rows
    test_mask = featured_df["date"] > train_df["date"].max()
    X_test = featured_df.loc[test_mask, FEATURE_COLUMNS]

    # --- Random Forest ---
    rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    if len(X_train) > 0 and len(X_test) == test_steps:
        rf.fit(X_train, y_train)
        rf_preds = np.maximum(rf.predict(X_test), 0.0)
    else:
        rf_preds = baseline_preds
    fitted_models["random_forest"] = rf
    eval_metrics["random_forest"] = evaluate_forecast(y_test, rf_preds)

    # --- XGBoost ---
    xgb = XGBRegressor(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1
    )
    if len(X_train) > 0 and len(X_test) == test_steps:
        xgb.fit(X_train, y_train)
        xgb_preds = np.maximum(xgb.predict(X_test), 0.0)
    else:
        xgb_preds = baseline_preds
    fitted_models["xgboost"] = xgb
    eval_metrics["xgboost"] = evaluate_forecast(y_test, xgb_preds)

    # Determine Best Model by lowest WAPE (fallback to MAE if WAPE tied)
    best_model_name = min(
        eval_metrics.keys(),
        key=lambda m: (eval_metrics[m]["wape"], eval_metrics[m]["mae"])
    )

    logger.info(f"Model comparison completed. Best model: {best_model_name} with WAPE: {eval_metrics[best_model_name]['wape']}%")
    return fitted_models, eval_metrics, best_model_name
