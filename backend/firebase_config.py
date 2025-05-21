"""
Firebase configuration for the Astra Threat Detection Platform
"""
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import logging
from datetime import datetime # Ensure datetime is imported

logger = logging.getLogger(__name__)

# Initialize Firebase
def initialize_firebase():
    """Initialize Firebase connection"""
    try:
        if firebase_admin._apps:
            logger.info("Firebase already initialized")
            return True
        
        cred_path = os.environ.get('FIREBASE_CREDENTIALS', 'firebase-credentials.json')
        
        if not os.path.exists(cred_path):
            logger.error(f"Firebase credentials file not found at {cred_path}")
            if not os.path.exists('firebase-credentials.json'): # Check relative path too
                logger.warning("Attempting to create dummy credentials as fallback.")
                create_dummy_credentials()
                cred_path = 'firebase-credentials.json'
                if not os.path.exists(cred_path): # Check again after creation
                    logger.error("Dummy credentials creation failed or not found.")
                    return False
            else: # If found in relative path
                cred_path = 'firebase-credentials.json'
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing Firebase: {str(e)}")
        return False

# Get Firestore database instance
def get_firestore_db():
    """Get Firestore database instance"""
    if not firebase_admin._apps:
        if not initialize_firebase():
            logger.error("Failed to initialize Firebase for get_firestore_db")
            return None
    
    try:
        db = firestore.client()
        return db
    except Exception as e:
        logger.error(f"Error getting Firestore client: {str(e)}")
        return None

# Create a dummy credentials file for development
def create_dummy_credentials():
    """Create a dummy credentials file for development"""
    dummy_creds = {
        "type": "service_account",
        "project_id": "astra-dummy",
        "private_key_id": "dummy_private_key_id",
        "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_DUMMY_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
        "client_email": "dummy@astra-dummy.iam.gserviceaccount.com",
        "client_id": "dummy_client_id",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dummy%40astra-dummy.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com"
    }
    
    try:
        with open('firebase-credentials.json', 'w') as f:
            json.dump(dummy_creds, f, indent=2)
        logger.warning("Created dummy Firebase credentials file. Please replace with actual credentials for production.")
    except Exception as e:
        logger.error(f"Failed to create dummy credentials file: {e}")

