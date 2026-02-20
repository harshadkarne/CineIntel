from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

router = APIRouter(prefix="/api/genre", tags=["genre"])

# Data service will be injected
data_service = None


def set_data_service(ds):
    global data_service
    data_service = ds


@router.get("/popularity")
async def get_genre_popularity(
    year_start: Optional[int] = Query(None),
    year_end: Optional[int] = Query(None),
    genres: Optional[str] = Query(None)
):
    """Get genre popularity over time"""
    try:
        year_range = [year_start, year_end] if year_start and year_end else None
        genre_list = genres.split(',') if genres else None
        
        return data_service.get_genre_popularity_over_time(year_range, genre_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-by-year")
async def get_top_genres_by_year(year: int = Query(...)):
    """Get top 3 genres for a specific year"""
    try:
        return data_service.get_top_genres_by_year(year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue")
async def get_highest_grossing(
    year_start: Optional[int] = Query(None),
    year_end: Optional[int] = Query(None)
):
    """Get highest grossing genre per year"""
    try:
        year_range = [year_start, year_end] if year_start and year_end else None
        return data_service.get_highest_grossing_per_year(year_range)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/success-rate")
async def get_success_rate(genres: Optional[str] = Query(None)):
    """Get success rate by genre"""
    try:
        genre_list = genres.split(',') if genres else None
        return data_service.get_success_rate_by_genre(genre_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roi")
async def get_roi(genres: Optional[str] = Query(None)):
    """Get average ROI by genre"""
    try:
        genre_list = genres.split(',') if genres else None
        return data_service.get_roi_by_genre(genre_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def get_all_genres():
    """Get list of all genres"""
    try:
        return {"genres": data_service.get_all_genres()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/year-range")
async def get_year_range():
    """Get min and max years in dataset"""
    try:
        return data_service.get_year_range()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yearly")
async def get_genre_yearly():
    """Get yearly genre statistics"""
    try:
        return data_service.load_genre_yearly()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overall")
async def get_genre_overall():
    """Get overall genre statistics"""
    try:
        return data_service.load_genre_overall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmark")
async def get_benchmark(genre_a: str = Query(...), genre_b: str = Query(...)):
    """Compare two genres for benchmarking"""
    try:
        return data_service.get_benchmark_data(genre_a, genre_b)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
