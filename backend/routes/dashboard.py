from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Data service will be injected
data_service = None


def set_data_service(ds):
    global data_service
    data_service = ds


@router.get("/summary")
async def get_dashboard_summary():
    """Get dashboard KPI summary"""
    try:
        return data_service.get_dashboard_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai-recommendation")
async def get_ai_recommendation():
    """Get AI-generated recommendation"""
    try:
        return data_service.get_ai_recommendation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budget-optimization")
async def get_budget_optimization(genre: str, budget: float):
    """Get budget optimization suggestion"""
    try:
        return data_service.get_budget_optimization(genre, budget)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/release-timing")
async def get_release_timing(genre: str):
    """Get release timing suggestions"""
    try:
        return data_service.get_release_timing(genre)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market-pulse")
async def get_market_pulse():
    """Get AI Market Pulse"""
    try:
        return data_service.get_market_pulse()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-performers")
async def get_top_performers(limit: int = 12):
    """Get top performing movies"""
    try:
        return data_service.get_top_performing_movies(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
