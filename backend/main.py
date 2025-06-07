import os
import sys
import time
import random
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import asyncio
import uuid

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import chat and RAG services
try:
    from chat_service import threat_ai
    from rag_service_v2 import enhanced_rag_service
    CHAT_ENABLED = True
    RAG_ENABLED = True
    logger.info("Enhanced RAG and Chat services loaded successfully")
except ImportError as e:
    logging.warning(f"Chat services not available: {e}")
    CHAT_ENABLED = False
    RAG_ENABLED = False

# Set up path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Firebase configuration
from firebase_config import (
    initialize_firebase, 
    get_firestore_db,
    get_or_create_user, 
    get_user_threat_stats, 
    get_user_threat_categories,
    get_user_analysis_history, 
    add_analysis_to_history, 
    update_user_threat_stats,
    add_threat_location,
    get_user_threat_locations,
    get_all_threat_locations,
    filter_threat_locations
)

# Import model loader
from app.model_loader import model_loader

# Import geocoding utilities
from geocoding_utils import geocode_location, determine_threat_priority, extract_location_from_user_data, extract_location_from_twitter_api_response

# Logger already configured above

# Define request models
class PredictionRequest(BaseModel):
    text: str

class BatchPredictionRequest(BaseModel):
    texts: List[str]

class UserInfo(BaseModel):
    user_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class ThreatMapFilterRequest(BaseModel):
    timeRange: Optional[int] = 30  # days
    threatTypes: Optional[List[str]] = None
    priority: Optional[List[str]] = None

