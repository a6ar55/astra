"""
Geocoding utilities for converting location strings to latitude/longitude coordinates
"""
import requests
import logging
import time
import random
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Pre-defined coordinates for major cities to avoid API calls
CITY_COORDINATES = {
    # United States
    "new york": (40.7128, -74.0060),
    "los angeles": (34.0522, -118.2437),
    "chicago": (41.8781, -87.6298),
    "houston": (29.7604, -95.3698),
    "phoenix": (33.4484, -112.0740),
    "philadelphia": (39.9526, -75.1652),
    "san antonio": (29.4241, -98.4936),
    "san diego": (32.7157, -117.1611),
    "dallas": (32.7767, -96.7970),
    "san jose": (37.3382, -121.8863),
    "austin": (30.2672, -97.7431),
    "jacksonville": (30.3322, -81.6557),
    "fort worth": (32.7555, -97.3308),
    "columbus": (39.9612, -82.9988),
    "charlotte": (35.2271, -80.8431),
    "san francisco": (37.7749, -122.4194),
    "indianapolis": (39.7684, -86.1581),
    "seattle": (47.6062, -122.3321),
    "denver": (39.7392, -104.9903),
    "boston": (42.3601, -71.0589),
    "el paso": (31.7619, -106.4850),
    "detroit": (42.3314, -83.0458),
    "nashville": (36.1627, -86.7816),
    "portland": (45.5152, -122.6784),
    "memphis": (35.1495, -90.0490),
    "oklahoma city": (35.4676, -97.5164),
    "las vegas": (36.1699, -115.1398),
    "louisville": (38.2527, -85.7585),
    "baltimore": (39.2904, -76.6122),
    "milwaukee": (43.0389, -87.9065),
    "albuquerque": (35.0844, -106.6504),
    "tucson": (32.2226, -110.9747),
    "fresno": (36.7378, -119.7871),
    "mesa": (33.4152, -111.8315),
    "sacramento": (38.5816, -121.4944),
    "atlanta": (33.7490, -84.3880),
    "kansas city": (39.0997, -94.5786),
    "colorado springs": (38.8339, -104.8214),
    "omaha": (41.2524, -95.9980),
    "raleigh": (35.7796, -78.6382),
    "miami": (25.7617, -80.1918),
    "long beach": (33.7701, -118.1937),
    "virginia beach": (36.8529, -75.9780),
    "oakland": (37.8044, -122.2711),
    "minneapolis": (44.9778, -93.2650),
    "tulsa": (36.1540, -95.9928),
    "tampa": (27.9506, -82.4572),
    "arlington": (32.7357, -97.1081),
    "new orleans": (29.9511, -90.0715),
    
    # International Cities
    "london": (51.5074, -0.1278),
    "paris": (48.8566, 2.3522),
    "tokyo": (35.6762, 139.6503),
    "berlin": (52.5200, 13.4050),
    "madrid": (40.4168, -3.7038),
    "rome": (41.9028, 12.4964),
    "moscow": (55.7558, 37.6176),
    "beijing": (39.9042, 116.4074),
    "shanghai": (31.2304, 121.4737),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "bangalore": (12.9716, 77.5946),
    "sydney": (33.8688, 151.2093),
    "melbourne": (37.8136, 144.9631),
    "toronto": (43.6532, -79.3832),
    "vancouver": (49.2827, -123.1207),
    "montreal": (45.5017, -73.5673),
    "rio de janeiro": (22.9068, -43.1729),
    "sao paulo": (23.5505, -46.6333),
    "buenos aires": (34.6118, -58.3960),
    "cairo": (30.0444, 31.2357),
    "lagos": (6.5244, 3.3792),
    "johannesburg": (26.2041, 28.0473),
    "cape town": (33.9249, 18.4241),
    "nairobi": (1.2921, 36.8219),
    "dubai": (25.2048, 55.2708),
    "istanbul": (41.0082, 28.9784),
    "tehran": (35.6892, 51.3890),
    "karachi": (24.8607, 67.0011),
    "dhaka": (23.8103, 90.4125),
    "manila": (14.5995, 120.9842),
    "jakarta": (6.2088, 106.8456),
    "bangkok": (13.7563, 100.5018),
    "kuala lumpur": (3.1390, 101.6869),
    "singapore": (1.3521, 103.8198),
    "hong kong": (22.3193, 114.1694),
    "seoul": (37.5665, 126.9780),
    
    # Countries (approximate centers)
    "usa": (39.8283, -98.5795),
    "united states": (39.8283, -98.5795),
    "canada": (56.1304, -106.3468),
    "mexico": (23.6345, -102.5528),
    "united kingdom": (55.3781, -3.4360),
    "france": (46.6034, 1.8883),
    "germany": (51.1657, 10.4515),
    "italy": (41.8719, 12.5674),
    "spain": (40.4637, -3.7492),
    "russia": (61.5240, 105.3188),
    "china": (35.8617, 104.1954),
    "japan": (36.2048, 138.2529),
    "india": (20.5937, 78.9629),
    "australia": (-25.2744, 133.7751),
    "brazil": (-14.2350, -51.9253),
    "argentina": (-38.4161, -63.6167),
    "south africa": (-30.5595, 22.9375),
    "egypt": (26.0975, 30.0444),
    "nigeria": (9.0820, 8.6753),
    "kenya": (-0.0236, 37.9062),
    "saudi arabia": (23.8859, 45.0792),
    "turkey": (38.9637, 35.2433),
    "iran": (32.4279, 53.6880),
    "pakistan": (30.3753, 69.3451),
    "bangladesh": (23.6850, 90.3563),
    "philippines": (12.8797, 121.7740),
    "indonesia": (-0.7893, 113.9213),
    "thailand": (15.8700, 100.9925),
    "malaysia": (4.2105, 101.9758),
    "vietnam": (14.0583, 108.2772),
    "south korea": (35.9078, 127.7669),
    "north korea": (40.3399, 127.5101),
}

