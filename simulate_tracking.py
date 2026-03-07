import requests
import time
import random
import json

# Configuration
DRIVERS = [f"D{str(i).zfill(3)}" for i in range(1, 51)]
# Try both localhost and container name for flexibility
URL_OPTIONS = [
    "http://backend:8000/api/v1/tracking/owntracks",
    "http://localhost:8000/api/v1/tracking/owntracks"
]
PUNE_CENTER = (18.5204, 73.8567)

def get_base_url():
    for url in URL_OPTIONS:
        try:
            # Short timeout to check if reachable
            # Use /health instead of the full path to avoid 404/405 confusion during check
            test_url = url.split("/api/v1")[0] + "/health"
            requests.get(test_url, timeout=1)
            return url
        except:
            continue
    return URL_OPTIONS[1] # fallback to localhost

BASE_URL = get_base_url()
print(f"Using BASE_URL: {BASE_URL}")

def simulate_driver(driver_id):
    # Random starting point around Pune
    lat = PUNE_CENTER[0] + random.uniform(-0.1, 0.1)
    lon = PUNE_CENTER[1] + random.uniform(-0.1, 0.1)

    while True:
        # Move slightly
        lat += random.uniform(-0.001, 0.001)
        lon += random.uniform(-0.001, 0.001)

        payload = {
            "_type": "location",
            "lat": lat,
            "lon": lon,
            "tst": int(time.time()),
            "tid": driver_id[-2:],
            "topic": f"owntracks/fleet/{driver_id}"
        }

        try:
            url = f"{BASE_URL}/{driver_id}"
            response = requests.post(url, json=payload)
            print(f"Update for {driver_id}: {response.status_code}")
        except Exception as e:
            print(f"Error updating {driver_id}: {e}")

        time.sleep(random.randint(5, 15))

if __name__ == "__main__":
    print(f"Starting simulation for {len(DRIVERS)} drivers...")
    import threading

    # Run a few drivers in threads to simulate simultaneous updates
    threads = []
    for i in range(10):  # Simulate 10 drivers for now
        t = threading.Thread(target=simulate_driver, args=(DRIVERS[i],), daemon=True)
        t.start()
        threads.append(t)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping simulation...")
