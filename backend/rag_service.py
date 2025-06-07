"""
RAG (Retrieval Augmented Generation) Service for Threat Analysis Chatbot
Implements semantic search over threat reports and provides context for AI responses
"""

import os
import json
import sqlite3
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ThreatReportRAG:
    """
    RAG system for threat analysis reports using semantic search
    and context retrieval for enhanced chatbot responses
    """
    
    def __init__(self, db_path: str = "astra.db", model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the RAG system with embedding model and database connection
        
        Args:
            db_path: Path to SQLite database
            model_name: Sentence transformer model for embeddings
        """
        self.db_path = db_path
        self.model = SentenceTransformer(model_name)
        self.embeddings_cache = {}
        self.reports_cache = []
        
        # Initialize database
        self._init_database()
        self._refresh_cache()
        
    def _init_database(self):
        """Initialize database tables for RAG system"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create reports table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS threat_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    report_type TEXT NOT NULL,
                    report_data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    embedding_vector TEXT
                )
            """)
            
            # Create chat conversations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    response TEXT NOT NULL,
                    context_used TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            
    def _refresh_cache(self):
        """Refresh the cache of reports and embeddings"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, user_id, report_type, report_data, created_at, embedding_vector
                FROM threat_reports
                ORDER BY created_at DESC
            """)
            
            self.reports_cache = []
            self.embeddings_cache = {}
            
            for row in cursor.fetchall():
                report_id, user_id, report_type, report_data, created_at, embedding_vector = row
                
                try:
                    report_data = json.loads(report_data)
                    
                    # Create searchable text from report
                    searchable_text = self._extract_searchable_text(report_data, report_type)
                    
                    report_entry = {
                        'id': report_id,
                        'user_id': user_id,
                        'report_type': report_type,
                        'report_data': report_data,
                        'created_at': created_at,
                        'searchable_text': searchable_text
                    }
                    
                    self.reports_cache.append(report_entry)
                    
                    # Load or generate embedding
                    if embedding_vector:
                        try:
                            embedding = np.array(json.loads(embedding_vector))
                            self.embeddings_cache[report_id] = embedding
                        except:
                            # Generate new embedding if loading fails
                            embedding = self.model.encode([searchable_text])[0]
                            self.embeddings_cache[report_id] = embedding
                            self._save_embedding(report_id, embedding)
                    else:
                        # Generate new embedding
                        embedding = self.model.encode([searchable_text])[0]
                        self.embeddings_cache[report_id] = embedding
                        self._save_embedding(report_id, embedding)
                        
                except Exception as e:
                    logger.error(f"Error processing report {report_id}: {e}")
                    
            conn.close()
            logger.info(f"Cache refreshed with {len(self.reports_cache)} reports")
            
        except Exception as e:
            logger.error(f"Cache refresh error: {e}")
            
    def _save_embedding(self, report_id: int, embedding: np.ndarray):
        """Save embedding vector to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            embedding_json = json.dumps(embedding.tolist())
            cursor.execute("""
                UPDATE threat_reports 
                SET embedding_vector = ?
                WHERE id = ?
            """, (embedding_json, report_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error saving embedding: {e}")
            
    def _extract_searchable_text(self, report_data: Dict, report_type: str) -> str:
        """Extract searchable text from report data"""
        searchable_parts = []
        
        try:
            if report_type == 'THREAT_ANALYSIS_REPORT':
                # Extract from threat analysis report
                if 'executive_summary' in report_data:
                    summary = report_data['executive_summary']
                    searchable_parts.append(f"Threats detected: {summary.get('threats_detected', 0)}")
                    searchable_parts.append(f"Total analyzed: {summary.get('total_items_analyzed', 0)}")
                    searchable_parts.append(f"Critical threats: {summary.get('critical_threats', 0)}")
                    
                if 'threat_breakdown' in report_data:
                    breakdown = report_data['threat_breakdown']
                    if 'by_category' in breakdown:
                        for category, count in breakdown['by_category'].items():
                            searchable_parts.append(f"{category}: {count} incidents")
                            
                if 'detailed_incidents' in report_data:
                    for incident in report_data['detailed_incidents'][:10]:  # Limit to first 10
                        searchable_parts.append(f"Incident {incident.get('incident_id', '')}: {incident.get('classification', '')} - {incident.get('severity_level', '')}")
                        content = incident.get('content', '')[:200]  # First 200 chars
                        if content:
                            searchable_parts.append(content)
                            
                if 'recommendations' in report_data:
                    searchable_parts.extend(report_data['recommendations'][:5])  # First 5 recommendations
                    
            elif report_type == 'INTELLIGENCE_SUMMARY':
                # Extract from intelligence summary
                if 'threat_landscape_overview' in report_data:
                    overview = report_data['threat_landscape_overview']
                    searchable_parts.append(f"Risk level: {overview.get('overall_risk_level', 'Unknown')}")
                    searchable_parts.append(f"Detection rate: {overview.get('threat_detection_rate', '0%')}")
                    searchable_parts.append(f"Trend: {overview.get('trend_indicator', 'Stable')}")
                    
                if 'category_analysis' in report_data:
                    for category in report_data['category_analysis'][:5]:  # First 5 categories
                        searchable_parts.append(f"{category.get('threat_type', '')}: {category.get('incident_count', 0)} incidents")
                        
                if 'key_findings' in report_data:
                    searchable_parts.extend(report_data['key_findings'][:5])
                    
                if 'immediate_actions_required' in report_data:
                    searchable_parts.extend(report_data['immediate_actions_required'][:3])
                    
            elif report_type == 'USER_THREAT_REPORT':
                # Extract from user-generated threat report
                searchable_parts.append(f"Title: {report_data.get('title', 'Untitled')}")
                searchable_parts.append(f"Threat Type: {report_data.get('threat_type', 'Unknown')}")
                searchable_parts.append(f"Severity: {report_data.get('severity', 'Unknown')}")
                
                description = report_data.get('description', '')
                if description:
                    searchable_parts.append(f"Description: {description}")
                    
                recommendations = report_data.get('recommendations', [])
                if recommendations:
                    searchable_parts.append(f"Recommendations: {' | '.join(recommendations[:3])}")
                    
                additional_data = report_data.get('additional_data', {})
                if additional_data:
                    for key, value in additional_data.items():
                        if isinstance(value, str) and len(value) < 200:
                            searchable_parts.append(f"{key}: {value}")
                            
            elif report_type == 'THREAT_ANALYSIS':
                # Extract from ML threat analysis results
                searchable_parts.append(f"Analyzed Text: {report_data.get('analyzed_text', '')[:200]}")
                searchable_parts.append(f"Classification: {report_data.get('predicted_class', 'Unknown')}")
                searchable_parts.append(f"Threat Type: {report_data.get('threat_type', 'Unknown')}")
                searchable_parts.append(f"Confidence: {report_data.get('confidence', 0):.2f}")
                
                # Add metadata if available
                metadata = report_data.get('additional_metadata', {})
                if 'twitter_metadata' in metadata:
                    twitter_data = metadata['twitter_metadata']
                    username = twitter_data.get('username', '')
                    if username:
                        searchable_parts.append(f"Twitter User: @{username}")
                    
        except Exception as e:
            logger.error(f"Error extracting searchable text: {e}")
            
        return " | ".join(searchable_parts)
        
    def save_report(self, user_id: str, report_type: str, report_data: Dict) -> bool:
        """Save a new threat report and generate its embedding"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            report_data_json = json.dumps(report_data)
            
            cursor.execute("""
                INSERT INTO threat_reports (user_id, report_type, report_data)
                VALUES (?, ?, ?)
            """, (user_id, report_type, report_data_json))
            
            report_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Generate and save embedding
            searchable_text = self._extract_searchable_text(report_data, report_type)
            embedding = self.model.encode([searchable_text])[0]
            self._save_embedding(report_id, embedding)
            
            # Refresh cache
            self._refresh_cache()
            
            logger.info(f"Report saved with ID: {report_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving report: {e}")
            return False
            
    def add_threat_report(self, user_id: str, title: str, threat_type: str, description: str, 
                         severity: str, recommendations: List[str] = None, 
                         additional_data: Dict = None) -> bool:
        """
        Add a user-generated threat report to the RAG system
        
        Args:
            user_id: User who created the report
            title: Report title
            threat_type: Type of threat
            description: Detailed description
            severity: Severity level
            recommendations: List of recommendations
            additional_data: Any additional metadata
            
        Returns:
            bool: Success status
        """
        try:
            # Structure the report data
            report_data = {
                'title': title,
                'threat_type': threat_type,
                'description': description,
                'severity': severity,
                'recommendations': recommendations or [],
                'additional_data': additional_data or {},
                'report_source': 'user_generated',
                'created_by': user_id
            }
            
            # Save using the main save_report method
            success = self.save_report(user_id, 'USER_THREAT_REPORT', report_data)
            
            if success:
                logger.info(f"User threat report added successfully for user {user_id}: {title}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error adding threat report: {e}")
            return False
            
    def add_threat_analysis(self, user_id: str, text: str, predicted_class: str, 
                           confidence: float, probabilities: Dict, 
                           threat_type: str = None, additional_metadata: Dict = None) -> bool:
        """
        Add a threat analysis result to the RAG system
        
        Args:
            user_id: User who performed the analysis
            text: Original text that was analyzed
            predicted_class: Classification result
            confidence: Confidence score
            probabilities: Class probabilities
            threat_type: Specific threat type if applicable
            additional_metadata: Any additional data (Twitter info, etc.)
            
        Returns:
            bool: Success status
        """
        try:
            # Only index threats, not neutral content
            if predicted_class == 'Non-threat/Neutral':
                return True  # Skip indexing non-threats
                
            # Structure the analysis data
            analysis_data = {
                'analyzed_text': text,
                'predicted_class': predicted_class,
                'confidence': confidence,
                'probabilities': probabilities,
                'threat_type': threat_type or predicted_class,
                'analysis_timestamp': datetime.now().isoformat(),
                'additional_metadata': additional_metadata or {},
                'analysis_source': 'ml_prediction'
            }
            
            # Create a title based on the prediction
            title = f"Threat Analysis: {predicted_class}"
            if threat_type and threat_type != predicted_class:
                title += f" ({threat_type})"
                
            # Save using the main save_report method
            success = self.save_report(user_id, 'THREAT_ANALYSIS', analysis_data)
            
            if success:
                logger.info(f"Threat analysis indexed for user {user_id}: {predicted_class}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error adding threat analysis: {e}")
            return False
            
    def search_reports(self, query: str, user_id: str = None, top_k: int = 5) -> List[Dict]:
        """
        Search for relevant reports using semantic similarity
        
        Args:
            query: Search query
            user_id: Optional user ID to filter results
            top_k: Number of top results to return
            
        Returns:
            List of relevant reports with similarity scores
        """
        if not self.reports_cache:
            return []
            
        try:
            # Generate query embedding
            query_embedding = self.model.encode([query])[0]
            
            # Filter reports by user if specified
            relevant_reports = self.reports_cache
            if user_id:
                relevant_reports = [r for r in self.reports_cache if r['user_id'] == user_id]
                
            if not relevant_reports:
                return []
                
            # Calculate similarities
            similarities = []
            for report in relevant_reports:
                report_id = report['id']
                if report_id in self.embeddings_cache:
                    report_embedding = self.embeddings_cache[report_id]
                    similarity = cosine_similarity([query_embedding], [report_embedding])[0][0]
                    similarities.append((similarity, report))
                    
            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            results = []
            for similarity, report in similarities[:top_k]:
                if similarity > 0.3:  # Minimum similarity threshold
                    results.append({
                        'report': report,
                        'similarity': float(similarity),
                        'relevant_text': report['searchable_text'][:500]  # First 500 chars
                    })
                    
            return results
            
        except Exception as e:
            logger.error(f"Error searching reports: {e}")
            return []
            
    def get_context_for_query(self, query: str, user_id: str = None) -> str:
        """
        Get relevant context from reports for a given query
        
        Args:
            query: User query
            user_id: Optional user ID to filter results
            
        Returns:
            Formatted context string for AI model
        """
        relevant_reports = self.search_reports(query, user_id, top_k=3)
        
        if not relevant_reports:
            return "No relevant threat reports found in the database."
            
        context_parts = ["=== RELEVANT THREAT INTELLIGENCE ==="]
        
        for i, result in enumerate(relevant_reports, 1):
            report = result['report']
            similarity = result['similarity']
            
            context_parts.append(f"\n--- Report {i} (Relevance: {similarity:.2f}) ---")
            context_parts.append(f"Type: {report['report_type']}")
            context_parts.append(f"Created: {report['created_at']}")
            context_parts.append(f"Key Information: {result['relevant_text']}")
            
            # Add specific insights based on report type
            report_data = report['report_data']
            if report['report_type'] == 'THREAT_ANALYSIS_REPORT':
                if 'executive_summary' in report_data:
                    summary = report_data['executive_summary']
                    context_parts.append(f"Threats Detected: {summary.get('threats_detected', 0)}")
                    context_parts.append(f"Critical Threats: {summary.get('critical_threats', 0)}")
                    
            elif report['report_type'] == 'INTELLIGENCE_SUMMARY':
                if 'threat_landscape_overview' in report_data:
                    overview = report_data['threat_landscape_overview']
                    context_parts.append(f"Risk Level: {overview.get('overall_risk_level', 'Unknown')}")
                    context_parts.append(f"Trend: {overview.get('trend_indicator', 'Stable')}")
                    
            elif report['report_type'] == 'USER_THREAT_REPORT':
                context_parts.append(f"Title: {report_data.get('title', 'Untitled')}")
                context_parts.append(f"Threat Type: {report_data.get('threat_type', 'Unknown')}")
                context_parts.append(f"Severity: {report_data.get('severity', 'Unknown')}")
                
                description = report_data.get('description', '')
                if description and len(description) > 0:
                    context_parts.append(f"Description: {description[:300]}...")  # Limit description length
                    
                recommendations = report_data.get('recommendations', [])
                if recommendations:
                    context_parts.append(f"Recommendations: {'; '.join(recommendations[:2])}")  # First 2 recommendations
                    
            elif report['report_type'] == 'THREAT_ANALYSIS':
                context_parts.append(f"Classification: {report_data.get('predicted_class', 'Unknown')}")
                context_parts.append(f"Confidence: {report_data.get('confidence', 0):.2f}")
                
                analyzed_text = report_data.get('analyzed_text', '')
                if analyzed_text:
                    context_parts.append(f"Analyzed Content: {analyzed_text[:200]}...")  # First 200 chars
                    
                metadata = report_data.get('additional_metadata', {})
                if 'twitter_metadata' in metadata:
                    twitter_data = metadata['twitter_metadata']
                    username = twitter_data.get('username', '')
                    if username:
                        context_parts.append(f"Source: Twitter (@{username})")
                    
        context_parts.append("\n=== END THREAT INTELLIGENCE ===")
        
        return "\n".join(context_parts)
        
    def save_conversation(self, user_id: str, message: str, response: str, context_used: str = None) -> bool:
        """Save chat conversation to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO chat_conversations (user_id, message, response, context_used)
                VALUES (?, ?, ?, ?)
            """, (user_id, message, response, context_used))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Error saving conversation: {e}")
            return False
            
    def get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent conversation history for context"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT message, response, created_at
                FROM chat_conversations
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (user_id, limit))
            
            history = []
            for row in cursor.fetchall():
                message, response, created_at = row
                history.append({
                    'message': message,
                    'response': response,
                    'timestamp': created_at
                })
                
            conn.close()
            return list(reversed(history))  # Return chronological order
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

# Initialize global RAG instance
rag_service = ThreatReportRAG() 