def get_coordinates_from_cache(location_str: str) -> Optional[Tuple[float, float]]:
    """
    Get coordinates from the pre-defined cache
    
    Args:
        location_str: Location string to look up
        
    Returns:
        Tuple of (latitude, longitude) if found, None otherwise
    """
    if not location_str:
        return None
    
    # Clean and normalize the location string
    location_clean = location_str.lower().strip()
    
    # Remove common prefixes/suffixes
    location_clean = location_clean.replace("tip jar:", "").replace("$", "").strip()
    
    # Direct lookup
    if location_clean in CITY_COORDINATES:
        return CITY_COORDINATES[location_clean]
    
    # Partial matching for cities with state/country
    for city, coords in CITY_COORDINATES.items():
        if city in location_clean or location_clean in city:
            return coords
    
    return None

def geocode_location(location_str: str, use_api: bool = False) -> Optional[Tuple[float, float]]:
    """
    Convert a location string to latitude/longitude coordinates.
    Returns None if the location cannot be determined.
    
    Args:
        location_str: Location string to geocode
        use_api: Whether to use external geocoding API (currently disabled)
        
    Returns:
        Tuple of (latitude, longitude) or None
    """
    if not location_str or not isinstance(location_str, str) or location_str.strip() == "":
        return None

    # Check for placeholder/negative values
    location_lower = location_str.lower()
    if any(placeholder in location_lower for placeholder in ["not available", "n/a", "unknown"]):
        return None
    
    # Try cache first
    cached_coords = get_coordinates_from_cache(location_str)
    if cached_coords:
        logger.info(f"Found cached coordinates for '{location_str}': {cached_coords}")
        return cached_coords
    
    # If not found in cache, we stop here for now as API is disabled
    # In a future implementation, this is where you would call a real geocoding API
    # and handle its response.
    
    logger.warning(f"Location '{location_str}' not found in cache. No coordinates will be assigned.")
    return None

def generate_random_coordinates() -> Tuple[float, float]:
    """
    Generate random but realistic coordinates
    
    Returns:
        Tuple of (latitude, longitude)
    """
    # Generate coordinates that favor populated areas
    populated_regions = [
        # North America
        (random.uniform(25.0, 49.0), random.uniform(-125.0, -66.0)),
        # Europe
        (random.uniform(35.0, 70.0), random.uniform(-10.0, 40.0)),
        # Asia
        (random.uniform(10.0, 50.0), random.uniform(70.0, 140.0)),
        # South America
        (random.uniform(-35.0, 10.0), random.uniform(-80.0, -35.0)),
        # Africa
        (random.uniform(-35.0, 35.0), random.uniform(-20.0, 50.0)),
        # Australia/Oceania
        (random.uniform(-45.0, -10.0), random.uniform(110.0, 180.0)),
    ]
    
    return random.choice(populated_regions)

def determine_threat_priority(threat_type: str, confidence: float) -> str:
    """
    Determine threat priority based on type and confidence
    
    Args:
        threat_type: The classified threat type
        confidence: Confidence score (0.0 to 1.0)
        
    Returns:
        Priority level string
    """
    confidence_percent = confidence * 100
    
    # High-risk threat types
    high_risk_types = [
        "Direct Violence Threats",
        "Child Safety Threats"
    ]
    
    # Medium-risk threat types  
    medium_risk_types = [
        "Hate Speech/Extremism",
        "Criminal Activity"
    ]
    
    # Determine priority
    if threat_type in high_risk_types:
        if confidence_percent >= 80:
            return "critical"
        elif confidence_percent >= 60:
            return "high"
        else:
            return "medium"
    elif threat_type in medium_risk_types:
        if confidence_percent >= 90:
            return "high"
        elif confidence_percent >= 70:
            return "medium"
        else:
            return "low"
    else:
        if confidence_percent >= 95:
            return "medium"
        else:
            return "low"

