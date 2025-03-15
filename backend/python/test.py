import os
import requests

API_KEY = os.getenv('API_KEY')
PLACES_API_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

params = {
    "query": "Worli Mumbai",
    "key": API_KEY
}

try:
    response = requests.get(PLACES_API_URL, params=params)
    response.raise_for_status()
    data = response.json()

    # Extract latitude
    if "results" in data and len(data["results"]) > 0:
        latitude = data["results"][0]["geometry"]["location"]["lat"]
        print("Latitude:", latitude)
    else:
        print("No results found.")

except requests.exceptions.RequestException as e:
    print({"error": str(e)})
