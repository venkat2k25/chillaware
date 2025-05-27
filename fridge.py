from fastapi import FastAPI, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import json
import datetime
from collections import defaultdict
import time
import os
import io
import logging
from typing import Dict, List, Optional
from pydantic import BaseModel
import asyncio
from contextlib import asynccontextmanager

# Configure logging to console only
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Pydantic models for request/response
class DetectionResult(BaseModel):
    item: str
    confidence: float
    count: int
    bbox: List[int]  # [x, y, width, height]
    category: str

class ScanResponse(BaseModel):
    success: bool
    detections: List[DetectionResult]
    total_new_items: int
    message: str

class InventoryItem(BaseModel):
    name: str
    count: int
    category: str
    last_detected: str
    confidence: float

class InventoryResponse(BaseModel):
    items: Dict[str, InventoryItem]
    total_items: int
    unique_items: int
    categories: Dict[str, int]

class InventoryItemInput(BaseModel):
    name: str
    count: int
    category: str
    confidence: Optional[float] = 0.5  # Optional with default

class SaveInventoryRequest(BaseModel):
    items: List[InventoryItemInput]

class FridgeScanner:
    def __init__(self):
        self.fridge_items = defaultdict(lambda: {
            'count': 0,
            'category': 'Other',
            'last_detected': None,
            'confidence': 0.0
        })
        self.detection_history = []
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.3"))
        self.nms_threshold = float(os.getenv("NMS_THRESHOLD", "0.4"))
        self.detection_cooldown = {}
        self.cooldown_duration = float(os.getenv("COOLDOWN_DURATION", "2.0"))
        
        self.food_categories = {
            'apple': 'Fruits', 'banana': 'Fruits', 'orange': 'Fruits', 
            'lemon': 'Fruits', 'pear': 'Fruits', 'grape': 'Fruits',
            'strawberry': 'Fruits', 'watermelon': 'Fruits', 'pineapple': 'Fruits',
            'mango': 'Fruits', 'avocado': 'Fruits', 'peach': 'Fruits',
            'carrot': 'Vegetables', 'broccoli': 'Vegetables', 'potato': 'Vegetables',
            'tomato': 'Vegetables', 'onion': 'Vegetables', 'pepper': 'Vegetables',
            'cucumber': 'Vegetables', 'lettuce': 'Vegetables', 'cabbage': 'Vegetables',
            'corn': 'Vegetables', 'celery': 'Vegetables', 'mushroom': 'Vegetables',
            'bottle': 'Beverages', 'cup': 'Beverages', 'wine glass': 'Beverages',
            'milk': 'Beverages', 'juice': 'Beverages', 'soda': 'Beverages',
            'water bottle': 'Beverages', 'beer': 'Beverages', 'wine': 'Beverages',
            'sandwich': 'Food', 'pizza': 'Food', 'hot dog': 'Food',
            'hamburger': 'Food', 'bread': 'Food', 'cheese': 'Food',
            'egg': 'Food', 'meat': 'Food', 'chicken': 'Food',
            'fish': 'Food', 'pasta': 'Food', 'rice': 'Food',
            'soup': 'Food', 'salad': 'Food', 'yogurt': 'Dairy',
            'cake': 'Desserts', 'donut': 'Desserts', 'cookie': 'Desserts',
            'ice cream': 'Desserts', 'chocolate': 'Desserts', 'candy': 'Desserts',
            'bowl': 'Containers', 'plate': 'Containers', 'jar': 'Containers',
            'can': 'Containers', 'box': 'Containers',
            'spoon': 'Utensils', 'knife': 'Utensils', 'fork': 'Utensils'
        }
        
        self.setup_detection_model()

    def setup_detection_model(self):
        model_files = {
            "weights": os.getenv("YOLO_WEIGHTS", "yolov3.weights"),
            "cfg": os.getenv("YOLO_CFG", "yolov3.cfg"),
            "names": os.getenv("YOLO_NAMES", "coco.names")
        }
        files_exist = all(os.path.exists(f) for f in model_files.values())
        
        if files_exist:
            try:
                self.net = cv2.dnn.readNet(model_files["weights"], model_files["cfg"])
                with open(model_files["names"], 'r') as f:
                    self.class_names = [line.strip() for line in f.readlines()]
                
                layer_names = self.net.getLayerNames()
                self.output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
                self.use_yolo = True
                logger.info("YOLO model loaded successfully")
            except Exception as e:
                logger.error(f"Error loading YOLO: {str(e)}")
                self.setup_fallback_detection()
        else:
            logger.warning("YOLO model files not found. Falling back to color-based detection")
            self.setup_fallback_detection()
    
    def setup_fallback_detection(self):
        self.use_yolo = False
        self.class_names = list(self.food_categories.keys())
        self.color_ranges = {
            'apple': [(0, 50, 50), (10, 255, 255)],
            'banana': [(20, 100, 100), (30, 255, 255)],
            'orange': [(10, 100, 100), (20, 255, 255)],
            'carrot': [(10, 100, 100), (20, 255, 255)],
            'broccoli': [(40, 50, 50), (80, 255, 255)],
            'bottle': [(100, 50, 50), (130, 255, 255)],
            'tomato': [(0, 100, 100), (10, 255, 255)],
            'lemon': [(25, 100, 100), (35, 255, 255)],
            'milk': [(0, 0, 200), (180, 30, 255)],
            'cheese': [(20, 100, 100), (30, 255, 255)],
        }
        logger.info("Using fallback color-based detection method")
    
    async def detect_objects_async(self, frame: np.ndarray) -> List[DetectionResult]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.detect_objects, frame)
    
    def detect_objects(self, frame: np.ndarray) -> List[DetectionResult]:
        if frame.shape[0] > 1024 or frame.shape[1] > 1024:
            scale = min(1024 / frame.shape[0], 1024 / frame.shape[1])
            frame = cv2.resize(frame, None, fx=scale, fy=scale)
            logger.info(f"Resized image to {frame.shape[1]}x{frame.shape[0]}")
        
        if self.use_yolo:
            return self.detect_objects_yolo(frame)
        else:
            return self.detect_objects_fallback(frame)
    
    def detect_objects_yolo(self, frame: np.ndarray) -> List[DetectionResult]:
        height, width, channels = frame.shape
        blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
        self.net.setInput(blob)
        outputs = self.net.forward(self.output_layers)
        
        boxes = []
        confidences = []
        class_ids = []
        
        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                if confidence > self.confidence_threshold:
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)
        
        indexes = cv2.dnn.NMSBoxes(boxes, confidences, self.confidence_threshold, self.nms_threshold)
        
        detections = []
        if len(indexes) > 0:
            for i in indexes.flatten():
                class_name = self.class_names[class_ids[i]]
                if self.is_food_item(class_name):
                    detections.append(DetectionResult(
                        item=class_name,
                        confidence=confidences[i],
                        count=1,
                        bbox=boxes[i],
                        category=self.food_categories.get(class_name, 'Other')
                    ))
        
        return detections
    
    def detect_objects_fallback(self, frame: np.ndarray) -> List[DetectionResult]:
        detections = []
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        for item_name, (lower, upper) in self.color_ranges.items():
            lower = np.array(lower)
            upper = np.array(upper)
            mask = cv2.inRange(hsv, lower, upper)
            kernel = np.ones((5,5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 300:
                    x, y, w, h = cv2.boundingRect(contour)
                    confidence = min(area / 3000, 0.9)
                    detections.append(DetectionResult(
                        item=item_name,
                        confidence=confidence,
                        count=1,
                        bbox=[x, y, w, h],
                        category=self.food_categories.get(item_name, 'Other')
                    ))
        return detections
    
    def is_food_item(self, class_name: str) -> bool:
        class_name_lower = class_name.lower()
        if class_name_lower in self.food_categories:
            return True
        food_keywords = [
            'food', 'fruit', 'vegetable', 'drink', 'beverage', 
            'meat', 'dairy', 'snack', 'meal', 'bread', 'cheese',
            'milk', 'juice', 'water', 'soda', 'beer', 'wine',
            'soup', 'salad', 'pasta', 'rice', 'fish', 'chicken',
            'egg', 'yogurt', 'ice cream', 'chocolate', 'candy'
        ]
        if any(keyword in class_name_lower for keyword in food_keywords):
            return True
        actual_food_classes = [
            'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
            'hot dog', 'pizza', 'donut', 'cake', 'bottle', 'egg', 'yogurt'
        ]
        return class_name_lower in actual_food_classes
    
    def add_detected_items(self, detections: List[DetectionResult]) -> int:
        total_added = 0
        current_time = time.time()
        item_counts = defaultdict(int)
        item_confidences = defaultdict(list)
        for detection in detections:
            item_counts[detection.item] += detection.count
            item_confidences[detection.item].append(detection.confidence)
        for item_name, count in item_counts.items():
            if item_name in self.detection_cooldown:
                if current_time - self.detection_cooldown[item_name] < self.cooldown_duration:
                    continue
            avg_confidence = sum(item_confidences[item_name]) / len(item_confidences[item_name])
            self.fridge_items[item_name]['count'] += count
            self.fridge_items[item_name]['category'] = self.food_categories.get(item_name, 'Other')
            self.fridge_items[item_name]['last_detected'] = datetime.datetime.now().isoformat()
            self.fridge_items[item_name]['confidence'] = avg_confidence
            self.detection_cooldown[item_name] = current_time
            total_added += count
            self.detection_history.append({
                'item': item_name,
                'count': count,
                'confidence': avg_confidence,
                'timestamp': datetime.datetime.now().isoformat()
            })
        return total_added
    
    def get_inventory(self) -> Dict:
        inventory_items = {}
        for item_name, item_data in self.fridge_items.items():
            if item_data['count'] > 0:
                inventory_items[item_name] = InventoryItem(
                    name=item_name,
                    count=item_data['count'],
                    category=item_data['category'],
                    last_detected=item_data['last_detected'] or '',
                    confidence=item_data['confidence']
                )
        categories = defaultdict(int)
        for item_data in inventory_items.values():
            categories[item_data.category] += item_data.count
        return {
            'items': inventory_items,
            'total_items': sum(item.count for item in inventory_items.values()),
            'unique_items': len(inventory_items),
            'categories': dict(categories)
        }
    
    def clear_inventory(self):
        self.fridge_items.clear()
        self.detection_cooldown.clear()
        self.detection_history.clear()
    
    def remove_item(self, item_name: str, count: int = 1) -> bool:
        if item_name in self.fridge_items and self.fridge_items[item_name]['count'] >= count:
            self.fridge_items[item_name]['count'] -= count
            if self.fridge_items[item_name]['count'] == 0:
                del self.fridge_items[item_name]
            return True
        return False

# Global scanner instance
scanner = FridgeScanner()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Smart Fridge Scanner API",
    description="Real-time object detection API for fridge inventory management",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Smart Fridge Scanner API",
        "status": "active",
        "detection_method": "YOLO" if scanner.use_yolo else "Fallback",
        "confidence_threshold": scanner.confidence_threshold
    }

@app.post("/process_image", response_model=ScanResponse)
async def process_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format or corrupted image")

        detections = await scanner.detect_objects_async(frame)
        total_added = scanner.add_detected_items(detections)

        return ScanResponse(
            success=True,
            detections=detections,
            total_new_items=total_added,
            message=f"Processed image. Detected {len(detections)} item(s), added {total_added} new item(s)."
        )
    except Exception as e:
        logger.exception("Failed to process image")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.get("/inventory", response_model=InventoryResponse)
async def get_inventory():
    try:
        inventory = scanner.get_inventory()
        return InventoryResponse(**inventory)
    except Exception as e:
        logger.error(f"Failed to get inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get inventory: {str(e)}")

@app.post("/inventory/save")
async def save_inventory(request: SaveInventoryRequest):
    try:
        # Validate all required fields for each item
        for item in request.items:
            if not item.name or item.count is None or not item.category:
                raise HTTPException(status_code=422, detail="Each item must have name, count, and category")
        total_added = 0
        current_time = time.time()
        for item in request.items:
            item_name = item.name
            count = item.count
            category = item.category
            confidence = item.confidence if item.confidence is not None else 0.5
            if item_name in scanner.detection_cooldown:
                if current_time - scanner.detection_cooldown[item_name] < scanner.cooldown_duration:
                    continue
            scanner.fridge_items[item_name]['count'] += count
            scanner.fridge_items[item_name]['category'] = category
            scanner.fridge_items[item_name]['last_detected'] = datetime.datetime.now().isoformat()
            scanner.fridge_items[item_name]['confidence'] = confidence
            scanner.detection_cooldown[item_name] = current_time
            total_added += count
            scanner.detection_history.append({
                'item': item_name,
                'count': count,
                'confidence': confidence,
                'timestamp': datetime.datetime.now().isoformat()
            })
        return {
            "success": True,
            "message": f"Saved {total_added} items to inventory",
            "total_added": total_added
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save inventory: {str(e)}")

@app.delete("/inventory")
async def clear_inventory():
    try:
        scanner.clear_inventory()
        return {"success": True, "message": "Inventory cleared"}
    except Exception as e:
        logger.error(f"Failed to clear inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to clear inventory: {str(e)}")

@app.delete("/inventory/{item_name}")
async def remove_item(item_name: str, count: int = 1):
    try:
        success = scanner.remove_item(item_name, count)
        if success:
            return {"success": True, "message": f"Removed {count} {item_name}(s)"}
        else:
            raise HTTPException(status_code=404, detail="Item not found or insufficient quantity")
    except Exception as e:
        logger.error(f"Failed to remove item: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to remove item: {str(e)}")

@app.get("/inventory/history")
async def get_detection_history():
    return {"history": scanner.detection_history}

@app.get("/categories")
async def get_categories():
    return {"categories": scanner.food_categories}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "total_items": sum(item['count'] for item in scanner.fridge_items.values()),
        "detection_method": "YOLO" if scanner.use_yolo else "Fallback",
        "confidence_threshold": scanner.confidence_threshold,
        "food_categories": len(scanner.food_categories)
    }

@app.get("/config")
async def get_config():
    return {
        "detection_method": "YOLO" if scanner.use_yolo else "Fallback",
        "confidence_threshold": scanner.confidence_threshold,
        "nms_threshold": scanner.nms_threshold,
        "cooldown_duration": scanner.cooldown_duration,
        "total_food_categories": len(scanner.food_categories),
        "yolo_available": scanner.use_yolo,
        "yolo_classes": len(scanner.class_names) if scanner.use_yolo else 0
    }

@app.post("/config/threshold")
async def update_threshold(confidence: float):
    if 0.3 <= confidence <= 1.0:
        scanner.confidence_threshold = confidence
        return {"success": True, "message": f"Confidence threshold updated to {confidence}"}
    else:
        raise HTTPException(status_code=400, detail="Confidence must be between 0.3 and 1.0")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "fridge:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )