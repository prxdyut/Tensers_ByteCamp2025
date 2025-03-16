from flask_cors import CORS
from flask import Flask, render_template, Response, jsonify, request
import cv2
import logging
from datetime import datetime
import sys
import os
import time
from dotenv import load_dotenv
import base64
import numpy as np
import uuid
import json
import traceback
from assistant import DoctorAgent  # Make sure this import works

# Load environment variables from .env file
load_dotenv() 

# Add the Proctoring-AI folder to Python path
proctoring_ai_path = os.path.join(os.path.dirname(__file__), 'Proctoring-AI')
if os.path.exists(proctoring_ai_path):
    sys.path.append(proctoring_ai_path)
else:
    logger.error(f"Proctoring-AI directory not found at {proctoring_ai_path}")
    raise RuntimeError("Required Proctoring-AI directory not found")




mouth_open_count = 0
# Configure logging with timestamps
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, supports_credentials=True, origins="http://localhost:5173")

def get_camera():
    """Initialize camera with error handling"""
    try:
        camera = cv2.VideoCapture(0)
        
        if not camera.isOpened():
            raise RuntimeError("Could not initialize camera")
        return camera
    except Exception as e:
        logger.error(f"Camera initialization failed: {str(e)}")
        raise

detection_history = []
total_frames = 0
# phone_detection_count = 0
emotion_counts = {
    'angry': 0,
    'disgust': 0,
    'fear': 0,
    'happy': 0,
    'sad': 0,
    'surprise': 0,
    'neutral': 0
}
phone_detected_count = 0
eye_movement_counts = {
    'looking_left': 0,
    'looking_right': 0,
    'looking_up': 0,
    'looking_normal': 0
}
head_pose_counts = {
    'Head up': 0,
    'Head down': 0,
    'Head left': 0,
    'Head right': 0,
    'Normal': 0
}


# @app.route('/api/test', methods=['GET'])
# def test():
#     try:
#         camera = get_camera()
#         camera.release()
#         return jsonify({
#             "status": "Server is running",
#             "camera": "Camera is accessible",
#             "timestamp": datetime.now().isoformat()
#         })
#     except Exception as e:
#         logger.error(f"Test endpoint error: {str(e)}")
#         return jsonify({
#             "status": "Server is running",
#             "camera": f"Camera error: {str(e)}",
#             "timestamp": datetime.now().isoformat()
#         }), 500
        


# @app.route('/api/detection-counts', methods=['GET'])
# def get_detection_counts():
#     try:
#         return jsonify({
#             "total_frames": total_frames,
#             "phone_detected_count": phone_detected_count,
#             "emotion_counts": emotion_counts,
#             "eye_movement_counts": eye_movement_counts,
#             "head_pose_counts": head_pose_counts,
#             "mouth_open_count": mouth_open_count,
#             "detection_history": detection_history[-10:],  # Only return last 10 events
#             "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#         })
#     except Exception as e:
#         logger.error(f"Error getting detection counts: {str(e)}")
#         return jsonify({"error": str(e)}), 500
    

# @app.route('/api/end-interview', methods=['GET'])
# def end_interview():
#     # Reset all counters
#     global total_frames, phone_detected_count, eye_movement_counts
#     global head_pose_counts, emotion_counts, mouth_open_count
#     try:
#         final_results = {
#             "total_frames": total_frames,
#             "phone_detection": {
#                 "total_detections": phone_detected_count,
#                 "percentage": (phone_detected_count / total_frames * 100) if total_frames > 0 else 0
#             },
#             "eye_movements": {
#                 "counts": eye_movement_counts,
#                 "percentages": {k: (v / total_frames * 100) if total_frames > 0 else 0 
#                               for k, v in eye_movement_counts.items()}
#             },
#             "head_pose": {
#                 "counts": head_pose_counts,
#                 "percentages": {k: (v / total_frames * 100) if total_frames > 0 else 0 
#                               for k, v in head_pose_counts.items()}
#             },
#             "emotions": {
#                 "counts": emotion_counts,
#                 "percentages": {k: (v / total_frames * 100) if total_frames > 0 else 0 
#                               for k, v in emotion_counts.items()}
#             },
#             "mouth_movements": {
#                 "total_open_count": mouth_open_count,
#                 "percentage": (mouth_open_count / total_frames * 100) if total_frames > 0 else 0
#             },
#             "session_duration": total_frames / 30 if total_frames > 0 else 0,  # Assuming 30 fps
#             "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#         }
        
        
        
