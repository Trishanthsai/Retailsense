"""
Application configuration for RetailSense
Supports environment variables with sensible defaults for local development (SQLite)
and production / Docker (PostgreSQL).
"""
import os

class Settings:
    PROJECT_NAME: str = "RetailSense Intelligent Sales Forecasting"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database URL: default to SQLite for instant local execution, or PostgreSQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./retailsense.db"
    )
    
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Default parameters
    DEFAULT_LEAD_TIME_DAYS: int = 7
    DEFAULT_SERVICE_LEVEL: float = 0.95  # z = 1.645
    DEFAULT_HORIZON_DAYS: int = 30

settings = Settings()
