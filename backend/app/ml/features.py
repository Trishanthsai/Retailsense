"""
Feature engineering for time-series and tabular forecasting models.
Implements Section 13.3 (Lag, Rolling, Calendar, Price and Promo Features).
Enforces zero data leakage: all rolling features are shifted by 1.
"""
import pandas as pd
import numpy as np
from typing import List, Tuple

FEATURE_COLUMNS = [
    "day_of_week",
    "day_of_month",
    "month",
    "is_weekend",
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_21",
    "lag_28",
    "rolling_mean_7",
    "rolling_std_7",
    "rolling_mean_14",
    "rolling_mean_28",
    "unit_price",
    "is_promotion",
]

def generate_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs calendar, lagged, and strictly past-shifted rolling window statistics.
    Expects df with columns: date (datetime), quantity_sold, unit_price, is_promotion.
    """
    data = df.sort_values("date").copy()

    # 1. Calendar Features
    try:
        data["day_of_week"] = data["date"].dt.day_of_week
    except AttributeError:
        data["day_of_week"] = data["date"].dt.dayofweek
    data["day_of_month"] = data["date"].dt.day
    data["month"] = data["date"].dt.month
    data["is_weekend"] = data["day_of_week"].isin([5, 6]).astype(int)

    # 2. Lagged Target Features
    data["lag_1"] = data["quantity_sold"].shift(1)
    data["lag_7"] = data["quantity_sold"].shift(7)
    data["lag_14"] = data["quantity_sold"].shift(14)
    data["lag_21"] = data["quantity_sold"].shift(21)
    data["lag_28"] = data["quantity_sold"].shift(28)

    # 3. Rolling Statistics (Shifted by 1 to strictly prevent lookahead leakage)
    data["rolling_mean_7"] = data["quantity_sold"].shift(1).rolling(window=7, min_periods=1).mean()
    data["rolling_std_7"] = data["quantity_sold"].shift(1).rolling(window=7, min_periods=1).std().fillna(0.0)
    data["rolling_mean_14"] = data["quantity_sold"].shift(1).rolling(window=14, min_periods=1).mean()
    data["rolling_mean_28"] = data["quantity_sold"].shift(1).rolling(window=28, min_periods=1).mean()

    # Ensure promotion & price exist
    if "is_promotion" not in data.columns:
        data["is_promotion"] = 0
    else:
        data["is_promotion"] = data["is_promotion"].astype(int)

    if "unit_price" not in data.columns:
        data["unit_price"] = 1.0

    return data


def prepare_supervised_data(
    df: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """
    Prepares X and y matrices for ML training by generating features and dropping initial NaN lag rows.
    Returns:
        X: DataFrame of feature predictors
        y: Series of target quantities
        data_clean: cleaned DataFrame with date index preserved
    """
    featured = generate_features(df)
    
    # Drop initial rows where 28-day lag is NaN
    clean_data = featured.dropna(subset=["lag_28"]).copy()
    
    X = clean_data[FEATURE_COLUMNS].copy()
    y = clean_data["quantity_sold"].copy()

    return X, y, clean_data