def extract_location_from_user_data(user_data: Dict[str, Any]) -> str:
    """
    Extract location information from user data (Twitter API response format)
    
    Args:
        user_data: User information dictionary from Twitter API
        
    Returns:
        Location string or empty string if not found
    """
    if not user_data:
        return ""

def extract_location_from_twitter_api_response(api_response: Dict[str, Any]) -> str:
    """
    Extract location information from Twitter API response (like the provided example)
    
    Args:
        api_response: Full Twitter API response dictionary
        
    Returns:
        Location string or empty string if not found
    """
    if not api_response:
        return ""
    
    # Navigate through the API response structure
    # Based on the provided example: timeline -> instructions -> entries -> content -> user_results -> result -> legacy -> location
    try:
        result = api_response.get('result', {})
        timeline = result.get('timeline', {})
        instructions = timeline.get('instructions', [])
        
        for instruction in instructions:
            if instruction.get('type') == 'TimelineAddEntries':
                entries = instruction.get('entries', [])
                
                for entry in entries:
                    content = entry.get('content', {})
                    
                    # Check for user module entries
                    if content.get('entryType') == 'TimelineTimelineModule':
                        items = content.get('items', [])
                        for item in items:
                            item_content = item.get('item', {}).get('itemContent', {})
                            if item_content.get('itemType') == 'TimelineUser':
                                user_results = item_content.get('user_results', {})
                                user_result = user_results.get('result', {})
                                legacy = user_result.get('legacy', {})
                                location = legacy.get('location', '')
                                
                                if location and location.strip():
                                    # Clean location string (remove monetary references)
                                    location = location.strip()
                                    if not location.lower().startswith(('tip jar', '$', 'venmo', 'cashapp', 'cash app')):
                                        logger.info(f"Extracted location from Twitter API response: {location}")
                                        return location
                    
                    # Check for direct user results
                    elif 'user_results' in content:
                        user_results = content.get('user_results', {})
                        user_result = user_results.get('result', {})
                        legacy = user_result.get('legacy', {})
                        location = legacy.get('location', '')
                        
                        if location and location.strip():
                            location = location.strip()
                            if not location.lower().startswith(('tip jar', '$', 'venmo', 'cashapp', 'cash app')):
                                logger.info(f"Extracted location from Twitter API response: {location}")
                                return location
        
        logger.info("No valid location found in Twitter API response")
        return ""
        
    except Exception as e:
        logger.error(f"Error extracting location from Twitter API response: {e}")
        return ""

def extract_location_from_user_data(user_data: Dict[str, Any]) -> str:
    """
    Extract location information from user data (Twitter API response format)
    
    Args:
        user_data: User information dictionary from Twitter API
        
    Returns:
        Location string or empty string if not found
    """
    if not user_data:
        return ""
    if 'result' in user_data and isinstance(user_data['result'], dict):
        user_data = user_data['result']
    
    # Check different possible location fields in Twitter API response format
    location_fields = [
        'location',
        'legacy.location',
        'profile_location',
        'user_location',
        'geo_location'
    ]
    
    for field in location_fields:
        if '.' in field:
            # Handle nested fields (like legacy.location)
            parts = field.split('.')
            value = user_data
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    value = None
                    break
            if value and isinstance(value, str) and value.strip():
                location = value.strip()
                # Clean up common Twitter location patterns
                if location and not location.startswith('$') and not location.startswith('tip jar'):
                    return location
        else:
            # Handle direct fields
            if field in user_data and user_data[field]:
                location = user_data[field]
                if isinstance(location, str) and location.strip():
                    location = location.strip()
                    # Clean up common Twitter location patterns
                    if location and not location.startswith('$') and not location.startswith('tip jar'):
                        return location
    
    # If no location found in user data, try to extract from timeline data
    if 'timeline' in user_data and isinstance(user_data['timeline'], dict):
        timeline_data = user_data['timeline']
        # Extract any location information from timeline instructions or entries
        if 'instructions' in timeline_data:
            for instruction in timeline_data['instructions']:
                if 'entries' in instruction:
                    for entry in instruction['entries']:
                        if 'content' in entry and 'user_results' in entry['content']:
                            user_result = entry['content']['user_results'].get('result', {})
                            if 'legacy' in user_result and 'location' in user_result['legacy']:
                                location = user_result['legacy']['location']
                                if location and location.strip():
                                    return location.strip()
    
    return "" 