# User operations
def get_or_create_user(user_id, email, first_name=None, last_name=None):
    """Get a user by ID or create if not exists. Also ensures stats and categories subcollections are present."""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_or_create_user for user {user_id}")
        return None
    
    try:
        logger.info(f"Attempting to get/create user with ID: {user_id}, email: {email}")
        
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        user_data_to_set = {
            'id': user_id,
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
    
        if not user_doc.exists:
            logger.info(f"User {user_id} not found, creating new user.")
            user_data_to_set['created_at'] = firestore.SERVER_TIMESTAMP
            user_ref.set(user_data_to_set)
            
            # Initialize stats
            stats_ref = user_ref.collection('stats').document('threat_stats')
            stats_ref.set({
                'totalAnalyzed': 0,
                'threatsDetected': 0,
                'highSeverity': 0,
                'averageConfidence': 0.0,
                'recentChange': 0.0,
                'lastUpdated': 'Never',
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            # Initialize categories
            default_categories = [
                {"category": "Hate Speech/Extremism", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Direct Violence Threats", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Harassment and Intimidation", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Criminal Activity", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Child Safety Threats", "count": 0, "trend": "neutral", "percentage": 0.0}
            ]
            
            try:
                categories_batch = db.batch()
                categories_col_ref = user_ref.collection('categories')
                for category_data in default_categories:
                    cat_doc_ref = categories_col_ref.document() # Auto-generate ID
                    categories_batch.set(cat_doc_ref, {**category_data, 'updated_at': firestore.SERVER_TIMESTAMP})
                categories_batch.commit()
                logger.info(f"Initialized stats and categories for new user {user_id}")
            except Exception as cat_error:
                logger.error(f"Error creating categories for user {user_id}: {str(cat_error)}")
                # Continue anyway, at least user document is created
            
            # Create empty history collection to make sure it exists
            try:
                history_ref = user_ref.collection('history').document('placeholder')
                history_ref.set({
                    'placeholder': True,
                    'created_at': firestore.SERVER_TIMESTAMP
                })
                history_ref.delete()  # Remove placeholder
                logger.info(f"Created and initialized history collection for user {user_id}")
            except Exception as hist_error:
                logger.error(f"Error creating history collection for user {user_id}: {str(hist_error)}")
                # Continue anyway
                
            user_doc = user_ref.get() # Re-fetch doc
        else:
            logger.info(f"User {user_id} found, updating timestamp.")
            user_ref.update({'updated_at': firestore.SERVER_TIMESTAMP}) # Just update timestamp for existing user
    
        return user_doc.to_dict()
    except Exception as e:
        logger.error(f"Error in get_or_create_user for user {user_id}: {str(e)}")
        logger.exception("Full stack trace:")
        return None

# Stats operations
def get_user_threat_stats(user_id):
    """Get threat stats for a user"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_user_threat_stats for user {user_id}")
        return None
    
    stats_ref = db.collection('users').document(user_id).collection('stats').document('threat_stats')
    stats_doc = stats_ref.get()
    
    if not stats_doc.exists:
        logger.warning(f"Threat stats not found for user {user_id}. Returning default.")
        # Attempt to create them if user exists but stats don't
        user_ref = db.collection('users').document(user_id)
        if user_ref.get().exists:
            stats_ref.set({
                'totalAnalyzed': 0, 'threatsDetected': 0, 'highSeverity': 0,
                'averageConfidence': 0.0, 'recentChange': 0.0, 'lastUpdated': 'Never',
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Created missing threat_stats for user {user_id}")
            stats_doc = stats_ref.get() # re-fetch
        else: # User doesn't exist, cannot create stats for non-existent user
            return {
                "totalAnalyzed": 0, "threatsDetected": 0, "highSeverity": 0,
                "averageConfidence": 0.0, "recentChange": 0.0, "lastUpdated": "User not found"
            }

    stats = stats_doc.to_dict()
    return {
        "totalAnalyzed": stats.get('totalAnalyzed', 0),
        "threatsDetected": stats.get('threatsDetected', 0),
        "highSeverity": stats.get('highSeverity', 0),
        "averageConfidence": stats.get('averageConfidence', 0.0),
        "recentChange": stats.get('recentChange', 0.0),
        "lastUpdated": stats.get('lastUpdated', 'Never')
    }

def get_user_threat_categories(user_id):
    """Get threat categories for a user"""
    db = get_firestore_db()
    if not db: 
        logger.error(f"Firestore DB not available for get_user_threat_categories for user {user_id}")
        return None
    
    categories_ref = db.collection('users').document(user_id).collection('categories')
    categories_stream = categories_ref.order_by("category").stream() # Order for consistency
    
    result = []
    for cat_doc in categories_stream:
        cat_dict = cat_doc.to_dict()
        result.append({
            "id": cat_doc.id, # Include document ID for updates
            "category": cat_dict.get('category', ''),
            "count": cat_dict.get('count', 0),
            "trend": cat_dict.get('trend', 'neutral'),
            "percentage": cat_dict.get('percentage', 0.0)
        })
    
    if not result:
        logger.warning(f"No categories found for user {user_id}. Returning default set.")
        # Attempt to create default categories if user exists
        user_ref = db.collection('users').document(user_id)
        if user_ref.get().exists:
            default_categories_data = [
                {"category": "Hate Speech/Extremism", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Direct Violence Threats", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Harassment and Intimidation", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Criminal Activity", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Child Safety Threats", "count": 0, "trend": "neutral", "percentage": 0.0}
            ]
            categories_batch = db.batch()
            for cat_data in default_categories_data:
                new_cat_ref = categories_ref.document()
                categories_batch.set(new_cat_ref, {**cat_data, 'updated_at': firestore.SERVER_TIMESTAMP})
            categories_batch.commit()
            logger.info(f"Created missing default categories for user {user_id}")
            # Re-fetch
            categories_stream = categories_ref.order_by("category").stream()
            for cat_doc in categories_stream:
                cat_dict = cat_doc.to_dict()
                result.append({
                    "id": cat_doc.id, "category": cat_dict.get('category', ''), "count": cat_dict.get('count', 0),
                    "trend": cat_dict.get('trend', 'neutral'), "percentage": cat_dict.get('percentage', 0.0)
                })
        else: # User doesn't exist
             return [
                {"category": "Hate Speech/Extremism", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Direct Violence Threats", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Harassment and Intimidation", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Criminal Activity", "count": 0, "trend": "neutral", "percentage": 0.0},
                {"category": "Child Safety Threats", "count": 0, "trend": "neutral", "percentage": 0.0}
            ]
    return result

def get_user_analysis_history(user_id, limit=100):
    """Get analysis history for a user, ordered by timestamp descending.
    
    Args:
        user_id (str): The user ID to fetch history for
        limit (int, optional): Maximum number of history items to retrieve. Defaults to 100.
        
    Returns:
        list: List of history items with their IDs, sorted by timestamp descending
    """
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_user_analysis_history for user {user_id}")
        return [] # Return empty list on DB error
    
    user_ref = db.collection('users').document(user_id)
    
    # First check if the user exists
    if not user_ref.get().exists:
        logger.warning(f"User {user_id} does not exist in Firestore")
        return []
    
    history_ref = user_ref.collection('history')
    
    # Query the history collection, ordered by timestamp descending
    try:
        # Build query with order and limit
        history_query = history_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
        
        # Execute query and process results
        history_list = []
        for doc in history_query.stream():
            # Get document data with ID
            item = doc.to_dict()
            item_id = doc.id
            
            # Ensure timestamp is JSON serializable (ISO format string)
            if 'timestamp' in item and hasattr(item['timestamp'], 'isoformat'):
                item['timestamp'] = item['timestamp'].isoformat()
            
            # Add document ID if not present
            if 'id' not in item:
                item['id'] = item_id
                
            # Ensure required fields are present for frontend components
            # If missing, provide reasonable defaults
            if 'text' not in item and 'threat_content' in item:
                item['text'] = item['threat_content']
                
            if 'predicted_class' not in item and 'threat_class' in item:
                item['predicted_class'] = item['threat_class']
                
            if 'confidence' not in item and 'threat_confidence' in item:
                item['confidence'] = item['threat_confidence'] / 100.0  # Convert percentage back to 0-1 scale
                
            if 'probabilities' not in item or not item['probabilities']:
                # Create default probabilities based on predicted class if missing
                if 'predicted_class' in item:
                    item['probabilities'] = {
                        "Direct Violence Threats": 0.05,
                        "Criminal Activity": 0.05,
                        "Harassment and Intimidation": 0.05,
                        "Hate Speech/Extremism": 0.05,
                        "Child Safety Threats": 0.05,
                        "Non-threat/Neutral": 0.75
                    }
                    # Boost the probability of the predicted class
                    if item['predicted_class'] in item['probabilities']:
                        confidence = item.get('confidence', 0.8)
                        item['probabilities'][item['predicted_class']] = confidence
                        
                        # Normalize the rest
                        remaining = 1.0 - confidence
                        other_classes = [k for k in item['probabilities'].keys() if k != item['predicted_class']]
                        for cls in other_classes:
                            item['probabilities'][cls] = remaining / len(other_classes)
            
            # Add the processed item to the list
            history_list.append(item)
            
        logger.info(f"Fetched {len(history_list)} history items for user {user_id}")
        return history_list
    except Exception as e:
        logger.error(f"Error fetching history for user {user_id}: {str(e)}")
        logger.exception("Full stack trace:")
        return [] # Return empty list on error

def add_analysis_to_history(user_id, text_input, analysis_result):
    """Add an analysis result to the user's history.
    This function commits the analysis to a dedicated 'history' collection in Firebase.
    
    Args:
        user_id (str): The user ID to store the history for
        text_input (str): The original text analyzed
        analysis_result (dict): The full analysis result dictionary
        
    Returns:
        dict or None: The stored history item with ID, or None if failed
    """
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for add_analysis_to_history for user {user_id}")
        return None
    
    # Ensure user exists, or create them. This also initializes stats/categories if needed.
    user = get_or_create_user(user_id, f"{user_id}@placeholder.email.com")
    if not user:
        logger.error(f"Failed to get or create user {user_id} before adding to history.")
        return None

    history_ref = db.collection('users').document(user_id).collection('history')
    
    # Log the analysis result at debug level
    logger.debug(f"Analysis result for user {user_id}: {analysis_result}")
    
    # Build a complete history item with all necessary fields
    history_item_data = {
        # Required fields - these must be present for the ThreatChart component
        'text': text_input,
        'threat': analysis_result.get('threat', False),
        'predicted_class': analysis_result.get('predicted_class', 'N/A'),
        'confidence': analysis_result.get('confidence', 0.0),
        'probabilities': analysis_result.get('probabilities', {}),
        'visualization_data': analysis_result.get('visualization_data', {}),
        'timestamp': firestore.SERVER_TIMESTAMP,
        
        # Additional fields specifically for the requested format
        'threat_content': text_input,
        'threat_class': analysis_result.get('predicted_class', 'N/A'),
        'threat_confidence': analysis_result.get('confidence', 0.0) * 100,  # As percentage
        
        # Additional fields that might be useful
        'hierarchical_classification': analysis_result.get('hierarchical_classification', {}),
        'threat_type': analysis_result.get('threat_type', ''),
        'stage1_result': analysis_result.get('stage1_result', {}),
        'stage2_result': analysis_result.get('stage2_result', {}),
        'stage1_breakdown': analysis_result.get('stage1_breakdown', []),
        'stage2_breakdown': analysis_result.get('stage2_breakdown', []),
        'stage': analysis_result.get('stage', 1),
    }
    
    # Ensure any additional fields from analysis_result are included
    for key, value in analysis_result.items():
        if key not in history_item_data and key != 'id':  # Don't override the id
            history_item_data[key] = value
    
    try:
        # Use a transaction for adding history to ensure atomicity
        transaction = db.transaction()
        
        @firestore.transactional
        def add_history_transaction(transaction, hist_ref, hist_data):
            # Add the history item with an auto-generated ID
            new_doc_ref = hist_ref.document()
            transaction.set(new_doc_ref, hist_data)
            return new_doc_ref
        
        # Execute the transaction
        doc_ref = add_history_transaction(transaction, history_ref, history_item_data)
        
        # Get the stored document to include server values like timestamp
        stored_doc = doc_ref.get()
        if stored_doc.exists:
            stored_data = stored_doc.to_dict()
            # Convert server timestamp to ISO format string for JSON serialization
            if 'timestamp' in stored_data and hasattr(stored_data['timestamp'], 'isoformat'):
                stored_data['timestamp'] = stored_data['timestamp'].isoformat()
            
            # Add the document ID to the returned data
            stored_data['id'] = doc_ref.id
            
            logger.info(f"Successfully added analysis to history for user {user_id}, doc ID: {doc_ref.id}")
            return stored_data
        else:
            logger.error(f"Failed to retrieve newly added history item {doc_ref.id} for user {user_id}")
            return None
    except Exception as e:
        logger.error(f"Error adding analysis to history for user {user_id}: {str(e)}")
        logger.exception("Full stack trace:")
        return None

def update_user_threat_stats(user_id, analysis_result):
    """Update user threat statistics based on analysis result.
    analysis_result is the dictionary from the prediction.
    """
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for update_user_threat_stats for user {user_id}")
        return None
    
    import random # For recentChange, keep if intended
    
    user_ref = db.collection('users').document(user_id)
    stats_ref = user_ref.collection('stats').document('threat_stats')

    # Transaction to ensure atomic updates
    @firestore.transactional
    def update_stats_transaction(transaction, stats_doc_ref, analysis_res):
        stats_snapshot = stats_doc_ref.get(transaction=transaction)
        
        if not stats_snapshot.exists:
            logger.warning(f"Stats document not found for user {user_id} during transaction. Initializing.")
            current_stats = {
                'totalAnalyzed': 0, 'threatsDetected': 0, 'highSeverity': 0,
                'averageConfidence': 0.0, 'recentChange': 0.0, 'lastUpdated': 'Never'
            }
        else:
            current_stats = stats_snapshot.to_dict()

        current_stats['totalAnalyzed'] = current_stats.get('totalAnalyzed', 0) + 1
        current_stats['lastUpdated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S") # More specific than "Just now"

        if analysis_res.get('threat', False):
            current_stats['threatsDetected'] = current_stats.get('threatsDetected', 0) + 1
            
            confidence = analysis_res.get('confidence', 0.0) * 100 # As percentage
            predicted_class = analysis_res.get('predicted_class', '')
            
            is_high_severity = (
                confidence >= 90 or 
                (confidence >= 70 and any(term in predicted_class for term in ['Violence', 'Child'])) # Simplified check
            )
            if is_high_severity:
                current_stats['highSeverity'] = current_stats.get('highSeverity', 0) + 1
            
            # Update average confidence for threats only
            # (old_avg * (n-1) + new_value) / n where n is new threatsDetected count
            old_avg_confidence = current_stats.get('averageConfidence', 0.0)
            num_threats = current_stats['threatsDetected']
            if num_threats == 1: # First threat
                current_stats['averageConfidence'] = confidence
            else:
                current_stats['averageConfidence'] = ((old_avg_confidence * (num_threats - 1)) + confidence) / num_threats
            
            current_stats['averageConfidence'] = round(current_stats['averageConfidence'], 1)

        current_stats['recentChange'] = round(random.uniform(0.5, 3.0), 1) # Smaller, more realistic random change
        current_stats['updated_at'] = firestore.SERVER_TIMESTAMP
        
        transaction.set(stats_doc_ref, current_stats)
        return current_stats

    try:
        transaction = db.transaction()
        updated_stats_dict = update_stats_transaction(transaction, stats_ref, analysis_result)
        logger.info(f"Successfully updated threat stats for user {user_id}.")
        
        # Update categories if it's a threat (outside transaction or in a separate one if complex)
        if analysis_result.get('threat', False) and analysis_result.get('predicted_class'):
            update_threat_categories(user_id, analysis_result.get('predicted_class'))
            
        return { # Return stats in the format expected by the frontend
            "totalAnalyzed": updated_stats_dict.get('totalAnalyzed',0),
            "threatsDetected": updated_stats_dict.get('threatsDetected',0),
            "highSeverity": updated_stats_dict.get('highSeverity',0),
            "averageConfidence": updated_stats_dict.get('averageConfidence',0.0),
            "recentChange": updated_stats_dict.get('recentChange',0.0),
            "lastUpdated": updated_stats_dict.get('lastUpdated','Never')
        }
    except Exception as e:
        logger.error(f"Error updating threat stats for user {user_id} in transaction: {str(e)}")
        return None

def update_threat_categories(user_id, predicted_class_name):
    """Update threat categories based on prediction. Should be called after stats update if needed."""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for update_threat_categories for user {user_id}")
        return
    
    categories_ref = db.collection('users').document(user_id).collection('categories')
    
    # Transaction for updating categories
    @firestore.transactional
    def update_categories_transaction(transaction, cat_collection_ref, p_class_name):
        categories_snapshot = list(cat_collection_ref.stream(transaction=transaction)) # Stream within transaction
        
        target_category_doc_ref = None
        target_category_data = None

        for cat_doc_snapshot in categories_snapshot:
            cat_data = cat_doc_snapshot.to_dict()
            if p_class_name.lower() in cat_data.get('category', '').lower() or \
               cat_data.get('category', '').lower() in p_class_name.lower():
                target_category_doc_ref = cat_doc_snapshot.reference
                target_category_data = cat_data
                break
        
        if target_category_doc_ref and target_category_data:
            new_count = target_category_data.get('count', 0) + 1
            transaction.update(target_category_doc_ref, {
                'count': new_count,
                'trend': 'up', # Or more sophisticated trend logic
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            # Recalculate percentages for all categories after updating count
            total_threat_counts = 0
            # Need to re-fetch counts for all categories for accurate total
            all_category_data_for_percentage = []
            for snap in cat_collection_ref.stream(transaction=transaction): # Re-stream for current counts
                data = snap.to_dict()
                if snap.reference.path == target_category_doc_ref.path: # Use updated count for the matched category
                    data['count'] = new_count
                all_category_data_for_percentage.append({'ref': snap.reference, 'data': data})
                total_threat_counts += data.get('count',0)

            for item in all_category_data_for_percentage:
                current_cat_count = item['data'].get('count', 0)
                percentage = round((current_cat_count / total_threat_counts) * 100, 1) if total_threat_counts > 0 else 0.0
                transaction.update(item['ref'], {'percentage': percentage})
            logger.info(f"Updated category '{target_category_data.get('category')}' count to {new_count} and recalculated percentages for user {user_id}.")
        else:
            logger.warning(f"Predicted class '{p_class_name}' did not match any existing categories for user {user_id}.")
            # Optionally, create a new category if it doesn't match
            # new_cat_ref = cat_collection_ref.document()
            # transaction.set(new_cat_ref, {'category': p_class_name, 'count': 1, 'trend': 'up', 'percentage': 0.0, 'updated_at': firestore.SERVER_TIMESTAMP})
            # Then, percentages would need to be recalculated including this new one.

    try:
        transaction = db.transaction()
        update_categories_transaction(transaction, categories_ref, predicted_class_name)
    except Exception as e:
        logger.error(f"Error updating threat categories for user {user_id} in transaction: {str(e)}")

# --- Reports Storage Functions ---
def save_report_to_firestore(user_id: str, report_type: str, report_data: dict):
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for save_report ({report_type}) for user {user_id}")
        return False
    try:
        # Storing reports in a 'reports' subcollection, then by type, then a list of reports or single doc
        # For simplicity, let's assume one document per report type for now, overwriting previous.
        # Or, use add() to create a new document for each report if multiple are needed.
        report_doc_ref = db.collection('users').document(user_id).collection('reports').document(report_type)
        report_doc_ref.set({
            "data": report_data, # The actual report content
            "generated_at": firestore.SERVER_TIMESTAMP,
            "type": report_type
        })
        logger.info(f"Successfully saved {report_type} report for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving {report_type} report for user {user_id}: {e}")
        return False

def get_report_from_firestore(user_id: str, report_type: str):
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_report ({report_type}) for user {user_id}")
        return None
    try:
        report_doc_ref = db.collection('users').document(user_id).collection('reports').document(report_type)
        report_doc = report_doc_ref.get()
        if report_doc.exists:
            data = report_doc.to_dict()
            if 'generated_at' in data and hasattr(data['generated_at'], 'isoformat'):
                data['generated_at'] = data['generated_at'].isoformat()
            logger.info(f"Successfully fetched {report_type} report for user {user_id}")
            return data
        else:
            logger.info(f"No {report_type} report found for user {user_id}")
            return None
    except Exception as e:
        logger.error(f"Error fetching {report_type} report for user {user_id}: {e}")
        return None 