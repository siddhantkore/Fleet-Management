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

ACTIVITY_TYPES = ["idle", "driving", "walking", "stationary"]
NETWORK_TYPES = ["wifi", "cellular", "none"]

def get_base_url():
    for url in URL_OPTIONS:
        try:
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
    alt = random.uniform(500, 600)
    battery = random.uniform(0.5, 1.0)

    while True:
        # Move slightly
        lat += random.uniform(-0.001, 0.001)
        lon += random.uniform(-0.001, 0.001)
        alt += random.uniform(-5, 5)
        battery = max(0.05, battery - random.uniform(0, 0.005))

        speed = random.uniform(0, 25)  # m/s (0 – 90 km/h)
        heading = random.uniform(0, 360)
        is_driving = speed > 2
        activity = "driving" if is_driving else random.choice(["idle", "stationary"])
        is_charging = random.random() < 0.1  # 10% chance charging
        if is_charging:
            battery = min(1.0, battery + random.uniform(0.01, 0.03))

        # Send in the new FleetTrack nested format
        payload = {
            "metadata": {
                "device_id": f"sim-{driver_id}",
                "user_id": driver_id,
                "session_id": f"sim-session-{driver_id}",
                "schema_version": "1.2"
            },
            "timestamp": {
                "captured_at": int(time.time() * 1000),
                "sent_at": int(time.time() * 1000),
                "timezone": "Asia/Kolkata"
            },
            "location": {
                "coords": {
                    "lat": round(lat, 7),
                    "lng": round(lon, 7),
                    "alt": round(alt, 2)
                },
                "motion": {
                    "speed": round(speed, 2),
                    "heading": round(heading, 1),
                    "accuracy_h": round(random.uniform(3, 30), 1),
                    "accuracy_v": round(random.uniform(1, 5), 1)
                }
            },
            "context": {
                "activity_type": activity,
                "battery_level": round(battery, 4),
                "is_charging": is_charging,
                "network_type": random.choice(NETWORK_TYPES)
            },
            "events": [
                {
                    "type": "location_update",
                    "value": activity
                }
            ]
        }

        try:
            url = f"{BASE_URL}/{driver_id}"
            response = requests.post(url, json=payload)
            status_icon = "🟢" if response.status_code == 200 else "🔴"
            print(f"{status_icon} {driver_id} | spd={speed:.1f}m/s | bat={battery:.0%} | {activity} | {response.status_code}")
        except Exception as e:
            print(f"❌ Error updating {driver_id}: {e}")

        time.sleep(random.randint(5, 15))

if __name__ == "__main__":
    print(f"Starting enriched simulation for {len(DRIVERS)} drivers...")
    import threading

    # Run a few drivers in threads to simulate simultaneous updates
    threads = []
    drivers = [1, 3, 4, 5, 6, 7, 8, 9, 10]
    # We will not show one of driver to see behaiviour of app even a driver is in database but he is not on trip live so we can see what happen
    for i in drivers:  # Simulate 10 drivers for now
        t = threading.Thread(target=simulate_driver, args=(DRIVERS[i],), daemon=True)
        t.start()
        threads.append(t)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping simulation...")
