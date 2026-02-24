import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.data_service import DataService
from services.simulation_service import SimulationService

def test_simulation():
    print("Initialising DataService...")
    ds = DataService(data_dir="./movie-data-pipeline")
    print("Initialising SimulationService...")
    ss = SimulationService(ds)
    
    genres = ["Action"]
    budget_cr = 20.0
    runtime = 135
    release_month = 12
    
    print(f"Running simulation for {genres}, {budget_cr} Cr, {runtime}m...")
    try:
        result = ss.simulate(genres, budget_cr, runtime, release_month)
        print("Simulation successful!")
        print(result['budget_intelligence'])
    except Exception as e:
        print("Simulation failed!")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_simulation()
