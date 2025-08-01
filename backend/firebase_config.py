"""
Firebase configuration and database operations
This module handles all Firebase Firestore operations for the threat detection platform.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import logging
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

# Global variables
db_instance = None

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account key"""
    global db_instance
    
    if firebase_admin._apps:
        logger.info("Firebase already initialized")
        return True
    
    try:
        # Path to service account key file
        cred_path = os.environ.get('FIREBASE_CREDENTIALS', 'firebase-credentials.json')
        
        # Check if the credentials file exists and contains real data
        try:
            with open(cred_path, 'r') as f:
                cred_data = json.load(f)
                if cred_data.get('project_id') == 'astra-dummy' or 'dummy' in cred_data.get('private_key', ''):
                    logger.error("Dummy Firebase credentials detected. REAL credentials required.")
                    logger.error("Please provide valid Firebase service account credentials.")
                    return False
        except FileNotFoundError:
            logger.error(f"Firebase credentials file not found: {cred_path}")
            return False
        
        # Initialize with real credentials
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        
        # Test the connection
        db_instance = firestore.client()
        
        logger.info("✅ Firebase initialized successfully with REAL credentials")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error initializing Firebase: {str(e)}")
        logger.error("REAL Firebase credentials are required. Please check your configuration.")
        return False

def get_firestore_db():
    """Get Firestore database instance - REAL ONLY"""
    global db_instance
    
    if db_instance is None:
        if not initialize_firebase():
            logger.error("Cannot get Firestore database - initialization failed")
            return None
        db_instance = firestore.client()
    
    return db_instance

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
            
            categories_batch = db.batch()
            categories_col_ref = user_ref.collection('categories')
            for category_data in default_categories:
                cat_doc_ref = categories_col_ref.document()
                categories_batch.set(cat_doc_ref, {**category_data, 'updated_at': firestore.SERVER_TIMESTAMP})
            categories_batch.commit()
            logger.info(f"✅ Initialized stats and categories for new user {user_id}")
            
            user_doc = user_ref.get()
        else:
            logger.info(f"User {user_id} found, updating timestamp.")
            user_ref.update({'updated_at': firestore.SERVER_TIMESTAMP})
    
        return user_doc.to_dict()
    except Exception as e:
        logger.error(f"❌ Error in get_or_create_user for user {user_id}: {str(e)}")
        logger.exception("Full stack trace:")
        return None

