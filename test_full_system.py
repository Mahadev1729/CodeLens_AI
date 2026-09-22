import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

PROJECT_DIR = Path(__file__).resolve().parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from backend.main import app

def test_full_system():
    client = TestClient(app)

    print("1. Testing Health Endpoint...")
    health_res = client.get("/api/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    health_json = health_res.json()
    print(f"   [OK] Health OK! DB Engine: {health_json.get('database_engine')}")

    print("2. Testing User Registration & Login...")
    test_user = "test_developer_2026"
    test_pwd = "SecurePassword123!"
    
    # Register
    reg_res = client.post("/api/auth/register", json={"username": test_user, "password": test_pwd})
    if reg_res.status_code == 200:
        print("   [OK] Registration OK!")
    else:
        print(f"   [INFO] User might already exist ({reg_res.json().get('detail')})")

    # Login
    login_res = client.post("/api/auth/login", json={"username": test_user, "password": test_pwd})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["token"]
    print(f"   [OK] Login OK! Token acquired: {token[:20]}...")

    headers = {"Authorization": f"Bearer {token}"}

    print("3. Testing Profile & Session...")
    profile_res = client.get("/api/auth/me", headers=headers)
    assert profile_res.status_code == 200
    print(f"   [OK] Profile OK! User: {profile_res.json().get('username')}")

    print("4. Testing Repository List...")
    repo_res = client.get("/api/repo/list", headers=headers)
    assert repo_res.status_code == 200
    repos = repo_res.json().get("repos", [])
    print(f"   [OK] Repo List OK! Found {len(repos)} existing repos.")

    print("5. Testing Activity Stats...")
    stats_res = client.get("/api/activities/stats", headers=headers)
    assert stats_res.status_code == 200
    print(f"   [OK] Stats OK! {stats_res.json()}")

    print("\nALL BACKEND & DATABASE TESTS PASSED WITH 0 ERRORS!")

if __name__ == "__main__":
    test_full_system()
