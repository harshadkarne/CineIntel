from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/api/movies", tags=["movies"])

# Data service will be injected
data_service = None

def set_data_service(ds):
    global data_service
    data_service = ds

@router.get("/explore")
async def explore_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    genre: Optional[str] = None,
    success_label: Optional[str] = None,
    sort_by: str = "roi",
    sort_order: str = "desc"
):
    """Explore movies with filtering, searching, and pagination"""
    try:
        if not data_service:
            raise HTTPException(status_code=500, detail="Data Service not initialized")
        return await data_service.get_filtered_movies(
            page=page,
            limit=limit,
            search=search,
            genre=genre,
            success_label=success_label,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
