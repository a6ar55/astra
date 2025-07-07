import os
import json
import logging
import aiohttp
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)

class LegalAnalysisService:
    def __init__(self):
        self.db = None
        self.api_url = "https://8000-dep-01jzg5bg4bh5z1453jx8fczxry-d.cloudspaces.litng.ai/predict"
        self.api_key = "0da8c2bf-e454-4d7f-867e-d246d5e59390"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_db(self):
        """Lazy initialization of Firestore client"""
        if self.db is None:
            try:
                self.db = firestore.client()
            except ValueError:
                logger.error("Firebase not initialized. Legal analysis service will not work properly.")
                raise
        return self.db

    def map_threat_class_to_legal_label(self, threat_class: str) -> str:
        """Map internal threat classes to legal labels for the API"""
        mapping = {
            "hate speech/extremism": "Hate Speech/Extremism",
            "hate speech": "Hate Speech/Extremism",
            "direct violence threats": "Direct Violence Threat",
            "violence": "Direct Violence Threat",
            "harassment and intimidation": "Harassment and Intimidation",
            "harassment": "Harassment and Intimidation",
            "criminal activity": "Criminal Activity",
            "child safety threats": "Child Safety Threat",
            "not a threat": "Non-threat/Neutral"
        }
        
        return mapping.get(threat_class.lower(), "Direct Violence Threat")

    async def analyze_legal_implications(self, content: str, threat_class: str, user_id: str) -> Dict[str, Any]:
        """Analyze legal implications of threat content"""
        try:
            logger.info(f"Analyzing legal implications for content: {content[:50]}...")
            
            # Map threat class to legal label
            legal_label = self.map_threat_class_to_legal_label(threat_class)
            
            # Prepare request payload
            payload = {
                "content": content,
                "class_label": legal_label
            }
            
            # Send request to legal API
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        logger.info("Legal analysis completed successfully")
                        
                        # Create analysis record
                        analysis_data = {
                            "content": content,
                            "threat_class": threat_class,
                            "legal_label": legal_label,
                            "legal_analysis": result.get("answer", ""),
                            "user_id": user_id,
                            "timestamp": datetime.now(timezone.utc),
                            "status": "completed"
                        }
                        
                        # Save to Firebase
                        await self.save_legal_analysis(analysis_data)
                        
                        return {
                            "status": "success",
                            "legal_analysis": result.get("answer", ""),
                            "threat_class": threat_class,
                            "legal_label": legal_label,
                            "timestamp": analysis_data["timestamp"]
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Legal API error: {response.status} - {error_text}")
                        raise Exception(f"Legal API returned status {response.status}: {error_text}")
                        
        except asyncio.TimeoutError:
            logger.error("Legal analysis request timed out")
            raise Exception("Legal analysis request timed out")
        except Exception as e:
            logger.error(f"Error in legal analysis: {e}")
            raise

    async def save_legal_analysis(self, analysis_data: Dict[str, Any]) -> str:
        """Save legal analysis to Firebase"""
        try:
            db = self._get_db()
            
            # Generate unique ID
            analysis_id = f"legal_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{analysis_data['user_id'][:8]}"
            
            # Save to Firebase
            legal_ref = db.collection('legal_analyses').document(analysis_id)
            legal_ref.set(analysis_data)
            
            logger.info(f"Legal analysis saved with ID: {analysis_id}")
            return analysis_id
            
        except Exception as e:
            logger.error(f"Error saving legal analysis: {e}")
            raise

    async def get_user_legal_analyses(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all legal analyses for a user"""
        try:
            db = self._get_db()
            legal_ref = db.collection('legal_analyses')
            query = legal_ref.where('user_id', '==', user_id).limit(limit)
            
            docs = query.stream()
            analyses = []
            
            for doc in docs:
                analysis_data = doc.to_dict()
                analysis_data['id'] = doc.id
                analyses.append(analysis_data)
            
            # Sort by timestamp (newest first)
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return analyses
            
        except Exception as e:
            logger.error(f"Error fetching legal analyses: {e}")
            raise

    async def get_legal_analysis_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """Get specific legal analysis by ID"""
        try:
            db = self._get_db()
            legal_ref = db.collection('legal_analyses').document(analysis_id)
            doc = legal_ref.get()
            
            if doc.exists:
                analysis_data = doc.to_dict()
                analysis_data['id'] = doc.id
                return analysis_data
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error fetching legal analysis {analysis_id}: {e}")
            raise

    async def delete_legal_analysis(self, analysis_id: str, user_id: str) -> bool:
        """Delete legal analysis (only if user owns it)"""
        try:
            db = self._get_db()
            
            # Verify ownership
            analysis_data = await self.get_legal_analysis_by_id(analysis_id)
            if not analysis_data or analysis_data.get('user_id') != user_id:
                return False
            
            # Delete from Firebase
            legal_ref = db.collection('legal_analyses').document(analysis_id)
            legal_ref.delete()
            
            logger.info(f"Legal analysis {analysis_id} deleted successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting legal analysis: {e}")
            raise

# Global legal analysis service instance
legal_analysis_service = LegalAnalysisService() 