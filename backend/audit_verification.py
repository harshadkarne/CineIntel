import sys
import os
import pandas as pd
import numpy as np
from pathlib import Path

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from services.data_service import DataService

def run_audit():
    print("--- CINEINTEL AUDIT VERIFICATION ---")
    
    # Initialize Service
    try:
        ds = DataService(data_dir="../movie-data-pipeline")
        print("[PASS] DataService initialized")
    except Exception as e:
        print(f"[FAIL] DataService initialization failed: {e}")
        return

    # 1. Data Validation Check
    print("\n1. DATA VALIDATION CHECK")
    years = ds.movies['year'].unique()
    year_min, year_max = min(years), max(years)
    print(f"Year Range: {year_min} - {year_max}")
    if year_min >= 1957 and year_max <= 2025:
        print("[PASS] Year range 1957-2025 strictly enforced")
    else:
        print(f"[FAIL] Invalid year range: {year_min}-{year_max}")

    # 2. Metric Correction Check
    print("\n2. METRIC CORRECTION CHECK")
    genre_stats = ds.genre_overall_stats
    if not genre_stats.empty:
        # Check Hit Rate logic (ROI > 1)
        # We'll check for a sample genre
        sample_genre = genre_stats.iloc[0]['genre']
        genre_movies = ds.movies[ds.movies['primary_genre'] == sample_genre]
        # Only movies with budget > 0 are considered for ROI analysis
        financial_pool = genre_movies[genre_movies['budget'] > 0]
        hits = len(financial_pool[financial_pool['roi'] > 1.0])
        expected_hit_rate = (hits / len(financial_pool)) * 100 if len(financial_pool) > 0 else 0
        actual_hit_rate = genre_stats[genre_stats['genre'] == sample_genre]['hit_rate'].values[0]
        
        if abs(expected_hit_rate - actual_hit_rate) < 0.01:
            print(f"[PASS] Hit Rate (ROI > 1) correct for {sample_genre}")
        else:
            print(f"[FAIL] Hit Rate mismatch for {sample_genre}: Expected {expected_hit_rate}, Actual {actual_hit_rate}")

        # Check Composite Risk Score
        risk_score = genre_stats.iloc[0]['risk_score']
        print(f"Sample Risk Score: {risk_score}")
        if 0 <= risk_score <= 1:
            print("[PASS] Composite Risk Score normalized (0-1)")
        else:
            print(f"[FAIL] Risk Score out of bounds: {risk_score}")

    # 3. Benchmark Mode Check
    print("\n3. BENCHMARK MODE CHECK")
    try:
        benchmark = ds.get_benchmark_data("Comedy", "Drama")
        print(f"Winner: {benchmark['winner']}")
        if "winner" in benchmark and "score_a" in benchmark:
            print("[PASS] Benchmark scoring and winner declaration active")
        else:
            print("[FAIL] Benchmark data missing fields")
    except Exception as e:
        print(f"[FAIL] Benchmark execution error: {e}")

    # 4. Genre Combination Check
    print("\n4. GENRE COMBINATIONS CHECK")
    combos = ds.get_genre_combinations()
    if len(combos['top_combinations']) > 0:
        print(f"[PASS] Genre combinations analyzed (Top {len(combos['top_combinations'])})")
    else:
        print("[FAIL] No genre combinations found")

    print("\n--- AUDIT COMPLETE ---")

if __name__ == "__main__":
    run_audit()
