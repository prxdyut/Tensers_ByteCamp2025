from flask import Flask, Response, render_template_string, jsonify
import cv2
import time
import numpy as np
import os
import json
import threading
import requests  # Add this import for making HTTP requests

# Force CPU usage since CUDA libraries are missing
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Now import YOLO after setting environment variable
from ultralytics import YOLO

app = Flask(__name__)

# Load YOLO model
model = YOLO("best.pt")  # Replace with your actual model path

# Video path (or replace with live webcam stream 0)
video_path = "vid.mp4"  

# Global variables for flood detection status
flood_detected = False
flood_detection_time = None
flood_detection_details = {}
notification_sent = False  # Track if notification has been sent in this cycle
flood_detection_lock = threading.Lock()

# WhatsApp notification endpoint
NOTIFICATION_ENDPOINT = "https://35ff-136-232-248-186.ngrok-free.app/flood-alert"  # Replace with actual endpoint

def send_notification(location="vasai"):
    """Send a notification to the WhatsApp bot via API call"""
    try:
        # Make a GET request to the notification endpoint
        response = requests.get(f"{NOTIFICATION_ENDPOINT}?location={location}")
        
        if response.status_code == 200:
            print(f"Notification successfully sent for location: {location}")
            return True
        else:
            print(f"Failed to send notification. Status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error sending notification: {e}")
        return False

