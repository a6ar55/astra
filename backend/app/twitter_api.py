import requests
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

TWITTER_API_HOST = "twitter241.p.rapidapi.com"
TWITTER_API_KEY = "8d1cd79b4amshe05e1c93c31c055p16a3e2jsn2127cb0fc270"

class TwitterAPI:
    def __init__(self):
        self.headers = {
            "x-rapidapi-key": TWITTER_API_KEY,
            "x-rapidapi-host": TWITTER_API_HOST
        }
    
    def get_user_tweets(self, user_id: str, count: int = 20) -> Dict[str, Any]:
        """
        Get tweets from a specific user
        """
        try:
            url = "https://twitter241.p.rapidapi.com/user-tweets"
            querystring = {"user": user_id, "count": str(count)}
            
            response = requests.get(url, headers=self.headers, params=querystring)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching user tweets: {e}")
            return {"error": str(e)}
    
    def search_tweets(self, query: str, count: int = 20, search_type: str = "Top") -> Dict[str, Any]:
        """
        Search tweets by keyword
        """
        try:
            url = "https://twitter241.p.rapidapi.com/search-v2"
            querystring = {"type": search_type, "count": str(count), "query": query}
            
            response = requests.get(url, headers=self.headers, params=querystring)
            return response.json()
        except Exception as e:
            logger.error(f"Error searching tweets: {e}")
            return {"error": str(e)}
    
    def get_user_info(self, username: str) -> Dict[str, Any]:
        """
        Get information about a Twitter user
        """
        try:
            url = "https://twitter241.p.rapidapi.com/user"
            querystring = {"username": username}
            
            response = requests.get(url, headers=self.headers, params=querystring)
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching user info: {e}")
            return {"error": str(e)}
    
    def extract_user_metadata(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant metadata from Twitter user data
        """
        if not user_data or "error" in user_data:
            return {}
        
        try:
            return {
                "twitter_handle": user_data.get("screen_name", ""),
                "display_name": user_data.get("name", ""),
                "verified": user_data.get("verified", False),
                "follower_count": user_data.get("followers_count", 0),
                "following_count": user_data.get("friends_count", 0),
                "account_creation_date": user_data.get("created_at", ""),
                "profile_description": user_data.get("description", ""),
                "location": user_data.get("location", ""),
                "profile_image": user_data.get("profile_image_url_https", ""),
                "tweet_count": user_data.get("statuses_count", 0),
                "url": user_data.get("url", ""),
            }
        except Exception as e:
            logger.error(f"Error extracting user metadata: {e}")
            return {}
    
    def analyze_tweet_content(self, tweet_content: str) -> Dict[str, Any]:
        """
        Placeholder for tweet content analysis
        This would connect to the existing threat detection model
        """
        # In a real implementation, this would send the tweet through the threat detection model
        return {
            "is_threat": False,
            "threat_type": None,
            "confidence": 0.0
        }

# Create singleton instance
twitter_api = TwitterAPI() 