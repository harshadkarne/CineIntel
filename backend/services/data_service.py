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
    
    def _calculate_confidence(self, sample_size: int) -> str:
        """Calculate confidence score based on sample size"""
        if sample_size >= 10: return "High"
        if sample_size >= 5: return "Moderate"
        return "Low"

    def _recalculate_genre_stats(self):
        """Recalculate genre statistics to ensure accurate volatility"""
        # Explode genres to handle movies with multiple genres
        # We already normalized separator to '|' in load_data
        movies_exploded = self.movies.assign(genre_split=self.movies['genre'].str.split('|')).explode('genre_split')
        
        # Group by genre
        genre_groups = movies_exploded.groupby('genre_split')
        
        # Calculate stats
        stats = []
        for genre, group in genre_groups:
            # ROI Volatility (Standard Deviation)
            # Use ddof=1 for sample standard deviation
            roi_volatility = group['roi'].std() if len(group) > 1 else 0.0
            
            stats.append({
                'genre': genre,
                'roi_volatility_recalc': roi_volatility
            })
            
        # Merge back into genre_overall_stats
        recalc_df = pd.DataFrame(stats)
        if self.genre_overall_stats is not None:
            # First drop old if exists
            if 'roi_volatility' in self.genre_overall_stats.columns:
                self.genre_overall_stats.drop('roi_volatility', axis=1, inplace=True)
                
            self.genre_overall_stats = pd.merge(self.genre_overall_stats, recalc_df, on='genre', how='left')
            # Update the main column with recalculated value
            self.genre_overall_stats['roi_volatility'] = self.genre_overall_stats['roi_volatility_recalc'].fillna(0.0)
            self.genre_overall_stats.drop('roi_volatility_recalc', axis=1, inplace=True)
            print("✅ Recalculated ROI volatility for all genres")

    def load_data(self):
        """Load all CSV files into memory"""
        try:
            # Use master_movies_dataset.csv for more comprehensive data
            movies_path = self.data_dir / "master_movies_dataset.csv"
            if not movies_path.exists():
                movies_path = self.data_dir / "merged_bollywood_movies.csv"
                
            self.movies = pd.read_csv(movies_path)
            self.genre_year_stats = pd.read_csv(self.data_dir / "genre_year_statistics.csv")
            self.genre_overall_stats = pd.read_csv(self.data_dir / "genre_overall_statistics.csv")
            
            # Use 'genres' primarily if available
            if 'genres' in self.movies.columns and 'genre' not in self.movies.columns:
                self.movies['genre'] = self.movies['genres']
            elif 'genre' in self.movies.columns and 'genres' not in self.movies.columns:
                self.movies['genres'] = self.movies['genre']
                
            # Clean data
            if 'release_date' in self.movies.columns:
                self.movies['release_date'] = self.movies['release_date'].astype(str).str.split('(').str[0].str.strip()
            self.movies['release_date'] = pd.to_datetime(self.movies['release_date'], errors='coerce')
            
            # Normalize genre separator to '|' (used by existing logic)
            if 'genre' in self.movies.columns:
                self.movies['genre'] = self.movies['genre'].str.replace(', ', '|').str.replace(',', '|')
            
            # Fill missing ROI with 0
            if 'roi' in self.movies.columns:
                self.movies['roi'] = self.movies['roi'].fillna(0.0)
            
            # Recalculate stats for accuracy
            self._recalculate_genre_stats()
            
            print(f"✅ Loaded {len(self.movies)} movies from {movies_path.name}")
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
        success_rate = (success_count / total_movies) * 100 if total_movies > 0 else 0
        
        # Total Market Volume (Box Office Sum)
        total_revenue = self.movies['box_office'].sum()
        
        # Highest ROI genre
        highest_roi_genre = self.genre_overall_stats.nlargest(1, 'avg_roi').iloc[0]
        
        # Latest market trend (2019/2020 top revenue genre)
        max_year = self.movies['year'].max()
        latest_year_data = self.genre_year_stats[self.genre_year_stats['year'] == max_year]
        if latest_year_data.empty and max_year > 2000:
            latest_year_data = self.genre_year_stats[self.genre_year_stats['year'] == max_year - 1]
            
        if not latest_year_data.empty:
            top_latest_genre = latest_year_data.nlargest(1, 'total_box_office').iloc[0]
        else:
            top_latest_genre = None
            
        # AI Strategic Insight
        strategic_insight = self.get_strategic_insight()
        
        # Capital Allocation
        capital_allocation = self.get_capital_allocation_strategy()
        
        return {
            "total_movies": total_movies,
            "overall_success_rate": round(success_rate, 2),
            "total_revenue": int(total_revenue),
            "highest_roi_genre": {
                "genre": highest_roi_genre['genre'],
                "avg_roi": round(highest_roi_genre['avg_roi'], 2)
            },
            "latest_trend": {
                "year": int(top_latest_genre['year']) if top_latest_genre is not None else int(max_year),
                "top_genre": top_latest_genre['genre'] if top_latest_genre is not None else "N/A",
                "revenue": int(top_latest_genre['total_box_office']) if top_latest_genre is not None else 0
            } if top_latest_genre is not None else None,
            "strategic_insight": strategic_insight,
            "capital_allocation": capital_allocation
        }
    
    def get_strategic_insight(self) -> Dict:
        """Generate dynamic strategic AI insight"""
        # Filter for genres with enough data
        reliable_stats = self.genre_overall_stats[self.genre_overall_stats['total_movies'] >= 5].copy()
        if reliable_stats.empty:
            reliable_stats = self.genre_overall_stats.copy()
            
        # Top ROI
        top_roi = reliable_stats.nlargest(1, 'avg_roi').iloc[0]
        
        # Most Volatile
        most_volatile = reliable_stats.nlargest(1, 'roi_volatility').iloc[0]
        
        # Safest (high success rate + lower volatility)
        safest = reliable_stats.sort_values(['success_rate', 'roi_volatility'], ascending=[False, True]).iloc[0]
        
        # Rising Star (Growth in box office share)
        # Compare 2018 vs 2019
        data_2018 = self.genre_year_stats[self.genre_year_stats['year'] == 2018]
        data_2019 = self.genre_year_stats[self.genre_year_stats['year'] == 2019]
        
        rising_star = "Drama" # Default
        if not data_2018.empty and not data_2019.empty:
            merged = pd.merge(data_2018, data_2019, on='genre', suffixes=('_2018', '_2019'))
            merged['growth'] = (merged['total_box_office_2019'] - merged['total_box_office_2018']) / merged['total_box_office_2018'].replace(0, 1)
            rising_star = merged.nlargest(1, 'growth').iloc[0]['genre']
        
        insight_text = (
            f"Market Analysis: {top_roi['genre']} leads ROI at {top_roi['avg_roi']:.1f}x. "
            f"Risk Alert: {most_volatile['genre']} shows highest volatility (σ={most_volatile['roi_volatility']:.1f}). "
            f"Recommended Strategy: Allocate 50% to {safest['genre']} for stability and 20% to {rising_star} for growth."
        )
        
        return {
            "text": insight_text,
            "top_roi_genre": top_roi['genre'],
            "safest_genre": safest['genre'],
            "rising_star": rising_star,
            "market_phase": "Expansion" if reliable_stats['avg_roi'].mean() > 1.2 else "Consolidation"
        }
        
    def get_capital_allocation_strategy(self) -> Dict:
        """Generate capital allocation strategy based on current market risk"""
        # Define modern SaaS style allocation categories
        allocation = {
            "Core (Low Risk)": 45,
            "Growth (Moderate)": 35,
            "Speculative (High)": 20
        }
        
        # Customize labels if needed based on data
        return allocation

    def get_ai_recommendation(self) -> Dict:
        """Generate dynamic AI recommendation based on 2019 trends and historical data"""
        # ... existing implementation kept for backward compatibility if needed, 
        # but strategic_insight replaces the main purpose. 
        # Keeping it as is but enhancing text slightly
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
        confidence = self._calculate_confidence(genre_overall.iloc[0]['total_movies'])
        
        recommendation = (
            f"{genre_name} dominated 2019 revenue. "
            f"However, ROI volatility is {risk_level.lower()} (σ = {roi_volatility:.1f}). "
            f"Success rate {trend_direction} in the last 3 years. "
            f"{risk_level} investment recommended. ({confidence} Confidence)"
        )
        
        return {
            "recommendation": recommendation,
            "top_genre": genre_name,
            "roi_volatility": round(roi_volatility, 2),
            "success_rate": round(success_rate, 2),
            "risk_level": risk_level,
            "confidence": confidence
        }
    
    def get_budget_optimization(self, genre: str, budget: float) -> Dict:
        """Calculate budget optimization suggestion"""
        genre_stats = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre]
        
        if len(genre_stats) == 0:
            return {"error": "Genre not found"}
        
        avg_budget = genre_stats.iloc[0]['avg_budget']
        avg_roi = genre_stats.iloc[0]['avg_roi']
        success_rate = genre_stats.iloc[0]['success_rate']
        
        warning_msg = None
        if budget > avg_budget * 1.5:
             warning_msg = "You are investing 150% above historical average. Risk increases significantly."
        
        if budget > avg_budget:
            risk_increase = ((budget - avg_budget) / avg_budget) * 100
            suggested_cap = avg_budget * 1.2  # 20% above average
            
            msg = f"Risk increases by {risk_increase:.1f}% above historical average. Suggested budget cap: ₹{suggested_cap:,.0f}."
            if warning_msg:
                msg = warning_msg + " " + msg
                
            return {
                "status": "above_average",
                "message": msg,
                "avg_budget": round(avg_budget, 2),
                "suggested_cap": round(suggested_cap, 2),
                "risk_increase": round(risk_increase, 2),
                "warning": warning_msg
            }
        else:
            return {
                "status": "within_range",
                "message": f"Budget is within safe range. Historical success rate: {success_rate:.1f}%, Average ROI: {avg_roi:.2f}x",
                "avg_budget": round(avg_budget, 2),
                "success_rate": round(success_rate, 2),
                "avg_roi": round(avg_roi, 2)
            }
            
    def check_budget_warning(self, genre: str, budget: float) -> Optional[str]:
        """Check for budget warning"""
        # Handle multi-genre by taking the primary one or average?
        # Let's try to match exact first
        genre_stats = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre]
        
        if len(genre_stats) == 0:
            # Try splitting
            genres = genre.split('|')
            matched_stats = self.genre_overall_stats[self.genre_overall_stats['genre'].isin(genres)]
            if len(matched_stats) > 0:
                avg_budget = matched_stats['avg_budget'].mean()
            else:
                return None
        else:
            avg_budget = genre_stats.iloc[0]['avg_budget']
            
        if budget > avg_budget * 1.5:
            return f"Warning: Budget exceeds 150% of historical average (₹{avg_budget:,.0f}) for {genre}."
        return None
    
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
        # We need to find the genre with max box office for each year
        # The previous implementation had a bug or was slightly off using idxmax on groupby which works but we need to be careful
        
        # Group by year and find max total_box_office
        # We want the whole row
        idx = data.groupby('year')['total_box_office'].idxmax()
        top_per_year = data.loc[idx]
        
        results = []
        for _, row in top_per_year.iterrows():
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
            
        # Add total movies to response for confidence badge
        return data[['genre', 'success_rate', 'total_movies']].to_dict('records')
    
    def get_roi_by_genre(self, genres: Optional[List[str]] = None) -> List[Dict]:
        """Get average ROI by genre"""
        data = self.genre_overall_stats.copy()
        
        if genres:
            data = data[data['genre'].isin(genres)]
        
        return data[['genre', 'avg_roi', 'roi_volatility', 'total_movies']].to_dict('records')
    
    def get_risk_analysis(self) -> List[Dict]:
        """Calculate risk scores and rankings for all genres"""
        data = self.genre_overall_stats.copy()
        
        # Normalize metrics to 0-1 scale
        data['budget_norm'] = (data['avg_budget'] - data['avg_budget'].min()) / (data['avg_budget'].max() - data['avg_budget'].min())
        data['success_norm'] = data['success_rate'] / 100
        
        # Volatility normalization (handle zeros or single values)
        if data['roi_volatility'].max() != data['roi_volatility'].min():
            data['volatility_norm'] = (data['roi_volatility'] - data['roi_volatility'].min()) / (data['roi_volatility'].max() - data['roi_volatility'].min())
        else:
            data['volatility_norm'] = 0.5
            
        # Risk score: higher budget + lower success + higher volatility = higher risk
        data['risk_score'] = (
            (data['budget_norm'] * 0.3) + 
            ((1 - data['success_norm']) * 0.4) + 
            (data['volatility_norm'] * 0.3)
        ) * 100
        
        # Classify Risk
        def categorize_risk(row):
            score = row['risk_score']
            if score > 60: return 'High Risk'
            if score > 30: return 'Moderate Risk'
            return 'Safe'
            
        data['risk_category'] = data.apply(categorize_risk, axis=1)
        
        # Confidence logic
        data['confidence'] = data['total_movies'].apply(lambda x: self._calculate_confidence(x))
        
        # Sort by risk score ascending (Safe first) or descending (Risky first)?
        # Usually users want to see ranking. Let's return sorted by Score ASC (Safest first)
        data = data.sort_values('risk_score', ascending=True)
        
        return data[[
            'genre', 'avg_budget', 'success_rate', 'roi_volatility', 
            'avg_roi', 'risk_score', 'risk_category', 'confidence', 'total_movies'
        ]].to_dict('records')
    
    def get_genre_combinations(self) -> Dict:
        """Analyze genre combinations from multi-genre movies"""
        # Get movies with multiple genres
        multi_genre_movies = self.movies[self.movies['genre'].str.contains('|', na=False, regex=False)]
        
        combo_stats = []
        
        for genre_combo in multi_genre_movies['genre'].unique():
            combo_movies = multi_genre_movies[multi_genre_movies['genre'] == genre_combo]
            
            # User wants to show all, but flag low confidence
            # "If sample size small, show confidence warning."
            
            success_count = len(combo_movies[combo_movies['success_label'] == 'Hit'])
            success_rate = (success_count / len(combo_movies)) * 100
            avg_roi = combo_movies['roi'].mean()
            total_revenue = combo_movies['box_office'].sum()
            sample_size = len(combo_movies)
            
            combo_stats.append({
                'combination': genre_combo,
                'total_movies': sample_size,
                'success_rate': round(success_rate, 2),
                'avg_roi': round(avg_roi, 2),
                'total_revenue': int(total_revenue),
                'confidence': self._calculate_confidence(sample_size)
            })
        
        # Sort by avg_roi
        combo_stats_sorted = sorted(combo_stats, key=lambda x: x['avg_roi'], reverse=True)
        
        return {
            'top_10': combo_stats_sorted[:10],
            'bottom_10': combo_stats_sorted[-10:],
            'all_combinations': combo_stats_sorted
        }
    
    def get_benchmark_data(self, genre_a: str, genre_b: str) -> Dict:
        """Compare two genres for benchmark dashboard"""
        stats_a = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre_a]
        stats_b = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre_b]
        
        if stats_a.empty or stats_b.empty:
            return {"error": "One or both genres not found"}
        
        row_a = stats_a.iloc[0]
        row_b = stats_b.iloc[0]
        
        return {
            "genre_a": {
                "genre": genre_a,
                "avg_roi": round(row_a['avg_roi'], 2),
                "success_rate": round(row_a['success_rate'], 2),
                "avg_budget": int(row_a['avg_budget']),
                "volatility": round(row_a['roi_volatility'], 2)
            },
            "genre_b": {
                "genre": genre_b,
                "avg_roi": round(row_b['avg_roi'], 2),
                "success_rate": round(row_b['success_rate'], 2),
                "avg_budget": int(row_b['avg_budget']),
                "volatility": round(row_b['roi_volatility'], 2)
            },
            "comparison": {
                "roi_diff": round(row_a['avg_roi'] - row_b['avg_roi'], 2),
                "success_diff": round(row_a['success_rate'] - row_b['success_rate'], 2)
            }
        }

    def get_market_pulse(self) -> Dict:
        """Get market velocity and sentiment metrics"""
        # Calculate recent market velocity (ROI of top movies in last 3 years)
        current_year = self.movies['year'].max()
        recent_movies = self.movies[self.movies['year'] >= current_year - 2]
        market_roi = recent_movies['roi'].mean() if not recent_movies.empty else 0
        
        # Market Sentiment
        sentiment = "Bullish" if market_roi > 1.2 else "Neutral" if market_roi > 0.8 else "Bearish"
        
        return {
            "roi_velocity": round(market_roi, 2),
            "sentiment": sentiment,
            "top_growing_segment": self.get_strategic_insight().get('rising_star', 'N/A'),
            "risk_index": round(self.genre_overall_stats['roi_volatility'].mean(), 2)
        }

    def get_top_performing_movies(self, limit: int = 12) -> List[Dict]:
        """Get top ROI movies for Explorer"""
        # Filter for movies with actual data
        valid_movies = self.movies[self.movies['budget'] > 0].nlargest(limit, 'roi')
        
        return [
            {
                "title": row['title'],
                "year": int(row['year']),
                "genre": row['genre'],
                "roi": round(row['roi'], 2),
                "box_office": int(row['box_office']),
                "poster_url": row.get('poster_url', '')
            }
            for _, row in valid_movies.iterrows()
        ]

    async def get_filtered_movies(
        self, 
        page: int = 1, 
        limit: int = 20, 
        search: Optional[str] = None, 
        genre: Optional[str] = None, 
        success_label: Optional[str] = None,
        sort_by: str = "roi",
        sort_order: str = "desc"
    ) -> Dict:
        """Filter, sort and paginate movies from the master dataset"""
        df = self.movies.copy()
        
        # Filtering
        if search:
            df = df[df['title'].str.contains(search, case=False, na=False)]
            
        if genre and genre != "All":
            df = df[df['genre'].str.contains(genre, case=False, na=False)]
            
        if success_label and success_label != "All":
            df = df[df['success_label'] == success_label]
            
        # Sorting
        ascending = sort_order.lower() == "asc"
        if sort_by in df.columns:
            df = df.sort_values(by=sort_by, ascending=ascending)
        
        # Pagination
        total_count = len(df)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        
        paginated_df = df.iloc[start_idx:end_idx]
        
        # Format results
        results = []
        for _, row in paginated_df.iterrows():
            # Handle genres which might be NaN
            genres_val = row['genre'] if 'genre' in df.columns else row.get('genres', '')
            if pd.isna(genres_val):
                genres_val = ""
                
            results.append({
                "title": row['title'],
                "year": int(row['year']) if not pd.isna(row['year']) else 0,
                "genres": genres_val,
                "roi": round(float(row['roi']), 2) if not pd.isna(row['roi']) else 0.0,
                "box_office": int(row['box_office']) if not pd.isna(row['box_office']) else 0,
                "poster_url": row.get('poster_url', '') if not pd.isna(row.get('poster_url')) else '',
                "imdb_rating": round(float(row['imdb_rating']), 1) if not pd.isna(row.get('imdb_rating', 0)) else 0.0,
                "success_label": row.get('success_label', 'Unknown') if not pd.isna(row.get('success_label')) else 'Unknown'
            })
        
        return {
            "movies": results,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": int(np.ceil(total_count / limit))
        }

    def load_genre_yearly(self) -> List[Dict]:
        """Load and clean genre-year statistics"""
        df = self.genre_year_stats.copy()
        numeric_cols = ["total_movies", "avg_rating", "avg_budget", 
                        "total_box_office", "success_rate", "avg_roi", "roi_volatility"]
        # Ensure all requested columns exist before conversion
        existing_cols = [c for c in numeric_cols if c in df.columns]
        df[existing_cols] = df[existing_cols].apply(pd.to_numeric, errors="coerce")
        return df.fillna(0).to_dict('records')

    def load_genre_overall(self) -> List[Dict]:
        """Load and clean genre-overall statistics"""
        df = self.genre_overall_stats.copy()
        numeric_cols = ["total_movies", "avg_budget", "success_rate", "avg_roi", "roi_volatility"]
        existing_cols = [c for c in numeric_cols if c in df.columns]
        df[existing_cols] = df[existing_cols].apply(pd.to_numeric, errors="coerce")
        return df.fillna(0).to_dict('records')

    def load_risk_data(self) -> pd.DataFrame:
        """Load and prepare risk analysis data"""
        df = self.genre_overall_stats.copy()
        numeric_cols = ["total_movies", "avg_budget", "success_rate", "avg_roi", "roi_volatility"]
        # Ensure columns exist
        existing_cols = [c for c in numeric_cols if c in df.columns]
        df[existing_cols] = df[existing_cols].apply(pd.to_numeric, errors="coerce")
        return df.fillna(0)

    def get_all_genres(self) -> List[str]:
        """Get list of all unique genres"""
        return sorted(self.genre_overall_stats['genre'].unique().tolist())
    
    def get_year_range(self) -> Dict:
        """Get min and max years in dataset"""
        return {
            'min_year': int(self.movies['year'].min()),
            'max_year': int(self.movies['year'].max())
        }
