from fastapi.testclient import TestClient
from main import app
import sys, os
import traceback

sys.path.append(os.path.abspath('.'))

client = TestClient(app)

print("Starting tests...")
try:
    with TestClient(app) as client:
        print("Testing /api/genre/overall")
        response = client.get("/api/genre/overall")
        print(f"Status code: {response.status_code}")
        if response.status_code != 200:
            print("Response:", response.json())
            
        print("Testing /api/risk/genre")
        response = client.get("/api/risk/genre")
        print(f"Status code: {response.status_code}")
        if response.status_code != 200:
            print("Response:", response.json())
            
except Exception as e:
    traceback.print_exc()
