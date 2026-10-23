"""
RetailSense FastAPI Main Application.
Provides RESTful APIs for sales forecasting, model evaluation, and inventory intelligence.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db.session import engine, Base, SessionLocal
from app.api import sales, forecasts, inventory, analytics, models_api
from app.services.data_service import seed_sample_retail_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("retailsense")

# Automatically create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and auto-seed if clean database
    logger.info("Initializing RetailSense backend services...")
    db = SessionLocal()
    try:
        # Auto-seed if database has no sales yet
        from app.models.db_models import Sale
        count = db.query(Sale).count()
        if count == 0:
            logger.info("Fresh database detected. Auto-seeding realistic sample retail data...")
            seed_sample_retail_data(db, num_days=365)
            logger.info("Sample retail data seeded successfully.")
    except Exception as e:
        logger.warning(f"Startup check warning: {e}")
    finally:
        db.close()
    yield
    logger.info("RetailSense backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Sales Forecasting and Decision-Support System",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service and database connectivity."""
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "supported_models": ["baseline", "sarimax", "random_forest", "xgboost"]
    }

# Register API Routers
app.include_router(sales.router, prefix=settings.API_V1_STR)
app.include_router(forecasts.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(models_api.router, prefix=settings.API_V1_STR)
