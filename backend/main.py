from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services.data_service import DataService
from services.ml_service import MLService
from routes import dashboard, genre, risk, combinations, predict, movies

# Global services
data_service = None
ml_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global data_service, ml_service
    
    print("🚀 Starting CineIntel Backend...")
    
    # Load data
    data_service = DataService()
    
    # Train ML model
    ml_service = MLService(data_service)
    
    # Inject services into routes
    dashboard.set_data_service(data_service)
    genre.set_data_service(data_service)
    risk.set_data_service(data_service)
    combinations.set_data_service(data_service)
    movies.set_data_service(data_service)
    predict.set_ml_service(ml_service)
    
    print("✅ CineIntel Backend Ready!")
    
    yield
    
    print("🛑 Shutting down CineIntel Backend...")


# Create FastAPI app
app = FastAPI(
    title="CineIntel API",
    description="Bollywood Investment Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router)
app.include_router(genre.router)
app.include_router(risk.router)
app.include_router(combinations.router)
app.include_router(predict.router)
app.include_router(movies.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CineIntel API - Bollywood Investment Intelligence Platform",
        "version": "1.0.0",
        "status": "operational",
        "data_loaded": data_service is not None,
        "ml_model_ready": ml_service is not None,
        "endpoints": {
            "dashboard": "/api/dashboard/*",
            "genre": "/api/genre/*",
            "risk": "/api/risk/*",
            "combinations": "/api/combinations",
            "predict": "/api/predict"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "data_service": data_service is not None,
            "ml_service": ml_service is not None,
            "model_accuracy": round(ml_service.model_accuracy, 4) if ml_service else 0
        }
    }

# --- New SaaS Endpoints ---

@app.get("/api/model/transparency")
async def get_model_transparency():
    """Get model transparency metrics"""
    if not ml_service:
        return {"error": "ML Service not initialized"}
    return ml_service.get_model_transparency()

@app.post("/api/predict/compare")
async def compare_plans(plans: dict):
    """Compare two investment plans"""
    if not ml_service:
        return {"error": "ML Service not initialized"}
    
    # Expecting { "plan_a": {...}, "plan_b": {...} }
    return ml_service.compare_investment_plans(plans.get('plan_a'), plans.get('plan_b'))

@app.get("/api/dashboard/strategic-insight")
async def get_strategic_insight():
    """Get AI strategic insight"""
    if not data_service:
        return {"error": "Data Service not initialized"}
    return data_service.get_strategic_insight()

@app.get("/api/dashboard/capital-allocation")
async def get_capital_allocation():
    """Get capital allocation strategy"""
    if not data_service:
        return {"error": "Data Service not initialized"}
    return data_service.get_capital_allocation_strategy()

@app.post("/api/report/export")
async def export_report(data: dict):
    """Generate export report (Mock)"""
    # In a real app, this would generate a PDF
    return {
        "status": "success", 
        "message": "Report generation initiated.",
        "download_url": "#" 
    }
