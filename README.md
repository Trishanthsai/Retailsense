# RetailSense — Intelligent Sales Forecasting & Decision-Support System

**Project Domain:** Machine Learning, Predictive Analytics & Full-Stack Enterprise Development  
**Project Level:** Medium-Advanced  
**Technology Stack:** Python, Pandas, Scikit-learn, XGBoost, Statsmodels, FastAPI, PostgreSQL / SQLite, React, TypeScript, Tailwind CSS, Recharts, and Docker.

---

## 1. Project Overview & Architecture

RetailSense is an enterprise-grade demand forecasting and decision-support platform designed to transform raw historical sales records into multi-horizon demand estimates and prescriptive replenishment recommendations. 

Traditional spreadsheet calculations and static moving averages fail to adapt to complex calendar seasonality, promotions, and price elasticity. RetailSense eliminates these bottlenecks through comparative machine learning, chronological validation (zero future data leakage), and automated safety-stock calculations.

```
              RETAIL SALES DATA
       Transactions, Products, Inventory
                     │
                     ▼
        ┌───────────────────────────┐
        │ Data Ingestion & Cleaning │
        │ Validation and Processing │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Feature Engineering       │
        │ Lag, Rolling, Calendar    │
        │ and Price Features        │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Forecasting Engine        │
        │                           │
        │ Baseline / SARIMAX        │
        │ Random Forest / XGBoost   │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Evaluation & Selection    │
        │ MAE, RMSE, WAPE           │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ FastAPI Backend           │
        │ Business Logic and APIs   │
        └──────┬─────────────┬──────┘
               │             │
        ┌──────▼──────┐ ┌────▼───────────┐
        │ PostgreSQL  │ │ Inventory      │
        │ Data Store  │ │ Insight Engine │
        └──────┬──────┘ └────┬───────────┘
               │             │
               └──────┬──────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ React + TypeScript UI     │
        │ Forecasts & Analytics     │
        └───────────────────────────┘
```

---

## 2. Directory Structure

```text
bda project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics.py        # Sales KPIs and summary endpoints
│   │   │   ├── forecasts.py        # Multi-model forecast execution & retrieval
│   │   │   ├── inventory.py        # Stockout risks, ROP & replenishment API
│   │   │   ├── models_api.py       # Model evaluation leaderboard API
│   │   │   └── sales.py            # Sales filtering, CSV upload & DB seeding
│   │   ├── db/
│   │   │   └── session.py          # SQLAlchemy session & SQLite/Postgres engine
│   │   ├── ml/
│   │   │   ├── evaluate.py         # MAE, RMSE, WAPE evaluation metrics
│   │   │   ├── features.py         # Lag (1-28d), shifted rolling stats, calendar
│   │   │   ├── predict.py          # Recursive multi-step horizon forecaster
│   │   │   ├── preprocessing.py    # Cleaning, gap filling, chronological split
│   │   │   └── train.py            # Baseline, SARIMAX, RF & XGBoost training
│   │   ├── models/
│   │   │   └── db_models.py        # Products, Stores, Sales, Inventory, Forecasts
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic V2 validation schemas
│   │   ├── services/
│   │   │   ├── data_service.py     # Ingestion, seeding & KPI aggregation
│   │   │   ├── forecast_service.py # Forecasting pipeline coordination
│   │   │   └── inventory_service.py# Safety stock & reorder point calculations
│   │   ├── tests/
│   │   │   ├── test_api.py         # FastAPI endpoint integration tests
│   │   │   ├── test_inventory.py   # Inventory formula verification tests
│   │   │   └── test_ml.py          # Zero-leakage, metric & model tests
│   │   ├── config.py               # Application settings & environment vars
│   │   └── main.py                 # FastAPI application lifecycle & CORS
│   ├── data/
│   │   └── sample_retail_data.csv  # 1,438-row pre-generated benchmark dataset
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.tsx          # Responsive navigation & API status
│   │   ├── pages/
│   │   │   ├── DataManagementTab.tsx       # CSV upload, template & sandbox
│   │   │   ├── ForecastExplorerTab.tsx     # Actual vs Predicted + 90% bands
│   │   │   ├── InventoryIntelligenceTab.tsx# Reorder point & stockout alerts
│   │   │   ├── ModelComparisonTab.tsx      # Leaderboard (MAE, RMSE, WAPE)
│   │   │   ├── OverviewTab.tsx             # Executive KPIs & 60-day trajectory
│   │   │   └── SalesAnalysisTab.tsx        # Filterable historical sales table
│   │   ├── services/
│   │   │   └── api.ts              # REST API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml              # PostgreSQL + Backend + Frontend
├── .env.example
├── run_tests.bat                   # One-click test runner
├── start_backend.bat               # One-click backend server launcher
├── start_frontend.bat              # One-click frontend dev launcher
└── README.md
```

