import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np


class DataService:
    """Service for loading and managing CSV data"""
    
    def __init__(self, data_dir: str = "../movie-data-pipeline."):
        self.data_dir = Path(data_dir)
        self.movies: pd.DataFrame = None
        self.genre_year_stats: pd.DataFrame = None
        self.genre_overall_stats: pd.DataFrame = None
        self.load_data()
    
    def load_data(self):
        """Load all CSV files into memory"""
        try:
            self.movies = pd.read_csv(self.data_dir / "merged_bollywood_movies.csv")
            self.genre_year_stats = pd.read_csv(self.data_dir / "genre_year_statistics.csv")
            self.genre_overall_stats = pd.read_csv(self.data_dir / "genre_overall_statistics.csv")
            
            # Clean data
            # Remove country suffix from release_date (e.g. "14 February 2019 (USA)")
            if 'release_date' in self.movies.columns:
                self.movies['release_date'] = self.movies['release_date'].astype(str).str.split('(').str[0].str.strip()
            self.movies['release_date'] = pd.to_datetime(self.movies['release_date'], errors='coerce')
            
            print(f"✅ Loaded {len(self.movies)} movies")
            print(f"✅ Loaded {len(self.genre_year_stats)} genre-year statistics")
            print(f"✅ Loaded {len(self.genre_overall_stats)} genre overall statistics")
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            raise
    
    def get_dashboard_summary(self) -> Dict:
        """Get summary statistics for dashboard KPIs"""
        total_movies = len(self.movies)
        
        # Overall success rate
        success_count = len(self.movies[self.movies['success_label'] == 'Hit'])
        success_rate = (success_count / total_movies) * 100
        
        # Highest ROI genre
        highest_roi_genre = self.genre_overall_stats.nlargest(1, 'avg_roi').iloc[0]
        
        # Latest market trend (2019 top revenue genre)
        latest_year_data = self.genre_year_stats[self.genre_year_stats['year'] == 2019]
        if len(latest_year_data) > 0:
            top_2019_genre = latest_year_data.nlargest(1, 'total_box_office').iloc[0]
        else:
            top_2019_genre = None
        
        return {
            "total_movies": total_movies,
            "overall_success_rate": round(success_rate, 2),
            "highest_roi_genre": {
                "genre": highest_roi_genre['genre'],
                "avg_roi": round(highest_roi_genre['avg_roi'], 2)
            },
            "latest_trend": {
                "year": 2019,
                "top_genre": top_2019_genre['genre'] if top_2019_genre is not None else "N/A",
                "revenue": int(top_2019_genre['total_box_office']) if top_2019_genre is not None else 0
            } if top_2019_genre is not None else None
        }
    
    def get_ai_recommendation(self) -> Dict:
        """Generate dynamic AI recommendation based on 2019 trends and historical data"""
        # Get 2019 data
        data_2019 = self.genre_year_stats[self.genre_year_stats['year'] == 2019]
        
        if len(data_2019) == 0:
            return {"recommendation": "Insufficient data for 2019 analysis"}
        
        # Top revenue genre in 2019
        top_genre_2019 = data_2019.nlargest(1, 'total_box_office').iloc[0]
        genre_name = top_genre_2019['genre']
        
        # Get overall stats for this genre
        genre_overall = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre_name]
        
        if len(genre_overall) == 0:
            return {"recommendation": f"{genre_name} dominated 2019 revenue."}
        
        roi_volatility = genre_overall.iloc[0]['roi_volatility']
        success_rate = genre_overall.iloc[0]['success_rate']
        
        # Calculate 3-year trend (2017-2019)
        recent_years = self.genre_year_stats[
            (self.genre_year_stats['genre'] == genre_name) & 
            (self.genre_year_stats['year'].isin([2017, 2018, 2019]))
        ].sort_values('year')
        
        trend_direction = "stable"
        if len(recent_years) >= 2:
            success_diff = recent_years.iloc[-1]['success_rate'] - recent_years.iloc[0]['success_rate']
            if success_diff < -5:
                trend_direction = f"declined {abs(success_diff):.1f}%"
            elif success_diff > 5:
                trend_direction = f"increased {success_diff:.1f}%"
        
        # Generate recommendation
        risk_level = "High" if roi_volatility > 2.0 else "Moderate" if roi_volatility > 1.0 else "Low"
        
        recommendation = (
            f"{genre_name} dominated 2019 revenue. "
            f"However, ROI volatility is {risk_level.lower()} (σ = {roi_volatility:.1f}). "
            f"Success rate {trend_direction} in the last 3 years. "
            f"{risk_level} investment recommended."
        )
        
        return {
            "recommendation": recommendation,
            "top_genre": genre_name,
            "roi_volatility": round(roi_volatility, 2),
            "success_rate": round(success_rate, 2),
            "risk_level": risk_level
        }
    
    def get_budget_optimization(self, genre: str, budget: float) -> Dict:
        """Calculate budget optimization suggestion"""
        genre_stats = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre]
        
        if len(genre_stats) == 0:
            return {"error": "Genre not found"}
        
        avg_budget = genre_stats.iloc[0]['avg_budget']
        avg_roi = genre_stats.iloc[0]['avg_roi']
        success_rate = genre_stats.iloc[0]['success_rate']
        
        if budget > avg_budget:
            risk_increase = ((budget - avg_budget) / avg_budget) * 100
            suggested_cap = avg_budget * 1.2  # 20% above average
            
            return {
                "status": "above_average",
                "message": f"Risk increases by {risk_increase:.1f}% above historical average. Suggested budget cap: ₹{suggested_cap:,.0f}.",
                "avg_budget": round(avg_budget, 2),
                "suggested_cap": round(suggested_cap, 2),
                "risk_increase": round(risk_increase, 2)
            }
        else:
            return {
                "status": "within_range",
                "message": f"Budget is within safe range. Historical success rate: {success_rate:.1f}%, Average ROI: {avg_roi:.2f}x",
                "avg_budget": round(avg_budget, 2),
                "success_rate": round(success_rate, 2),
                "avg_roi": round(avg_roi, 2)
            }
    
    def get_release_timing(self, genre: str) -> Dict:
        """Get best release months for a genre"""
        # Primary genre (fallback)
        primary_genre = genre.split('|')[0]
        
        # Try to find movies with the primary genre
        # Use case=False for case-insensitive matching
        mask = self.movies['genre'].str.contains(primary_genre, case=False, na=False, regex=False)
        genre_movies = self.movies[mask].copy()
        
        # Ensure release_date is valid
        genre_movies = genre_movies.dropna(subset=['release_date', 'roi'])
        
        if len(genre_movies) < 2:
            return {"error": f"Insufficient data for '{primary_genre}' ({len(genre_movies)} movies)"}
        
        # Extract month and calculate average ROI per month
        genre_movies['month'] = genre_movies['release_date'].dt.month
        monthly_roi = genre_movies.groupby('month')['roi'].mean().sort_values(ascending=False)
        
        if len(monthly_roi) == 0:
            return {"error": "No valid monthly ROI data"}
        
        best_months = monthly_roi.head(3)
        month_names = {
            1: "January", 2: "February", 3: "March", 4: "April",
            5: "May", 6: "June", 7: "July", 8: "August",
            9: "September", 10: "October", 11: "November", 12: "December"
        }
        
        best_month_names = [month_names.get(int(m), str(m)) for m in best_months.index]
        
        return {
            "genre": genre,
            "best_months": best_month_names,
            "message": f"{primary_genre} films historically perform best in {', '.join(best_month_names[:2])} window.",
            "monthly_data": [
                {"month": month_names.get(int(m), str(m)), "avg_roi": round(roi, 2)}
                for m, roi in best_months.items()
            ]
        }
    
    def get_genre_popularity_over_time(self, year_range: Optional[List[int]] = None, 
                                       genres: Optional[List[str]] = None) -> List[Dict]:
        """Get genre popularity trends over time"""
        data = self.genre_year_stats.copy()
        
        if year_range:
            data = data[(data['year'] >= year_range[0]) & (data['year'] <= year_range[1])]
        
        if genres:
            data = data[data['genre'].isin(genres)]
        
        return data[['year', 'genre', 'total_movies', 'avg_rating']].to_dict('records')
    
    def get_highest_grossing_per_year(self, year_range: Optional[List[int]] = None) -> List[Dict]:
        """Get highest grossing genre per year"""
        data = self.genre_year_stats.copy()
        
        if year_range:
            data = data[(data['year'] >= year_range[0]) & (data['year'] <= year_range[1])]
        
        # Get top genre per year by box office
        top_per_year = data.loc[data.groupby('year')['total_box_office'].idxmax()]
        
        results = []
        for _, row in top_per_year.iterrows():
            # Find top movie for this genre and year
            # We filter movies by year and check if the genre string contains the target genre
            year_movies = self.movies[self.movies['year'] == row['year']]
            
            # Since a movie can have multiple genres ("Action|Drama"), we check for containment
            # The genre in row['genre'] comes from the exploded dataset, so it's a single genre
            genre_movies = year_movies[year_movies['genre'].str.contains(row['genre'], na=False)]
            
            top_movie_name = "N/A"
            if not genre_movies.empty:
                top_movie = genre_movies.nlargest(1, 'box_office').iloc[0]
                top_movie_name = top_movie['title']
            
            results.append({
                'year': int(row['year']),
                'genre': row['genre'],
                'total_box_office': int(row['total_box_office']),
                'top_movie': top_movie_name
            })
            
        return results
    
    def get_top_genres_by_year(self, year: int, limit: int = 3) -> List[Dict]:
        """Get top N highest grossing genres for a specific year"""
        data = self.genre_year_stats[self.genre_year_stats['year'] == year].copy()
        
        if data.empty:
            return []
            
        # Sort by total box office
        top_genres = data.nlargest(limit, 'total_box_office')
        
        results = []
        for i, row in top_genres.iterrows():
            total_revenue = int(row['total_box_office'])
            
            # Formulate a result
            results.append({
                'rank': len(results) + 1,
                'genre': row['genre'],
                'total_box_office': total_revenue,
                'formatted_revenue': f"₹{total_revenue/10000000:.1f}Cr"
            })
            
        return results
    
    def get_success_rate_by_genre(self, genres: Optional[List[str]] = None) -> List[Dict]:
        """Get success rates by genre"""
        data = self.genre_overall_stats.copy()
        
        if genres:
            data = data[data['genre'].isin(genres)]
        
        return data[['genre', 'success_rate', 'total_movies']].to_dict('records')
    
    def get_roi_by_genre(self, genres: Optional[List[str]] = None) -> List[Dict]:
        """Get average ROI by genre"""
        data = self.genre_overall_stats.copy()
        
        if genres:
            data = data[data['genre'].isin(genres)]
        
        return data[['genre', 'avg_roi', 'roi_volatility']].to_dict('records')
    
    def get_risk_analysis(self) -> List[Dict]:
        """Calculate risk scores and rankings for all genres"""
        data = self.genre_overall_stats.copy()
        
        # Normalize metrics to 0-1 scale
        data['budget_norm'] = (data['avg_budget'] - data['avg_budget'].min()) / (data['avg_budget'].max() - data['avg_budget'].min())
        data['success_norm'] = data['success_rate'] / 100
        data['volatility_norm'] = (data['roi_volatility'] - data['roi_volatility'].min()) / (data['roi_volatility'].max() - data['roi_volatility'].min())
        
        # Risk score: higher budget + lower success + higher volatility = higher risk
        data['risk_score'] = (
            (data['budget_norm'] * 0.3) + 
            ((1 - data['success_norm']) * 0.4) + 
            (data['volatility_norm'] * 0.3)
        ) * 100
        
        # Classify as High Risk or Safe
        data['risk_category'] = data['risk_score'].apply(lambda x: 'High Risk' if x > 50 else 'Safe')
        
        # Sort by risk score descending
        data = data.sort_values('risk_score', ascending=False)
        
        return data[[
            'genre', 'avg_budget', 'success_rate', 'roi_volatility', 
            'avg_roi', 'risk_score', 'risk_category'
        ]].to_dict('records')
    
    def get_genre_combinations(self) -> Dict:
        """Analyze genre combinations from multi-genre movies"""
        # Get movies with multiple genres
        multi_genre_movies = self.movies[self.movies['genre'].str.contains('|', na=False)]
        
        combo_stats = []
        
        for genre_combo in multi_genre_movies['genre'].unique():
            combo_movies = multi_genre_movies[multi_genre_movies['genre'] == genre_combo]
            
            if len(combo_movies) < 2:  # Skip combos with only 1 movie
                continue
            
            success_count = len(combo_movies[combo_movies['success_label'] == 'Hit'])
            success_rate = (success_count / len(combo_movies)) * 100
            avg_roi = combo_movies['roi'].mean()
            total_revenue = combo_movies['box_office'].sum()
            
            combo_stats.append({
                'combination': genre_combo,
                'total_movies': len(combo_movies),
                'success_rate': round(success_rate, 2),
                'avg_roi': round(avg_roi, 2),
                'total_revenue': int(total_revenue)
            })
        
        # Sort by avg_roi
        combo_stats_sorted = sorted(combo_stats, key=lambda x: x['avg_roi'], reverse=True)
        
        return {
            'top_10': combo_stats_sorted[:10],
            'bottom_10': combo_stats_sorted[-10:],
            'all_combinations': combo_stats_sorted
        }
    
    def get_all_genres(self) -> List[str]:
        """Get list of all unique genres"""
        return sorted(self.genre_overall_stats['genre'].unique().tolist())
    
    def get_year_range(self) -> Dict:
        """Get min and max years in dataset"""
        return {
            'min_year': int(self.movies['year'].min()),
            'max_year': int(self.movies['year'].max())
        }
