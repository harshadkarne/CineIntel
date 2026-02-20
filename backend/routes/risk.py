from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/risk", tags=["risk"])

# Data service will be injected
data_service = None


def set_data_service(ds):
    global data_service
    data_service = ds


@router.get("/genre")
async def get_genre_risk():
    """Get risk analysis for all genres from statistics"""
    try:
        df = data_service.load_risk_data()
        return df.to_dict('records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis")
async def get_risk_analysis():
    """Get risk analysis for all genres"""
    try:
        risk_data = data_service.get_risk_analysis()
        
        # Calculate industry risk index (average risk score)
        avg_risk = sum(item['risk_score'] for item in risk_data) / len(risk_data)
        
        return {
            "genres": risk_data,
            "industry_risk_index": round(avg_risk, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