#         total_frames = 0
#         phone_detected_count = 0
#         eye_movement_counts = {k: 0 for k in eye_movement_counts}
#         head_pose_counts = {k: 0 for k in head_pose_counts}
#         emotion_counts = {k: 0 for k in emotion_counts}
#         mouth_open_count = 0
        
#         return jsonify(final_results)
#     except Exception as e:
#         logger.error(f"Error ending interview: {str(e)}")
#         return jsonify({"error": str(e)}), 500


# viva_sessions = {}

# def get_api_keys():
#     api_keys_str = os.environ.get('GEMINI_API_KEY', '')
#     print(f"API keys found: {bool(api_keys_str)}")  # Debug output
#     if not api_keys_str:
#         # Fallback to a default key for development
#         return ["AIzaSyBV2_8SW0tufxTjfLfWM0GM6xUDOGxEO8M"]
    
#     keys = api_keys_str.split(',')
#     print(f"Number of API keys: {len(keys)}")  # Debug output
#     return keys

# @app.route('/api/viva/start', methods=['POST'])
# def start_viva():
#     """
#     Start a new viva session.
    
#     Expected JSON payload:
#     {
#         "student_name": "John Doe",
#         "student_info": "Computer Science student, 3rd year",
#         "subject": "Database Management Systems",
#         "syllabus": "SQL, Normalization, Transaction Management, etc.",
#         "teacher_notes": "Focus on normalization and transaction isolation levels",
#         "difficulty": 70,
#         "tasks": 2,
#         "max_questions": 5
#     }
#     """
#     try:
#         # Check if content type is application/json
#         if not request.is_json:
#             return jsonify({"error": "Request must be JSON"}), 415
            
#         data = request.json
        
#         # Validate required fields
#         required_fields = ["student_name", "subject"]
#         for field in required_fields:
#             if field not in data or not data[field]:  # Check for empty strings too
#                 return jsonify({"error": f"Missing or empty required field: {field}"}), 400
        
#         # Type validation for numeric fields
#         try:
#             if "difficulty" in data and data["difficulty"] is not None:
#                 data["difficulty"] = int(data["difficulty"])
#                 if not (1 <= data["difficulty"] <= 100):
#                     return jsonify({"error": "Difficulty must be between 1 and 100"}), 400
                    
#             if "tasks" in data and data["tasks"] is not None:
#                 data["tasks"] = int(data["tasks"])
#                 if data["tasks"] < 0:
#                     return jsonify({"error": "Number of coding tasks must be non-negative"}), 400
#         except ValueError:
#             return jsonify({"error": "Numeric fields must contain valid numbers"}), 400
        
#         # Create a unique session ID
#         import uuid
#         session_id = str(uuid.uuid4())
        
#         # Initialize configuration with default values
#         config = {
#             "student_name": data.get("student_name"),
#             "student_info": data.get("student_info", ""),
#             "subject": data.get("subject"),
#             "syllabus": data.get("syllabus", ""),
#             "teacher_notes": data.get("teacher_notes", ""),
#             "difficulty": data.get("difficulty", 50),
#             "tasks": data.get("tasks", 2),
#             "max_questions": data.get("max_questions", 5)
#         }
        
#         # Initialize the viva agent
#         api_keys = get_api_keys()
#         if not api_keys:
#             return jsonify({"error": "No API keys configured"}), 500
            
#         viva_agent = VivaExaminationAgent(gemini_api_keys=api_keys, config=config)
        
#         # Store the agent in the sessions dictionary with a timestamp
#         viva_sessions[session_id] = {
#             "agent": viva_agent,
#             "created_at": time.time()
#         }
        
#         # Start the viva and get the introduction message
#         intro_response = viva_agent.start_viva()
        
#         response_json = {
#             "session_id": session_id,
#             "message": intro_response["message"]
#         }
        
#         return jsonify(response_json)
    
#     except Exception as e:
#         app.logger.error(f"Error starting viva: {str(e)}", exc_info=True)
#         return jsonify({"error": "An internal server error occurred"}), 500
    

# @app.route('/api/viva/message', methods=['POST'])
# def send_message():
#     """
#     Send a message to an active viva session.
    
