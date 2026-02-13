from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/predict", tags=["predict"])

# ML service will be injected
ml_service = None


def set_ml_service(ms):
    global ml_service
    ml_service = ms


class PredictionRequest(BaseModel):
    genre: str
    budget: float
    year: int
    imdb_rating: float
    runtime: int


@router.post("")
async def predict_movie_success(request: PredictionRequest):
    """Predict movie success and provide investment insights"""
    try:
        result = ml_service.predict(
            genre=request.genre,
            budget=request.budget,
            year=request.year,
            imdb_rating=request.imdb_rating,
            runtime=request.runtime
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
