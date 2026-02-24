import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from services.data_service import DataService

class SimulationService:
    """Service for calculating movie production simulations and greenlight scores"""
    
    def __init__(self, data_service: DataService):
        self.data_service = data_service

    def simulate(self, genres: List[str], user_budget_cr: float, runtime: int, release_month: int) -> Dict:
        """Run a data-driven simulation for a movie project with precision-budgeting and market realism"""
        movies_raw = self.data_service.movies
        
        if movies_raw is None or movies_raw.empty:
            return {"error": "Dataset empty"}

        # 0. Budget Detection & Auto-Scaling
        # Detect if dataset budgets are small-scaled (normalized or legacy/USD)
        non_zero_budgets = movies_raw[movies_raw['budget'] > 100000]['budget']
        data_median = non_zero_budgets.median() if not non_zero_budgets.empty else 0
        
        scaling_factor = 1.0
        # If median is less than 5 Cr, it's likely normalized or small-scaled.
        # A median of 3.65M scaled by 100x results in 36.5 Cr, which is realistic for Bollywood mid-range.
        if 0 < data_median < 50000000:
            scaling_factor = 100.0

        # Create a working copy and apply scaling
        movies = movies_raw[(movies_raw['budget'] > 0) & (movies_raw['box_office'] > 0)].copy()
        movies['budget'] = movies['budget'] * scaling_factor
        movies['box_office'] = movies['box_office'] * scaling_factor
        movies['roi'] = (movies['box_office'] - movies['budget']) / movies['budget']
        movies['roi'] = movies['roi'].clip(-1, 15)

        # Convert user budget to absolute Rupees (already in Cr from frontend)
        user_budget = user_budget_cr * 10000000

        # 1. Multi-Genre Blending & HIT-based Intelligence
        genre_stats = []
        for g in genres:
            g_movies = movies[movies['genre'].str.contains(g, case=False, na=False)]
            if not g_movies.empty:
                hit_movies = g_movies[g_movies['success_label'] == 'Hit']
                
                # If hit samples are sufficient (>=3), use hit-based percentiles
                if len(hit_movies) >= 3:
                    hit_median = float(hit_movies['budget'].median())
                    hit_p25 = float(hit_movies['budget'].quantile(0.25))
                    hit_p75 = float(hit_movies['budget'].quantile(0.75))
                else:
                    # Fallback to median ± 20%
                    gen_median = float(g_movies['budget'].median())
                    hit_median = gen_median
                    hit_p25 = gen_median * 0.8
                    hit_p75 = gen_median * 1.2
                
                genre_stats.append({
                    "name": g,
                    "hit_median": hit_median,
                    "hit_p25": hit_p25,
                    "hit_p75": hit_p75,
                    "hit_rate": (g_movies['success_label'] == 'Hit').mean(),
                    "avg_roi": g_movies['roi'].mean(),
                    "median_runtime": float(hit_movies['runtime'].median()) if not hit_movies.empty else 135,
                    "count": len(g_movies),
                    "roi_volatility": g_movies['roi'].std() if len(g_movies) > 1 else 0
                })

        if not genre_stats:
            # Fallback to all movies if no genres match
            blended_hit_median = float(movies['budget'].median())
            blended_hit_p25 = float(movies['budget'].quantile(0.25))
            blended_hit_p75 = float(movies['budget'].quantile(0.75))
            blended_hit_rate = (movies['success_label'] == 'Hit').mean()
            blended_roi = movies['roi'].mean()
            blended_runtime = 135
            blended_volatility = movies['roi'].std()
            sample_size = len(movies)
        else:
            # Blend genres (weighted by sample size)
            total_count = sum(s['count'] for s in genre_stats)
            blended_hit_median = sum(s['hit_median'] * s['count'] for s in genre_stats) / total_count
            blended_hit_p25 = sum(s['hit_p25'] * s['count'] for s in genre_stats) / total_count
            blended_hit_p75 = sum(s['hit_p75'] * s['count'] for s in genre_stats) / total_count
            blended_hit_rate = sum(s['hit_rate'] * s['count'] for s in genre_stats) / total_count
            blended_roi = sum(s['avg_roi'] * s['count'] for s in genre_stats) / total_count
            blended_runtime = sum(s['median_runtime'] * s['count'] for s in genre_stats) / total_count
            blended_volatility = sum(s['roi_volatility'] * s['count'] for s in genre_stats) / total_count
            sample_size = total_count

        # 2. Market Context & Release Intelligence
        cluster_movies = movies[movies['genre'].apply(lambda x: any(g in x for g in genres))]
        if cluster_movies.empty: cluster_movies = movies
        
        monthly_success = cluster_movies.groupby('release_month')['success_label'].apply(
            lambda x: (x == 'Hit').mean()
        ).to_dict()
        
        best_month = int(max(monthly_success, key=monthly_success.get)) if monthly_success else 12
        user_month_score = monthly_success.get(release_month, 0)
        max_month_score = max(monthly_success.values()) if monthly_success else 1
        release_fit = (user_month_score / max_month_score) * 100 if max_month_score > 0 else 50

        # 3. Success Probabilities
        success_map = cluster_movies['success_label'].value_counts(normalize=True).to_dict()
        probs = {
            "hit": round(success_map.get('Hit', 0) * 100, 1),
            "average": round(success_map.get('Average', 0) * 100, 1),
            "flop": round(success_map.get('Flop', 0) * 100, 1)
        }

        # 4. Budget Percentile & Risk (Realistic Classification)
        all_budgets = cluster_movies['budget'].sort_values().values
        idx = np.searchsorted(all_budgets, user_budget)
        user_percentile = round((idx / len(all_budgets)) * 100, 1) if len(all_budgets) > 0 else 50

        # Risk Classification (Realistic)
        if user_percentile < 40:
            budget_risk = "Low"
        elif user_percentile < 75:
            budget_risk = "Moderate"
        else:
            budget_risk = "High"

        # Volatility overlap (Conditional Trigger)
        # Warning only if volatility is high AND budget is in high capital range (>60th percentile)
        is_volatile = bool(blended_volatility > 2.0)
        show_volatility_warning = bool(is_volatile and user_percentile > 60)
        
        if blended_volatility < 1.0:
            volatility_label = "Stable"
        elif blended_volatility < 2.0:
            volatility_label = "Moderate Variability"
        else:
            volatility_label = "High Volatility"

        is_extreme_risk = bool(is_volatile and user_percentile > 75)
        if is_extreme_risk:
            budget_risk = "Extreme"

        # 5. Greenlight Score Engine (Fix & Penalties)
        # Weights: 40% Hit Probability, 20% ROI Cluster, 20% Budget Fit, 10% Release Fit, 10% Runtime Fit
        hit_range_fit = 100 if blended_hit_p25 <= user_budget <= blended_hit_p75 else max(0, 100 - (abs(user_budget - blended_hit_median) / blended_hit_median * 100))
        
        # Runtime Fit (Tolerance-based)
        rt_median = blended_runtime
        rt_diff = abs(runtime - rt_median)
        if rt_diff <= 20:
            runtime_risk = "Optimal"
            runtime_fit = 100
        elif rt_diff <= 40:
            runtime_risk = "Neutral"
            runtime_fit = 70
        else:
            runtime_risk = "Risk"
            runtime_fit = 40
        
        final_score = (
            0.40 * probs['hit'] +
            0.20 * min(max(blended_roi * 15, 0), 100) +
            0.20 * hit_range_fit +
            0.10 * release_fit +
            0.10 * runtime_fit
        )

        # Penalties
        if user_percentile > 80: final_score -= 15
        if blended_volatility > 2.5: final_score -= 10
        if blended_roi < 1.3: final_score -= 5
        
        # Rewards
        if blended_hit_p25 <= user_budget <= blended_hit_p75: final_score += 10
        
        final_score = min(max(int(final_score), 0), 100)

        # 6. AI Producer Advisor Guidance
        advisor_insights = []
        genres_str = " + ".join(genres)
        
        # Comparison logic
        if user_budget > blended_hit_p75 * 1.2:
            advisor_insights.append(f"Caution: Budget (₹{user_budget_cr} Cr) exceeds {genres_str} hit ceiling (₹{round(blended_hit_p75/1e7,1)} Cr). High probability of diminishing returns.")
        elif user_budget < blended_hit_p25:
            advisor_insights.append(f"Growth Strategy: Budget is below the hit range for {genres_str}. Increasing to ₹{round(blended_hit_p25/1e7, 1)} Cr could improve production value parity.")
        else:
            advisor_insights.append(f"Optimization: Budget is perfectly aligned with historical hits for {genres_str}.")

        if show_volatility_warning:
            advisor_insights.append(f"Scenario Warning: This genre cluster shows high ROI volatility ({round(blended_volatility, 1)}x). Consider a more conservative budget or stronger distribution Tie-ups.")
        
        # 7. Historical Proxies (Similarity Ranking)
        def get_ranked_proxies():
            # Match: >= 1 genre, budget ±60%, runtime ±40m
            pot = movies[
                (abs(movies['runtime'] - runtime) <= 40) &
                (abs(movies['budget'] - user_budget) / user_budget <= 0.6)
            ].copy()
            
            if pot.empty: return []
            
            pot['genre_ov'] = pot['genre'].apply(lambda x: len(set(genres) & set(x.split('|'))))
            pot = pot[pot['genre_ov'] >= 1]
            
            # Similarity score calculation
            def calc_sim(row):
                g_score = row['genre_ov'] / len(genres)
                b_dist = 1 - (abs(row['budget'] - user_budget) / user_budget)
                r_dist = 1 - (abs(row['runtime'] - runtime) / 40)
                return (0.5 * g_score) + (0.3 * max(0, b_dist)) + (0.2 * max(0, r_dist))
            
            pot['similarity'] = pot.apply(calc_sim, axis=1)
            return pot.sort_values(by='similarity', ascending=False).head(5)

        ranked_proxies = get_ranked_proxies()
        similar_movies = []
        if not isinstance(ranked_proxies, list):
            similar_movies = ranked_proxies[['title', 'year', 'roi', 'success_label', 'budget']].to_dict(orient='records')
            # De-scale proxy budget for display
            for m in similar_movies:
                m['budget_cr'] = round(m['budget'] / 10000000, 1)

        return {
            "greenlight_score": int(final_score),
            "confidence_score": min(int((sample_size / 50) * 100), 100),
            "probabilities": probs,
            "financials": {
                "expected_roi": float(round(blended_roi, 2)),
                "break_even": float(round(user_budget * (1.4 if user_percentile < 40 else 1.7 if user_percentile > 75 else 1.5), 2)),
                "break_even_multiplier": float(1.4 if user_percentile < 40 else 1.7 if user_percentile > 75 else 1.5),
                "user_budget_cr": float(user_budget_cr)
            },
            "budget_intelligence": {
                "risk_level": budget_risk,
                "percentile": float(user_percentile),
                "median": float(round(blended_hit_median / 1e7, 1)),
                "hit_range": [float(round(blended_hit_p25 / 1e7, 1)), float(round(blended_hit_p75 / 1e7, 1))],
                "suggested_range": f"₹{round(blended_hit_p25/1e7,1)} Cr – ₹{round(blended_hit_p75/1e7,1)} Cr",
                "volatility": float(round(blended_volatility, 2)),
                "volatility_label": volatility_label,
                "show_volatility_warning": bool(show_volatility_warning)
            },
            "recommendations": {
                "best_month": int(best_month),
                "recommended_runtime": int(blended_runtime),
                "runtime_deviation": int(rt_diff),
                "runtime_risk": runtime_risk,
                "advisor_guidance": advisor_insights
            },
            "similar_movies": similar_movies
        }


    def _get_month_name(self, m: int) -> str:
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return months[m-1]
