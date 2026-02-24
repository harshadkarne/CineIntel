import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from services.data_service import DataService

class DashboardService:
    """Service for calculating high-level investor metrics for the Executive Dashboard"""
    
    def __init__(self, data_service: DataService):
        self.data_service = data_service

    def get_dashboard_metrics(self) -> Dict:
        """Calculate refined producer-grade metrics for the Executive Dashboard"""
        movies_all = self.data_service.movies
        genre_stats_raw = self.data_service.genre_overall_stats
        
        if movies_all is None or movies_all.empty:
            return {}

        # 1. SCOPE & FILTERING
        # Use full dataset for "Scope" (5200+), but filter for financial analysis
        full_sample_count = len(movies_all)
        movies = movies_all[(movies_all['budget'] > 0) & (movies_all['box_office'] > 0)].copy()
        movies['roi'] = movies['roi'].clip(-5, 10)
        
        if movies.empty:
            return {"error": "No valid financial data available"}

        # 2. MARKET VELOCITY ENGINE (12-Month Rolling Delta)
        max_year = int(movies['year'].max())
        recent_year_roi = movies[movies['year'] == max_year]['roi'].mean() if not movies[movies['year'] == max_year].empty else 0
        prev_year_roi = movies[movies['year'] == max_year - 1]['roi'].mean() if not movies[movies['year'] == max_year - 1].empty else 0
        
        velocity_delta = recent_year_roi - prev_year_roi
        velocity_pct = ((recent_year_roi - prev_year_roi) / prev_year_roi * 100) if prev_year_roi > 0 else 0
        
        # Labeling for Velocity
        if velocity_delta < 0 and recent_year_roi > 1.2:
            velocity_label = "Short-term Cooling"
        elif velocity_delta > 0.2:
            velocity_label = "Accelerating"
        else:
            velocity_label = "Stable Momentum"

        # 3. 5-STAGE MARKET SENTIMENT ENGINE
        # Factors: ROI momentum (velocity), Hit Rate, Volatility Regime
        avg_roi = float(movies[movies['year'] >= max_year - 2]['roi'].mean())
        success_rate = float((movies[movies['year'] >= max_year - 2]['success_label'] == 'Hit').mean() * 100)
        risk_sigma = float(movies[movies['year'] >= max_year - 2]['roi'].std())

        if avg_roi > 2.0 and velocity_delta > 0:
            sentiment = "Expansion Phase"
            sentiment_stage = "expansion"
        elif avg_roi > 1.5:
            sentiment = "Bullish"
            sentiment_stage = "bullish"
        elif avg_roi > 1.0 and velocity_delta >= -0.1:
            sentiment = "Cautiously Bullish"
            sentiment_stage = "cautious"
        elif avg_roi > 0.8:
            sentiment = "Neutral"
            sentiment_stage = "neutral"
        else:
            sentiment = "Bearish"
            sentiment_stage = "bearish"

        # 4. RISK INDEX LABELS
        if risk_sigma < 0.8:
            risk_label = "Stable"
        elif risk_sigma < 1.5:
            risk_label = "Moderate Volatility"
        elif risk_sigma < 2.5:
            risk_label = "High Volatility"
        else:
            risk_label = "Extreme"

        # 5. STRATEGIC INTELLIGENCE (Differentiated Leaders)
        trending_genre = "Action"
        top_alpha_genre = "Drama"
        anchor_genre = "Comedy"
        
        if genre_stats_raw is not None and not genre_stats_raw.empty:
            genre_stats = genre_stats_raw.copy()
            # Alpha = Highest ROI
            top_alpha_genre = str(genre_stats.loc[genre_stats['avg_roi'].idxmax()]['genre'])
            # Anchor = Lowest Volatility with ROI > 1
            safe_pool = genre_stats[genre_stats['avg_roi'] > 1.0]
            if not safe_pool.empty:
                anchor_genre = str(safe_pool.loc[safe_pool['roi_volatility'].idxmin()]['genre'])
            else:
                anchor_genre = str(genre_stats.loc[genre_stats['roi_volatility'].idxmin()]['genre'])
            # Trending = Momentum leader (simplified for dashboard)
            trending_genre = str(genre_stats.loc[genre_stats['weighted_roi'].idxmax()]['genre'])

        # Dynamic Narrative Construction
        narratives = [
            f"The market is currently in a {sentiment} phase. {top_alpha_genre} continues to lead in alpha, while {anchor_genre} provides a reliable anchor for core allocations.",
            f"With {sentiment} sentiment and {velocity_label} velocity, strategic focus should shift towards {top_alpha_genre} for growth, while maintaining {anchor_genre} for stability.",
            f"Market data indicates {risk_label} conditions. {trending_genre} shows the strongest momentum, making it a key candidate for speculative buckets capped at 40%."
        ]
        import random
        strategic_text = narratives[full_sample_count % len(narratives)]

        # 6. ALLOCATION ENGINE (Sentiment Aligned)
        # Speculative capped at 40%
        if sentiment == "Expansion Phase":
            alloc = {"Core": 25, "Growth": 45, "Speculative": 30}
        elif sentiment == "Bullish":
            alloc = {"Core": 30, "Growth": 40, "Speculative": 30}
        elif sentiment == "Cautiously Bullish":
            alloc = {"Core": 45, "Growth": 35, "Speculative": 20}
        elif sentiment == "Neutral":
            alloc = {"Core": 50, "Growth": 35, "Speculative": 15}
        else: # Bearish
            alloc = {"Core": 70, "Growth": 20, "Speculative": 10}

        return {
            "total_movies": full_sample_count, 
            "financial_sample_count": len(movies),
            "year_range": f"{int(movies['year'].min())}–{int(movies['year'].max())}",
            "sentiment": sentiment,
            "sentiment_stage": sentiment_stage,
            "market_velocity": round(velocity_pct, 1),
            "market_velocity_label": velocity_label,
            "risk_index": round(risk_sigma, 2),
            "risk_label": risk_label,
            "trending_genre": trending_genre,
            "top_alpha": top_alpha_genre,
            "anchor_segment": anchor_genre,
            "strategic_intelligence": strategic_text,
            "capital_allocation": {
                "Core (Low Risk)": alloc["Core"],
                "Growth (Moderate)": alloc["Growth"],
                "Speculative (High)": alloc["Speculative"]
            },
            "total_volume": round(float(movies['box_office'].sum()), 2),
            "confidence_score": "High" if len(movies) > 1000 else "Moderate",
            "data_freshness": "Feb 2025", # Consistent with system time
            "avg_roi": round(avg_roi, 2),
            "success_rate": round(success_rate, 1)
        }