#     Expected JSON payload:
#     {
#         "session_id": "uuid-from-start-viva",
#         "message": "User's message"
        
#     }
#     """
#     try:
#         # Check if content type is application/json
#         if not request.is_json:
#             return jsonify({"error": "Request must be JSON"}), 415
            
#         data = request.json
        
#         # Validate required fields
#         required_fields = ["session_id", "message"]
#         for field in required_fields:
#             if field not in data or data[field] is None:
#                 return jsonify({"error": f"Missing required field: {field}"}), 400
        
#         session_id = data["session_id"]
#         message = str(data["message"]).strip()  # Convert to string and strip whitespace
        
#         if not message:
#             return jsonify({"error": "Message cannot be empty"}), 400
        
#         # Check if the session exists
#         if session_id not in viva_sessions:
#             return jsonify({"error": "Invalid session ID or session expired"}), 404
        
#         # Get the viva agent
#         viva_agent = viva_sessions[session_id]["agent"]
        
#         # Update last activity timestamp
#         viva_sessions[session_id]["last_activity"] = time.time()
        
#         # Process the message
#         response = viva_agent.process_message(message)
        
#         # Create the response JSON
#         response_json = {
#             "session_id": session_id,
#             "message": response["message"]
#         }
        
#         # Add 'task' field if it's a task
#         if response.get("isTask", False):
#             response_json["task"] = response["message"]
        
#         return jsonify(response_json)
    
#     except Exception as e:
#         app.logger.error(f"Error processing message: {str(e)}", exc_info=True)
#         return jsonify({"error": "An internal server error occurred"}), 500

# @app.route('/api/viva/status', methods=['GET'])
# def get_status():
#     """
#     Get the status of a viva session.
    
#     Expected query parameter:
#     session_id=uuid-from-start-viva
#     """
#     try:
#         session_id = request.args.get('session_id')
        
#         if not session_id:
#             return jsonify({"error": "Missing session_id parameter"}), 400
        
#         # Check if the session exists
#         if session_id not in viva_sessions:
#             return jsonify({"error": "Invalid session ID or session expired"}), 404
        
#         viva_agent = viva_sessions[session_id]
        
#         # Get session information
#         status = {
#             "session_id": session_id,
#             "student_name": viva_agent.student_name,
#             "subject": viva_agent.subject,
#             "total_tasks": viva_agent.total_tasks,
#             "completed_tasks": viva_agent.completed_tasks,
#             "messages_count": len(viva_agent.conversation_history),
#             "active": True
#         }
        
#         return jsonify(status)
    
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/viva/history', methods=['GET'])
# def get_history():
#     """
#     Get the conversation history of a viva session.
    
#     Expected query parameter:
#     session_id=uuid-from-start-viva
#     """
#     try:
#         session_id = request.args.get('session_id')
        
#         if not session_id:
#             return jsonify({"error": "Missing session_id parameter"}), 400
        
#         # Check if the session exists
#         if session_id not in viva_sessions:
#             return jsonify({"error": "Invalid session ID or session expired"}), 404
        
#         viva_agent = viva_sessions[session_id]
        
#         return jsonify({
#             "session_id": session_id,
#             "history": viva_agent.conversation_history
#         })
    
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/viva/end', methods=['POST'])
# def end_viva():
#     """
#     End a viva session.
    
#     Expected JSON payload:
#     {
#         "session_id": "uuid-from-start-viva"
#     }
#     """
#     try:
#         data = request.json
        
#         # Validate required fields
#         if "session_id" not in data:
#             return jsonify({"error": "Missing session_id field"}), 400
        
#         session_id = data["session_id"]
        
#         # Check if the session exists
#         if session_id not in viva_sessions:
#             return jsonify({"error": "Invalid session ID or session expired"}), 404
        
#         # Remove the session
#         del viva_sessions[session_id]
        
#         return jsonify({
#             "message": "Viva session ended successfully"
#         })
    
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


# @app.route('/analyze-patient', methods=['POST'])
# def analyze_patient():
#     data = request.json
#     user_id = data.get('userId')
#     text = data.get('text')
#     frame_data = data.get('frameData')
    
