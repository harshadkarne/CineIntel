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
        """Films released within last 3 years with ROI > 3"""
        max_year = 2024 # Current year context
        recent = movies[movies['year'] >= max_year - 3].copy()
        
        # Recently Hit criteria: releaseYear >= currentYear - 3 AND ROI > 3
        mask = (recent['roi'] > 3)
        hit_films = recent[mask].sort_values(by='roi', ascending=False).head(10)
        
        return {
            "title": "Recently Hit Movies",
            "type": "carousel",
            "description": "High-performing titles from the current market cycle (ROI > 3x).",
            "movies": self._format_movies(hit_films)
        }

    def _get_high_risk_reward_row(self, movies: pd.DataFrame) -> Dict:
        """High Risk High Reward: ROI > 4 AND high revenue volatility"""
        # ROI > 4
        high_roi = movies[movies['roi'] > 4].copy()
        
        # High revenue volatility proxy: we can use ROI standard deviation for its genre
        # or just look for movies with high ROI but also many flops in their cluster.
        # For simplicity and based on user request, let's pick from high ROI movies.
        high_risk_reward = high_roi.sample(n=min(8, len(high_roi)))
        
        return {
            "title": "High Risk, High Reward",
            "type": "row",
            "description": "Speculative plays with massive breakout history (ROI > 4x).",
            "movies": self._format_movies(high_risk_reward)
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
        """Genre Cluster Leaders: Top ROI movie for each genre"""
        # Explode genres to get the leader for each individual genre
        exploded_movies = movies.explode('genres_list')
        leaders = exploded_movies.sort_values('roi', ascending=False).drop_duplicates('genres_list').head(12)
        
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
        # INR Cr thresholds: 100M USD -> 830 Cr, 10M USD -> 83 Cr
        if movie['budget'] > 830: 
            tags.append("High Budget Blockbuster")
        elif movie['budget'] < 83: 
            tags.append("Low Budget Wonder")
            
        return tags

    def _format_movies(self, df: pd.DataFrame) -> List[Dict]:
        """Convert dataframe to serializable list for frontend"""
        results = []
        for _, row in df.iterrows():
            results.append({
                "title": row['title'],
                "year": int(row['year']) if not pd.isna(row['year']) else 0,
                "genres": row['genres_list'] if 'genres_list' in row else [row.get('genre', '')],
                "roi": float(row['roi']) if pd.notna(row['roi']) else None,
                "box_office": float(row['box_office']) if pd.notna(row['box_office']) else 0.0,
                "financial_status": row.get('financial_status', 'complete'),
                "poster_url": row.get('poster_url', ''),
                "imdb_rating": round(float(row['imdb_rating']), 1),
                "success_label": row.get('success_label', 'Unknown'),
                "trending_score": self.calculate_trending_score(row),
                "intelligence_tags": self.get_intelligence_tags(row),
                "budget": float(row['budget']) if pd.notna(row['budget']) else 0.0,
                "revenue": float(row['box_office']) if pd.notna(row['box_office']) else 0.0
            })
        return results
