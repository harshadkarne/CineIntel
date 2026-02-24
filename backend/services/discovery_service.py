import pandas as pd
import numpy as np
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from services.data_service import DataService

class DiscoveryService:
    """Service for intelligence-driven discovery engine logic"""
    
    def __init__(self, data_service: 'DataService'):
        self.data_service = data_service

    def get_discovery_rows(self) -> List[Dict]:
        """Generate smart recommendation rows for the Discovery Engine"""
        movies = self.data_service.movies
        if movies is None or movies.empty:
            return []
            
        rows = [
            self._get_recently_hit_row(movies),
            self._get_high_risk_reward_row(movies),
            self._get_undervalued_sleepers_row(movies),
            self._get_genre_leaders_row(movies)
        ]
        
        return [r for r in rows if r["movies"]]

    def _get_recently_hit_row(self, movies: pd.DataFrame) -> Dict:
        """Films released within last 3 years with ROI > 1.8 or Success > 60%"""
        max_year = movies['year'].max()
        recent = movies[movies['year'] >= max_year - 3].copy()
        
        # Recently Hit criteria
        mask = (recent['roi'] > 1.8) | (recent['success_label'] == 'Hit')
        hit_films = recent[mask].sort_values(by='roi', ascending=False).head(10)
        
        return {
            "title": "Recently Hit Films",
            "type": "carousel",
            "description": "High-performing titles from the current market cycle.",
            "movies": self._format_movies(hit_films)
        }

    def _get_high_risk_reward_row(self, movies: pd.DataFrame) -> Dict:
        """High Volatility + High ROI Potential"""
        # Volatile genres usually: Action, Sci-Fi
        volatile = movies[movies['roi'] > 2.5].copy()
        # Filter for "Extreme" or "High" volatility genres if possible, 
        # but here we'll use ROI variance per genre as a proxy
        high_reward = volatile.sample(n=min(8, len(volatile)))
        
        return {
            "title": "High Risk, High Reward",
            "type": "row",
            "description": "Speculative plays with massive breakout history.",
            "movies": self._format_movies(high_reward)
        }

    def _get_undervalued_sleepers_row(self, movies: pd.DataFrame) -> Dict:
        """Low Budget (< 30th percentile) + ROI > 2.0"""
        budget_threshold = movies['budget'].quantile(0.3)
        sleepers = movies[(movies['budget'] <= budget_threshold) & (movies['roi'] > 2.0)].copy()
        sleepers = sleepers.sort_values(by='roi', ascending=False).head(8)
        
        return {
            "title": "Undervalued Sleeper Hits",
            "type": "row",
            "description": "Maximum capital efficiency from boutique budgets.",
            "movies": self._format_movies(sleepers)
        }

    def _get_genre_leaders_row(self, movies: pd.DataFrame) -> Dict:
        """Current momentum leaders in top genres"""
        # Logic: Highest ROI per genre
        leaders = movies.sort_values('roi', ascending=False).drop_duplicates('genre').head(8)
        
        return {
            "title": "Genre Cluster Leaders",
            "type": "row",
            "description": "The gold-standard benchmarks for each cinematic cluster.",
            "movies": self._format_movies(leaders)
        }

    def calculate_trending_score(self, movie: pd.Series) -> float:
        """
        Trending Score = ROI (40%) + Success Momentum (40%) + Recency (20%)
        """
        # Normalize ROI (clamped at 5 for scoring)
        roi_score = min(movie['roi'], 5) / 5.0
        
        # Success Weight
        success_weight = 1.0 if movie['success_label'] == 'Hit' else 0.5
        
        # Recency Weight
        current_year = 2025
        recency = 1.0 if movie['year'] >= 2022 else (0.5 if movie['year'] >= 2015 else 0.1)
        
        # Final Score 0-1
        score = (roi_score * 0.4) + (success_weight * 0.4) + (recency * 0.2)
        return round(score, 2)

    def get_intelligence_tags(self, movie: pd.Series) -> List[str]:
        """Generate contextual tags for cards"""
        tags = []
        
        # Recency
        if movie['year'] >= 2022:
            tags.append("Recent Hit")
            
        # ROI Performance
        if movie['roi'] > 3.0:
            tags.append("Breakout ROI")
        elif movie['roi'] > 2.0:
            tags.append("Boutique Win")
            
        # Budget Percentile (calculated elsewhere or passed)
        # For now simple logic
        if movie['budget'] > 100000000: # 100M USD proxy
            tags.append("High Budget Blockbuster")
        elif movie['budget'] < 10000000: # 10M USD proxy
            tags.append("Low Budget Wonder")
            
        return tags

    def _format_movies(self, df: pd.DataFrame) -> List[Dict]:
        """Convert dataframe to serializable list for frontend"""
        results = []
        for _, row in df.iterrows():
            results.append({
                "title": row['title'],
                "year": int(row['year']),
                "genres": row['genre'],
                "roi": round(float(row['roi']), 2),
                "box_office": int(row['box_office']),
                "poster_url": row.get('poster_url', ''),
                "imdb_rating": round(float(row['imdb_rating']), 1),
                "success_label": row.get('success_label', 'Unknown'),
                "trending_score": self.calculate_trending_score(row),
                "intelligence_tags": self.get_intelligence_tags(row)
            })
        return results