#     # Process the frame_data (base64 image)
#     if frame_data and frame_data.startswith('data:image/jpeg;base64,'):
#         # Remove the prefix
#         frame_data = frame_data.replace('data:image/jpeg;base64,', '')
#         # Decode base64 to image
#         image_bytes = base64.b64decode(frame_data)
#         # Convert to numpy array for processing
#         nparr = np.frombuffer(image_bytes, np.uint8)
#         img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
#         print("image recieved ")
#         # Analyze image for medical insights
#         # This is where you'd use computer vision models for medical analysis
#         # visual_observations = analyze_medical_image(img)
        
#         # # Combine visual and text analysis
#         # response = generate_medical_response(text, visual_observations)
        
#         # Return your response with audio, etc.
#         return jsonify({
#             'success': True,
#             # 'text': response,
#             # 'audio': generate_audio(response)  # Your audio generation function
#         })
#     else:
#         # Handle case with no valid image
#         # response = generate_medical_response(text)
#         return jsonify({
#             'success': True,
#             # 'text': response,
#             # 'audio': generate_audio(response)
#         })

doctor_sessions = {}

# Add this helper function first if not already defined
def get_api_keys():
    api_keys_str = os.environ.get('GEMINI_API_KEY', '')
    print(f"API keys found: {bool(api_keys_str)}")  # Debug output
    if not api_keys_str:
        # Fallback to a default key for development
        return ["AIzaSyBV2_8SW0tufxTjfLfWM0GM6xUDOGxEO8M"]
    
    keys = api_keys_str.split(',')
    print(f"Number of API keys: {len(keys)}")  # Debug output
    return keys


@app.route('/analyze-patient', methods=['POST'])
def analyze_patient():
    try:
        print("analyze-patient endpoint called")
        # Check if content type is application/json
        if not request.is_json:
            print("Error: Request is not JSON")
            return jsonify({"success": False, "error": "Request must be JSON"}), 415
            
        data = request.json
        
        # Extract data from request
        user_id = data.get('userId', 'anonymous')
        text = data.get('text', '')
        # Get pre-analyzed image data instead of raw frame
        image_analysis = data.get('imageAnalysis')
        
        print(f"Processing request for user: {user_id}")
        print(f"Text length: {len(text) if text else 0}")
        print(f"Image analysis present:", bool(image_analysis))
        
        if not text:
            return jsonify({"success": False, "error": "Message cannot be empty"}), 400
        
        # Get or create doctor agent for this user
        try:
            doctor_agent = get_or_create_doctor_agent(user_id)
            print(f"Doctor agent created/retrieved for user: {user_id}")
        except Exception as agent_error:
            logger.error(f"Error creating doctor agent: {str(agent_error)}")
            return jsonify({
                "success": False, 
                "error": "Could not initialize doctor agent", 
                "text": "I'm sorry, I encountered a technical issue. Please try again."
            }), 500
        
        # If no pre-analyzed image data was provided, use default message
        if not image_analysis:
            image_analysis = "No visual analysis available"
        
        # Process the message with the pre-analyzed image data
        try:
            response = doctor_agent.process_patient_message(text, image_analysis)
            print("Doctor agent processed message successfully")
        except Exception as process_error:
            logger.error(f"Error in doctor agent processing: {str(process_error)}")
            return jsonify({
                "success": False,
                "error": "Error processing message",
                "text": "I'm sorry, I encountered a problem analyzing your input. Please try again."
            }), 500
        
        # Return response with the actual message text
        return jsonify({
            "success": True,
            "text": response.get("message", "I'm analyzing your symptoms. Could you provide more details?"),
            "userId": user_id
        })
    
    except Exception as e:
        logger.error(f"Unexpected error in analyze_patient: {str(e)}", exc_info=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "An internal server error occurred",
            "text": "Sorry, I encountered an error processing your request. Please try again."
        }), 500
# Modify the analyze-medical-image endpoint to be a fallback only


@app.route('/analyze-medical-image', methods=['POST'])
def analyze_medical_image():
    try:
        print("analyze-medical-image endpoint called - this is now a fallback route")
        # This route now serves as a fallback if the Node.js direct analysis fails
        # Extract data from the multipart form
        user_id = request.form.get('userId', 'anonymous')
        message = request.form.get('text', '')
        
        # Check if an image was uploaded
        if 'image' not in request.files:
            return jsonify({"success": False, "error": "No image uploaded"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"success": False, "error": "No image selected"}), 400
        
        # Read and convert the image to base64
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Get or create doctor agent for this user
        doctor_agent = get_or_create_doctor_agent(user_id)
        
        # Process the uploaded medical image
        response = doctor_agent.process_uploaded_medical_image(message, image_data)
        
        # Return response
        return jsonify({
            "success": True,
            "text": response.get("message", ""),
            "userId": user_id
        })
    
    except Exception as e:
        logger.error(f"Error in fallback image analysis: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Fallback image analysis failed",
            "text": "Sorry, I encountered an error analyzing the uploaded image. Please try again."
        }), 500