# Stats operations
def get_user_threat_stats(user_id):
    """Get threat stats for a user"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_user_threat_stats for user {user_id}")
        return None
    
    try:
        stats_ref = db.collection('users').document(user_id).collection('stats').document('threat_stats')
        stats_doc = stats_ref.get()
    
        if not stats_doc.exists:
            logger.warning(f"Threat stats not found for user {user_id}. Creating default.")
            user_ref = db.collection('users').document(user_id)
            if user_ref.get().exists:
                stats_ref.set({
                    'totalAnalyzed': 0, 'threatsDetected': 0, 'highSeverity': 0,
                    'averageConfidence': 0.0, 'recentChange': 0.0, 'lastUpdated': 'Never',
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                logger.info(f"Created missing threat_stats for user {user_id}")
                stats_doc = stats_ref.get()
            else:
                logger.error(f"User {user_id} doesn't exist, cannot create stats")
                return None

        stats = stats_doc.to_dict()
        return {
            "totalAnalyzed": stats.get('totalAnalyzed', 0),
            "threatsDetected": stats.get('threatsDetected', 0),
            "highSeverity": stats.get('highSeverity', 0),
            "averageConfidence": stats.get('averageConfidence', 0.0),
            "recentChange": stats.get('recentChange', 0.0),
            "lastUpdated": stats.get('lastUpdated', 'Never')
        }
    except Exception as e:
        logger.error(f"❌ Error getting threat stats for user {user_id}: {str(e)}")
        return None

def get_user_threat_categories(user_id):
    """Get threat categories for a user"""
    db = get_firestore_db()
    if not db: 
        logger.error(f"Firestore DB not available for get_user_threat_categories for user {user_id}")
        return None
    
    try:
        categories_ref = db.collection('users').document(user_id).collection('categories')
        categories_stream = categories_ref.order_by("category").stream()
    
        result = []
        for cat_doc in categories_stream:
            cat_dict = cat_doc.to_dict()
            result.append({
                "id": cat_doc.id,
                "category": cat_dict.get('category', ''),
                "count": cat_dict.get('count', 0),
                "trend": cat_dict.get('trend', 'neutral'),
                "percentage": cat_dict.get('percentage', 0.0)
            })
    
        if not result:
            logger.warning(f"No categories found for user {user_id}. Creating defaults.")
            user_ref = db.collection('users').document(user_id)
            if user_ref.get().exists:
                default_categories = [
                    {"category": "Hate Speech/Extremism", "count": 0, "trend": "neutral", "percentage": 0.0},
                    {"category": "Direct Violence Threats", "count": 0, "trend": "neutral", "percentage": 0.0},
                    {"category": "Harassment and Intimidation", "count": 0, "trend": "neutral", "percentage": 0.0},
                    {"category": "Criminal Activity", "count": 0, "trend": "neutral", "percentage": 0.0},
                    {"category": "Child Safety Threats", "count": 0, "trend": "neutral", "percentage": 0.0}
                ]
                categories_batch = db.batch()
                for cat_data in default_categories:
                    new_cat_ref = categories_ref.document()
                    categories_batch.set(new_cat_ref, {**cat_data, 'updated_at': firestore.SERVER_TIMESTAMP})
                categories_batch.commit()
                logger.info(f"Created missing default categories for user {user_id}")
                # Re-fetch
                result = []
                for cat_doc in categories_ref.order_by("category").stream():
                    cat_dict = cat_doc.to_dict()
                    result.append({
                        "id": cat_doc.id, "category": cat_dict.get('category', ''), 
                        "count": cat_dict.get('count', 0), "trend": cat_dict.get('trend', 'neutral'), 
                        "percentage": cat_dict.get('percentage', 0.0)
                    })
            else:
                logger.error(f"User {user_id} doesn't exist, cannot create categories")
                return None
        
        return result
    except Exception as e:
        logger.error(f"❌ Error getting categories for user {user_id}: {str(e)}")
        return None

def get_user_analysis_history(user_id, limit=100):
    """Get analysis history for a user, ordered by timestamp descending"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_user_analysis_history for user {user_id}")
        return []
    
    try:
        user_ref = db.collection('users').document(user_id)
        
        if not user_ref.get().exists:
            logger.warning(f"User {user_id} does not exist in Firestore")
            return []
        
        history_ref = user_ref.collection('history')
        history_query = history_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
        
        history_list = []
        for doc in history_query.stream():
            item = doc.to_dict()
            item_id = doc.id
            
            # Convert timestamp to ISO format
            if 'timestamp' in item and hasattr(item['timestamp'], 'isoformat'):
                item['timestamp'] = item['timestamp'].isoformat()
            
            item['id'] = item_id
            
            # Ensure required fields are present
            if 'text' not in item and 'threat_content' in item:
                item['text'] = item['threat_content']
                
            if 'predicted_class' not in item and 'threat_class' in item:
                item['predicted_class'] = item['threat_class']
                
            if 'confidence' not in item and 'threat_confidence' in item:
                item['confidence'] = item['threat_confidence'] / 100.0
            
            history_list.append(item)
        
        logger.info(f"✅ Fetched {len(history_list)} history items for user {user_id}")
        return history_list
    except Exception as e:
        logger.error(f"❌ Error fetching history for user {user_id}: {str(e)}")
        return []

