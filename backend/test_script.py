import sys
import os
sys.path.append(os.path.abspath('.'))
from services.data_service import DataService

try:
    ds = DataService(data_dir='../movie-data-pipeline')
    print("Testing get_genre_overall")
    res = ds.get_genre_overall()
    print("Length:", len(res))
    print("Testing get_risk_analysis")
    res2 = ds.get_risk_analysis()
    print("Length:", len(res2))
    print("Testing load_risk_data")
    res3 = ds.load_risk_data()
    print("Length:", len(res3))
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