def get_or_create_doctor_agent(user_id, patient_info=None):
    """Get or create a doctor agent for the specified user ID"""
    # Check if session exists for this user
    for session_id, session_data in doctor_sessions.items():
        if session_data.get("user_id") == user_id:
            # Update last activity timestamp
            doctor_sessions[session_id]["last_activity"] = time.time()
            
            # Optionally update patient info if provided
            if patient_info and patient_info != "":
                doctor_sessions[session_id]["agent"].config["patient_info"] = patient_info
                
            return doctor_sessions[session_id]["agent"]
    
    # If no session exists, create a new one
    api_keys = get_api_keys()
    if not api_keys:
        raise Exception("No API keys configured")
    
    # Create configuration for the doctor agent
    config = {
        "user_id": user_id,
        "patient_info": patient_info or ""
    }
    
    # Create new doctor agent
    doctor_agent = DoctorAgent(gemini_api_keys=api_keys, config=config)
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Store in sessions dictionary
    doctor_sessions[session_id] = {
        "agent": doctor_agent,
        "user_id": user_id,
        "created_at": time.time(),
        "last_activity": time.time()
    }
    
    return doctor_agent

# Add these routes to fix the 404 error
@app.route('/api/doctor/start', methods=['POST'])
def start_doctor_session():
    """
    Start a new doctor consultation session.
    
    Expected JSON payload:
    {
        "userId": "patient-identifier",
        "patientInfo": "Optional information about the patient"
    }
    """
    try:
        print("start_doctor_session")
        # Check if content type is application/json
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 415
            
        data = request.json
        
        # Extract user ID, default to a random ID if not provided
        user_id = data.get("userId", str(uuid.uuid4()))
        
        # Get optional patient info
        patient_info = data.get("patientInfo", "")
        
        # Get or create doctor agent
        doctor_agent = get_or_create_doctor_agent(user_id, patient_info)
        
        # Define a welcome message
        welcome_message = "Hello! I'm your AI doctor assistant. How can I help you today? Please describe your symptoms or health concerns."
        
        # Return the response
        return jsonify({
            "success": True,
            "userId": user_id,
            "message": welcome_message
        })
    
    except Exception as e:
        logger.error(f"Error starting doctor session: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "An internal server error occurred",
            "message": "Sorry, I couldn't start your doctor consultation. Please try again."
        }), 500

@app.route('/api/doctor/history', methods=['GET'])
def get_doctor_history():
    """
    Get the conversation history for a specific user
    """
    try:
        user_id = request.args.get('userId')
        
        if not user_id:
            return jsonify({"error": "Missing userId parameter"}), 400
        
        # Find the session for this user
        doctor_agent = None
        for session_id, session_data in doctor_sessions.items():
            if session_data.get("user_id") == user_id:
                doctor_agent = session_data["agent"]
                break
        
        if not doctor_agent:
            return jsonify({
                "success": False,
                "error": "No active session found for this user"
            }), 404
        
        return jsonify({
            "success": True,
            "userId": user_id,
            "history": doctor_agent.conversation_history
        })
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/doctor/end', methods=['POST'])
def end_doctor_session():
    """
    End a doctor session for a specific user
    """
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 415
            
        data = request.json
        user_id = data.get("userId")
        
        if not user_id:
            return jsonify({"error": "Missing userId field"}), 400
        
        # Find and remove the session for this user
        session_to_remove = None
        for session_id, session_data in doctor_sessions.items():
            if session_data.get("user_id") == user_id:
                session_to_remove = session_id
                break
        
        if session_to_remove:
            del doctor_sessions[session_to_remove]
            return jsonify({
                "success": True,
                "message": "Doctor session ended successfully"
            })
        
        # If no session found
        return jsonify({
            "success": False,
            "error": "No active session found for this user"
        }), 404
        
    except Exception as e:
        logger.error(f"Error ending doctor session: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    app.run(threaded=True, host="0.0.0.0", port=6500)