def add_analysis_to_history(user_id, text_input, analysis_result):
    """Add an analysis result to the user's history in Firebase"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for add_analysis_to_history for user {user_id}")
        return None
    
    try:
        # Ensure user exists
        user = get_or_create_user(user_id, f"{user_id}@placeholder.email.com")
        if not user:
            logger.error(f"Failed to get or create user {user_id} before adding to history.")
            return None

        history_ref = db.collection('users').document(user_id).collection('history')
        
        # Build complete history item
        history_item_data = {
            'text': text_input,
            'threat': analysis_result.get('threat', False),
            'predicted_class': analysis_result.get('predicted_class', 'N/A'),
            'confidence': analysis_result.get('confidence', 0.0),
            'probabilities': analysis_result.get('probabilities', {}),
            'visualization_data': analysis_result.get('visualization_data', {}),
            'timestamp': firestore.SERVER_TIMESTAMP,
            'threat_content': text_input,
            'threat_class': analysis_result.get('predicted_class', 'N/A'),
            'threat_confidence': analysis_result.get('confidence', 0.0) * 100,
            'hierarchical_classification': analysis_result.get('hierarchical_classification', {}),
            'threat_type': analysis_result.get('threat_type', ''),
            'stage1_result': analysis_result.get('stage1_result', {}),
            'stage2_result': analysis_result.get('stage2_result', {}),
            'stage1_breakdown': analysis_result.get('stage1_breakdown', []),
            'stage2_breakdown': analysis_result.get('stage2_breakdown', []),
            'stage': analysis_result.get('stage', 1),
        }
        
        # Include Twitter metadata if present
        if 'twitter_metadata' in analysis_result:
            history_item_data['twitter_metadata'] = analysis_result['twitter_metadata']
            history_item_data['source'] = 'twitter'
        else:
            history_item_data['source'] = 'direct_input'
            
        # Include user metadata if present
        if 'user_metadata' in analysis_result:
            history_item_data['user_metadata'] = analysis_result['user_metadata']
        
        # Add any additional fields
        for key, value in analysis_result.items():
            if key not in history_item_data and key != 'id':
                history_item_data[key] = value
        
        # Add to Firebase
        new_doc_ref = history_ref.document()
        new_doc_ref.set(history_item_data)
        
        # Get stored document
        stored_doc = new_doc_ref.get()
        if stored_doc.exists:
            stored_data = stored_doc.to_dict()
            if 'timestamp' in stored_data and hasattr(stored_data['timestamp'], 'isoformat'):
                stored_data['timestamp'] = stored_data['timestamp'].isoformat()
            
            stored_data['id'] = new_doc_ref.id
            
            logger.info(f"✅ Successfully added analysis to history for user {user_id}, doc ID: {new_doc_ref.id}")
            return stored_data
        else:
            logger.error(f"❌ Failed to retrieve newly added history item for user {user_id}")
            return None
    except Exception as e:
        logger.error(f"❌ Error adding analysis to history for user {user_id}: {str(e)}")
        return None

def update_user_threat_stats(user_id, analysis_result):
    """Update user threat statistics based on analysis result"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for update_user_threat_stats for user {user_id}")
        return None
    
    try:
        user_ref = db.collection('users').document(user_id)
        stats_ref = user_ref.collection('stats').document('threat_stats')

        # Use transaction for atomic updates
        @firestore.transactional
        def update_stats_transaction(transaction, stats_doc_ref, analysis_res):
            stats_snapshot = stats_doc_ref.get(transaction=transaction)
            
            if not stats_snapshot.exists:
                current_stats = {
                    'totalAnalyzed': 0, 'threatsDetected': 0, 'highSeverity': 0,
                    'averageConfidence': 0.0, 'recentChange': 0.0, 'lastUpdated': 'Never'
                }
            else:
                current_stats = stats_snapshot.to_dict()

            current_stats['totalAnalyzed'] = current_stats.get('totalAnalyzed', 0) + 1
            current_stats['lastUpdated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            if analysis_res.get('threat', False):
                current_stats['threatsDetected'] = current_stats.get('threatsDetected', 0) + 1
                
                confidence = analysis_res.get('confidence', 0.0) * 100
                predicted_class = analysis_res.get('predicted_class', '')
                
                is_high_severity = (
                    confidence >= 90 or 
                    (confidence >= 70 and any(term in predicted_class for term in ['Violence', 'Child']))
                )
                if is_high_severity:
                    current_stats['highSeverity'] = current_stats.get('highSeverity', 0) + 1
                
                # Update average confidence for threats only
                old_avg_confidence = current_stats.get('averageConfidence', 0.0)
                num_threats = current_stats['threatsDetected']
                if num_threats == 1:
                    current_stats['averageConfidence'] = confidence
                else:
                    current_stats['averageConfidence'] = ((old_avg_confidence * (num_threats - 1)) + confidence) / num_threats
                
                current_stats['averageConfidence'] = round(current_stats['averageConfidence'], 1)

                current_stats['recentChange'] = round(abs(current_stats.get('averageConfidence', 0) - 75.0) / 10, 1)
            current_stats['updated_at'] = firestore.SERVER_TIMESTAMP
            
            transaction.set(stats_doc_ref, current_stats)
            return current_stats

        transaction = db.transaction()
        updated_stats_dict = update_stats_transaction(transaction, stats_ref, analysis_result)
        logger.info(f"✅ Successfully updated threat stats for user {user_id}")
        
        # Update categories if it's a threat
        if analysis_result.get('threat', False) and analysis_result.get('predicted_class'):
            update_threat_categories(user_id, analysis_result.get('predicted_class'))
        
        return {
            "totalAnalyzed": updated_stats_dict.get('totalAnalyzed',0),
            "threatsDetected": updated_stats_dict.get('threatsDetected',0),
            "highSeverity": updated_stats_dict.get('highSeverity',0),
            "averageConfidence": updated_stats_dict.get('averageConfidence',0.0),
            "recentChange": updated_stats_dict.get('recentChange',0.0),
            "lastUpdated": updated_stats_dict.get('lastUpdated','Never')
        }
    except Exception as e:
        logger.error(f"❌ Error updating threat stats for user {user_id}: {str(e)}")
        return None

def update_threat_categories(user_id, predicted_class_name):
    """Update threat categories based on prediction"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for update_threat_categories for user {user_id}")
        return
    
    try:
        categories_ref = db.collection('users').document(user_id).collection('categories')
        
        @firestore.transactional
        def update_categories_transaction(transaction, cat_collection_ref, p_class_name):
            categories_snapshot = list(cat_collection_ref.stream(transaction=transaction))
            
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
                    'trend': 'up',
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                
                # Recalculate percentages
                total_threat_counts = 0
                all_category_data = []
                for snap in cat_collection_ref.stream(transaction=transaction):
                    data = snap.to_dict()
                    if snap.reference.path == target_category_doc_ref.path:
                        data['count'] = new_count
                        all_category_data.append({'ref': snap.reference, 'data': data})
                    total_threat_counts += data.get('count',0)

                for item in all_category_data:
                    current_cat_count = item['data'].get('count', 0)
                    percentage = round((current_cat_count / total_threat_counts) * 100, 1) if total_threat_counts > 0 else 0.0
                    transaction.update(item['ref'], {'percentage': percentage})
                    
                logger.info(f"✅ Updated category '{target_category_data.get('category')}' count to {new_count} for user {user_id}")

        transaction = db.transaction()
        update_categories_transaction(transaction, categories_ref, predicted_class_name)
    except Exception as e:
        logger.error(f"❌ Error updating threat categories for user {user_id}: {str(e)}")

def get_twitter_threats(user_id):
    """Get all Twitter-related threat analyses from user's history"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_twitter_threats for user {user_id}")
        return []
    
    try:
        history = get_user_analysis_history(user_id, limit=1000)
        
        if not history:
            return []
        
        # Filter for Twitter-related threats
        twitter_threats = []
        for item in history:
            is_twitter = (
                'twitter_metadata' in item or
                item.get('source') == 'twitter' or
                item.get('text', '').startswith('Tweet') or
                '@' in item.get('text', '')
            )
            
            is_threat = item.get('threat', False) or item.get('predicted_class') != 'Non-threat/Neutral'
            
            if is_twitter and is_threat:
                twitter_threats.append(item)
        
        logger.info(f"✅ Found {len(twitter_threats)} Twitter threats for user {user_id}")
        return twitter_threats
        
    except Exception as e:
        logger.error(f"❌ Error getting Twitter threats for user {user_id}: {str(e)}")
        return []

# Threat Map Functions
def add_threat_location(user_id, threat_data):
    """Add a threat location to the user's threat map collection"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for add_threat_location for user {user_id}")
        return None
    
    try:
        # Ensure user exists
        user = get_or_create_user(user_id, f"{user_id}@placeholder.email.com")
        if not user:
            logger.error(f"Failed to get or create user {user_id} before adding threat location.")
            return None

        threat_locations_ref = db.collection('users').document(user_id).collection('threat_locations')
        
        # Add timestamp and ensure required fields
        threat_location_data = {
            'id': threat_data.get('id', f"THR-{str(uuid.uuid4())[:8]}"),
            'type': threat_data.get('type', 'Unknown Threat'),
            'lat': threat_data.get('lat', 0.0),
            'lng': threat_data.get('lng', 0.0),
            'title': threat_data.get('title', 'Threat Detected'),
            'location': threat_data.get('location', 'Unknown Location'),
            'details': threat_data.get('details', 'No details available'),
            'priority': threat_data.get('priority', 'medium'),
            'date': threat_data.get('date', datetime.now().isoformat()),
            'caseId': threat_data.get('caseId', f"THP-{str(uuid.uuid4())[:8]}"),
            'source': threat_data.get('source', 'manual'),
            'user_id': user_id,
            'confidence': threat_data.get('confidence', 0.0),
            'predicted_class': threat_data.get('predicted_class', ''),
            'twitter_metadata': threat_data.get('twitter_metadata', {}),
            'text': threat_data.get('text', ''),
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        
        # Use the threat ID as document ID for easy retrieval
        doc_id = threat_location_data['id']
        threat_locations_ref.document(doc_id).set(threat_location_data)
        
        logger.info(f"✅ Successfully added threat location {doc_id} for user {user_id}")
        return threat_location_data
        
    except Exception as e:
        logger.error(f"❌ Error adding threat location for user {user_id}: {str(e)}")
        return None

def get_user_threat_locations(user_id, limit=1000):
    """Get all threat locations for a user"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for get_user_threat_locations for user {user_id}")
        return []
    
    try:
        user_ref = db.collection('users').document(user_id)
        
        if not user_ref.get().exists:
            logger.warning(f"User {user_id} does not exist in Firestore")
            return []
        
        threat_locations_ref = user_ref.collection('threat_locations')
        threat_locations_query = threat_locations_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
        
        locations_list = []
        for doc in threat_locations_query.stream():
            location_data = doc.to_dict()
            
            # Convert timestamp to ISO format
            if 'timestamp' in location_data and hasattr(location_data['timestamp'], 'isoformat'):
                location_data['timestamp'] = location_data['timestamp'].isoformat()
            
            locations_list.append(location_data)
            
        logger.info(f"✅ Fetched {len(locations_list)} threat locations for user {user_id}")
        return locations_list
        
    except Exception as e:
        logger.error(f"❌ Error fetching threat locations for user {user_id}: {str(e)}")
        return []

