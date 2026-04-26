from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/predict", tags=["predict"])

# Services will be injected
ml_service = None
simulation_service = None


def set_ml_service(ms):
    global ml_service
    ml_service = ms


def set_simulation_service(ss):
    global simulation_service
    simulation_service = ss


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


class SimulatorRequest(BaseModel):
    genres: List[str]
    budget: float
    runtime: int
    release_month: int


@router.post("/simulator")
async def predict_simulator(request: SimulatorRequest):
    """Data-driven producer-focused simulation"""
    try:
        result = simulation_service.simulate(
            genres=request.genres,
            user_budget_cr=request.budget,
            runtime=request.runtime,
            release_month=request.release_month
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/movie")
async def predict_movie_simulator(request: SimulatorRequest):
    """Specific endpoint for simulator with heuristic adjustment layer"""
    try:
        # Join genres for the ML model
        genre_str = "|".join(request.genres)
        
        # Use existing ML prediction with safe defaults
        result = ml_service.predict(
            genre=genre_str,
            budget=request.budget,
            year=2024,
            imdb_rating=6.5,
            runtime=request.runtime
        )
        
        # Get base hit probability from ML model (normalized to 0-1)
        probs_ml = result.get('probabilities', {})
        base_hit = float(probs_ml.get('Hit', 60.0)) / 100
        
        # --- Heuristic Adjustment Layer ---
        
        # Genre impact
        if any("Action" in g for g in request.genres):
            base_hit += 0.15
        elif any("Drama" in g for g in request.genres):
            base_hit += 0.05
            
        # Budget impact (budget is in Cr)
        if request.budget > 70:
            base_hit -= 0.15
        elif request.budget < 40:
            base_hit += 0.1
            
        # Runtime impact
        if request.runtime > 160:
            base_hit -= 0.1
        elif 100 <= request.runtime <= 140:
            base_hit += 0.1
            
        # Release window impact
        if request.release_month == 12: # December
            base_hit += 0.15
        elif request.release_month == 2: # February
            base_hit -= 0.1

        # --- Final Probability Calculation ---
        hit_prob = max(0.05, min(0.9, base_hit))
        avg_prob = max(0.05, 1 - hit_prob - 0.2)
        flop_prob = 1 - hit_prob - avg_prob
        
        # Update response keys for frontend
        result['hit_probability'] = round(hit_prob, 4)
        result['average_probability'] = round(avg_prob, 4)
        result['flop_probability'] = round(flop_prob, 4)
        
        # Update internal probabilities dict for consistency
        result['probabilities'] = {
            "Hit": round(hit_prob * 100, 2),
            "Average": round(avg_prob * 100, 2),
            "Flop": round(flop_prob * 100, 2)
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
