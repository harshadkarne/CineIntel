import sys
import os
sys.path.append(os.path.abspath('backend'))
from backend.services.data_service import DataService

try:
    ds = DataService(data_dir='movie-data-pipeline')
    print("Testing get_genre_overall")
    ds.get_genre_overall()
    print("Testing get_risk_analysis")
    ds.get_risk_analysis()
    print("Testing load_risk_data")
    ds.load_risk_data()
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