def get_all_threat_locations(user_id=None, limit=1000):
    """Get threat locations for all users or specific user"""
    db = get_firestore_db()
    if not db:
        logger.error("Firestore DB not available for get_all_threat_locations")
        return []
    
    try:
        all_locations = []
        
        if user_id:
            # Get locations for specific user
            return get_user_threat_locations(user_id, limit)
        else:
            # Get locations for all users (admin view)
            users_ref = db.collection('users')
            users_stream = users_ref.stream()
            
            for user_doc in users_stream:
                user_locations = get_user_threat_locations(user_doc.id, limit // 10)  # Distribute limit across users
                all_locations.extend(user_locations)
                
                if len(all_locations) >= limit:
                    break
            
            # Sort by timestamp descending
            all_locations.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
        logger.info(f"✅ Fetched {len(all_locations)} total threat locations")
        return all_locations[:limit]
        
    except Exception as e:
        logger.error(f"❌ Error fetching all threat locations: {str(e)}")
        return []

def filter_threat_locations(user_id, time_range_days=30, threat_types=None, priority_levels=None):
    """Filter threat locations based on criteria"""
    db = get_firestore_db()
    if not db:
        logger.error(f"Firestore DB not available for filter_threat_locations for user {user_id}")
        return []
    
    try:
        # Get all user threat locations first
        all_locations = get_user_threat_locations(user_id, 1000)
        
        if not all_locations:
            return []
        
        filtered_locations = []
        cutoff_date = datetime.now() - timedelta(days=time_range_days)
        
        for location in all_locations:
            # Time range filter
            location_date_str = location.get('date', location.get('timestamp', ''))
            if location_date_str:
                try:
                    if location_date_str.endswith('Z'):
                        location_date = datetime.fromisoformat(location_date_str.replace('Z', '+00:00'))
                    else:
                        location_date = datetime.fromisoformat(location_date_str)
                    
                    if location_date < cutoff_date:
                        continue
                except ValueError:
                    # Skip if date parsing fails
                    continue
            
            # Threat type filter
            if threat_types and len(threat_types) > 0:
                location_type = location.get('type', location.get('predicted_class', ''))
                if location_type not in threat_types:
                    continue
            
            # Priority filter
            if priority_levels and len(priority_levels) > 0:
                location_priority = location.get('priority', 'medium')
                if location_priority not in priority_levels:
                    continue
            
            filtered_locations.append(location)
        
        logger.info(f"✅ Filtered {len(filtered_locations)} threat locations for user {user_id}")
        return filtered_locations
        
    except Exception as e:
        logger.error(f"❌ Error filtering threat locations for user {user_id}: {str(e)}")
        return [] 