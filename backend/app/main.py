import os
import sys
import time
import pandas as pd
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from geopy.geocoders import Nominatim
from collections import defaultdict
import random
import logging
import json
from typing import Dict, Any, List, Optional

# Import model loader
from app.model_loader import model_loader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger(__name__)

# Define data paths
CURRENT_DIR = Path(__file__).parent.parent.parent.parent
DIVERSE_DATASET_PATH = CURRENT_DIR / "diverse_dataset.csv"
GEN_DATASET_PATH = CURRENT_DIR / "gen_ds.csv"

# Define request models
class PredictionRequest(BaseModel):
    text: str

class BatchPredictionRequest(BaseModel):
    texts: List[str]



class EventCreateRequest(BaseModel):
    caseId: str
    text: str
    user: str

class ThreatMapFilterRequest(BaseModel):
    timeRange: Optional[int] = 30  # days
    threatTypes: Optional[List[str]] = None
    priority: Optional[List[str]] = None

# Create FastAPI app
app = FastAPI(
    title="Threat Detection API",
    description="API for detecting threatening content in text",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for cases, events, and threat data
cases_db = {}
events_db = []
threat_data = []

# Load datasets
def load_datasets():
    global threat_data
    
    # Load and process datasets
    try:
        diverse_df = pd.read_csv(DIVERSE_DATASET_PATH)
        gen_df = pd.read_csv(GEN_DATASET_PATH)
        
        # Combine datasets
        diverse_df.columns = ['text', 'class']
        gen_df.columns = ['text', 'class']
        combined_df = pd.concat([diverse_df, gen_df], ignore_index=True)
        
        logger.info(f"Loaded combined dataset with {len(combined_df)} entries")
        
        # Skip geocoding to avoid timeouts
        # geocoder = Nominatim(user_agent="threat-detection-platform", timeout=1)
        
        # List of major cities for random assignment
        cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", 
                  "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
                  "Mumbai", "Delhi", "Bangalore", "Kolkata", "Hyderabad", "Chennai", "Pune",
                  "London", "Paris", "Tokyo", "Sydney", "Moscow", "Berlin"]
        
        # Sample at most 100 entries from each category for threat map
        for threat_class in combined_df['class'].unique():
            class_df = combined_df[combined_df['class'] == threat_class]
            if len(class_df) > 50:
                class_df = class_df.sample(50)
            
            for _, row in class_df.iterrows():
                city = random.choice(cities)
                # Use random coordinates instead of geocoding
                lat = random.uniform(-80, 80)
                lng = random.uniform(-180, 180)
                
                # Create threat entry
                date = (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat()
                
                # Determine priority based on threat class
                if threat_class == "Direct Violence Threats" or threat_class == "Child Safety Threats":
                    priority = random.choice(["critical", "high"])
                elif threat_class == "Hate Speech/Extremism":
                    priority = random.choice(["high", "medium"])
                elif threat_class == "Criminal Activity":
                    priority = random.choice(["medium", "high"])
                else:
                    priority = random.choice(["medium", "low"])
                
                threat_entry = {
                    "id": f"THR-{str(uuid.uuid4())[:8]}",
                    "type": threat_class,
                    "lat": lat,
                    "lng": lng,
                    "title": f"{threat_class} detected in {city}",
                    "location": city,
                    "date": date,
                    "priority": priority,
                    "details": row['text'][:100] + ("..." if len(row['text']) > 100 else ""),
                    "caseId": f"THP-{str(uuid.uuid4())[:8]}"
                }
                threat_data.append(threat_entry)
                    
        logger.info(f"Created {len(threat_data)} threat map entries")
        
        # Create some default cases based on threat data
        create_default_cases()
        
    except Exception as e:
        logger.error(f"Error loading datasets: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

def create_default_cases():
    # Create a few default cases based on the threat data
    try:
        case_count = min(10, len(threat_data))
        for i in range(case_count):
            threat = threat_data[i]
            case_id = threat["caseId"]
            
            # Create case
            case = {
                "id": case_id,
                "title": f"{threat['type']} in {threat['location']}",
                "target": random.choice(["Individual", "Organization", "Public", "Government", "Religious community"]),
                "status": threat["priority"],
                "threatType": threat["type"],
                "createdDate": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                "updatedDate": datetime.now().isoformat(),
                "assignedTo": random.choice(["Agent M. Johnson", "Agent S. Williams", "Agent T. Rodriguez", "Agent L. Patel", "Agent J. Anderson"]),
                "source": random.choice(["Social media", "Email", "Web forum", "Dark web", "Public report"]),
                "location": threat["location"],
                "confidence": round(random.uniform(85.0, 98.0), 1),
                "summary": threat["details"],
                "relatedCases": []
            }
            
            # Add events
            case_events = []
            
            # Case created event
            created_date = datetime.fromisoformat(case["createdDate"])
            case_events.append({
                "caseId": case_id,
                "date": created_date.isoformat(),
                "text": "Case created from threat detection system",
                "user": "System"
            })
            
            # Assignment event (same day)
            assigned_date = created_date + timedelta(hours=random.randint(1, 3))
            case_events.append({
                "caseId": case_id,
                "date": assigned_date.isoformat(),
                "text": f"Assigned to {case['assignedTo']}",
                "user": "Supervisor K. Smith"
            })
            
            # Additional events
            num_events = random.randint(1, 3)
            for j in range(num_events):
                event_date = assigned_date + timedelta(days=random.randint(1, 10))
                
                # Generate event description
                if j == 0:
                    text = f"Initial investigation completed. Analyzing digital evidence."
                elif j == 1:
                    text = f"Additional information collected. Continuing investigation."
                else:
                    text = f"Progress update: {random.choice(['Suspect identified', 'Evidence collected', 'Coordinating with local agencies', 'Analyzing related content'])}"
                
                case_events.append({
                    "caseId": case_id,
                    "date": event_date.isoformat(),
                    "text": text,
                    "user": case["assignedTo"]
                })
                
                # Update case last updated date
                case["updatedDate"] = event_date.isoformat()
            
            # Store case and events
            cases_db[case_id] = case
            events_db.extend(case_events)
            
        # Add some related cases
        for case_id, case in list(cases_db.items())[:5]:
            # Randomly select 1-2 related cases
            available_cases = [c for c in cases_db.keys() if c != case_id]
            if available_cases:
                num_related = min(len(available_cases), random.randint(1, 2))
                related_cases = random.sample(available_cases, num_related)
                case["relatedCases"] = related_cases
                
                # Update the related cases to establish bi-directional relationship
                for related_id in related_cases:
                    if related_id in cases_db:
                        if "relatedCases" not in cases_db[related_id]:
                            cases_db[related_id]["relatedCases"] = []
                        if case_id not in cases_db[related_id]["relatedCases"]:
                            cases_db[related_id]["relatedCases"].append(case_id)
        
        logger.info(f"Created {len(cases_db)} default cases with events")
        
    except Exception as e:
        logger.error(f"Error creating default cases: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

# Application startup event
@app.on_event("startup")
async def startup_event():
    # Try to use relative paths based on app directory
    app_dir = Path(__file__).parent.parent
    
    # Use explicit paths to the models
    models_dir = CURRENT_DIR / "models"
    stage1_dir = models_dir / "stage1_bin" / "checkpoint-1772"
    stage2_dir = models_dir / "stage2_multi" / "checkpoint-1296"
    
    # Fall back to absolute paths if needed
    if not stage1_dir.exists():
        stage1_dir = "/Users/darkarmy/Downloads/threat_detection/myProj/models/stage1_bin/checkpoint-1772"
    
    if not stage2_dir.exists():
        stage2_dir = "/Users/darkarmy/Downloads/threat_detection/myProj/models/stage2_multi/checkpoint-1296"
    
    logger.info(f"Loading two-stage models: {stage1_dir}, {stage2_dir}")
    if not model_loader.load_models(str(stage1_dir), str(stage2_dir)):
        logger.error(f"Failed to load two-stage models from {stage1_dir} and {stage2_dir}")
        logger.warning("Application will continue but prediction endpoints will return errors")
    else:
        logger.info("Two-stage models loaded successfully at startup")
    
    # Load datasets for threat map
    load_datasets()

# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint that verifies if both models are loaded
    """
    if not getattr(model_loader, 'stage1_model', None) or not getattr(model_loader, 'stage2_model', None):
        return {"status": "error", "message": "One or both models not loaded"}
    
    # Return success
    return {"status": "ok", "message": "Both models are loaded"}

# API endpoints for prediction
@app.post("/api/predict")
async def predict_api(request: PredictionRequest):
    """
    API endpoint for frontend prediction requests
    """
    return await predict(request)

# Prediction endpoint
@app.post("/predict")
async def predict(request: PredictionRequest):
    """
    Make a prediction on the input text
    """
    start_time = time.time()
    
    # Log the request
    logger.info(f"Prediction request received: '{request.text[:100]}...'")
    
    # Check if model is loaded
    if not getattr(model_loader, 'stage1_model', None) or not getattr(model_loader, 'stage2_model', None):
        logger.error("One or both models not loaded")
        raise HTTPException(status_code=500, detail="One or both models not loaded")
    
    # Make prediction
    result = model_loader.predict(request.text)
    
    # Check for errors
    if not result.get("success", False):
        error_msg = result.get("error", "Unknown error")
        logger.error(f"Prediction error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
    
    # Calculate response time
    response_time = time.time() - start_time
    result["response_time_ms"] = round(response_time * 1000)
    
    # Log the result using the standardized format
    logger.info(f"Prediction result: class={result['predicted_class']}, confidence={result['confidence']:.4f}, threat={result['threat']}, stage={result['stage']}, time={result['response_time_ms']}ms")
    
    # Debug log the full response
    logger.debug(f"Full prediction response: {json.dumps(result)}")
    
    return result

# Batch prediction endpoint
@app.post("/api/predict/batch")
async def predict_batch_api(request: BatchPredictionRequest):
    """
    API endpoint for frontend batch prediction requests
    """
    return await predict_batch(request)

@app.post("/predict/batch")
async def predict_batch(request: BatchPredictionRequest):
    """
    Make predictions on multiple texts
    """
    start_time = time.time()
    
    # Log the request
    logger.info(f"Batch prediction request received: {len(request.texts)} texts")
    
    # Check if model is loaded
    if not getattr(model_loader, 'stage1_model', None) or not getattr(model_loader, 'stage2_model', None):
        logger.error("One or both models not loaded")
        raise HTTPException(status_code=500, detail="One or both models not loaded")
    
    # Make predictions
    results = []
    for text in request.texts:
        result = model_loader.predict(text)
        if result.get("success", False):
            # Add response time only to individual predictions
            result["response_time_ms"] = 0  # Will be updated with batch time
            results.append(result)
            # Log individual prediction
            logger.debug(f"Batch item prediction: class={result['predicted_class']}, confidence={result['confidence']:.4f}, threat={result['threat']}")
        else:
            error_msg = result.get("error", "Unknown error")
            logger.error(f"Prediction error for text '{text[:50]}...': {error_msg}")
            results.append({"text": text, "error": error_msg, "success": False})
    
    # Calculate response time
    response_time = time.time() - start_time
    batch_response_time_ms = round(response_time * 1000)
    
    # Update response times
    for result in results:
        result["response_time_ms"] = batch_response_time_ms
    
    # Prepare response
    response = {
        "results": results,
        "count": len(results),
        "response_time_ms": batch_response_time_ms,
        "success": True
    }
    
    # Log the result
    logger.info(f"Batch prediction completed: {len(results)} texts, time={response['response_time_ms']}ms")
    
    return response

# Case Management Endpoints
@app.get("/api/cases")
async def get_cases():
    # In a real app, this would fetch from a database
    # Generate some sample cases
    cases = []
    
    # List of threat types
    threat_types = ["Direct Violence Threats", "Criminal Activity", 
                   "Harassment and Intimidation", "Hate Speech/Extremism", 
                   "Child Safety Threats"]
    
    # List of statuses
    statuses = ["low", "medium", "high", "critical"]
    
    # List of targets
    targets = ["Individual", "Organization", "Public", "Government", "Religious community"]
    
    # List of sources
    sources = ["Social Media", "Email", "Web forum", "Dark web", "Public report"]
    
    # List of locations
    locations = ["New York", "London", "Tokyo", "Paris", "Sydney", "Berlin", "Moscow", 
               "Beijing", "Rio de Janeiro", "Cairo", "Mumbai", "Los Angeles", "Chicago"]
    
    # Generate 10-30 random cases
    for i in range(random.randint(10, 30)):
        case_id = f"THP-{random.randint(10000, 99999)}"
        
        # Create dates
        created_date = datetime.now() - timedelta(days=random.randint(1, 30))
        updated_date = created_date + timedelta(days=random.randint(1, 5))
        
        # Create a case
        case = {
            "id": case_id,
            "title": f"{random.choice(threat_types)} - {random.choice(locations)}",
            "summary": f"This is a sample case for demonstration purposes. It represents a {random.choice(threat_types).lower()} that was detected in the system.",
            "threatType": random.choice(threat_types),
            "status": random.choice(statuses),
            "target": random.choice(targets),
            "createdDate": created_date.isoformat(),
            "updatedDate": updated_date.isoformat(),
            "assignedTo": f"Agent {chr(65 + random.randint(0, 25))}. {chr(65 + random.randint(0, 25))}",
            "source": random.choice(sources),
            "location": random.choice(locations),
            "confidence": round(random.uniform(80, 99), 1)
        }
        
        # Add related cases to some cases
        if random.random() > 0.7:
            num_related = random.randint(1, 3)
            case["relatedCases"] = [f"THP-{random.randint(70000, 79999)}" for _ in range(num_related)]
        else:
            case["relatedCases"] = []
        
        cases.append(case)
    
    return cases

@app.get("/api/cases/{case_id}")
async def get_case(case_id: str):
    """
    Get a specific case
    """
    if case_id not in cases_db:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return cases_db[case_id]

@app.post("/api/cases")
async def create_case(new_case: dict):
    # In a real app, this would be stored in a database
    # For demo, just return the case with an ID and dates
    case_id = f"THP-{random.randint(10000, 99999)}"
    
    created_case = {
        "id": case_id,
        "title": new_case.get("title", "New Case"),
        "summary": new_case.get("summary", "This is a new case"),
        "threatType": new_case.get("threatType", "Direct Violence Threats"),
        "status": new_case.get("status", "medium"),
        "target": new_case.get("target", "Individual"),
        "createdDate": datetime.now().isoformat(),
        "updatedDate": datetime.now().isoformat(),
        "assignedTo": "Unassigned",
        "source": new_case.get("source", "Manual Entry"),
        "location": new_case.get("location", "Unknown"),
        "confidence": 85.0,
        "relatedCases": []
    }
    
    return created_case

@app.put("/api/cases/{case_id}")
async def update_case(case_id: str, case_update: dict):
    # In a real app, this would update the database
    # For demo, just return the updated case
    updated_case = {
        "id": case_id,
        "title": "Updated Case",
        "summary": "This case has been updated",
        "threatType": "Direct Violence Threats",
        "status": case_update.get("status", "medium"),
        "target": "Individual",
        "createdDate": (datetime.now() - timedelta(days=5)).isoformat(),
        "updatedDate": datetime.now().isoformat(),
        "assignedTo": "Agent J. Smith",
        "source": "Social Media",
        "location": "New York",
        "confidence": 92.5,
        "relatedCases": []
    }
    
    return updated_case

@app.delete("/api/cases/{case_id}")
async def delete_case(case_id: str):
    """
    Delete a case
    """
    if case_id not in cases_db:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Remove the case
    del cases_db[case_id]
    
    # Remove associated events
    events_db[:] = [event for event in events_db if event["caseId"] != case_id]
    
    return {"success": True, "message": f"Case {case_id} deleted"}

# Case Events Endpoints
@app.get("/api/cases/{case_id}/events")
async def get_case_events(case_id: str):
    # In a real app, this would fetch from a database
    # Generate some sample events for the case
    events = []
    
    # Create a base date
    base_date = datetime.now() - timedelta(days=random.randint(5, 20))
    
    # Generate 3-8 random events
    for i in range(random.randint(3, 8)):
        event_date = base_date + timedelta(days=i)
        
        if i == 0:
            text = "Case created from threat detection system"
            user = "System"
        else:
            actions = [
                "Initial investigation completed",
                "Additional evidence collected",
                "Subject identified",
                "Coordinated with local agencies",
                "Threat level reassessed",
                "Digital forensics completed",
                "Evidence package prepared",
                "Case referred to specialized unit"
            ]
            text = random.choice(actions)
            user = f"Agent {chr(65 + random.randint(0, 25))}. {chr(65 + random.randint(0, 25))}" if random.random() > 0.3 else "System"
        
        event = {
            "id": str(uuid.uuid4()),
            "caseId": case_id,
            "date": event_date.isoformat(),
            "text": text,
            "user": user
        }
        
        events.append(event)
    
    # Sort events by date (newest first)
    events.sort(key=lambda e: e["date"], reverse=True)
    
    return events

@app.post("/api/cases/{case_id}/events")
async def add_case_event(case_id: str, event: dict):
    # In a real app, this would be stored in a database
    # For demo, just return the event with an ID and date
    new_event = {
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "date": datetime.now().isoformat(),
        "text": event.get("text", "New event"),
        "user": event.get("user", "Current User")
    }
    
    return new_event

# Threat Map Endpoints
@app.get("/api/threat-map/data")
async def get_threat_map_data():
    try:
        # List of major cities for random assignment
        cities = ["New York", "London", "Tokyo", "Paris", "Sydney", "Berlin", "Moscow", 
                 "Beijing", "Rio de Janeiro", "Cairo", "Mumbai", "Los Angeles", "Chicago"]
        
        # Create random threat data
        threats = []
        
        # Generate 10-20 random threats
        for i in range(random.randint(10, 20)):
            # Randomly select a city
            city = random.choice(cities)
            
            # Skip geocoding and use random coordinates directly
            lat = random.uniform(-80, 80)
            lng = random.uniform(-180, 180)
            
            # Determine threat type
            threat_types = ["Direct Violence Threats", "Criminal Activity", 
                           "Harassment and Intimidation", "Hate Speech/Extremism", 
                           "Child Safety Threats"]
            threat_type = random.choice(threat_types)
            
            # Determine priority
            priorities = ["low", "medium", "high", "critical"]
            priority = random.choice(priorities)
            
            # Create a unique ID
            threat_id = f"THR-{random.randint(10000, 99999)}"
            case_id = f"THP-{random.randint(10000, 99999)}"
            
            # Create a threat object
            threat = {
                "id": threat_id,
                "type": threat_type,
                "lat": lat,
                "lng": lng,
                "title": f"{threat_type} detected",
                "location": city,
                "date": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                "priority": priority,
                "details": f"Potential {threat_type.lower()} detected in {city} area requiring investigation.",
                "caseId": case_id
            }
            
            threats.append(threat)
        
        return threats
    except Exception as e:
        logger.error(f"Error generating threat map data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/threat-map/filter")
async def filter_threat_map(filter_req: ThreatMapFilterRequest):
    """
    Filter threat map data
    """
    filtered_data = threat_data
    
    # Apply time range filter
    if filter_req.timeRange:
        cutoff_date = datetime.now() - timedelta(days=filter_req.timeRange)
        filtered_data = [
            threat for threat in filtered_data 
            if datetime.fromisoformat(threat["date"]) > cutoff_date
        ]
    
    # Apply threat type filter
    if filter_req.threatTypes and len(filter_req.threatTypes) > 0:
        filtered_data = [
            threat for threat in filtered_data 
            if threat["type"] in filter_req.threatTypes
        ]
    
    # Apply priority filter
    if filter_req.priority and len(filter_req.priority) > 0:
        filtered_data = [
            threat for threat in filtered_data 
            if threat["priority"] in filter_req.priority
        ]
    
    return filtered_data

# Statistics Endpoints
@app.get("/api/stats/threat-distribution")
async def get_threat_distribution():
    """
    Get distribution of threats by type
    """
    distribution = {}
    for threat in threat_data:
        threat_type = threat["type"]
        if threat_type not in distribution:
            distribution[threat_type] = 0
        distribution[threat_type] += 1
    
    # Convert to list format
    result = []
    for category, count in distribution.items():
        result.append({
            "category": category,
            "count": count,
            "percentage": round((count / len(threat_data) * 100), 1) if threat_data else 0,
            "trend": random.choice(["up", "down", "neutral"])
        })
    
    # Sort by count (descending)
    result.sort(key=lambda x: x["count"], reverse=True)
    
    return result

@app.get("/api/stats/overview")
async def get_stats_overview():
    """
    Get overall statistics
    """
    total_analyzed = len(threat_data) + random.randint(10000, 13000)
    threats_detected = len(threat_data)
    high_severity = len([t for t in threat_data if t["priority"] in ["critical", "high"]])
    
    return {
        "totalAnalyzed": total_analyzed,
        "threatsDetected": threats_detected,
        "highSeverity": high_severity,
        "averageConfidence": round(random.uniform(90, 93), 1),
        "recentChange": round(random.uniform(10, 15), 1),
        "lastUpdated": "2 minutes ago"
    }

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for all unhandled exceptions
    """
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(f"Request path: {request.url.path}")
    import traceback
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc)}
    )

# If this is run as a script, start the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 