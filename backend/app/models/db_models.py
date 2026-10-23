"""
SQLAlchemy ORM models for RetailSense.
Matches Section 18: Main Tables (Products, Stores, Sales, Inventory, Forecasts, Model Evaluations).
"""
import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Product(Base):
    __tablename__ = "products"

    product_id = Column(String(50), primary_key=True, index=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    unit_price = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    sales = relationship("Sale", back_populates="product", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="product", cascade="all, delete-orphan")


class Store(Base):
    __tablename__ = "stores"

    store_id = Column(String(50), primary_key=True, index=True)
    store_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)

    sales = relationship("Sale", back_populates="store", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="store", cascade="all, delete-orphan")


class Sale(Base):
    __tablename__ = "sales"

    sale_id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), nullable=False, index=True)
    store_id = Column(String(50), ForeignKey("stores.store_id"), nullable=True, index=True)
    sale_date = Column(Date, nullable=False, index=True)
    quantity_sold = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    revenue = Column(Float, nullable=False)
    is_promotion = Column(Boolean, default=False)

    product = relationship("Product", back_populates="sales")
    store = relationship("Store", back_populates="sales")

    __table_args__ = (
        Index("idx_sales_product_date", "product_id", "sale_date"),
        Index("idx_sales_date", "sale_date"),
    )


class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), ForeignKey("products.product_id"), nullable=False, index=True)
    store_id = Column(String(50), ForeignKey("stores.store_id"), nullable=True, index=True)
    stock_quantity = Column(Float, nullable=False, default=0.0)
    lead_time_days = Column(Integer, nullable=False, default=7)
    min_order_quantity = Column(Integer, nullable=False, default=10)
    service_level = Column(Float, nullable=False, default=0.95)
    last_updated = Column(DateTime, default=utc_now)

    product = relationship("Product", back_populates="inventory")
    store = relationship("Store", back_populates="inventory")

    __table_args__ = (
        Index("idx_inventory_product_store", "product_id", "store_id", unique=True),
    )


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    forecast_id = Column(String(100), index=True, nullable=False)
    product_id = Column(String(50), ForeignKey("products.product_id"), nullable=False, index=True)
    store_id = Column(String(50), ForeignKey("stores.store_id"), nullable=True)
    forecast_date = Column(Date, nullable=False, index=True)
    predicted_quantity = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    model_name = Column(String(50), nullable=False)
    model_version = Column(String(50), nullable=False)
    horizon_days = Column(Integer, nullable=False)
    generated_at = Column(DateTime, default=utc_now, nullable=False)

    product = relationship("Product", back_populates="forecasts")

    __table_args__ = (
        Index("idx_forecast_product_date", "product_id", "forecast_date"),
        Index("idx_forecast_run", "forecast_id"),
    )


class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    evaluation_id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(50), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    product_id = Column(String(50), nullable=True, index=True)
    evaluation_period = Column(String(100), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    wape = Column(Float, nullable=False)
    horizon_days = Column(Integer, nullable=False)
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
