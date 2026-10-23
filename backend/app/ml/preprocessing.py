"""
Data cleaning, validation, and chronological splitting for retail sales.
Implements Section 13 (Data Cleaning & Chronological Splitting).
"""
import pandas as pd
import numpy as np
from typing import Tuple, Optional

REQUIRED_COLUMNS = ["sale_date", "product_id", "quantity_sold", "unit_price"]

def clean_and_validate_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, list]:
    """
    Validates input dataframe against schema rules:
    - Checks required columns
    - Drops duplicates
    - Parses dates
    - Removes invalid negative or non-numeric quantities
    """
    errors = []
    
    # Check missing required columns
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns in dataset: {missing_cols}")
    
    df_clean = df.copy()

    # Convert dates
    try:
        df_clean["sale_date"] = pd.to_datetime(df_clean["sale_date"]).dt.date
    except Exception as e:
        errors.append(f"Date conversion error: {str(e)}")
        df_clean["sale_date"] = pd.to_datetime(df_clean["sale_date"], errors="coerce").dt.date
        df_clean = df_clean.dropna(subset=["sale_date"])

    # Clean numeric fields
    df_clean["quantity_sold"] = pd.to_numeric(df_clean["quantity_sold"], errors="coerce")
    df_clean["unit_price"] = pd.to_numeric(df_clean["unit_price"], errors="coerce")
    
    # Flag invalid quantities
    invalid_rows = df_clean["quantity_sold"].isna() | (df_clean["quantity_sold"] < 0)
    if invalid_rows.any():
        errors.append(f"Filtered out {invalid_rows.sum()} rows with invalid/negative quantity_sold")
        df_clean = df_clean[~invalid_rows]

    # Flag invalid prices
    invalid_price = df_clean["unit_price"].isna() | (df_clean["unit_price"] < 0)
    if invalid_price.any():
        errors.append(f"Filtered out {invalid_price.sum()} rows with invalid unit_price")
        df_clean = df_clean[~invalid_price]

    # Calculate revenue if missing
    if "revenue" not in df_clean.columns or df_clean["revenue"].isna().any():
        df_clean["revenue"] = df_clean["quantity_sold"] * df_clean["unit_price"]

    # Promotion indicator default
    if "is_promotion" not in df_clean.columns:
        df_clean["is_promotion"] = False
    else:
        df_clean["is_promotion"] = df_clean["is_promotion"].astype(bool)

    # Remove exact duplicate sales records
    before_dups = len(df_clean)
    df_clean = df_clean.drop_duplicates(subset=["sale_date", "product_id", "store_id"] if "store_id" in df_clean.columns else ["sale_date", "product_id"])
    if len(df_clean) < before_dups:
        errors.append(f"Removed {before_dups - len(df_clean)} duplicate rows")

    return df_clean, errors


def build_daily_time_series(df: pd.DataFrame, product_id: Optional[str] = None) -> pd.DataFrame:
    """
    Aggregates transactions into a continuous daily time series for a product.
    Fills zero-sales days with 0 instead of dropping them, preventing irregular intervals.
    """
    df_prod = df.copy()
    if product_id is not None:
        df_prod = df_prod[df_prod["product_id"] == product_id]

    if df_prod.empty:
        return pd.DataFrame(columns=["date", "quantity_sold", "unit_price", "is_promotion"])

    # Aggregate daily
    daily = df_prod.groupby("sale_date").agg({
        "quantity_sold": "sum",
        "revenue": "sum",
        "unit_price": "mean",
        "is_promotion": "max"
    }).reset_index()

    daily["date"] = pd.to_datetime(daily["sale_date"])
    daily = daily.sort_values("date").set_index("date")

    # Create full continuous date range
    min_date = daily.index.min()
    max_date = daily.index.max()
    full_idx = pd.date_range(start=min_date, end=max_date, freq="D")

    daily = daily.reindex(full_idx)
    daily["quantity_sold"] = daily["quantity_sold"].fillna(0.0)
    daily["revenue"] = daily["revenue"].fillna(0.0)
    daily["unit_price"] = daily["unit_price"].ffill().bfill().fillna(10.0)
    daily["is_promotion"] = daily["is_promotion"].fillna(False).astype(int)

    daily = daily.reset_index().rename(columns={"index": "date"})
    daily["sale_date"] = daily["date"].dt.date
    if product_id:
        daily["product_id"] = product_id

    return daily


def chronological_split(
    df: pd.DataFrame, 
    test_days: int = 30
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits data chronologically.
    Last `test_days` are used as evaluation set.
    """
    df_sorted = df.sort_values("date").reset_index(drop=True)
    if len(df_sorted) <= test_days:
        # If dataset is too short, allocate 80% train / 20% test
        split_idx = int(len(df_sorted) * 0.8)
    else:
        split_idx = len(df_sorted) - test_days

    train_df = df_sorted.iloc[:split_idx].copy()
    test_df = df_sorted.iloc[split_idx:].copy()

    return train_df, test_df