# Create FastAPI app
app = FastAPI(
    title="Astra API",
    description="Astra: API for detecting threatening content in text",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase on startup
db = None

@app.on_event("startup")
async def startup_event():
    global db
    
    # Initialize Firebase
    if initialize_firebase():
        db = get_firestore_db()
        logger.info("Firebase initialized successfully")
    else:
        logger.error("Failed to initialize Firebase")
    
    # Load the 2-stage model
    stage1_dir = os.path.abspath(os.path.join(os.getcwd(), "..", "..", "models", "stage1_bin"))
    stage2_dir = os.path.abspath(os.path.join(os.getcwd(), "..", "..", "models", "stage2_multi"))
    
    logger.info(f"Loading models from: {stage1_dir} and {stage2_dir}")
    if model_loader.load_models(stage1_dir, stage2_dir):
        logger.info("Models loaded successfully")
    else:
        logger.error("Failed to load models. Will fallback to mock predictions.")

# Define label map for threat classification - ONLY used as fallback if model loading fails
label_map = {
    0: "Hate Speech/Extremism",
    1: "Direct Violence Threats",
    2: "Harassment and Intimidation",
    3: "Criminal Activity",
    4: "Child Safety Threats",
    5: "Not a Threat"
}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running", "timestamp": time.time()}

# Extract user_id from request headers
def get_user_id(request: Request) -> str:
    user_id = request.headers.get("user_id")
    if not user_id:
        user_id = request.query_params.get("user_id", "anonymous")
    return user_id

# Register or update user
@app.post("/api/user/register")
async def register_user(user: UserInfo):
    try:
        logger.info(f"Registering user with ID: {user.user_id}, email: {user.email}")
        
        # Validate input
        if not user.user_id:
            logger.error("Missing user_id in registration request")
            raise HTTPException(status_code=400, detail="User ID is required")
            
        if not user.email:
            logger.warning(f"No email provided for user {user.user_id}, using placeholder")
            user.email = f"{user.user_id}@placeholder.email.com"
        
        # Create or update user in Firestore
        user_data = get_or_create_user(user.user_id, user.email, user.first_name, user.last_name)
        if not user_data:
            logger.error(f"Failed to register user {user.user_id} in Firebase")
            raise HTTPException(status_code=500, detail="Failed to register user in database")
        
        logger.info(f"User registered successfully: {user.user_id}")
        return {"status": "success", "message": "User registered successfully"}
    except HTTPException as http_err:
        # Re-raise HTTP exceptions
        raise http_err
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error registering user: {error_msg}")
        logger.exception("Full stack trace:")
        raise HTTPException(status_code=500, detail=f"Registration failed: {error_msg}")

# Predict endpoint
@app.post("/api/predict")
async def predict(request: Request, prediction_request: PredictionRequest):
    text = prediction_request.text
    
    # Get the user_id from request headers or query params
    user_id = get_user_id(request)
    logger.info(f"Processing prediction for user: {user_id}")
    
    # Try to predict using the actual models
    result = None
    
    if model_loader.stage1_model is not None and model_loader.stage2_model is not None:
        try:
            model_result = model_loader.predict(text)
            if model_result.get("success", False):
                result = model_result
                # Add timestamp and text
                result["timestamp"] = datetime.now().isoformat()
                result["text"] = text
                logger.info(f"Real model prediction successful for user {user_id}")
            else:
                logger.error(f"Model prediction failed for user {user_id}: {model_result}")
                raise HTTPException(status_code=500, detail="Model prediction failed")
        except Exception as e:
            logger.error(f"Error during model prediction for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Model prediction error: {str(e)}")
    else:
        logger.error(f"Models not loaded - cannot perform prediction for user {user_id}")
        raise HTTPException(status_code=503, detail="Models not available. Please contact administrator.")

    # Save to Firebase if user is not anonymous and we have a real result
    if user_id != "anonymous" and result:
        try:
            history_item = add_analysis_to_history(user_id, text, result)
            if history_item:
                result["id"] = history_item.get("id")
            
            # Update user's threat statistics
            update_user_threat_stats(user_id, result)
            
            # Also add to RAG system for chatbot context
            if RAG_ENABLED:
                try:
                    rag_success = enhanced_rag_service.add_prediction_analysis(
                        user_id=user_id,
                        text=text,
                        prediction_result=result,
                        source='single_prediction'
                    )
                    if rag_success:
                        logger.info(f"✅ Prediction indexed in enhanced RAG for user {user_id}")
                except Exception as rag_error:
                    logger.error(f"❌ Enhanced RAG indexing error: {rag_error}")
            
            # Save to threat map if this is a threat
            if result.get("threat", False):
                try:
                    # Use generic location for direct text analysis
                    location_str = "Direct text analysis threat"
                    
                    # Geocode the location (will generate random coordinates)
                    lat, lng = geocode_location(location_str)
                    
                    # Determine priority
                    predicted_class = result.get('predicted_class', 'Unknown')
                    confidence = result.get('confidence', 0.0)
                    priority = determine_threat_priority(predicted_class, confidence)
                    
                    # Create threat location entry
                    threat_data = {
                        "id": f"THR-{result.get('id', str(uuid.uuid4())[:8])}",
                        "type": predicted_class,
                        "lat": lat,
                        "lng": lng,
                        "title": f"{predicted_class} detected in direct analysis",
                        "location": location_str,
                        "date": result.get('timestamp', datetime.now().isoformat()),
                        "priority": priority,
                        "details": text[:100] + ("..." if len(text) > 100 else ""),
                        "caseId": f"THP-{str(uuid.uuid4())[:8]}",
                        "source": "direct_prediction",
                        "confidence": confidence,
                        "predicted_class": predicted_class,
                        "twitter_metadata": {},
                        "text": text
                    }
                    
                    # Save to threat map
                    saved_location = add_threat_location(user_id, threat_data)
                    if saved_location:
                        logger.info(f"✅ Saved threat location for direct prediction")
                    else:
                        logger.warning(f"⚠️ Failed to save threat location for direct prediction")
                        
                except Exception as location_error:
                    logger.error(f"❌ Error saving threat location for direct prediction: {location_error}")
            
            logger.info(f"✅ Analysis saved to Firebase for user {user_id}")
        except Exception as e:
            logger.error(f"❌ Error saving to Firebase for user {user_id}: {e}")
            # Don't fail the request if Firebase save fails, just log
            result["firebase_save_error"] = str(e)

    return result

# Get user stats
@app.get("/api/user/stats")
async def get_user_stats(request: Request):
    user_id = get_user_id(request)
    
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get user stats
        stats = get_user_threat_stats(user_id)
        if not stats:
            raise HTTPException(status_code=500, detail="Failed to get user stats")
        
        # Get categories
        categories = get_user_threat_categories(user_id)
        if not categories:
            raise HTTPException(status_code=500, detail="Failed to get user categories")
        
        return {
            "stats": stats,
            "categories": categories
        }
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get user history
@app.get("/api/user/history")
async def get_user_history(request: Request):
    user_id = get_user_id(request)
    
    if user_id == "anonymous":
        logger.warning("Anonymous user tried to access history")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Fetching history for user: {user_id}")
    
    try:
        # Get user's history from Firebase
        history = get_user_analysis_history(user_id)
        
        if history is None:
            logger.error(f"Failed to fetch history for user {user_id}")
            raise HTTPException(status_code=500, detail="Failed to fetch history data")
        
        if not history:  # Empty list
            logger.info(f"No history found for user {user_id}")
            return []
        
        logger.info(f"Successfully fetched {len(history)} history items for user {user_id}")
        return history
    
    except Exception as e:
        logger.error(f"Error getting user history: {e}")
        logger.exception("Full stack trace:")
        raise HTTPException(status_code=500, detail=str(e))

# Batch prediction endpoint
@app.post("/api/predict/batch")
async def predict_batch(request: Request, batch_request: BatchPredictionRequest):
    results = []
    firebase_results = []
    
    # Get the user_id for database operations
    user_id = get_user_id(request)
    logger.info(f"Processing batch prediction for user: {user_id}, items: {len(batch_request.texts)}")
    
    for text in batch_request.texts:
        result = None
        
        # Use the model for prediction if available
        if model_loader.stage1_model is not None and model_loader.stage2_model is not None:
            try:
                model_result = model_loader.predict(text)
                if model_result.get("success", False):
                    result = model_result
                    # Add timestamp and text
                    result["timestamp"] = datetime.now().isoformat()
                    result["text"] = text
                else:
                    logger.error(f"Model prediction failed for text in batch: {model_result}")
                    continue  # Skip this text if prediction fails
            except Exception as e:
                logger.error(f"Error during batch prediction: {str(e)}")
                continue  # Skip this text if prediction fails
        else:
            logger.error("Models not loaded - cannot perform batch prediction")
            raise HTTPException(status_code=503, detail="Models not available. Please contact administrator.")

        # Save to Firebase if user is not anonymous and we have a real result
        if user_id != "anonymous" and result:
            try:
                history_item = add_analysis_to_history(user_id, text, result)
                if history_item:
                    result["id"] = history_item.get("id")
                    firebase_results.append(history_item)
                
                # Update user's threat statistics  
                update_user_threat_stats(user_id, result)
                
                # Also add to RAG system for chatbot context
                if RAG_ENABLED:
                    try:
                        rag_success = enhanced_rag_service.add_prediction_analysis(
                            user_id=user_id,
                            text=text,
                            prediction_result=result,
                            source='batch_prediction'
                        )
                        if rag_success:
                            logger.debug(f"✅ Batch prediction indexed in enhanced RAG for user {user_id}")
                    except Exception as rag_error:
                        logger.error(f"❌ Enhanced RAG batch indexing error: {rag_error}")
                
                # Save to threat map if this is a threat
                if result.get("threat", False):
                    try:
                        # Use generic location for batch analysis
                        location_str = "Batch analysis threat"
                        
                        # Geocode the location (will generate random coordinates)
                        lat, lng = geocode_location(location_str)
                        
                        # Determine priority
                        predicted_class = result.get('predicted_class', 'Unknown')
                        confidence = result.get('confidence', 0.0)
                        priority = determine_threat_priority(predicted_class, confidence)
                        
                        # Create threat location entry
                        threat_data = {
                            "id": f"THR-{result.get('id', str(uuid.uuid4())[:8])}",
                            "type": predicted_class,
                            "lat": lat,
                            "lng": lng,
                            "title": f"{predicted_class} detected in batch analysis",
                            "location": location_str,
                            "date": result.get('timestamp', datetime.now().isoformat()),
                            "priority": priority,
                            "details": text[:100] + ("..." if len(text) > 100 else ""),
                            "caseId": f"THP-{str(uuid.uuid4())[:8]}",
                            "source": "batch_prediction",
                            "confidence": confidence,
                            "predicted_class": predicted_class,
                            "twitter_metadata": {},
                            "text": text
                        }
                        
                        # Save to threat map
                        saved_location = add_threat_location(user_id, threat_data)
                        if saved_location:
                            logger.debug(f"✅ Saved threat location for batch prediction")
                        
                    except Exception as location_error:
                        logger.error(f"❌ Error saving threat location for batch prediction: {location_error}")
                
            except Exception as e:
                logger.error(f"Error saving batch item to Firebase: {e}")
                # Continue with next item even if this one fails to save
        
        if result:
            results.append(result)
    
    logger.info(f"Batch prediction complete: {len(results)} successful predictions out of {len(batch_request.texts)} texts")
    
    return {"results": results, "total_processed": len(results)}

# Save summary report
@app.post("/api/user/reports/summary")
async def save_summary_report(request: Request, report: dict = Body(...)):
    user_id = get_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get Firestore database instance
        from firebase_config import get_firestore_db
        db_instance = get_firestore_db()
        if not db_instance:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Add timestamp and user info
        report_data = {
            **report,
            "saved_at": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        # Save report to Firestore
        db_instance.collection("users").document(user_id).collection("reports").document("summary").set(report_data)
        logger.info(f"Summary report saved successfully for user {user_id}")
        
        # Also add to enhanced RAG system for chatbot context
        if RAG_ENABLED:
            try:
                rag_success = enhanced_rag_service.add_summary_report(
                    user_id=user_id,
                    report_data=report_data,
                    source='frontend_summary'
                )
                if rag_success:
                    logger.info(f"✅ Summary report indexed in enhanced RAG for user {user_id}")
                else:
                    logger.warning(f"⚠️ Failed to index summary report in enhanced RAG for user {user_id}")
            except Exception as rag_error:
                logger.error(f"❌ Enhanced RAG summary indexing error: {rag_error}")
                # Don't fail the main request if RAG indexing fails
        
        return {"status": "success", "message": "Summary report saved successfully"}
    except Exception as e:
        logger.error(f"Error saving summary report for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save summary report: {str(e)}")

# Get summary report
@app.get("/api/user/reports/summary")
async def get_summary_report(request: Request):
    user_id = get_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get Firestore database instance
        from firebase_config import get_firestore_db
        db_instance = get_firestore_db()
        if not db_instance:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get report from Firestore
        doc_ref = db_instance.collection("users").document(user_id).collection("reports").document("summary")
        doc = doc_ref.get()
        
        if doc.exists:
            logger.info(f"Summary report retrieved successfully for user {user_id}")
            return {"report": doc.to_dict()}
        else:
            logger.info(f"No summary report found for user {user_id}")
        return {"report": None}
    except Exception as e:
        logger.error(f"Error getting summary report for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve summary report: {str(e)}")

# Save threat report
@app.post("/api/user/reports/threat")
async def save_threat_report(request: Request, report: dict = Body(...)):
    user_id = get_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get Firestore database instance
        from firebase_config import get_firestore_db
        db_instance = get_firestore_db()
        if not db_instance:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Add timestamp and user info
        report_data = {
            **report,
            "saved_at": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        # Save report to Firestore
        db_instance.collection("users").document(user_id).collection("reports").document("threat").set(report_data)
        logger.info(f"Threat report saved successfully for user {user_id}")
        
        # Also add to enhanced RAG system for chatbot context
        if RAG_ENABLED:
            try:
                rag_success = enhanced_rag_service.add_threat_report(
                    user_id=user_id,
                    report_data=report_data,
                    source='frontend_threat'
                )
                
                if rag_success:
                    logger.info(f"✅ Threat report indexed in enhanced RAG for user {user_id}")
                else:
                    logger.warning(f"⚠️ Failed to index threat report in enhanced RAG for user {user_id}")
                    
            except Exception as rag_error:
                logger.error(f"❌ Enhanced RAG threat indexing error: {rag_error}")
                # Don't fail the main request if RAG indexing fails
        
        return {"status": "success", "message": "Threat report saved successfully"}
    except Exception as e:
        logger.error(f"Error saving threat report for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save threat report: {str(e)}")

# Get threat report
@app.get("/api/user/reports/threat")
async def get_threat_report(request: Request):
    user_id = get_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get Firestore database instance
        from firebase_config import get_firestore_db
        db_instance = get_firestore_db()
        if not db_instance:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Get report from Firestore
        doc_ref = db_instance.collection("users").document(user_id).collection("reports").document("threat")
        doc = doc_ref.get()
        
        if doc.exists:
            logger.info(f"Threat report retrieved successfully for user {user_id}")
            return {"report": doc.to_dict()}
        else:
            logger.info(f"No threat report found for user {user_id}")
        return {"report": None}
    except Exception as e:
        logger.error(f"Error getting threat report for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve threat report: {str(e)}")

# New Twitter Analysis endpoints
class TwitterAnalysisRequest(BaseModel):
    username: str
    tweets: List[dict]  # List of tweet objects with content, etc.
    userInfo: Optional[dict] = None

class SingleTweetAnalysisRequest(BaseModel):
    tweet_text: str
    username: Optional[str] = None
    tweet_metadata: Optional[dict] = None

class ChatRequest(BaseModel):
    message: str
    
class ChatHealthRequest(BaseModel):
    check_type: Optional[str] = "basic"

@app.post("/api/twitter/analyze-user")
async def analyze_twitter_user(request: Request, twitter_request: TwitterAnalysisRequest):
    """Analyze a Twitter user's tweets and save to Firebase"""
    user_id = get_user_id(request)
    logger.info(f"Processing Twitter user analysis for user: {user_id}, analyzing {len(twitter_request.tweets)} tweets for @{twitter_request.username}")
    
    analyzed_tweets = []
    threat_count = 0
    
    for tweet in twitter_request.tweets:
        tweet_text = tweet.get('content', '')
        if not tweet_text:
            continue
            
        # Analyze the tweet
        result = None
        if model_loader.stage1_model is not None and model_loader.stage2_model is not None:
            try:
                model_result = model_loader.predict(tweet_text)
                if model_result.get("success", False):
                    result = model_result
                    result["timestamp"] = datetime.now().isoformat()
                    result["text"] = tweet_text
                else:
                    logger.error(f"Model prediction failed for tweet: {model_result}")
                    continue  # Skip this tweet if prediction fails
            except Exception as e:
                logger.error(f"Error during Twitter tweet prediction: {str(e)}")
                continue  # Skip this tweet if prediction fails
        else:
            logger.error("Models not loaded - cannot perform Twitter analysis")
            raise HTTPException(status_code=503, detail="Models not available. Please contact administrator.")
        
        # Only process if we have a real result
        if not result:
            continue
        
        # Add Twitter-specific metadata
        result["twitter_metadata"] = {
            "username": twitter_request.username,
            "tweet_id": tweet.get('id'),
            "created_at": tweet.get('created_at'),
            "likes": tweet.get('likes', 0),
            "retweets": tweet.get('retweets', 0),
            "analysis_type": "twitter_user_analysis"
        }
        
        # Save to Firebase if user is not anonymous
        if user_id != "anonymous":
            try:
                # Create enhanced text for storage that includes context
                enhanced_text = f"Tweet by @{twitter_request.username}: {tweet_text}"
                history_item = add_analysis_to_history(user_id, enhanced_text, result)
                if history_item:
                    result["id"] = history_item.get("id")
                    
                # Update user's stats
                update_user_threat_stats(user_id, result)
                
                # Save to threat map if this is a threat
                if result.get("threat", False):
                    try:
                        # Extract location from user info - enhanced location extraction
                        location_str = ""
                        
                        # Try to get location from userInfo using enhanced Twitter API response parser
                        if twitter_request.userInfo:
                            location_str = extract_location_from_twitter_api_response(twitter_request.userInfo)
                            
                            # Fallback to standard user data extraction if Twitter API response parsing fails
                            if not location_str:
                                location_str = extract_location_from_user_data(twitter_request.userInfo)
                        
                        # Fallback: try to extract from tweet location data if available
                        if not location_str and 'location' in tweet:
                            location_str = tweet.get('location', '')
                        
                        # Default if no location found
                        if not location_str:
                            location_str = f"Social media threat from @{twitter_request.username}"
                        
                        # Geocode the location
                        lat, lng = geocode_location(location_str)
                        
                        # Determine priority
                        predicted_class = result.get('predicted_class', 'Unknown')
                        confidence = result.get('confidence', 0.0)
                        priority = determine_threat_priority(predicted_class, confidence)
                        
                        # Create threat location entry
                        threat_data = {
                            "id": f"THR-{result.get('id', str(uuid.uuid4())[:8])}",
                            "type": predicted_class,
                            "lat": lat,
                            "lng": lng,
                            "title": f"{predicted_class} detected from @{twitter_request.username}",
                            "location": location_str,
                            "date": result.get('timestamp', datetime.now().isoformat()),
                            "priority": priority,
                            "details": tweet_text[:100] + ("..." if len(tweet_text) > 100 else ""),
                            "caseId": f"THP-{str(uuid.uuid4())[:8]}",
                            "source": "twitter_user_analysis",
                            "confidence": confidence,
                            "predicted_class": predicted_class,
                            "twitter_metadata": result["twitter_metadata"],
                            "text": tweet_text
                        }
                        
                        # Save to threat map
                        saved_location = add_threat_location(user_id, threat_data)
                        if saved_location:
                            logger.info(f"✅ Saved threat location for @{twitter_request.username} threat at {location_str}")
                        else:
                            logger.warning(f"⚠️ Failed to save threat location for @{twitter_request.username}")
                            
                    except Exception as location_error:
                        logger.error(f"❌ Error saving threat location for @{twitter_request.username}: {location_error}")
                
            except Exception as e:
                logger.error(f"Error saving Twitter analysis to Firebase: {e}")
        
        if result.get("threat", False):
            threat_count += 1
            
        analyzed_tweets.append(result)
    
    # Create summary
    summary = {
        "username": twitter_request.username,
        "total_tweets": len(analyzed_tweets),
        "threat_tweets": threat_count,
        "threat_percentage": (threat_count / len(analyzed_tweets) * 100) if analyzed_tweets else 0,
        "analysis_timestamp": datetime.now().isoformat(),
        "user_info": twitter_request.userInfo
    }
    
    logger.info(f"Twitter analysis complete: {threat_count}/{len(analyzed_tweets)} threats detected for @{twitter_request.username}")
    
    return {
        "summary": summary,
        "analyzed_tweets": analyzed_tweets,
        "success": True
    }

@app.post("/api/twitter/analyze-tweet")
async def analyze_single_tweet(request: Request, tweet_request: SingleTweetAnalysisRequest):
    """Analyze a single tweet and save to Firebase"""
    user_id = get_user_id(request)
    tweet_text = tweet_request.tweet_text
    
    logger.info(f"Processing single tweet analysis for user: {user_id}")
    
    # Analyze the tweet
    result = None
    if model_loader.stage1_model is not None and model_loader.stage2_model is not None:
        try:
            model_result = model_loader.predict(tweet_text)
            if model_result.get("success", False):
                result = model_result
                result["timestamp"] = datetime.now().isoformat()
                result["text"] = tweet_text
            else:
                logger.error(f"Model prediction failed for single tweet: {model_result}")
                raise HTTPException(status_code=500, detail="Model prediction failed")
        except Exception as e:
            logger.error(f"Error during single tweet prediction: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Model prediction error: {str(e)}")
    else:
        logger.error("Models not loaded - cannot perform single tweet analysis")
        raise HTTPException(status_code=503, detail="Models not available. Please contact administrator.")
    
    # Only continue if we have a real result
    if not result:
        raise HTTPException(status_code=500, detail="Failed to analyze tweet")
    
    # Add Twitter metadata if provided
    if tweet_request.username or tweet_request.tweet_metadata:
        result["twitter_metadata"] = {
            "username": tweet_request.username,
            "analysis_type": "single_tweet_analysis",
            **(tweet_request.tweet_metadata or {})
        }
    
    # Save to Firebase if user is not anonymous
    if user_id != "anonymous":
        try:
            enhanced_text = f"Tweet: {tweet_text}"
            if tweet_request.username:
                enhanced_text = f"Tweet by @{tweet_request.username}: {tweet_text}"
                
            history_item = add_analysis_to_history(user_id, enhanced_text, result)
            if history_item:
                result["id"] = history_item.get("id")
                
            # Update user's stats
            update_user_threat_stats(user_id, result)
            
            # Save to threat map if this is a threat
            if result.get("threat", False):
                try:
                    # Enhanced location extraction for single tweet
                    location_str = ""
                    
                    # Try to extract location from tweet metadata if available
                    if tweet_request.tweet_metadata:
                        if 'location' in tweet_request.tweet_metadata:
                            location_str = tweet_request.tweet_metadata.get('location', '')
                        elif 'user_location' in tweet_request.tweet_metadata:
                            location_str = tweet_request.tweet_metadata.get('user_location', '')
                    
                    # Use username for location fallback
                    if not location_str and tweet_request.username:
                        location_str = f"Social media threat from @{tweet_request.username}"
                    elif not location_str:
                        location_str = "Social media threat (unknown location)"
                    
                    # Geocode the location
                    lat, lng = geocode_location(location_str)
                    
                    # Determine priority
                    predicted_class = result.get('predicted_class', 'Unknown')
                    confidence = result.get('confidence', 0.0)
                    priority = determine_threat_priority(predicted_class, confidence)
                    
                    # Create threat location entry
                    threat_data = {
                        "id": f"THR-{result.get('id', str(uuid.uuid4())[:8])}",
                        "type": predicted_class,
                        "lat": lat,
                        "lng": lng,
                        "title": f"{predicted_class} detected" + (f" from @{tweet_request.username}" if tweet_request.username else ""),
                        "location": location_str,
                        "date": result.get('timestamp', datetime.now().isoformat()),
                        "priority": priority,
                        "details": tweet_text[:100] + ("..." if len(tweet_text) > 100 else ""),
                        "caseId": f"THP-{str(uuid.uuid4())[:8]}",
                        "source": "single_tweet_analysis",
                        "confidence": confidence,
                        "predicted_class": predicted_class,
                        "twitter_metadata": result.get("twitter_metadata", {}),
                        "text": tweet_text
                    }
                    
                    # Save to threat map
                    saved_location = add_threat_location(user_id, threat_data)
                    if saved_location:
                        logger.info(f"✅ Saved threat location for single tweet analysis")
                    else:
                        logger.warning(f"⚠️ Failed to save threat location for single tweet")
                        
                except Exception as location_error:
                    logger.error(f"❌ Error saving threat location for single tweet: {location_error}")
            
        except Exception as e:
            logger.error(f"Error saving single tweet analysis to Firebase: {e}")
    
    return result

# Enhanced endpoint to get Twitter threats from history
@app.get("/api/twitter/threats")
async def get_twitter_threats(request: Request):
    """Get all Twitter-related threat analyses from user's history"""
    user_id = get_user_id(request)
    
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get user's full history
        history = get_user_analysis_history(user_id, limit=1000)  # Get more items for Twitter filtering
        
        if not history:
            return []
        
        # Filter for Twitter-related analyses
        twitter_threats = []
        for item in history:
            # Check if it's Twitter-related by looking at metadata or text patterns
            is_twitter = (
                'twitter_metadata' in item or
                item.get('text', '').startswith('Tweet') or
                '@' in item.get('text', '')
            )
            
            # Only include threats
            is_threat = item.get('threat', False) or item.get('predicted_class') != 'Non-threat/Neutral'
            
            if is_twitter and is_threat:
                twitter_threats.append(item)
        
        logger.info(f"Found {len(twitter_threats)} Twitter threats for user {user_id}")
        return twitter_threats
        
    except Exception as e:
        logger.error(f"Error getting Twitter threats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Chat AI endpoints
@app.post("/api/chat/message")
async def chat_message(request: Request, chat_request: ChatRequest):
    """
    Send a message to the threat analysis AI assistant
    Uses RAG to provide context-aware responses based on user's threat reports
    """
    if not CHAT_ENABLED:
        raise HTTPException(status_code=503, detail="Chat service is not available")
    
    user_id = get_user_id(request)
    
    try:
        logger.info(f"Processing chat message for user: {user_id}")
        
        # Get relevant context from enhanced RAG
        if RAG_ENABLED:
            context_text = enhanced_rag_service.get_context_for_query(chat_request.message, user_id, max_reports=3)
            context_used = "No relevant threat intelligence found" not in context_text
            
            # Count reports found
            reports_found = len(enhanced_rag_service.search_reports(chat_request.message, user_id, top_k=3))
        else:
            context_text = "RAG service not available"
            context_used = False
            reports_found = 0
        
        # Generate AI response with context
        ai_response = threat_ai.analyze_with_context(chat_request.message, context_text)
        
        # Save conversation to database
        context_summary = f"Intelligence Context Applied" if context_used else "No relevant context found"
        if RAG_ENABLED:
            enhanced_rag_service.save_conversation(
                user_id, 
                chat_request.message, 
                ai_response, 
                context_text if context_used else None,
                reports_found
            )
        
        logger.info(f"Chat response generated for user {user_id}, context_used: {context_used}")
        
        return {
            "status": "success",
            "response": ai_response,
            "context_used": context_used,
            "context_summary": context_summary,
            "reports_found": reports_found if RAG_ENABLED else 0,
            "timestamp": datetime.now().isoformat(),
            "model": "meta-llama/llama-3.1-8b-instruct:free",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error processing chat message for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.get("/api/chat/history")
async def get_chat_history(request: Request, limit: int = 20):
    """
    Get conversation history for the current user
    """
    if not CHAT_ENABLED:
        raise HTTPException(status_code=503, detail="Chat service is not available")
    
    user_id = get_user_id(request)
    
    try:
        if RAG_ENABLED:
            history = enhanced_rag_service.get_conversation_history(user_id, limit)
        else:
            history = []
        
        return {
            "status": "success",
            "history": history,
            "count": len(history),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error getting chat history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

@app.post("/api/chat/health")
async def chat_health_check(health_request: ChatHealthRequest):
    """
    Check the health status of the chat AI system
    """
    if not CHAT_ENABLED:
        return {
            "status": "disabled",
            "message": "Chat service is not available",
            "chat_enabled": False
        }
    
    try:
        health_status = threat_ai.health_check()
        
        if RAG_ENABLED:
            rag_debug_info = enhanced_rag_service.debug_status()
            rag_status = {
                "status": "healthy",
                "reports_cached": rag_debug_info["reports_cached"],
                "database_path": rag_debug_info["database_path"],
                "model_loaded": rag_debug_info["model_loaded"],
                "report_types": rag_debug_info["report_types"],
                "users": rag_debug_info["users"],
                "sources": rag_debug_info["sources"]
            }
        else:
            rag_status = {"status": "disabled", "message": "RAG service not available"}
        
        return {
            "status": "success",
            "chat_enabled": True,
            "ai_service": health_status,
            "rag_service": rag_status,
            "model": "meta-llama/llama-3.1-8b-instruct:free",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error checking chat health: {e}")
        return {
            "status": "error",
            "chat_enabled": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/chat/rag/refresh")
async def refresh_rag_cache(request: Request):
    """
    Refresh the RAG cache with latest reports
    """
    if not CHAT_ENABLED:
        raise HTTPException(status_code=503, detail="Chat service is not available")
    
    user_id = get_user_id(request)
    
    try:
        logger.info(f"Refreshing enhanced RAG cache for user: {user_id}")
        
        if RAG_ENABLED:
            # Refresh the cache
            enhanced_rag_service._refresh_cache()
            reports_cached = len(enhanced_rag_service.reports_cache)
        else:
            reports_cached = 0
        
        return {
            "status": "success",
            "message": "Enhanced RAG cache refreshed successfully",
            "reports_cached": reports_cached,
            "rag_enabled": RAG_ENABLED,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error refreshing RAG cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh RAG cache: {str(e)}")

# Threat Map API endpoints
@app.get("/api/threat-map/data")
async def get_threat_map_data(request: Request):
    """Get threat map data for the current user"""
    user_id = get_user_id(request)
    
    try:
        logger.info(f"Fetching threat map data for user: {user_id}")
        
        if user_id == "anonymous":
            # Return sample data for anonymous users
            sample_threats = generate_sample_threat_data()
            logger.info(f"Generated {len(sample_threats)} sample threats for anonymous user")
            return sample_threats
        else:
            # Get user's actual threat locations from Firebase
            threat_locations = get_user_threat_locations(user_id, limit=100)
            
            # If user has no data, generate some sample data mixed with their actual analysis history
            if not threat_locations:
                logger.info(f"No threat locations found for user {user_id}, generating from analysis history")
                threat_locations = generate_threats_from_user_history(user_id)
            
            logger.info(f"Returning {len(threat_locations)} threat locations for user {user_id}")
            return threat_locations
            
    except Exception as e:
        logger.error(f"Error getting threat map data for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get threat map data: {str(e)}")

@app.post("/api/threat-map/filter")
async def filter_threat_map(request: Request, filter_req: ThreatMapFilterRequest):
    """Filter threat map data based on criteria"""
    user_id = get_user_id(request)
    
    try:
        logger.info(f"Filtering threat map data for user: {user_id} with criteria: {filter_req}")
        
        if user_id == "anonymous":
            # Return filtered sample data for anonymous users
            sample_threats = generate_sample_threat_data()
            filtered_data = filter_sample_threats(sample_threats, filter_req)
            return filtered_data
        else:
            # Filter user's actual threat locations
            filtered_locations = filter_threat_locations(
                user_id=user_id,
                time_range_days=filter_req.timeRange or 30,
                threat_types=filter_req.threatTypes,
                priority_levels=filter_req.priority
            )
            
            logger.info(f"Filtered to {len(filtered_locations)} threat locations for user {user_id}")
            return filtered_locations
            
    except Exception as e:
        logger.error(f"Error filtering threat map data for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to filter threat map data: {str(e)}")

def generate_sample_threat_data():
    """Generate sample threat data for anonymous users or empty accounts"""
    import random
    from datetime import datetime, timedelta
    
    cities = [
        ("New York", 40.7128, -74.0060),
        ("Los Angeles", 34.0522, -118.2437),
        ("Chicago", 41.8781, -87.6298),
        ("Houston", 29.7604, -95.3698),
        ("Phoenix", 33.4484, -112.0740),
        ("Philadelphia", 39.9526, -75.1652),
        ("San Antonio", 29.4241, -98.4936),
        ("San Diego", 32.7157, -117.1611),
        ("Dallas", 32.7767, -96.7970),
        ("San Francisco", 37.7749, -122.4194),
        ("London", 51.5074, -0.1278),
        ("Paris", 48.8566, 2.3522),
        ("Tokyo", 35.6762, 139.6503),
        ("Berlin", 52.5200, 13.4050),
        ("Sydney", 33.8688, 151.2093)
    ]
    
    threat_types = [
        "Direct Violence Threats",
        "Criminal Activity", 
        "Harassment and Intimidation",
        "Hate Speech/Extremism",
        "Child Safety Threats"
    ]
    
    priorities = ["low", "medium", "high", "critical"]
    
    threats = []
    
    # Generate 15-25 random threats
    for i in range(random.randint(15, 25)):
        city_name, lat, lng = random.choice(cities)
        threat_type = random.choice(threat_types)
        priority = random.choice(priorities)
        
        # Add some random variance to coordinates
        lat += random.uniform(-0.5, 0.5)
        lng += random.uniform(-0.5, 0.5)
        
        threat_id = f"THR-{random.randint(10000, 99999)}"
        case_id = f"THP-{random.randint(10000, 99999)}"
        
        threat = {
            "id": threat_id,
            "type": threat_type,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "title": f"{threat_type} detected in {city_name}",
            "location": city_name,
            "date": (datetime.now() - timedelta(days=random.randint(1, 60))).isoformat(),
            "priority": priority,
            "details": f"Sample {threat_type.lower()} detected in {city_name} area requiring investigation.",
            "caseId": case_id,
            "source": "sample_data",
            "confidence": round(random.uniform(0.6, 0.95), 2),
            "predicted_class": threat_type
        }
        
        threats.append(threat)
    
    return threats

def filter_sample_threats(threats, filter_req):
    """Filter sample threat data based on criteria"""
    filtered = threats.copy()
    
    # Apply time range filter
    if filter_req.timeRange:
        cutoff_date = datetime.now() - timedelta(days=filter_req.timeRange)
        filtered = [
            threat for threat in filtered 
            if datetime.fromisoformat(threat["date"]) > cutoff_date
        ]
    
    # Apply threat type filter
    if filter_req.threatTypes and len(filter_req.threatTypes) > 0:
        filtered = [
            threat for threat in filtered 
            if threat["type"] in filter_req.threatTypes
        ]
    
    # Apply priority filter
    if filter_req.priority and len(filter_req.priority) > 0:
        filtered = [
            threat for threat in filtered 
            if threat["priority"] in filter_req.priority
        ]
    
    return filtered

def generate_threats_from_user_history(user_id):
    """Generate threat map data from user's analysis history"""
    try:
        from firebase_config import get_user_analysis_history
        
        # Get user's history
        history = get_user_analysis_history(user_id, limit=500)
        
        threats = []
        processed_count = 0
        
        for item in history:
            # Only process threats
            if not item.get('threat', False):
                continue
            
            # Extract location information - enhanced location extraction
            location_str = ""
            
            # Check Twitter metadata for location first
            if 'twitter_metadata' in item:
                twitter_meta = item['twitter_metadata']
                
                # Try to get actual location from metadata
                if 'location' in twitter_meta and twitter_meta['location']:
                    location_str = twitter_meta['location']
                elif 'user_location' in twitter_meta and twitter_meta['user_location']:
                    location_str = twitter_meta['user_location']
                else:
                    # Fall back to username-based location
                    username = twitter_meta.get('username', '')
                    if username:
                        location_str = f"Social media threat from @{username}"
            
            # Check if there's saved location information from the analysis
            if not location_str and 'location' in item:
                location_str = item['location']
            
            # If still no specific location, use Unknown Location
            if not location_str:
                location_str = "Unknown Location"
            
            # Geocode the location
            lat, lng = geocode_location(location_str)
            
            # Determine priority
            predicted_class = item.get('predicted_class', 'Unknown')
            confidence = item.get('confidence', 0.0)
            priority = determine_threat_priority(predicted_class, confidence)
            
            # Create threat location entry
            threat_data = {
                "id": f"THR-{item.get('id', str(uuid.uuid4())[:8])}",
                "type": predicted_class,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "title": f"{predicted_class} detected",
                "location": location_str,
                "date": item.get('timestamp', datetime.now().isoformat()),
                "priority": priority,
                "details": item.get('text', 'No details available')[:100] + ("..." if len(item.get('text', '')) > 100 else ""),
                "caseId": f"THP-{str(uuid.uuid4())[:8]}",
                "source": "user_history",
                "confidence": confidence,
                "predicted_class": predicted_class,
                "twitter_metadata": item.get('twitter_metadata', {}),
                "text": item.get('text', '')
            }
            
            # Save to Firebase for future use
            add_threat_location(user_id, threat_data)
            threats.append(threat_data)
            
            processed_count += 1
            if processed_count >= 50:  # Limit to 50 threats max
                break
        
        logger.info(f"Generated {len(threats)} threat locations from user history for user {user_id}")
        return threats
        
    except Exception as e:
        logger.error(f"Error generating threats from user history for user {user_id}: {e}")
        return []

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    logger.error(f"Unhandled exception: {error_msg}")
    logger.exception("Full stack trace:")
    return {"error": error_msg, "status_code": 500} 

# Run the server when executed directly
if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting Astra Threat Detection Platform API Server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 