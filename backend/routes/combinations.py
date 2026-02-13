from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/combinations", tags=["combinations"])

# Data service will be injected
data_service = None


def set_data_service(ds):
    global data_service
    data_service = ds


@router.get("")
async def get_genre_combinations():
    """Get genre combination analysis"""
    try:
        return data_service.get_genre_combinations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
