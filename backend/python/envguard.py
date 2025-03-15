from flask import Flask, render_template , flash , request , redirect , url_for , abort , jsonify
from flask_wtf import FlaskForm
from wtforms import StringField , SubmitField , PasswordField , BooleanField , ValidationError
from wtforms.validators import DataRequired , Length , EqualTo 
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime , timezone , date
import os
import requests  , json
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
API_KEY= "AIzaSyDpQP2ipTuApnppJdw0w0GpN-40F3pGKcA"
url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={API_KEY}"


@app.route('/')
def index():
    first_name="Sujal"
    return render_template("index.html", my_first_name=first_name)

@app.route("/save_location")
def save_location():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    print("lat:",lat,"lon:",lon)
    location = {
        "location": {
        "latitude": lat,
        "longitude": lon
    }}
    headers = {
    "Content-Type": "application/json"}

# Send POST request
    response = requests.post(url, json=location, headers=headers)

    return jsonify(response.json())
        # lat = request.args.get("lat")
        # lon = request.args.get("lon")

        # print(f"Received request: lat={lat}, lon={lon}")  # Debugging in terminal

        # if not lat or not lon:
        #     return jsonify({"error": "Latitude and longitude are required"}), 400

        # return jsonify({"message": "Location received", "latitude": lat, "longitude": lon})


    
    



if __name__ == "__main__":
    app.run(debug=True)