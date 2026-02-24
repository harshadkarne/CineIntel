import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np

from services.discovery_service import DiscoveryService

class DataService:
    """Service for loading and managing CSV data"""
    
    def __init__(self, data_dir: str = "../movie-data-pipeline"):
        self.data_dir = Path(data_dir)
        self.movies: pd.DataFrame = None
        self.genre_year_stats: pd.DataFrame = None
        self.genre_overall_stats: pd.DataFrame = None
        self.discovery_service = DiscoveryService(self)
        self.load_data()
    
    def _calculate_confidence(self, sample_size: int) -> str:
        """Calculate confidence score based on sample size"""
        if sample_size >= 10: return "High"
        if sample_size >= 5: return "Moderate"
        return "Low"

    def _recalculate_genre_stats(self):
        """Recalculate genre statistics using producer-grade aggregation"""
        if self.movies is None or self.movies.empty:
            return

        # Explode genres to handle movies with multiple genres correctly
        movies_exploded = self.movies.assign(genre_split=self.movies['genre'].str.split('|')).explode('genre_split')
        movies_exploded = movies_exploded[movies_exploded['genre_split'].notna() & (movies_exploded['genre_split'] != "")]
        
        # 1. Overall Genre Stats Aggregation
        genre_groups = movies_exploded.groupby('genre_split')
        raw_stats = []
        
        # Determine 5-year break points for momentum
        max_year = int(self.movies['year'].max()) if not self.movies['year'].empty else 2025
        recent_5_yrs = range(max_year - 4, max_year + 1)
        prev_5_yrs = range(max_year - 9, max_year - 4)

        # Global medians for NaN fallback
        global_roi_median = self.movies['roi'].median()
        global_v_std_median = self.movies['roi'].std()

        for genre, group in genre_groups:
            if len(group) < 5:  # Lowered threshold for broader comparison
                continue
                
            # Basic Metrics
            total_movies = len(group)
            total_budget = group['budget'].sum()
            total_profit = group['profit'].sum()
            total_box_office = group['box_office'].sum()
            
            # Weighted ROI = sum profit / sum budget
            weighted_roi = (total_profit / total_budget) if total_budget > 0 else group['roi'].mean()
            median_roi = group['roi'].median()
            roi_peak = group['roi'].max()
            
            # ROI Volatility Index
            roi_std = group['roi'].std() if len(group) > 1 else 0.0
            avg_roi_simple = group['roi'].mean()
            volatility_index = (roi_std / avg_roi_simple) if avg_roi_simple > 0 else 0.0
            
            # Hit Rate & Failure Rate
            hit_count = len(group[group['success_label'] == 'Hit'])
            hit_rate = (hit_count / total_movies) * 100
            
            # Flop Rate (defined as ROI < 0.5)
            flop_count = len(group[group['roi'] < 0.5])
            flop_rate = (flop_count / total_movies) * 100

            # Downside ROI (average ROI for non-hits)
            downside_movies = group[group['success_label'] != 'Hit']
            downside_roi = downside_movies['roi'].mean() if not downside_movies.empty else 0.0
            
            # ROI Consistency (Inverse of Volatility, scaled)
            roi_consistency = max(0, 10 - volatility_index) if volatility_index > 0 else 10.0
            
            # Risk-Adjusted Return (ROISS: ROI / Standard Deviation)
            risk_adjusted_return = (weighted_roi / roi_std) if roi_std > 0 else weighted_roi
            
            # Budget Efficiency
            budget_efficiency = (weighted_roi / (total_budget/total_movies)) * 100 if total_budget > 0 else 0.0
            
            # Optimal Budget Range (based on quartile 1 to 3 of successful movies)
            successful_budgets = group[group['success_label'] == 'Hit']['budget']
            if not successful_budgets.empty:
                opt_min = successful_budgets.quantile(0.25)
                opt_max = successful_budgets.quantile(0.75)
            else:
                opt_min = group['budget'].quantile(0.25)
                opt_max = group['budget'].quantile(0.75)
            
            # Momentum Metrics
            recent_group = group[group['year'].isin(recent_5_yrs)]
            prev_group = group[group['year'].isin(prev_5_yrs)]
            
            recent_box = recent_group['box_office'].sum()
            prev_box = prev_group['box_office'].sum()
            
            volume_growth = ((recent_box - prev_box) / prev_box * 100) if prev_box > 0 else 0.0
            momentum = volume_growth # compatibility
            recent_hit_ratio = (len(recent_group[recent_group['success_label'] == 'Hit']) / len(recent_group) * 100) if not recent_group.empty else hit_rate
            
            # Longevity Score (Years active / span)
            years_active = group['year'].nunique()
            year_span = (group['year'].max() - group['year'].min()) + 1
            longevity_score = (years_active / year_span) * 100 if year_span > 0 else 0.0

            raw_stats.append({
                'genre': genre,
                'total_movies': total_movies,
                'weighted_roi': weighted_roi,
                'median_roi': median_roi,
                'roi_peak': roi_peak,
                'roi_std': roi_std,
                'volatility_index': volatility_index,
                'roi_consistency': roi_consistency,
                'risk_adjusted_return': risk_adjusted_return,
                'hit_rate': hit_rate,
                'flop_rate': flop_rate,
                'downside_risk': max(0.0, 1.0 - weighted_roi),
                'downside_roi': downside_roi,
                'budget_efficiency': budget_efficiency,
                'opt_budget_min': int(opt_min),
                'opt_budget_max': int(opt_max),
                'momentum': momentum,
                'volume_growth': volume_growth,
                'recent_hit_ratio': recent_hit_ratio,
                'total_box_office': total_box_office,
                'avg_budget': int(total_budget / total_movies),
                'longevity_score': longevity_score,
                'top_drivers': group.nlargest(3, 'roi')[['title', 'roi', 'year']].to_dict('records')
            })
            
        if not raw_stats:
            self.genre_overall_stats = pd.DataFrame()
            return

        # Normalize metrics for Radar/Vector comparison
        max_roi_peak = max(s['roi_peak'] for s in raw_stats) or 1.0
        max_vol = max(s['volatility_index'] for s in raw_stats) or 1.0
        max_box = max(s['total_box_office'] for s in raw_stats) or 1.0
        max_momentum = max(abs(s['momentum']) for s in raw_stats) or 1.0
        
        overall_stats = []
        total_market_vol = sum(s['total_box_office'] for s in raw_stats)

        for s in raw_stats:
            # Normalized Vectors (0-1)
            norm_roi_peak = s['roi_peak'] / max_roi_peak
            norm_success = s['hit_rate'] / 100
            norm_stability = s['roi_consistency'] / 10.0
            norm_market_cap = s['total_box_office'] / max_box
            norm_momentum = np.clip((s['momentum'] / max_momentum + 1) / 2, 0, 1) if max_momentum > 0 else 0.5
            
            # Market Share
            market_share = (s['total_box_office'] / total_market_vol * 100) if total_market_vol > 0 else 0
            
            # Composite Risk
            composite_risk = (0.4 * (1.0 - norm_stability)) + (0.3 * s['downside_risk']) + (0.3 * (s['flop_rate'] / 100))
            
            # Risk Classification
            roi = s['weighted_roi']
            v_std = s['roi_std']
            f_rate = s['flop_rate']
            
            if roi > 1.2 and v_std < 2 and f_rate < 30:
                risk_category = "SAFE"
            elif roi < 0.8 or v_std > 5 or f_rate > 50:
                risk_category = "HIGH RISK"
            else:
                risk_category = "MODERATE"
                
            # Archetype
            if roi > 1.5 and s['hit_rate'] < 30:
                archetype = "Blockbuster-driven (Aggressive)"
            elif roi > 1.0 and s['hit_rate'] > 60:
                archetype = "Consistent performer (Defensive)"
            elif v_std > 8:
                archetype = "Lottery genre (Aggressive)"
            else:
                archetype = "Market Standard"

            s_copy = s.copy()
            s_copy.update({
                'avg_roi': round(roi, 2),
                'risk_score': round(composite_risk, 2),
                'risk_category': risk_category,
                'archetype': archetype,
                'market_share': round(market_share, 2),
                'norm_roi_peak': round(norm_roi_peak, 2),
                'norm_success_yield': round(norm_success, 2),
                'norm_stability': round(norm_stability, 2),
                'norm_market_cap': round(norm_market_cap, 2),
                'norm_momentum': round(norm_momentum, 2),
                'roi_volatility': round(v_std, 2),
                'failure_rate': f_rate
            })
            overall_stats.append(s_copy)
            
        self.genre_overall_stats = pd.DataFrame(overall_stats)

        # 2. Yearly Genre Stats (already robust)
        yearly_groups = movies_exploded.groupby(['year', 'genre_split'])
        yearly_raw = []
        for (year, genre), group in yearly_groups:
            yearly_raw.append({
                'year': int(year),
                'genre': genre,
                'avg_roi': group['roi'].mean()
            })
        
        yearly_df = pd.DataFrame(yearly_raw)
        smoothed_yearly = []
        for g in yearly_df['genre'].unique():
            g_df = yearly_df[yearly_df['genre'] == g].sort_values('year')
            g_df['avg_roi_smooth'] = g_df['avg_roi'].rolling(window=3, min_periods=1).mean()
            smoothed_yearly.append(g_df)
            
        self.genre_year_stats = pd.concat(smoothed_yearly) if smoothed_yearly else pd.DataFrame()
        print(f"✅ Enhanced cinematic benchmark metrics for {len(overall_stats)} genres")

    def load_data(self):
        """Load all CSV files into memory with strict cleaning"""
        try:
            # Use master_movies_dataset.csv exclusively as requested
            movies_path = self.data_dir / "master_movies_dataset.csv"
            
            self.movies = pd.read_csv(movies_path)
            self.genre_year_stats = pd.read_csv(self.data_dir / "genre_year_statistics.csv")
            self.genre_overall_stats = pd.read_csv(self.data_dir / "genre_overall_statistics.csv")
            
            # Safe numeric conversion for specified fields
            numeric_fields = ['imdb_rating', 'budget', 'box_office', 'roi', 'vote_count', 'runtime']
            for field in numeric_fields:
                if field in self.movies.columns:
                    self.movies[field] = pd.to_numeric(self.movies[field], errors='coerce')
            
            # Fallback cleaning
            # Replace imdb_rating NaN with vote_count/100
            if 'imdb_rating' in self.movies.columns and 'vote_count' in self.movies.columns:
                self.movies['imdb_rating'] = self.movies['imdb_rating'].fillna(self.movies['vote_count'] / 100)
                # Clip between 0 and 10
                self.movies['imdb_rating'] = self.movies['imdb_rating'].clip(0, 10)
            
            # Fill runtime and vote_count with 0
            self.movies['runtime'] = self.movies.get('runtime', pd.Series([0]*len(self.movies))).fillna(0)
            self.movies['vote_count'] = self.movies.get('vote_count', pd.Series([0]*len(self.movies))).fillna(0)
            
            # Filter out "Unknown" or empty genres
            if 'genre' in self.movies.columns:
                self.movies = self.movies[self.movies['genre'].notna() & (self.movies['genre'] != "Unknown") & (self.movies['genre'] != "")]
                self.movies['genres'] = self.movies['genre']
            elif 'genres' in self.movies.columns:
                self.movies = self.movies[self.movies['genres'].notna() & (self.movies['genres'] != "Unknown") & (self.movies['genres'] != "")]
                self.movies['genre'] = self.movies['genres']
            
            # Ensure profit column exists: profit = box_office - budget
            if 'box_office' in self.movies.columns and 'budget' in self.movies.columns:
                # Fill NaNs with 0 for calculation
                box_office = self.movies['box_office'].fillna(0)
                budget = self.movies['budget'].fillna(0)
                self.movies['profit'] = box_office - budget
            
            # Date cleaning
            if 'release_date' in self.movies.columns:
                self.movies['release_date'] = self.movies['release_date'].astype(str).str.split('(').str[0].str.strip()
                self.movies['release_date'] = pd.to_datetime(self.movies['release_date'], errors='coerce')
                # Extract year if missing
                if 'year' not in self.movies.columns:
                    self.movies['year'] = self.movies['release_date'].dt.year
            
            # Normalize genre separator to '|'
            if 'genre' in self.movies.columns:
                self.movies['genre'] = self.movies['genre'].str.replace(', ', '|').str.replace(',', '|')
            
            # Fill missing ROI with 0
            if 'roi' in self.movies.columns:
                self.movies['roi'] = self.movies['roi'].fillna(0.0)
            
            # Recalculate producer-grade stats for accuracy
            self._recalculate_genre_stats()
            
            print(f"✅ Loaded {len(self.movies)} movies from {movies_path.name}")
            print(f"✅ Successfully filtered 'Unknown' genres and normalized data.")
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
        
    def get_capital_allocation_strategy(self, risk_intensity: float = 0.5) -> Dict:
        """Generate capital allocation strategy based on real genre stats and user risk appetite"""
        if self.genre_overall_stats is None or self.genre_overall_stats.empty:
            return {"error": "Stats not ready"}

        # 1. Define Category Weights based on Intensity
        if risk_intensity < 0.33: # Conservative
            safe_p, mod_p, high_p = 0.60, 0.30, 0.10
            strategy_name = "Conservative"
        elif risk_intensity < 0.66: # Balanced
            safe_p, mod_p, high_p = 0.40, 0.35, 0.25
            strategy_name = "Balanced"
        else: # Aggressive
            safe_p, mod_p, high_p = 0.20, 0.40, 0.40
            strategy_name = "Aggressive"

        # 2. Group Genres by Risk Category
        stats = self.genre_overall_stats.copy()
        safe_genres = stats[stats['risk_category'] == 'SAFE']
        mod_genres = stats[stats['risk_category'] == 'MODERATE']
        high_genres = stats[stats['risk_category'] == 'HIGH RISK']

        def allocate_within_bucket(bucket_df, bucket_percentage):
            if bucket_df.empty: return []
            
            # Efficiency Score = ROI * Hit Rate * log(Sample Size)
            bucket_df['efficiency'] = bucket_df['weighted_roi'] * (bucket_df['hit_rate'] / 100) * np.log1p(bucket_df['total_movies'])
            total_eff = bucket_df['efficiency'].sum()
            
            allocations = []
            for _, row in bucket_df.iterrows():
                share = (row['efficiency'] / total_eff) * bucket_percentage
                allocations.append({
                    "genre": row['genre'],
                    "allocation": round(share * 100, 1),
                    "roi": row['weighted_roi'],
                    "volatility": row['roi_volatility'],
                    "hit_rate": row['hit_rate'],
                    "risk_category": row['risk_category'],
                    "archetype": row['archetype']
                })
            return allocations

        # 3. Apply Allocations
        portfolio = []
        portfolio.extend(allocate_within_bucket(safe_genres, safe_p))
        portfolio.extend(allocate_within_bucket(mod_genres, mod_p))
        portfolio.extend(allocate_within_bucket(high_genres, high_p))

        # 4. Correlation Penalty (Action/Thriller, Drama/Romance, Horror/Mystery)
        correlated_pairs = [("Action", "Thriller"), ("Drama", "Romance"), ("Horror", "Mystery")]
        for g1, g2 in correlated_pairs:
            idx1 = next((i for i, item in enumerate(portfolio) if item['genre'] == g1), -1)
            idx2 = next((i for i, item in enumerate(portfolio) if item['genre'] == g2), -1)
            if idx1 != -1 and idx2 != -1:
                # Reduce weight for the lower ROI one
                if portfolio[idx1]['roi'] < portfolio[idx2]['roi']:
                    portfolio[idx1]['allocation'] *= 0.85
                else:
                    portfolio[idx2]['allocation'] *= 0.85

        # Re-normalize to 100% after penalties
        total_alloc = sum(item['allocation'] for item in portfolio)
        if total_alloc > 0:
            for item in portfolio:
                item['allocation'] = round((item['allocation'] / total_alloc) * 100, 1)

        # 5. Calculate Portfolio Metrics
        if not portfolio: return {"error": "No genres met criteria"}
        
        expected_roi = sum(item['roi'] * (item['allocation'] / 100) for item in portfolio)
        port_volatility = sum(item['volatility'] * (item['allocation'] / 100) for item in portfolio)
        hit_prob = sum(item['hit_rate'] * (item['allocation'] / 100) for item in portfolio)
        
        # Diversification Score (Simpson Index Variation)
        # 1 - sum(p^2)
        simpson = sum((item['allocation'] / 100)**2 for item in portfolio)
        div_score = round((1 - simpson) * 100)

        # 6. Insights and Warnings
        overexposed = [item['genre'] for item in portfolio if item['allocation'] > 35]
        warnings = []
        if overexposed:
            warnings.append(f"Overexposure Warning: {', '.join(overexposed)} exceeds 35% threshold.")

        # Producer Value Highlights
        defensive = stats.sort_values('failure_rate').iloc[0]['genre'] if not stats.empty else "N/A"
        most_efficient = stats.sort_values('budget_efficiency', ascending=False).iloc[0]['genre']
        high_alpha = stats.sort_values('weighted_roi', ascending=False).iloc[0]['genre']
        best_div = safe_genres.sort_values('roi_volatility').iloc[0]['genre'] if not safe_genres.empty else "Drama"

        # AI Recommendation text
        rec_text = f"Strategy focused on {strategy_name} returns. "
        if strategy_name == "Conservative":
            rec_text += f"{best_div} acts as a strong defensive anchor. "
        elif strategy_name == "Aggressive":
            rec_text += f"Focusing on high-alpha genres like {high_alpha} for maximum ROI."
        
        if "Comedy" in stats["genre"].values and "Horror" in stats["genre"].values:
            rec_text += "Comedy and Horror provide strong ROI diversification."

        return {
            "strategy": strategy_name,
            "portfolio": portfolio,
            "metrics": {
                "expected_roi": round(expected_roi, 2),
                "volatility": round(port_volatility, 2),
                "hit_probability": round(hit_prob, 1),
                "diversification_score": div_score
            },
            "highlights": {
                "defensive": defensive,
                "most_efficient": most_efficient,
                "high_alpha": high_alpha,
                "best_diversifier": best_div
            },
            "recommendation": rec_text,
            "warnings": warnings
        }

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
        
        # Risk score: risk_score = roi_volatility / (avg_roi + 0.1)
        data['risk_score'] = data['roi_volatility'] / (data['avg_roi'] + 0.1)
        
        # Classify Risk based on new formula thresholds
        def categorize_risk(row):
            score = row['risk_score']
            if score > 1.0: return 'High Risk'
            if score > 0.5: return 'Moderate Risk'
            return 'Safe'
            
        data['risk_category'] = data.apply(categorize_risk, axis=1)
        
        # Confidence logic
        data['confidence'] = data['total_movies'].apply(lambda x: self._calculate_confidence(x))
        
        # Sort by risk score ascending (Safe first) or descending (Risky first)?
        # Usually users want to see ranking. Let's return sorted by Score ASC (Safest first)
        data = data.sort_values('risk_score', ascending=True)
        
        return data[[
            'genre', 'avg_budget', 'success_rate', 'roi_volatility', 
            'avg_roi', 'risk_score', 'risk_category', 'confidence', 'total_movies', 'flop_rate'
        ]].rename(columns={'flop_rate': 'failure_rate'}).to_dict('records')
    
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
        """Compare two genres for benchmark dashboard with professional analytics"""
        df_a = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre_a]
        df_b = self.genre_overall_stats[self.genre_overall_stats['genre'] == genre_b]
        
        if df_a.empty or df_b.empty:
            return {"error": "One or both genres not found"}
        
        row_a = df_a.iloc[0].to_dict()
        row_b = df_b.iloc[0].to_dict()
        
        # 1. 5-Dimension Detailed Comparison
        comparison_matrix = {
            "Performance": {
                "winner": genre_a if row_a['weighted_roi'] > row_b['weighted_roi'] else genre_b,
                "metrics": [
                    {"label": "Avg ROI", "a": row_a['weighted_roi'], "b": row_b['weighted_roi'], "unit": "x"},
                    {"label": "Median ROI", "a": row_a['median_roi'], "b": row_b['median_roi'], "unit": "x"},
                    {"label": "Hit Probability", "a": row_a['hit_rate'], "b": row_b['hit_rate'], "unit": "%"}
                ]
            },
            "Risk": {
                "winner": genre_a if row_a['risk_score'] < row_b['risk_score'] else genre_b,
                "metrics": [
                    {"label": "Volatility", "a": row_a['roi_volatility'], "b": row_b['roi_volatility'], "unit": "σ"},
                    {"label": "Flop Rate", "a": row_a['flop_rate'], "b": row_b['flop_rate'], "unit": "%"},
                    {"label": "Downside ROI", "a": row_a['downside_roi'], "b": row_b['downside_roi'], "unit": "x"}
                ]
            },
            "Budget Efficiency": {
                "winner": genre_a if row_a['budget_efficiency'] > row_b['budget_efficiency'] else genre_b,
                "metrics": [
                    {"label": "ROI per Crore", "a": round(row_a['budget_efficiency'], 1), "b": round(row_b['budget_efficiency'], 1), "unit": "%"},
                    {"label": "Opt Budget Min", "a": row_a['opt_budget_min'], "b": row_b['opt_budget_min'], "unit": "Cr"},
                    {"label": "Opt Budget Max", "a": row_a['opt_budget_max'], "b": row_b['opt_budget_max'], "unit": "Cr"}
                ]
            },
            "Market Momentum": {
                "winner": genre_a if row_a['momentum'] > row_b['momentum'] else genre_b,
                "metrics": [
                    {"label": "Volume Growth", "a": round(row_a['volume_growth'], 1), "b": round(row_b['volume_growth'], 1), "unit": "%"},
                    {"label": "Recent Hit Ratio", "a": round(row_a['recent_hit_ratio'], 1), "b": round(row_b['recent_hit_ratio'], 1), "unit": "%"}
                ]
            },
            "Stability": {
                "winner": genre_a if row_a['norm_stability'] > row_b['norm_stability'] else genre_b,
                "metrics": [
                    {"label": "ROI Consistency", "a": round(row_a['roi_consistency'], 1), "b": round(row_b['roi_consistency'], 1), "unit": "/10"},
                    {"label": "Risk-Adj Return", "a": round(row_a['risk_adjusted_return'], 2), "b": round(row_b['risk_adjusted_return'], 2), "unit": ""},
                    {"label": "Longevity Score", "a": round(row_a['longevity_score'], 1), "b": round(row_b['longevity_score'], 1), "unit": "%"}
                ]
            }
        }

        # 2. Automated Verdict & Diversification
        v_tag_a = "Aggressive" if "Aggressive" in row_a['archetype'] else "Defensive"
        v_tag_b = "Aggressive" if "Aggressive" in row_b['archetype'] else "Defensive"
        
        verdict = f"{genre_a} ({v_tag_a}) demonstrates superior {('ROI efficiency' if row_a['weighted_roi'] > row_b['weighted_roi'] else 'stability')} "
        verdict += f"and {('lower' if row_a['roi_volatility'] < row_b['roi_volatility'] else 'higher')} volatility. "
        verdict += f"{genre_b} ({v_tag_b}) offers strong {('market momentum' if row_b['momentum'] > row_a['momentum'] else 'capital protection')}. "
        
        # Diversification insight
        if row_a['risk_category'] != row_b['risk_category']:
            verdict += f"Pairing these suggests a high diversification opportunity by blending {row_a['risk_category']} and {row_b['risk_category']} assets."
        else:
            verdict += "Both genres share similar risk profiles, suggesting limited vertical diversification but potential for thematic horizontal scaling."

        # 3. Portfolio Context
        def get_suitability(row):
            if row['risk_category'] == 'SAFE' and row['market_share'] > 15:
                return "Theatrical / Blockbuster"
            if row['weighted_roi'] > 1.3 and row['flop_rate'] < 25:
                return "OTT / Franchise Expansion"
            if row['roi_volatility'] > 4 or "Lottery" in row['archetype']:
                return "Franchise Play / High Alpha"
            return "Theatrical / Content Slate"

        return {
            "genre_a": row_a,
            "genre_b": row_b,
            "comparison_matrix": comparison_matrix,
            "verdict": verdict,
            "suitability": {
                "a": get_suitability(row_a),
                "b": get_suitability(row_b)
            },
            "tags": {
                "a": v_tag_a,
                "b": v_tag_b
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
        sort_order: str = "desc",
        budget_tier: Optional[str] = None,
        risk_level: Optional[str] = None
    ) -> Dict:
        """Filter, sort and paginate movies from the master dataset"""
        df = self.movies.copy()
        
        # 1. Advanced Filtering
        if search:
            df = df[df['title'].str.contains(search, case=False, na=False)]
            
        if genre and genre != "All":
            df = df[df['genre'].str.contains(genre, case=False, na=False)]
            
        if success_label and success_label != "All":
            df = df[df['success_label'] == success_label]

        if budget_tier and budget_tier != "All":
            if budget_tier == "Indie":
                df = df[df['budget'] < df['budget'].quantile(0.25)]
            elif budget_tier == "Mid-Budget":
                df = df[(df['budget'] >= df['budget'].quantile(0.25)) & (df['budget'] < df['budget'].quantile(0.75))]
            elif budget_tier == "Blockbuster":
                df = df[df['budget'] >= df['budget'].quantile(0.75)]

        if risk_level and risk_level != "All":
            # Risk proxy: high volatility genres or negative ROI history
            if risk_level == "Low Risk":
                df = df[df['roi'] > 0.8]
            elif risk_level == "High Risk":
                df = df[df['roi'] < 0.5]
            
        # 2. Advanced Discovery Sorting
        ascending = sort_order.lower() == "asc"
        
        if sort_by == "Recent Hits":
            max_year = df['year'].max()
            df = df[df['year'] >= max_year - 3].sort_values(by='roi', ascending=False)
        elif sort_by == "Highest ROI":
            df = df.sort_values(by='roi', ascending=False)
        elif sort_by == "Most Volatile":
            # Sort by ROI variance proxy (high ROI or high failure)
            df = df.sort_values(by='roi', ascending=ascending)
        elif sort_by == "Undervalued Gems":
            budget_q = df['budget'].quantile(0.3)
            df = df[(df['budget'] <= budget_q) & (df['roi'] > 1.5)].sort_values(by='roi', ascending=False)
        elif sort_by == "Flop to Cult":
            df = df[(df['success_label'] == 'Flop') & (df['roi'] > 1.2)].sort_values(by='roi', ascending=False)
        elif sort_by == "Genre Momentum":
            # Sorted by year and then ROI
            df = df.sort_values(by=['year', 'roi'], ascending=[False, False])
        elif sort_by in df.columns:
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
                "success_label": row.get('success_label', 'Unknown') if not pd.isna(row.get('success_label')) else 'Unknown',
                "trending_score": self.discovery_service.calculate_trending_score(row),
                "intelligence_tags": self.discovery_service.get_intelligence_tags(row),
                "budget_percentile": round(float(self.movies['budget'].rank(pct=True).loc[row.name] * 100), 1) if row.name in self.movies.index else 50
            })
        
        return {
            "movies": results,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": int(np.ceil(total_count / limit))
        }

    def get_discovery_data(self) -> Dict:
        """Get smart rows and carousels for the discovery engine"""
        return {
            "rows": self.discovery_service.get_discovery_rows(),
            "confidence": "High",
            "sample_size": len(self.movies)
        }

    def load_genre_yearly(self) -> List[Dict]:
        """Load and clean genre-year statistics with smoothed ROI"""
        if self.genre_year_stats.empty:
            return []
        df = self.genre_year_stats.copy()
        return df.fillna(0).to_dict('records')

    def load_genre_overall(self) -> List[Dict]:
        """Load and clean genre-overall statistics with producer metrics"""
        if self.genre_overall_stats.empty:
            return []
        df = self.genre_overall_stats.copy()
        # Add market share metrics
        total_volume = df['total_movies'].sum()
        total_bo = df['total_box_office'].sum()
        df['volume_share'] = (df['total_movies'] / total_volume * 100) if total_volume > 0 else 0
        df['bo_share'] = (df['total_box_office'] / total_bo * 100) if total_bo > 0 else 0
        
        return df.fillna(0).to_dict('records')

    def load_risk_data(self) -> pd.DataFrame:
        """Load and prepare risk analysis data"""
        df = self.genre_overall_stats.copy()
        numeric_cols = ["total_movies", "avg_budget", "success_rate", "avg_roi", "roi_volatility", "flop_rate"]
        # Ensure columns exist
        existing_cols = [c for c in numeric_cols if c in df.columns]
        df[existing_cols] = df[existing_cols].apply(pd.to_numeric, errors="coerce")
        if 'flop_rate' in df.columns:
            df['failure_rate'] = df['flop_rate']
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
