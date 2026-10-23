"""
Future multi-step forecast generation across configured horizons (7, 14, 30, 90 days).
Supports Baseline, SARIMAX, Random Forest, and XGBoost with recursive feature updating.
"""
import datetime
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

from app.ml.features import FEATURE_COLUMNS, generate_features, prepare_supervised_data
from app.ml.train import BaselineForecaster, SarimaxForecaster

def generate_future_forecast(
    daily_df: pd.DataFrame,
    model_name: str,
    horizon_days: int = 30
) -> List[Dict[str, Any]]:
    """
    Produces out-of-sample future predictions for `horizon_days` ahead.
    Returns list of dicts with:
    - date (YYYY-MM-DD)
    - predicted_quantity
    - lower_bound (90% confidence lower bound)
    - upper_bound (90% confidence upper bound)
    """
    if daily_df.empty:
        return []

    df = daily_df.sort_values("date").copy()
    last_date = df["date"].max()
    future_dates = [last_date + datetime.timedelta(days=i) for i in range(1, horizon_days + 1)]
    
    # Calculate historical standard deviation for prediction intervals
    daily_std = float(df["quantity_sold"].std()) if len(df) > 1 else 1.0
    if np.isnan(daily_std) or daily_std == 0:
        daily_std = 1.0

    predictions = []

    if model_name == "baseline":
        forecaster = BaselineForecaster()
        forecaster.fit(df["quantity_sold"])
        preds = forecaster.predict(steps=horizon_days)

    elif model_name == "sarimax":
        forecaster = SarimaxForecaster()
        forecaster.fit(df["quantity_sold"])
        preds = forecaster.predict(steps=horizon_days)

    elif model_name in ["random_forest", "xgboost"]:
        # Fit model on entire available historical record
        X, y, clean_df = prepare_supervised_data(df)
        
        if model_name == "random_forest":
            model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
        else:
            model = XGBRegressor(n_estimators=120, max_depth=5, learning_rate=0.08, random_state=42, n_jobs=-1)
        
        if len(X) > 0:
            model.fit(X, y)
            
            # Recursive multi-step generation
            running_df = df.copy()
            preds = []
            
            for f_date in future_dates:
                # Construct temporary next row
                next_row = pd.DataFrame([{
                    "date": f_date,
                    "sale_date": f_date.date(),
                    "quantity_sold": 0.0,
                    "unit_price": df["unit_price"].iloc[-1],
                    "is_promotion": 0
                }])
                temp_df = pd.concat([running_df, next_row], ignore_index=True)
                
                # Compute features for the next row
                featured_temp = generate_features(temp_df)
                next_x = featured_temp.iloc[[-1]][FEATURE_COLUMNS]
                
                # Predict next step
                step_pred = float(np.maximum(model.predict(next_x)[0], 0.0))
                preds.append(step_pred)
                
                # Update running_df with the predicted value so future lags see it
                next_row["quantity_sold"] = step_pred
                running_df = pd.concat([running_df, next_row], ignore_index=True)
            
            preds = np.array(preds)
        else:
            # Fallback to naive if not enough history for 28 lags
            forecaster = BaselineForecaster()
            forecaster.fit(df["quantity_sold"])
            preds = forecaster.predict(steps=horizon_days)
    else:
        # Default fallback
        forecaster = BaselineForecaster()
        forecaster.fit(df["quantity_sold"])
        preds = forecaster.predict(steps=horizon_days)

    # Build forecast points with confidence bands (Z=1.645 for ~90% interval)
    for idx, (f_date, pred_val) in enumerate(zip(future_dates, preds)):
        pred_val = round(float(pred_val), 2)
        # Uncertainty grows slightly with horizon
        horizon_uncertainty = daily_std * 1.645 * np.sqrt(1 + (idx / horizon_days))
        lower_bound = max(0.0, round(pred_val - horizon_uncertainty, 2))
        upper_bound = round(pred_val + horizon_uncertainty, 2)

        predictions.append({
            "date": f_date.strftime("%Y-%m-%d"),
            "predicted_quantity": pred_val,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound
        })

    return predictions
