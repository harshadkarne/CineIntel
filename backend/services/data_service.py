import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
import math

from services.discovery_service import DiscoveryService

class DataService:
    """Service for loading and managing CSV data"""
    
    def __init__(self, data_dir: str = "../movie-data-pipeline"):
        self.data_dir = Path(data_dir)
        self.movies: pd.DataFrame = None
        self.genre_year_stats: pd.DataFrame = None
        self.genre_overall_stats: pd.DataFrame = None
        self.discovery_service = DiscoveryService(self)
        self.currency_normalized = False
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

        # Use primary_genre instead of exploding combinations
        # 1. Overall Genre Stats Aggregation
        genre_groups = self.movies.groupby('primary_genre')
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
            
            # Weighted ROI = sum profit / sum budget - Use dropna() for simple mean
            weighted_roi = (total_profit / total_budget) if total_budget > 0 else (group['roi'].dropna().mean() if not group['roi'].dropna().empty else 0.0)
            median_roi = group['roi'].dropna().median() if not group['roi'].dropna().empty else 0.0
            roi_peak = group['roi'].dropna().max() if not group['roi'].dropna().empty else 0.0
            
            # ROI Volatility Index
            roi_series = group['roi'].dropna()
            valid_roi_count = len(roi_series)
            is_low_sample = valid_roi_count < 15
            
            roi_std = roi_series.std() if valid_roi_count > 1 else 0.5  # Default moderate volatility if NaN
            avg_roi_simple = roi_series.mean() if not roi_series.empty else (1.0 if not self.relaxed_mode else roi_series.median() if not roi_series.empty else 1.0)
            
            # Tiered fallback: Use median in relaxed mode if mean is unstable
            if self.relaxed_mode and not roi_series.empty:
                weighted_roi = roi_series.median()
            else:
                weighted_roi = (total_profit / total_budget) if total_budget > 0 else (avg_roi_simple)
            
            median_roi = roi_series.median() if not roi_series.empty else 0.0
            roi_peak = roi_series.max() if not roi_series.empty else 0.0
            
            volatility_index = (roi_std / avg_roi_simple) if avg_roi_simple > 0 else 0.5
            
            # Hit Rate & Failure Rate - Using ROI >= 1.2 as Hit Proxy for stability
            if not roi_series.empty:
                hit_count = len(roi_series[roi_series >= 1.2])
                hit_rate = (hit_count / valid_roi_count) * 100
            else:
                hit_count = 0
                hit_rate = 0.0
            
            # Flop Rate (defined as ROI < 1.0 threshold)
            flop_count = len(roi_series[roi_series < 1.0])
            flop_rate = min(90.0, (flop_count / valid_roi_count) * 100) if valid_roi_count > 0 else 50.0

            # Downside ROI (average ROI for non-hits)
            downside_movies = roi_series[roi_series < 1.2]
            downside_roi = downside_movies.mean() if not downside_movies.empty else 0.0
            
            # ROI Consistency (Inverse of Volatility, scaled)
            roi_consistency = max(0, 10 - volatility_index) if volatility_index > 0 else 5.0
            
            # Risk-Adjusted Return (ROISS: ROI / Standard Deviation)
            risk_adjusted_return = (weighted_roi / roi_std) if roi_std > 0 else weighted_roi
            
            # Budget Efficiency: ROI per ₹1 invested
            budget_efficiency = weighted_roi
            
            # Optimal Budget Range
            successful_budgets = group[(group['roi'] >= 1.2)]['budget']
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
            momentum = volume_growth
            
            # Recent Hit Ratio using Proxy
            recent_roi_series = recent_group['roi'].dropna()
            recent_hit_ratio = (len(recent_roi_series[recent_roi_series >= 1.2]) / len(recent_roi_series) * 100) if not recent_roi_series.empty else hit_rate
            
            # Longevity Score
            years_active = group['year'].nunique()
            year_span = (group['year'].max() - group['year'].min()) + 1
            longevity_score = (years_active / year_span) * 100 if year_span > 0 else 0.0

            # Clean top drivers for JSON compliance
            top_drivers_df = group.nlargest(3, 'roi')[['title', 'roi', 'year']].copy()
            top_drivers_df['roi'] = top_drivers_df['roi'].fillna(0.0).replace([np.inf, -np.inf], 0.0)
            top_drivers = top_drivers_df.to_dict('records')

            raw_stats.append({
                'genre': genre,
                'total_movies': total_movies,
                'valid_roi_count': valid_roi_count,
                'is_low_sample': is_low_sample,
                'weighted_roi': weighted_roi,
                'median_roi': median_roi,
                'roi_peak': roi_peak,
                'roi_std': roi_std,
                'volatility_index': volatility_index,
                'roi_consistency': roi_consistency,
                'risk_adjusted_return': risk_adjusted_return,
                'hit_rate': hit_rate,
                'flop_rate': flop_rate,
                'downside_risk': max(0.0, 1.0 - weighted_roi) if not np.isnan(weighted_roi) else 0.5,
                'downside_roi': downside_roi,
                'budget_efficiency': budget_efficiency,
                'opt_budget_min': int(opt_min) if not np.isnan(opt_min) else 0,
                'opt_budget_max': int(opt_max) if not np.isnan(opt_max) else 0,
                'momentum': momentum,
                'volume_growth': volume_growth,
                'recent_hit_ratio': recent_hit_ratio,
                'total_box_office': total_box_office,
                'avg_budget': int(total_budget / total_movies) if total_movies > 0 else 0,
                'longevity_score': longevity_score,
                'top_drivers': top_drivers
            })
            
        if not raw_stats:
            self.genre_overall_stats = pd.DataFrame()
            return

        # Normalize metrics for Radar/Vector comparison
        max_roi_peak = max(s['roi_peak'] for s in raw_stats) if raw_stats else 1.0
        if np.isnan(max_roi_peak) or max_roi_peak <= 0: max_roi_peak = 1.0
        
        max_vol = max(s['volatility_index'] for s in raw_stats) if raw_stats else 1.0
        if np.isnan(max_vol) or max_vol <= 0: max_vol = 1.0
        
        max_box = max(s['total_box_office'] for s in raw_stats) if raw_stats else 1.0
        if np.isnan(max_box) or max_box <= 0: max_box = 1.0
        
        max_momentum = max(abs(s['momentum']) for s in raw_stats) if raw_stats else 1.0
        if np.isnan(max_momentum) or max_momentum <= 0: max_momentum = 1.0
        
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
            
            # Composite Risk - Normalized strictly 0-1
            raw_risk = (0.4 * (1.0 - norm_stability)) + (0.3 * s.get('downside_risk', 0.5)) + (0.3 * (s['flop_rate'] / 100))
            composite_risk = max(0.0, min(1.0, float(raw_risk)))
            
            # Risk Classification
            roi = s['weighted_roi']
            v_std = s['roi_std']
            f_rate = min(90.0, s['flop_rate'])
            
            if roi > 1.2 and v_std < 2 and f_rate < 30:
                risk_category = "SAFE"
            elif roi < 0.3 or v_std > 5 or f_rate > 70: # Adjusted for ROI < 1 failure definition
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
                'success_rate': s['hit_rate'],  # Alias for compatibility
                'failure_rate': f_rate
            })
            overall_stats.append(s_copy)

        # Global cleanup for any remaining NaNs or Infs
        for s in overall_stats:
            for k, v in s.items():
                if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                    s[k] = 0.0
            
        self.genre_overall_stats = pd.DataFrame(overall_stats)

        # 2. Yearly Genre Stats (already robust)
        if self.movies.empty:
            self.genre_year_stats = pd.DataFrame()
            return

        yearly_groups = self.movies.groupby(['year', 'genre'])
        yearly_raw = []
        for (year, genre), group in yearly_groups:
            # Hit Proxy: ROI >= 1.2
            roi_series = group['roi'].dropna()
            hit_count = len(roi_series[roi_series >= 1.2]) if not roi_series.empty else 0
            hit_rate = (hit_count / len(roi_series)) * 100 if not roi_series.empty else 0.0
            
            yearly_raw.append({
                'year': int(year),
                'genre': genre,
                'avg_roi': roi_series.mean() if not roi_series.empty else 0.0,
                'total_box_office': group['box_office'].sum(),
                'success_rate': hit_rate
            })
        
        yearly_df = pd.DataFrame(yearly_raw)
        if yearly_df.empty:
            self.genre_year_stats = pd.DataFrame()
            return
            
        smoothed_yearly = []
        for g in yearly_df['genre'].unique():
            g_df = yearly_df[yearly_df['genre'] == g].sort_values('year')
            g_df['avg_roi_smooth'] = g_df['avg_roi'].rolling(window=3, min_periods=1).mean()
            smoothed_yearly.append(g_df)
            
        self.genre_year_stats = pd.concat(smoothed_yearly) if smoothed_yearly else pd.DataFrame()
        
        if not self.genre_overall_stats.empty:
             print(f"✅ Enhanced cinematic benchmark metrics for {len(self.genre_overall_stats)} genres")
        else:
             print("⚠️ No genre statistics could be calculated.")

    def load_data(self):
        """Load all CSV files into memory with strict cleaning and validation"""
        try:
            # Use master_movies_dataset.csv exclusively as requested
            movies_path = self.data_dir / "master_movies_dataset.csv"
            
            if not movies_path.exists():
                print(f"❌ Error: {movies_path} not found.")
                self.movies = pd.DataFrame()
                return

            self.movies = pd.read_csv(movies_path)
            
            if self.movies.empty:
                print(f"⚠️ Warning: Loaded dataset {movies_path.name} is empty.")
                return

            # Safe numeric conversion for specified fields
            numeric_fields = ['imdb_rating', 'budget', 'box_office', 'roi', 'vote_count', 'runtime']
            for field in numeric_fields:
                if field in self.movies.columns:
                    self.movies[field] = pd.to_numeric(self.movies[field], errors='coerce')
            
            # Fill missing required metrics with safe defaults
            self.movies['budget'] = self.movies.get('budget', pd.Series([0]*len(self.movies))).fillna(0)
            self.movies['box_office'] = self.movies.get('box_office', pd.Series([0]*len(self.movies))).fillna(0)
            self.movies['runtime'] = self.movies.get('runtime', pd.Series([0]*len(self.movies))).fillna(0)
            self.movies['vote_count'] = self.movies.get('vote_count', pd.Series([0]*len(self.movies))).fillna(0)
            self.movies['imdb_rating'] = self.movies.get('imdb_rating', pd.Series([0]*len(self.movies))).fillna(0).clip(0, 10)

            # Normalize genres into lists
            if 'genres' in self.movies.columns:
                self.movies['genres_list'] = self.movies['genres'].apply(
                    lambda x: [g.strip() for g in x.replace('|', ',').split(',')] if isinstance(x, str) else []
                )
            elif 'genre' in self.movies.columns:
                self.movies['genres_list'] = self.movies['genre'].apply(
                    lambda x: [g.strip() for g in x.replace('|', ',').split(',')] if isinstance(x, str) else []
                )
            
            # Use the first genre as primary for backward compatibility where needed
            self.movies['primary_genre'] = self.movies['genres_list'].apply(
                lambda x: x[0] if len(x) > 0 else "Unknown"
            )
            
            self.movies['genre'] = self.movies['primary_genre']
            self.movies['genres'] = self.movies['primary_genre']
            
            # ---------------------------------------------------
            # CURRENCY STANDARDIZATION (USD -> INR Crores)
            # ---------------------------------------------------
            if not self.currency_normalized:
                USD_TO_INR = 83
                INR_PER_CRORE = 10_000_000
                
                # Convert to INR Crores
                self.movies['box_office_inr_cr'] = (self.movies['box_office'] * USD_TO_INR) / INR_PER_CRORE
                self.movies['budget_inr_cr'] = (self.movies['budget'] * USD_TO_INR) / INR_PER_CRORE
                
                # Overwrite original fields with INR Cr values for global consistency
                self.movies['box_office'] = self.movies['box_office_inr_cr'].round(2)
                self.movies['budget'] = self.movies['budget_inr_cr'].round(2)
                self.currency_normalized = True
                print("✅ Currency normalized to INR Crores.")

            # Profit calculation (in INR Cr)
            self.movies['profit'] = self.movies['box_office'] - self.movies['budget']

            # ---------------------------------------------------
            # FINANCIAL INTEGRITY & TIERED FALLBACK ENGINE
            # ---------------------------------------------------
            financial_movies = self.movies.copy()
            
            # Tier 1: Relaxed Filter - Keep rows with non-NaN budget and box_office
            financial_movies = financial_movies[
                (financial_movies['budget'].notna()) &
                (financial_movies['box_office'].notna())
            ]
            
            # Tier 2: Safe ROI Calculation - Use np.nan for zero/invalid financial pairs
            financial_movies['roi'] = np.where(
                (financial_movies['budget'] > 0) & (financial_movies['box_office'] > 0),
                (financial_movies['box_office'] / financial_movies['budget']).round(2),
                np.nan
            )
            
            # Detect Relaxed Mode (Tier 3)
            valid_roi_count = financial_movies['roi'].count()
            self.relaxed_mode = valid_roi_count < 300
            
            if self.relaxed_mode:
                print(f"⚠️ Relaxed Mode Activated: Low financial sample size ({valid_roi_count} < 300)")
                # In relaxed mode, we allow budget-only movies for basic sizing
                # But ROI remains NaN for non-box-office movies
            
            self.movies = financial_movies
            self.movies['financial_status'] = np.where(self.movies['roi'].notna(), 'complete', 'incomplete')
            
            # Structured Integrity Logging
            print(f"📊 Total movies (raw): {len(self.movies)}")
            print(f"💰 Valid ROI rows (N > 0): {valid_roi_count}")
            
            # Genre-specific ROI sample distribution
            genre_coverage = self.movies.groupby('genre')['roi'].count()
            print("📈 Genres with valid ROI:\n", genre_coverage)

            # Recalculate producer-grade stats for accuracy
            self._recalculate_genre_stats()
            
            print(f"✅ Data stability layer initialized for {len(self.movies)} assets.")
        except Exception as e:
            print(f"❌ Critical error in data stability layer: {e}")
            # Ensure attributes exist to prevent downstream crashes
            if self.movies is None: self.movies = pd.DataFrame()
            if self.genre_overall_stats is None: self.genre_overall_stats = pd.DataFrame()
            if self.genre_year_stats is None: self.genre_year_stats = pd.DataFrame()
    
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
            # Use fillna(0) to prevent NaN crashes during summation
            roi_col = bucket_df['weighted_roi'].fillna(0)
            hit_col = bucket_df['hit_rate'].fillna(0) / 100
            size_col = np.log1p(bucket_df['total_movies'].fillna(0))
            
            bucket_df['efficiency'] = roi_col * hit_col * size_col
            total_eff = bucket_df['efficiency'].sum()
            
            allocations = []
            if total_eff <= 0:
                # Equal weight fallback if no efficiency scores are valid
                share_per = bucket_percentage / len(bucket_df)
                for _, row in bucket_df.iterrows():
                    allocations.append({
                        "genre": row['genre'],
                        "allocation": round(share_per * 100, 1),
                        "roi": row.get('weighted_roi', 0.0),
                        "volatility": row.get('roi_volatility', 0.0),
                        "hit_rate": row.get('hit_rate', 0.0),
                        "risk_category": row.get('risk_category', 'MODERATE'),
                        "archetype": row.get('archetype', 'Market Standard')
                    })
                return allocations

            for _, row in bucket_df.iterrows():
                share = (row['efficiency'] / total_eff) * bucket_percentage
                allocations.append({
                    "genre": row['genre'],
                    "allocation": round(share * 100, 1),
                    "roi": row.get('weighted_roi', 0.0),
                    "volatility": row.get('roi_volatility', 0.0),
                    "hit_rate": row.get('hit_rate', 0.0),
                    "risk_category": row.get('risk_category', 'MODERATE'),
                    "archetype": row.get('archetype', 'Market Standard')
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
                item['allocation'] = (item['allocation'] / total_alloc) * 100
                
            # Round and ensure exact 100 sum
            # Use largest remainder method
            allocations = [item['allocation'] for item in portfolio]
            floors = [math.floor(a) for a in allocations]
            diff = 100 - sum(floors)
            
            remainders = [(i, allocations[i] - floors[i]) for i in range(len(allocations))]
            remainders.sort(key=lambda x: x[1], reverse=True)
            
            for i in range(diff):
                idx = remainders[i][0]
                floors[idx] += 1
                
            for i, item in enumerate(portfolio):
                item['allocation'] = float(floors[i])

        # 5. Calculate Portfolio Metrics
        if not portfolio: return {"error": "No genres met criteria"}
        
        # Safe metric calculation with np.nan_to_num fallbacks
        expected_roi = sum(np.nan_to_num(item.get('roi', 0.0)) * (item.get('allocation', 0) / 100) for item in portfolio)
        port_volatility = sum(np.nan_to_num(item.get('volatility', 0.0)) * (item.get('allocation', 0) / 100) for item in portfolio)
        hit_prob = sum(np.nan_to_num(item.get('hit_rate', 0.0)) * (item.get('allocation', 0) / 100) for item in portfolio)
        
        # Tiered fallback for neutral baseline if results are Zero/NaN
        if expected_roi <= 0:
            valid_rois = self.movies['roi'].dropna()
            expected_roi = valid_rois.mean() if not valid_rois.empty else 1.0
        
        if hit_prob <= 0:
            hit_prob = 50.0 # Neutral baseline
        
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
        """Calculate risk scores and rankings for all genres with a safe computation engine"""
        try:
            if self.genre_overall_stats is None or self.genre_overall_stats.empty:
                return []

            data = self.genre_overall_stats.copy()
            
            # Ensure required columns exist for selection
            req_cols = ['genre', 'avg_budget', 'success_rate', 'roi_volatility', 'avg_roi', 'risk_score', 'risk_category', 'total_movies', 'failure_rate']
            for col in req_cols:
                if col not in data.columns:
                    data[col] = 0.0
            
            # Confidence logic
            data['confidence'] = data['total_movies'].apply(lambda x: self._calculate_confidence(x))
            
            # Sort by risk score ascending (Safe first)
            data = data.sort_values('risk_score', ascending=True)
            
            return data[[
                'genre', 'avg_budget', 'success_rate', 'roi_volatility', 
                'avg_roi', 'risk_score', 'risk_category', 'confidence', 'total_movies', 'failure_rate'
            ]].fillna(0).replace([np.inf, -np.inf], 0).to_dict('records')
        except Exception as e:
            print(f"⚠️ Risk analysis fell back to recovery mode: {e}")
            return [{
                "genre": "Recovery Mode",
                "risk_score": 0,
                "volatility": 0,
                "status": "fallback_mode"
            }]
    
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
            # Genre Filter: movie.genres.includes(selectedGenre)
            df = df[df['genres_list'].apply(lambda x: genre in x)]
            
        if success_label and success_label != "All":
            df = df[df['success_label'] == success_label]

        if budget_tier and budget_tier != "All":
            if budget_tier == "Low Budget":
                df = df[df['budget'] < 20]
            elif budget_tier == "Mid Budget":
                df = df[(df['budget'] >= 20) & (df['budget'] <= 80)]
            elif budget_tier == "High Budget":
                df = df[df['budget'] > 80]
            # Backward compatibility for old tiers if still sent by client
            elif budget_tier == "Indie":
                df = df[df['budget'] < df['budget'].quantile(0.25)]
            elif budget_tier == "Mid-Budget":
                df = df[(df['budget'] >= df['budget'].quantile(0.25)) & (df['budget'] < df['budget'].quantile(0.75))]
            elif budget_tier == "Blockbuster":
                df = df[df['budget'] >= df['budget'].quantile(0.75)]

        if risk_level and risk_level != "All" and risk_level != "Any Risk Level":
            if risk_level == "Low Risk":
                df = df[df['roi'] > 2]
            elif risk_level == "Medium Risk":
                df = df[(df['roi'] >= 1) & (df['roi'] <= 2)]
            elif risk_level == "High Risk":
                df = df[df['roi'] < 1]
            
        # 2. Advanced Discovery Sorting
        ascending = sort_order.lower() == "asc"
        
        if sort_by == "Recent Hits":
            max_year = 2024 # Current year context
            df = df[df['year'] >= max_year - 3].sort_values(by='roi', ascending=False)
        elif sort_by == "ROI" or sort_by == "Highest ROI":
            df = df.sort_values(by='roi', ascending=False)
        elif sort_by == "Revenue" or sort_by == "box_office":
            df = df.sort_values(by='box_office', ascending=False)
        elif sort_by == "Rating" or sort_by == "imdb_rating":
            df = df.sort_values(by='imdb_rating', ascending=False)
        elif sort_by == "Release Year" or sort_by == "year":
            df = df.sort_values(by='year', ascending=False)
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
                "genres": row['genres_list'] if 'genres_list' in row else [row.get('genre', '')],
                "roi": float(row['roi']) if pd.notna(row['roi']) else None,
                "box_office": float(row['box_office']) if pd.notna(row['box_office']) else 0,
                "financial_status": row.get('financial_status', 'complete'),
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

    def get_genre_yearly(self) -> List[Dict]:
        """Get yearly genre statistics as list of dicts"""
        if self.genre_year_stats is None or self.genre_year_stats.empty:
            return []
        df = self.genre_year_stats.copy()
        return df.fillna(0).to_dict('records')

    def get_genre_overall(self) -> List[Dict]:
        """Get overall genre statistics as list of dicts with market share"""
        if self.genre_overall_stats is None or self.genre_overall_stats.empty:
            return []
        df = self.genre_overall_stats.copy()
        
        # Ensure weighted_roi is present for dashboard/optimizer consistency
        if 'weighted_roi' not in df.columns and 'avg_roi' in df.columns:
            df['weighted_roi'] = df['avg_roi']
            
        # Add market share metrics
        total_volume = df['total_movies'].sum() if 'total_movies' in df.columns else 0
        total_bo = df['total_box_office'].sum() if 'total_box_office' in df.columns else 0
        df['volume_share'] = (df['total_movies'] / total_volume * 100) if total_volume > 0 else 0
        df['bo_share'] = (df['total_box_office'] / total_bo * 100) if total_bo > 0 else 0
        
        return df.fillna(0).to_dict('records')

    # Compatibility aliases
    def load_genre_yearly(self): return self.get_genre_yearly()
    def load_genre_overall(self): return self.get_genre_overall()

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
        """Get list of all unique individual genres, sorted alphabetically"""
        all_genres = set()
        for genres in self.movies['genres_list']:
            for g in genres:
                if g and g != "Unknown":
                    all_genres.add(g)
        return sorted(list(all_genres))
    
    def get_year_range(self) -> Dict:
        """Get min and max years in dataset"""
        return {
            'min_year': int(self.movies['year'].min()),
            'max_year': int(self.movies['year'].max())
        }
