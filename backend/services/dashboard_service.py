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
        """Calculate high-level investor metrics for Executive Dashboard"""

        movies_all = self.data_service.movies
        genre_stats_raw = self.data_service.genre_overall_stats

        if movies_all is None or movies_all.empty:
            return {}

        # ---------------------------------------------------
        # 1️⃣ SCOPE & FINANCIAL FILTERING
        # ---------------------------------------------------
        full_sample_count = len(movies_all)

        movies = movies_all[
            (movies_all["budget"] > 0) &
            (movies_all["box_office"] > 0)
        ].copy()

        if movies.empty:
            return {"error": "No valid financial data available"}

        # Prevent extreme outliers
        movies["roi"] = movies["roi"].clip(-5, 10)

        max_year = int(movies["year"].max())
        recent_window = movies[movies["year"] >= max_year - 2]

        # ---------------------------------------------------
        # 2️⃣ MARKET VELOCITY ENGINE (Stabilized)
        # ---------------------------------------------------
        recent_year_roi = movies[movies["year"] == max_year]["roi"].mean()
        prev_year_roi = movies[movies["year"] == max_year - 1]["roi"].mean()

        # Avoid division explosions
        if pd.notna(prev_year_roi) and prev_year_roi > 0.3:
            velocity_pct = (
                (recent_year_roi - prev_year_roi) / prev_year_roi
            ) * 100
        else:
            velocity_pct = (recent_year_roi - prev_year_roi) * 100

        velocity_pct = float(np.clip(velocity_pct, -200, 200))
        velocity_delta = recent_year_roi - prev_year_roi

        if velocity_delta < 0 and recent_year_roi > 1.2:
            velocity_label = "Short-term Cooling"
        elif velocity_delta > 0.2:
            velocity_label = "Accelerating"
        else:
            velocity_label = "Stable Momentum"

        # ---------------------------------------------------
        # 3️⃣ CORE MARKET METRICS
        # ---------------------------------------------------
        avg_roi = float(recent_window["roi"].mean())
        success_rate = float(
            (recent_window["success_label"] == "Hit").mean() * 100
        )
        risk_sigma = float(recent_window["roi"].std())

        # ---------------------------------------------------
        # 4️⃣ SENTIMENT ENGINE (Institutional Grade)
        # ---------------------------------------------------
        if avg_roi > 2.0 and velocity_delta > 0.1 and risk_sigma < 2.0:
            sentiment = "Expansion Phase"
            sentiment_stage = "expansion"

        elif velocity_delta > 0 and avg_roi > 1.2 and risk_sigma < 1.5:
            sentiment = "Bullish"
            sentiment_stage = "bullish"

        elif velocity_delta > 0 and avg_roi > 1.0 and risk_sigma >= 1.5:
            sentiment = "Cautiously Bullish"
            sentiment_stage = "cautious"

        elif velocity_delta < 0 and avg_roi > 1.0:
            sentiment = "Neutral"
            sentiment_stage = "neutral"

        else:
            sentiment = "Bearish"
            sentiment_stage = "bearish"

        # ---------------------------------------------------
        # 5️⃣ VOLATILITY LABELS (Realistic Bands)
        # ---------------------------------------------------
        if risk_sigma < 1.0:
            risk_label = "Stable"
        elif risk_sigma < 2.0:
            risk_label = "Moderate Volatility"
        elif risk_sigma < 3.0:
            risk_label = "High Volatility"
        else:
            risk_label = "Extreme"

        # ---------------------------------------------------
        # 6️⃣ GENRE INTELLIGENCE
        # ---------------------------------------------------
        trending_genre = "N/A"
        top_alpha_genre = "N/A"
        anchor_genre = "N/A"

        if genre_stats_raw is not None and not genre_stats_raw.empty:
            genre_stats = genre_stats_raw.copy()

            # Highest ROI genre
            top_alpha_genre = str(
                genre_stats.loc[
                    genre_stats["avg_roi"].idxmax()
                ]["genre"]
            )

            # Safe anchor (ROI > 1 with lowest volatility)
            safe_pool = genre_stats[genre_stats["avg_roi"] > 1.0]

            if not safe_pool.empty:
                anchor_genre = str(
                    safe_pool.loc[
                        safe_pool["roi_volatility"].idxmin()
                    ]["genre"]
                )
            else:
                anchor_genre = str(
                    genre_stats.loc[
                        genre_stats["roi_volatility"].idxmin()
                    ]["genre"]
                )

            # Momentum leader
            target_col = "weighted_roi" if "weighted_roi" in genre_stats.columns else "avg_roi"
            trending_genre = str(
                genre_stats.loc[
                    genre_stats[target_col].idxmax()
                ]["genre"]
            )

        # ---------------------------------------------------
        # 7️⃣ STRATEGIC INTELLIGENCE (Deterministic + Contextual)
        # ---------------------------------------------------
        narratives = [
            f"The market is currently in a {sentiment} phase. "
            f"{top_alpha_genre} leads alpha generation, while "
            f"{anchor_genre} provides defensive stability.",

            f"With {velocity_label} velocity and {risk_label} conditions, "
            f"capital allocation should tilt toward {top_alpha_genre} "
            f"while maintaining exposure to {anchor_genre}.",

            f"{trending_genre} demonstrates strong momentum under "
            f"{sentiment} conditions. A diversified exposure strategy "
            f"is advised."
        ]

        narrative_index = abs(hash(sentiment + top_alpha_genre)) % len(narratives)
        strategic_text = narratives[narrative_index]

        # ---------------------------------------------------
        # 8️⃣ CAPITAL ALLOCATION ENGINE
        # ---------------------------------------------------
        if sentiment == "Expansion Phase":
            alloc = {"Core": 25, "Growth": 45, "Speculative": 30}
        elif sentiment == "Bullish":
            alloc = {"Core": 30, "Growth": 40, "Speculative": 30}
        elif sentiment == "Cautiously Bullish":
            alloc = {"Core": 45, "Growth": 35, "Speculative": 20}
        elif sentiment == "Neutral":
            alloc = {"Core": 50, "Growth": 35, "Speculative": 15}
        else:  # Bearish
            alloc = {"Core": 70, "Growth": 20, "Speculative": 10}

        # ---------------------------------------------------
        # 9️⃣ TOTAL VOLUME (3-Year Rolling Capital)
        # ---------------------------------------------------
        total_volume = float(recent_window["box_office"].sum())

        # ---------------------------------------------------
        # 🔟 FINAL OUTPUT
        # ---------------------------------------------------
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
            "total_volume": round(total_volume, 2),
            "confidence_score": "High" if len(movies) > 1000 else "Moderate",
            "data_freshness": "Feb 2025",
            "avg_roi": round(avg_roi, 2),
            "success_rate": round(success_rate, 1)
        }