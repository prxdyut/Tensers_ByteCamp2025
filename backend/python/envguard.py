from flask import Flask, render_template , flash , request , redirect , url_for , abort , jsonify
from flask_wtf import FlaskForm
from wtforms import StringField , SubmitField , PasswordField , BooleanField , ValidationError
from wtforms.validators import DataRequired , Length , EqualTo 
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime , timezone , date
from flask_cors import CORS
import os
import requests  , json
app = Flask(__name__)
# Configure CORS to allow all origins
CORS(app, 
     resources={r"/*": {
         "origins": "*",  # Allow all origins
         "methods": ["GET", "POST", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
     }})
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
API_KEY= "AIzaSyDpQP2ipTuApnppJdw0w0GpN-40F3pGKcA"
url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={API_KEY}"
PLACES_API_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json"


@app.route('/')
def index():
    first_name="Sujal"
    return render_template("index.html", my_first_name=first_name)

@app.route("/save_location")
def save_location():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    
    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    print("lat:", lat, "lon:", lon)
    
    try:
        # Get air quality data first
        location = {
            "location": {
                "latitude": lat,
                "longitude": lon
            }
        }
        headers = {
            "Content-Type": "application/json"
        }
        
        air_response = requests.post(url, json=location, headers=headers)
        air_data = air_response.json()
        
        # Try geocoding if possible
        try:
            geocoding_params = {
                "latlng": f"{lat},{lon}",
                "key": API_KEY,
                "language": "en"
            }
            
            geocoding_response = requests.get(GEOCODING_API_URL, params=geocoding_params)
            geocoding_data = geocoding_response.json()
            
            place_name = ""
            if geocoding_data.get('status') == 'OK' and geocoding_data.get('results'):
                result = geocoding_data['results'][0]
                for component in result.get('address_components', []):
                    if 'sublocality' in component['types'] or 'locality' in component['types']:
                        place_name = component['long_name']
                        break
                
                if not place_name:
                    place_name = result.get('formatted_address', '')
            
        except Exception as e:
            print(f"Geocoding failed: {str(e)}")
            # Fallback to coordinate-based name if geocoding fails
            place_name = f"Location ({lat}, {lon})"
        
        # Combine responses
        combined_response = {
            "place_name": place_name or f"Location ({lat}, {lon})",
            "air_quality_data": air_data
        }
        
        return jsonify(combined_response)
        
    except requests.exceptions.RequestException as e:
        print("Error in request:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/search_place")
def search_place():
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Search query is required"}), 400
    
    params = {
        "query": query,
        "key": API_KEY
    }
    
    try:
        response = requests.get(PLACES_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data.get('results'):
            # Get the first result
            place = data['results'][0]
            place_name = place.get('name', '')
            location = {
                "location": {
                    "latitude": place.get('geometry', {}).get('location', {}).get('lat', ''),
                    "longitude": place.get('geometry', {}).get('location', {}).get('lng', '')
                }
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            # Get air quality data
            air_response = requests.post(url, json=location, headers=headers)
            air_data = air_response.json()
            
            # Combine both responses
            combined_response = {
                "place_name": place_name,
                "air_quality_data": air_data
            }
            
            return jsonify(combined_response)
        else:
            return jsonify({'error': 'No places found'}), 404
            
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)