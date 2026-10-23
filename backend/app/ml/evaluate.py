"""
Model evaluation metrics for sales forecasting.
Implements Section 15:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Weighted Absolute Percentage Error (WAPE)
"""
import numpy as np

def calculate_mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Error: average absolute difference between actual and predicted."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return 0.0
    return float(np.mean(np.abs(y_true - y_pred)))


def calculate_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Root Mean Squared Error: penalizes large errors quadratically."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return 0.0
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def calculate_wape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Weighted Absolute Percentage Error (WAPE):
    WAPE = (sum |y_i - y_hat_i| / sum y_i) * 100
    Provides a standardized metric resilient to low/zero sales periods.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    total_actual = np.sum(y_true)
    if total_actual == 0:
        return 0.0 if np.all(y_pred == 0) else 100.0
    total_abs_error = np.sum(np.abs(y_true - y_pred))
    return float((total_abs_error / total_actual) * 100.0)


def evaluate_forecast(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Computes all evaluation metrics in one call."""
    # Ensure non-negative predictions for sales
    y_pred_clipped = np.clip(y_pred, 0, None)
    return {
        "mae": round(calculate_mae(y_true, y_pred_clipped), 3),
        "rmse": round(calculate_rmse(y_true, y_pred_clipped), 3),
        "wape": round(calculate_wape(y_true, y_pred_clipped), 2),
    }
