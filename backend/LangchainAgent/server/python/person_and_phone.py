import cv2
import torch
from ultralytics import YOLO

# Load YOLOv8 model
model = YOLO("yolov8s.pt")

def detect_phone_and_person(frame, conf_threshold=0.5):
    try:
        results = model(frame)[0]
        detections = []
        
        for r in results.boxes:
            class_id = int(r.cls.item())
            confidence = float(r.conf.item())
            
            # Check if object is person (0) or phone (67)
            if class_id in [0, 67] and confidence > conf_threshold:
                x1, y1, x2, y2 = map(int, r.xyxy[0].tolist())
                
                # Green for phone, Blue for person
                color = (0, 255, 0) if class_id == 67 else (255, 0, 0)
                label = 'Phone' if class_id == 67 else 'Person'
                
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f'{label} {confidence:.2f}', 
                           (x1, y1-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 
                           0.6, color, 2)
                
                detections.append({
                    "type": label,
                    "x": (x1 + x2) / (2 * frame.shape[1]),
                    "y": (y1 + y2) / (2 * frame.shape[0]),
                    "confidence": confidence
                })

        return frame, detections

    except Exception as e:
        print(f"Error in detect_phone_and_person: {str(e)}")
        return frame, []