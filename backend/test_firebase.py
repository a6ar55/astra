#!/usr/bin/env python3
import os
import sys
import logging
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Firebase config and functions
from firebase_config import (
    initialize_firebase,
    get_firestore_db,
    get_or_create_user,
    add_analysis_to_history,
    get_user_analysis_history
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def test_firebase_operations():
    """Test Firebase operations for history storage and retrieval"""
    # Step 1: Initialize Firebase
    logger.info("Step 1: Initializing Firebase...")
    if not initialize_firebase():
        logger.error("Failed to initialize Firebase. Exiting.")
        return False

    # Step 2: Get Firestore DB
    logger.info("Step 2: Getting Firestore DB...")
    db = get_firestore_db()
    if not db:
        logger.error("Failed to get Firestore DB. Exiting.")
        return False

    # Step 3: Create a test user
    test_user_id = f"test_user_{int(datetime.now().timestamp())}"
    logger.info(f"Step 3: Creating test user with ID: {test_user_id}")
    
    user_data = get_or_create_user(
        test_user_id,
        f"{test_user_id}@example.com",
        "Test",
        "User"
    )
    
    if not user_data:
        logger.error("Failed to create test user. Exiting.")
        return False
    
    logger.info(f"Test user created successfully: {user_data}")

    # Step 4: Add a test history item
    logger.info("Step 4: Adding test history item...")
    
    test_text = "I will kill you"
    test_analysis = {
        "text": test_text,
        "threat": True,
        "predicted_class": "Direct Violence Threats",
        "confidence": 0.9925,
        "probabilities": {
            "Direct Violence Threats": 0.9925,
            "Criminal Activity": 0.0025,
            "Harassment and Intimidation": 0.0020,
            "Hate Speech/Extremism": 0.0015,
            "Child Safety Threats": 0.0010,
            "Non-threat/Neutral": 0.0005
        },
        "visualization_data": {
            "keywords": [
                {"word": "kill", "score": 0.95},
                {"word": "you", "score": 0.85}
            ]
        },
        "threat_content": test_text,
        "threat_class": "Direct Violence Threats",
        "threat_confidence": 99.25
    }
    
    history_item = add_analysis_to_history(test_user_id, test_text, test_analysis)
    if not history_item:
        logger.error("Failed to add history item. Exiting.")
        return False
    
    logger.info(f"History item added successfully: {history_item}")
    history_item_id = history_item.get("id")
    
    # Step 5: Fetch history for the user
    logger.info("Step 5: Fetching history...")
    
    history_items = get_user_analysis_history(test_user_id)
    if not history_items:
        logger.error("Failed to fetch history items. Exiting.")
        return False
    
    logger.info(f"Fetched {len(history_items)} history items:")
    for item in history_items:
        logger.info(f"  Item ID: {item.get('id')}")
        logger.info(f"  Text: {item.get('text')}")
        logger.info(f"  Threat: {item.get('threat')}")
        logger.info(f"  Predicted Class: {item.get('predicted_class')}")
        logger.info(f"  Confidence: {item.get('confidence')}")
        logger.info(f"  Timestamp: {item.get('timestamp')}")
        
    # Step 6: Verify the added item is in the fetched items
    found_item = False
    for item in history_items:
        if item.get("id") == history_item_id:
            found_item = True
            break
    
    if not found_item:
        logger.error(f"Added history item with ID {history_item_id} not found in fetched history.")
        return False
    
    logger.info("Success! History item was correctly stored and retrieved from Firebase.")
    return True

if __name__ == "__main__":
    logger.info("Starting Firebase history test...")
    success = test_firebase_operations()
    if success:
        logger.info("All tests passed successfully.")
    else:
        logger.error("Tests failed.")
    
    sys.exit(0 if success else 1) 