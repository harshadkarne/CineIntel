import pandas as pd
import numpy as np
from typing import Dict
from services.data_service import DataService


class DashboardService:
    """
    Institutional-grade Executive Dashboard metrics engine.
    Stabilized velocity, refined sentiment, realistic volatility bands,
    and rolling 3-year capital calculations.
    """

    def __init__(self, data_service: DataService):
        self.data_service = data_service

    def get_dashboard_metrics(self) -> Dict:
        """Calculate high-level investor metrics for Executive Dashboard (Isolated Layer)"""

        # Task 8: Module Isolation - Work with raw movies dataset
        movies_raw = self.data_service.movies
        if movies_raw is None or movies_raw.empty:
            return {}

        # Task 7: Data Validation
        # Remove films with: missing budgets, missing revenue, ROI < 0
        movies = movies_raw[
            (movies_raw['budget'] > 0) & 
            (movies_raw['box_office'].notna()) & 
            (movies_raw['roi'] >= 0)
        ].copy()

        if movies.empty:
            return {"error": "Insufficient data after validation"}

        # Task 6: Total Volume Analysed (Sum of revenue in ₹ Crores)
        total_volume = float(movies['box_office'].sum())

        # Task 1: Market Velocity (ROI_2021_2025 vs ROI_2016_2020)
        max_year = int(movies['year'].max())
        recent_5_yrs = movies[movies['year'] >= max_year - 4]
        prev_5_yrs = movies[(movies['year'] >= max_year - 9) & (movies['year'] < max_year - 4)]

        roi_recent = recent_5_yrs['roi'].mean() if not recent_5_yrs.empty else 0
        roi_prev = prev_5_yrs['roi'].mean() if not prev_5_yrs.empty else 0

        if roi_prev > 0:
            velocity_pct = ((roi_recent - roi_prev) / roi_prev) * 100
        else:
            velocity_pct = 0.0

        vel_label = "Expansionary" if velocity_pct > 0 else "Contractionary"
        
        # Task 4: Risk Regime (σ across all film ROI values)
        market_volatility = float(movies['roi'].std())
        if market_volatility < 2.5:
            risk_regime = "Low Risk"
        elif market_volatility <= 3.5:
            risk_regime = "Moderate Risk"
        else:
            risk_regime = "High Volatility"

        # Task 3: Market Sentiment
        if velocity_pct > 5 and market_volatility < 3:
            sentiment = "Bullish"
            sentiment_stage = "bullish"
        elif -5 <= velocity_pct <= 5:
            sentiment = "Neutral"
            sentiment_stage = "neutral"
        elif velocity_pct < -5 or market_volatility > 4:
            sentiment = "Bearish"
            sentiment_stage = "bearish"
        else:
            sentiment = "Neutral" # Fallback
            sentiment_stage = "neutral"

        # Task 2: Trending Genre (Momentum Score)
        # Momentum Score = 0.5 * ROI Growth + 0.3 * Hit Rate Growth + 0.2 * Volume Growth
        genre_momentum = []
        for genre in movies['primary_genre'].unique():
            if genre == "Unknown": continue
            g_movies = movies[movies['primary_genre'] == genre]
            
            g_recent = g_movies[g_movies['year'] >= max_year - 4]
            g_prev = g_movies[(g_movies['year'] >= max_year - 9) & (g_movies['year'] < max_year - 4)]
            
            if g_recent.empty or g_prev.empty:
                continue
                
            # ROI Growth
            roi_growth = (g_recent['roi'].mean() - g_prev['roi'].mean()) / g_prev['roi'].mean() if g_prev['roi'].mean() > 0 else 0
            
            # Hit Rate Growth
            hr_recent = (len(g_recent[g_recent['roi'] > 1.0]) / len(g_recent)) * 100
            hr_prev = (len(g_prev[g_prev['roi'] > 1.0]) / len(g_prev)) * 100
            hr_growth = (hr_recent - hr_prev) / hr_prev if hr_prev > 0 else 0
            
            # Volume Growth
            vol_recent = g_recent['box_office'].sum()
            vol_prev = g_prev['box_office'].sum()
            vol_growth = (vol_recent - vol_prev) / vol_prev if vol_prev > 0 else 0
            
            momentum_score = (0.5 * roi_growth) + (0.3 * hr_growth) + (0.2 * vol_growth)
            genre_momentum.append({"genre": genre, "score": momentum_score, "roi": g_recent['roi'].mean(), "vol": g_recent['roi'].std()})

        if genre_momentum:
            genre_momentum_sorted = sorted(genre_momentum, key=lambda x: x['score'], reverse=True)
            trending_genre = genre_momentum_sorted[0]['genre']
            
            # Task 5: Strategic Intelligence Card
            # Top Alpha = highest avg ROI
            top_alpha_genre = sorted(genre_momentum, key=lambda x: x['roi'], reverse=True)[0]['genre']
            
            # Anchor Segment = lowest volatility AND positive ROI
            anchors = [g for g in genre_momentum if g['roi'] > 1.0]
            if anchors:
                anchor_genre = sorted(anchors, key=lambda x: x['vol'])[0]['genre']
            else:
                anchor_genre = sorted(genre_momentum, key=lambda x: x['vol'])[0]['genre']
        else:
            trending_genre = "N/A"
            top_alpha_genre = "N/A"
            anchor_genre = "N/A"

        strategic_insight = f"The market is in a {sentiment} phase with {risk_regime} conditions. {trending_genre} is the current momentum leader, while {anchor_genre} serves as the primary anchor for risk-averse portfolios. {top_alpha_genre} continues to offer the highest alpha potential."

        # Capital Allocation (Simplified for dashboard)
        if sentiment == "Bullish":
            alloc = {"Core": 30, "Growth": 50, "Speculative": 20}
        elif sentiment == "Neutral":
            alloc = {"Core": 50, "Growth": 35, "Speculative": 15}
        else:
            alloc = {"Core": 70, "Growth": 20, "Speculative": 10}

        return {
            "total_movies": len(movies_raw),
            "financial_sample_count": len(movies),
            "year_range": f"{int(movies['year'].min())}–{int(movies['year'].max())}",
            "sentiment": sentiment,
            "sentiment_stage": sentiment_stage,
            "market_velocity": round(velocity_pct, 1),
            "market_velocity_label": vel_label,
            "risk_index": round(market_volatility, 2),
            "risk_label": risk_regime,
            "trending_genre": trending_genre,
            "top_alpha": top_alpha_genre,
            "anchor_segment": anchor_genre,
            "strategic_intelligence": strategic_insight,
            "capital_allocation": {
                "Core (Low Risk)": alloc["Core"],
                "Growth (Moderate)": alloc["Growth"],
                "Speculative (High)": alloc["Speculative"]
            },
            "total_volume": round(total_volume, 2),
            "confidence_score": "High" if len(movies) > 1000 else "Moderate",
            "data_freshness": "Mar 2026",
            "avg_roi": round(roi_recent, 2),
            "success_rate": round(len(recent_5_yrs[recent_5_yrs['roi'] > 1.0]) / len(recent_5_yrs) * 100, 1) if not recent_5_yrs.empty else 0
        }