---

## 3. Machine Learning & Forecasting Methodology

RetailSense evaluates 4 candidate models side-by-side using chronological validation without future leakage:

1. **Baseline Model (Seasonal Naive):**  
   Tiles 7-day cyclical sales patterns and rolling averages as the benchmark reference.
2. **Statistical Model (SARIMAX):**  
   State-space autoregressive model with weekly seasonal order `(1, 1, 1) x (1, 0, 0, 7)` capturing cyclical autocorrelation.
3. **Random Forest Regressor:**  
   Non-linear ensemble model with 100 decision trees trained on 15 calendar, lag, and shifted rolling statistics.
4. **Gradient Boosting (XGBoost):**  
   High-performance gradient-boosted decision trees (`XGBRegressor`) capturing subtle price elasticity and multi-week interaction effects.

### Multi-Horizon Forecast Generation
Supports configurable planning horizons: **7, 14, 30, and 90 days** ahead. Future lag features are iteratively populated through recursive multi-step forecasting with expanding 90% confidence bands.

### Error Evaluation Metrics
- **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{n} \sum_{i=1}^n |y_i - \hat{y}_i|$
- **Root Mean Squared Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^n (y_i - \hat{y}_i)^2}$
- **Weighted Absolute Percentage Error (WAPE):** $\text{WAPE} = \frac{\sum_i |y_i - \hat{y}_i|}{\sum_i y_i} \times 100\%$

The winning model with the lowest WAPE is automatically selected for operational forecasts.

---

## 4. Prescriptive Inventory Intelligence

RetailSense directly translates demand run-rates into replenishment instructions:

$$\text{Reorder Point (ROP)} = \mu_L + \text{SS} = (\mu_d \times L) + \text{SS}$$

$$\text{Safety Stock (SS)} = z \cdot \sigma_d \cdot \sqrt{L}$$

$$\text{Days of Supply (DOS)} = \frac{\text{Current Stock}}{\mu_d}$$

Where:
- $\mu_d$: Estimated average daily demand
- $L$: Supplier replenishment lead time in days
- $\sigma_d$: Standard deviation of daily demand
- $z$: Normal distribution quantile for target service level ($z = 1.645$ for 95% service level)

### Automated Risk Tiers:
- **Critical Stockout:** Stock $\le 3$ days of supply or stockout imminent.
- **Reorder Triggered:** Current Stock $\le \text{ROP}$.
- **Optimal / Balanced:** Stock maintains target service level buffer.
- **Excess Capital:** Inventory exceeds 60 days of forward demand.

---

## 5. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Healthcheck & active model engine verification |
| `GET` | `/api/v1/sales` | Filter sales by product, store, and date range |
| `POST` | `/api/v1/sales/import` | Validate and ingest CSV sales transactions |
| `GET` | `/api/v1/analytics/summary` | Aggregate revenue, units, and 60-day trajectory |
| `POST` | `/api/v1/forecasts/generate` | Run comparative model training & produce forecast |
| `GET` | `/api/v1/forecasts` | List historical forecast execution runs |
| `GET` | `/api/v1/forecasts/{id}` | Retrieve forecast points with confidence bands |
| `GET` | `/api/v1/models/evaluations` | Model leaderboard error comparison |
| `GET` | `/api/v1/inventory/risks` | Safety stock, ROP, and replenishment orders |
| `POST` | `/api/v1/seed` | Populate database with 365-day retail benchmark data |

---

## 6. How to Run

### Method A: One-Click Launchers (Windows)
1. **Start Backend:** Double-click `start_backend.bat` (runs FastAPI on `http://localhost:8000`).
2. **Start Frontend:** Double-click `start_frontend.bat` (runs Vite dev server on `http://localhost:5173`).
3. Open `http://localhost:5173` in your browser.

### Method B: Manual Command Line

**Backend:**
```bash
cd backend
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger documentation available at: `http://localhost:8000/docs`

**Frontend:**
```bash
cd frontend
npm run dev
```

### Method C: Docker Compose (PostgreSQL + Backend + Frontend)
```bash
docker-compose up --build
```
- Web Dashboard: `http://localhost:3000`
- API Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 7. Running the Automated Test Suite

Run the 14 automated unit and API integration tests:

```bash
cd backend
py -m pytest -v
```

Or double-click `run_tests.bat`.

All 14 tests verify:
- Feature generation with shifted rolling statistics (zero future lookahead leakage)
- Chronological dataset splitting
- Correctness of MAE, RMSE, and WAPE formulas
- Safety stock and Reorder Point calculations
- Full FastAPI endpoint lifecycle with CSV import validation