def generate_frames():
    global flood_detected, flood_detection_time, flood_detection_details, notification_sent
    
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print("Error: Could not open video file.")
        return
    
    # Reset the video if it reaches the end
    frame_count = 0
    
    while True:
        success, frame = cap.read()
        
        # If frame reading was not successful, reset the video
        if not success:
            print(f"End of video or error reading frame. Processed {frame_count} frames.")
            cap.release()
            cap = cv2.VideoCapture(video_path)  # Restart the video
            success, frame = cap.read()
            if not success:  # If still can't read, there's a problem with the file
                print("Error restarting video. Exiting.")
                break
            frame_count = 0
            
            # Reset global flood detection status and notification flag when restarting video
            with flood_detection_lock:
                flood_detected = False
                flood_detection_time = None
                flood_detection_details = {}
                notification_sent = False
            
            print("Video restarted.")
        
        frame_count += 1
        height, width = frame.shape[:2]
        
        # Process frame with model regardless of previous detections
        try:
            results = model(frame, conf=0.25)
            annotated_frame = results[0].plot()
            
            # Add detection information to the frame
            detections = len(results[0].boxes)
            
            if detections > 0:
                print(f"Frame {frame_count}: {detections} detections")
                for i, box in enumerate(results[0].boxes):
                    class_id = int(box.cls)
                    class_name = model.names[class_id]
                    confidence = float(box.conf)
                    print(f"  Detection {i+1}: {class_name}, Confidence: {confidence:.4f}")
                    
                    # Check if this is a flood detection
                    if "flood" in class_name.lower():
                        # Update global flood detection status
                        with flood_detection_lock:
                            current_flood_detected = flood_detected
                            current_notification_sent = notification_sent
                            
                            flood_detected = True
                            flood_detection_time = time.strftime("%Y-%m-%d %H:%M:%S")
                            flood_detection_details = {
                                "class": class_name,
                                "confidence": float(confidence),
                                "frame": frame_count,
                                "time": flood_detection_time
                            }
                        
                        # Add visual indicator to the frame
                        cv2.putText(annotated_frame, "FLOOD DETECTED!", (width//2-150, height//2), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
                        
                        # Send notification only once per video cycle
                        if not current_notification_sent:
                            # Make API call to send WhatsApp notification
                            notification_success = send_notification(location="vasai")
                            
                            with flood_detection_lock:
                                notification_sent = notification_success
                            
                            if notification_success:
                                print(f"API CALL MADE: Flood alert sent for Vasai at {flood_detection_time}")
                                print(f"This is the only notification for this video cycle.")
                            else:
                                print(f"Failed to make API call for notification.")
            
            cv2.putText(annotated_frame, f"Detections: {detections}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Add notification status to the frame
            with flood_detection_lock:
                if flood_detected:
                    notification_status = "Alert sent to WhatsApp" if notification_sent else "Alert pending"
                    cv2.putText(annotated_frame, notification_status, (10, height - 20), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
        except Exception as e:
            print(f"Error processing frame {frame_count}: {e}")
            # Use the original frame if processing fails
            annotated_frame = frame
        
        # Encode frame to JPEG
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_bytes = buffer.tobytes()

        # Stream frame over HTTP
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Add a small delay to control streaming rate
        time.sleep(0.03)  # ~30 FPS
    
    cap.release()

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/flood_status')
def flood_status():
    global flood_detected, flood_detection_time, flood_detection_details, notification_sent
    
    with flood_detection_lock:
        status = {
            "flood_detected": flood_detected,
            "detection_time": flood_detection_time,
            "details": flood_detection_details,
            "notification_sent": notification_sent
        }
    
    return jsonify(status)

@app.route('/flood_events')
def flood_events():
    def event_stream():
        global flood_detected, flood_detection_details, notification_sent
        last_status = False
        
        while True:
            with flood_detection_lock:
                current_status = flood_detected
                current_notification = notification_sent
                details = flood_detection_details.copy() if flood_detected else {}
            
            # Only send an event when the status changes to detected
            if current_status and not last_status:
                data = {
                    "flood_detected": True,
                    "notification_sent": current_notification,
                    "details": details
                }
                yield f"data: {json.dumps(data)}\n\n"
            
            last_status = current_status
            time.sleep(0.5)  # Check every half second
    
    return Response(event_stream(), mimetype="text/event-stream")

@app.route('/')
def index():
    return """
    <html>
    <head>
        <title>Flood Detection Stream</title>
        <style>
            body { font-family: Arial; text-align: center; margin: 20px; }
            h1 { color: #4285f4; }
            .video-container { margin: 20px auto; max-width: 800px; }
            .alert { 
                background-color: #f44336; 
                color: white; 
                padding: 15px; 
                margin: 15px auto; 
                max-width: 800px; 
                display: none; 
            }
            .status {
                margin: 10px auto;
                max-width: 800px;
                padding: 10px;
                background-color: #f1f1f1;
                border-radius: 5px;
            }
        </style>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Check initial status
                fetch('/flood_status')
                    .then(response => response.json())
                    .then(data => {
                        if (data.flood_detected) {
                            showFloodAlert(data.details, data.notification_sent);
                        }
                    });
                
                // Set up event source for real-time updates
                const eventSource = new EventSource('/flood_events');
                
                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    if (data.flood_detected) {
                        showFloodAlert(data.details, data.notification_sent);
                    }
                };
                
                eventSource.onerror = function() {
                    console.error('EventSource failed. Reconnecting...');
                    eventSource.close();
                    setTimeout(() => {
                        location.reload();
                    }, 5000);
                };
            });
            
            function showFloodAlert(details, notificationSent) {
                const alertDiv = document.getElementById('floodAlert');
                alertDiv.style.display = 'block';
                
                let detailsText = '';
                if (details) {
                    detailsText = `<br>Class: ${details.class || 'Unknown'}<br>
                                  Confidence: ${(details.confidence * 100).toFixed(2)}%<br>
                                  Time: ${details.time || 'Unknown'}<br>
                                  Location: Vasai`;
                }
                
                const notificationText = notificationSent ? 
                    '<br><span style="color: #8eff8e;">WhatsApp alert has been sent!</span>' : 
                    '<br><span style="color: #ffff8e;">WhatsApp alert pending...</span>';
                
                alertDiv.innerHTML = `<strong>ALERT!</strong> Flood detected!${detailsText}${notificationText}`;
            }
        </script>
    </head>
    <body>
        <h1>Flood Detection Live Stream</h1>
        <div id="floodAlert" class="alert"></div>
        <div class="video-container">
            <img src="/video_feed" width="100%" />
        </div>
        <div class="status">
            <p>System is monitoring for flood conditions...</p>
        </div>
    </body>
    </html>
    """

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)