"""
API integration tests using FastAPI TestClient.
Tests Section 19 (Endpoints and Functional Requirements).
"""
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, engine, Base
from app.services.data_service import seed_sample_retail_data

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_sample_retail_data(db, num_days=90)
    db.close()
    yield


def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "supported_models" in data
    assert "baseline" in data["supported_models"]


def test_products_endpoint():
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)
    assert len(products) > 0
    first = products[0]
    assert "product_id" in first
    assert "product_name" in first
    assert "unit_price" in first


def test_analytics_summary_endpoint():
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    summary = response.json()
    assert "total_revenue" in summary
    assert "total_units_sold" in summary
    assert "top_products" in summary
    assert "category_breakdown" in summary
    assert "recent_trend" in summary
    assert summary["total_revenue"] >= 0


def test_inventory_risks_endpoint():
    response = client.get("/api/v1/inventory/risks")
    assert response.status_code == 200
    risks = response.json()
    assert isinstance(risks, list)
    assert len(risks) > 0
    first = risks[0]
    assert "risk_level" in first
    assert "reorder_point" in first
    assert "safety_stock" in first
    assert "recommended_order_quantity" in first


def test_forecast_generation_endpoint():
    # Trigger forecast generation for one product
    payload = {
        "product_ids": ["PRD-HEADPHONES"],
        "horizon_days": 14,
        "models": ["baseline", "sarimax", "random_forest", "xgboost"]
    }
    response = client.post("/api/v1/forecasts/generate", json=payload)
    assert response.status_code == 200
    forecasts = response.json()
    assert len(forecasts) >= 1
    fc = forecasts[0]
    assert fc["product_id"] == "PRD-HEADPHONES"
    assert fc["horizon_days"] == 14
    assert len(fc["points"]) > 14  # Includes history anchors + 14 future points
    assert "metrics" in fc


def test_model_evaluations_endpoint():
    response = client.get("/api/v1/models/evaluations")
    assert response.status_code == 200
    evals = response.json()
    assert isinstance(evals, list)
    if len(evals) > 0:
        first = evals[0]
        assert "mae" in first
        assert "rmse" in first
        assert "wape" in first


def test_csv_upload_validation():
    # Valid CSV
    csv_content = (
        "sale_date,product_id,product_name,category,store_id,quantity_sold,unit_price\n"
        "2026-02-01,TEST-PROD-99,Test Item,Electronics,STR-01,15,49.99\n"
        "2026-02-02,TEST-PROD-99,Test Item,Electronics,STR-01,20,49.99\n"
    )
    files = {"file": ("test_sales.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/v1/sales/import", files=files)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["imported_rows"] == 2

    # Invalid file extension
    files_bad = {"file": ("test.txt", io.BytesIO(b"random text"), "text/plain")}
    response_bad = client.post("/api/v1/sales/import", files=files_bad)
    assert response_bad.status_code == 400
