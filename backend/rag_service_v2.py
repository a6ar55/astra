"""
Enhanced RAG (Retrieval Augmented Generation) Service for Threat Analysis Chatbot
Complete rewrite with better debugging, integration, and reliability
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

# Set up logging with more detail
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EnhancedThreatReportRAG:
    """
    Enhanced RAG system for threat analysis with comprehensive debugging and integration
    """
    
    def __init__(self, db_path: str = "enhanced_rag.db", model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the enhanced RAG system"""
        self.db_path = db_path
        self.model_name = model_name
        self.model = None
        self.embeddings_cache = {}
        self.reports_cache = []
        
        # Initialize with detailed logging
        logger.info(f"🚀 Initializing Enhanced RAG System")
        logger.info(f"   Database: {self.db_path}")
        logger.info(f"   Model: {self.model_name}")
        
        self._load_model()
        self._init_database()
        self._refresh_cache()
        
        logger.info(f"✅ RAG System initialized with {len(self.reports_cache)} reports")
        
    def _load_model(self):
        """Load the sentence transformer model"""
        try:
            logger.info("📥 Loading sentence transformer model...")
            self.model = SentenceTransformer(self.model_name)
            logger.info("✅ Model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise
        
    def _init_database(self):
        """Initialize database with enhanced schema"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Drop existing table to ensure clean schema
            cursor.execute("DROP TABLE IF EXISTS threat_reports")
            cursor.execute("DROP TABLE IF EXISTS chat_conversations")
            
            # Create enhanced reports table
            cursor.execute("""
                CREATE TABLE threat_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    report_type TEXT NOT NULL,
                    report_data TEXT NOT NULL,
                    searchable_text TEXT NOT NULL,
                    embedding_vector TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    source TEXT DEFAULT 'unknown',
                    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create chat conversations table
            cursor.execute("""
                CREATE TABLE chat_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    response TEXT NOT NULL,
                    context_used TEXT,
                    reports_found INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX idx_user_id ON threat_reports(user_id)")
            cursor.execute("CREATE INDEX idx_report_type ON threat_reports(report_type)")
            cursor.execute("CREATE INDEX idx_created_at ON threat_reports(created_at)")
            
            conn.commit()
            conn.close()
            logger.info("✅ Database initialized with enhanced schema")
            
        except Exception as e:
            logger.error(f"❌ Database initialization error: {e}")
            raise
            
    def _refresh_cache(self):
        """Refresh cache with detailed logging"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, user_id, report_type, report_data, searchable_text, 
                       embedding_vector, created_at, source
                FROM threat_reports
                ORDER BY created_at DESC
            """)
            
            self.reports_cache = []
            self.embeddings_cache = {}
            
            for row in cursor.fetchall():
                report_id, user_id, report_type, report_data, searchable_text, embedding_vector, created_at, source = row
                
                try:
                    report_data = json.loads(report_data)
                    
                    report_entry = {
                        'id': report_id,
                        'user_id': user_id,
                        'report_type': report_type,
                        'report_data': report_data,
                        'searchable_text': searchable_text,
                        'created_at': created_at,
                        'source': source
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
                    logger.error(f"❌ Error processing report {report_id}: {e}")
                    
            conn.close()
            
            # Log cache details
            logger.info(f"🔄 Cache refreshed: {len(self.reports_cache)} reports")
            for report in self.reports_cache:
                logger.info(f"   📄 {report['report_type']} | User: {report['user_id']} | Source: {report['source']}")
            
        except Exception as e:
            logger.error(f"❌ Cache refresh error: {e}")
            
    def _save_embedding(self, report_id: int, embedding: np.ndarray):
        """Save embedding to database"""
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
            logger.error(f"❌ Error saving embedding: {e}")
            
    def _extract_comprehensive_text(self, report_data: Dict, report_type: str) -> str:
        """Extract comprehensive searchable text from any report type"""
        searchable_parts = []
        
        try:
            logger.debug(f"🔍 Extracting text from {report_type}")
            
            if report_type == 'USER_THREAT_REPORT':
                # User-generated threat reports
                title = report_data.get('title', '')
                threat_type = report_data.get('threat_type', '')
                description = report_data.get('description', '')
                severity = report_data.get('severity', '')
                recommendations = report_data.get('recommendations', [])
                
                if title:
                    searchable_parts.append(f"Report Title: {title}")
                if threat_type:
                    searchable_parts.append(f"Threat Type: {threat_type}")
                if description:
                    searchable_parts.append(f"Description: {description}")
                if severity:
                    searchable_parts.append(f"Severity Level: {severity}")
                if recommendations:
                    recs = recommendations if isinstance(recommendations, list) else [recommendations]
                    searchable_parts.append(f"Recommendations: {' | '.join(recs[:3])}")
                    
                # Add additional data
                additional = report_data.get('additional_data', {})
                for key, value in additional.items():
                    if isinstance(value, str) and len(value) < 300:
                        searchable_parts.append(f"{key}: {value}")
                        
            elif report_type == 'USER_SUMMARY_REPORT':
                # User-generated summary reports
                title = report_data.get('title', '')
                summary_type = report_data.get('summary_type', '')
                executive_summary = report_data.get('executive_summary', '')
                key_findings = report_data.get('key_findings', [])
                recommendations = report_data.get('recommendations', [])
                
                if title:
                    searchable_parts.append(f"Summary Report: {title}")
                if summary_type:
                    searchable_parts.append(f"Summary Type: {summary_type}")
                if executive_summary:
                    searchable_parts.append(f"Executive Summary: {executive_summary}")
                if key_findings:
                    findings = key_findings if isinstance(key_findings, list) else [key_findings]
                    searchable_parts.append(f"Key Findings: {' | '.join(findings[:5])}")
                if recommendations:
                    recs = recommendations if isinstance(recommendations, list) else [recommendations]
                    searchable_parts.append(f"Recommendations: {' | '.join(recs[:3])}")
                    
            elif report_type == 'THREAT_ANALYSIS':
                # ML prediction results
                analyzed_text = report_data.get('analyzed_text', '')
                predicted_class = report_data.get('predicted_class', '')
                confidence = report_data.get('confidence', 0)
                threat_type = report_data.get('threat_type', '')
                
                if analyzed_text:
                    searchable_parts.append(f"Analyzed Content: {analyzed_text[:200]}")
                if predicted_class:
                    searchable_parts.append(f"Threat Classification: {predicted_class}")
                if threat_type:
                    searchable_parts.append(f"Threat Type: {threat_type}")
                searchable_parts.append(f"Confidence Score: {confidence:.2f}")
                
                # Add metadata
                metadata = report_data.get('additional_metadata', {})
                if 'twitter_metadata' in metadata:
                    twitter_data = metadata['twitter_metadata']
                    username = twitter_data.get('username', '')
                    if username:
                        searchable_parts.append(f"Twitter Source: @{username}")
                        
            elif report_type in ['THREAT_ANALYSIS_REPORT', 'INTELLIGENCE_SUMMARY']:
                # Legacy report formats - extract whatever we can
                for key, value in report_data.items():
                    if isinstance(value, str) and len(value) < 500:
                        searchable_parts.append(f"{key}: {value}")
                    elif isinstance(value, dict):
                        for sub_key, sub_value in value.items():
                            if isinstance(sub_value, str) and len(sub_value) < 300:
                                searchable_parts.append(f"{key} {sub_key}: {sub_value}")
                                
            else:
                # Generic extraction for unknown types
                logger.warning(f"⚠️ Unknown report type: {report_type}")
                for key, value in report_data.items():
                    if isinstance(value, str) and len(value) < 300:
                        searchable_parts.append(f"{key}: {value}")
                        
        except Exception as e:
            logger.error(f"❌ Error extracting text from {report_type}: {e}")
            
        result = " | ".join(searchable_parts)
        logger.debug(f"✅ Extracted {len(result)} characters of searchable text")
        return result
        
    def add_threat_report(self, user_id: str, report_data: Dict, source: str = 'frontend_threat') -> bool:
        """Add a user threat report with enhanced logging"""
        try:
            logger.info(f"📝 Adding threat report for user {user_id} from {source}")
            
            # Extract searchable text
            searchable_text = self._extract_comprehensive_text(report_data, 'USER_THREAT_REPORT')
            
            # Save to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO threat_reports (user_id, report_type, report_data, searchable_text, source)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, 'USER_THREAT_REPORT', json.dumps(report_data), searchable_text, source))
            
            report_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Generate and save embedding
            if self.model:
                embedding = self.model.encode([searchable_text])[0]
                self._save_embedding(report_id, embedding)
                logger.info(f"✅ Threat report saved with ID {report_id} and embedding generated")
            else:
                logger.warning("⚠️ Model not loaded, embedding not generated")
            
            # Refresh cache
            self._refresh_cache()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error adding threat report: {e}")
            return False
            
    def add_summary_report(self, user_id: str, report_data: Dict, source: str = 'frontend_summary') -> bool:
        """Add a user summary report with enhanced logging"""
        try:
            logger.info(f"📊 Adding summary report for user {user_id} from {source}")
            
            # Extract searchable text
            searchable_text = self._extract_comprehensive_text(report_data, 'USER_SUMMARY_REPORT')
            
            # Save to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO threat_reports (user_id, report_type, report_data, searchable_text, source)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, 'USER_SUMMARY_REPORT', json.dumps(report_data), searchable_text, source))
            
            report_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Generate and save embedding
            if self.model:
                embedding = self.model.encode([searchable_text])[0]
                self._save_embedding(report_id, embedding)
                logger.info(f"✅ Summary report saved with ID {report_id} and embedding generated")
            else:
                logger.warning("⚠️ Model not loaded, embedding not generated")
            
            # Refresh cache
            self._refresh_cache()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error adding summary report: {e}")
            return False
            
    def add_prediction_analysis(self, user_id: str, text: str, prediction_result: Dict, source: str = 'ml_prediction') -> bool:
        """Add ML prediction analysis to RAG with enhanced logging"""
        try:
            # Only index threats, skip neutral content
            if prediction_result.get('predicted_class') == 'Non-threat/Neutral':
                logger.debug(f"⏭️ Skipping non-threat prediction for indexing")
                return True
                
            logger.info(f"🤖 Adding ML prediction for user {user_id}: {prediction_result.get('predicted_class')}")
            
            # Structure analysis data
            analysis_data = {
                'analyzed_text': text,
                'predicted_class': prediction_result.get('predicted_class', 'Unknown'),
                'confidence': prediction_result.get('confidence', 0.0),
                'probabilities': prediction_result.get('probabilities', {}),
                'threat_type': prediction_result.get('predicted_class'),
                'analysis_timestamp': datetime.now().isoformat(),
                'additional_metadata': prediction_result.get('additional_metadata', {}),
                'analysis_source': source
            }
            
            # Extract searchable text
            searchable_text = self._extract_comprehensive_text(analysis_data, 'THREAT_ANALYSIS')
            
            # Save to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO threat_reports (user_id, report_type, report_data, searchable_text, source)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, 'THREAT_ANALYSIS', json.dumps(analysis_data), searchable_text, source))
            
            report_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Generate and save embedding
            if self.model:
                embedding = self.model.encode([searchable_text])[0]
                self._save_embedding(report_id, embedding)
                logger.info(f"✅ Prediction analysis saved with ID {report_id}")
            
            # Refresh cache
            self._refresh_cache()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error adding prediction analysis: {e}")
            return False
            
    def search_reports(self, query: str, user_id: str = None, top_k: int = 5, similarity_threshold: float = 0.1) -> List[Dict]:
        """Enhanced search with comprehensive debugging"""
        try:
            logger.info(f"🔍 Searching for: '{query}' | User: {user_id} | Threshold: {similarity_threshold}")
            
            if not self.reports_cache:
                logger.warning("⚠️ No reports in cache")
                return []
                
            if not self.model:
                logger.error("❌ Model not loaded")
                return []
                
            # Generate query embedding
            query_embedding = self.model.encode([query])[0]
            logger.debug(f"🧮 Query embedding generated: shape {query_embedding.shape}")
            
            # Filter reports by user if specified
            relevant_reports = self.reports_cache
            if user_id:
                relevant_reports = [r for r in self.reports_cache if r['user_id'] == user_id]
                logger.info(f"📋 Filtered to {len(relevant_reports)} reports for user {user_id}")
            else:
                logger.info(f"📋 Searching across all {len(relevant_reports)} reports")
                
            if not relevant_reports:
                logger.warning("⚠️ No relevant reports found after filtering")
                return []
                
            # Calculate similarities with detailed logging
            similarities = []
            for report in relevant_reports:
                report_id = report['id']
                if report_id in self.embeddings_cache:
                    report_embedding = self.embeddings_cache[report_id]
                    similarity = cosine_similarity([query_embedding], [report_embedding])[0][0]
                    similarities.append((similarity, report))
                    logger.debug(f"   📊 Report {report_id} ({report['report_type']}): similarity = {similarity:.3f}")
                else:
                    logger.warning(f"⚠️ No embedding found for report {report_id}")
                    
            # Sort by similarity
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            # Apply threshold and return results
            results = []
            for similarity, report in similarities[:top_k]:
                if similarity > similarity_threshold:
                    results.append({
                        'report': report,
                        'similarity': float(similarity),
                        'relevant_text': report['searchable_text'][:500]
                    })
                    logger.info(f"✅ Found relevant report: {report['report_type']} (similarity: {similarity:.3f})")
                else:
                    logger.debug(f"⚪ Report below threshold: {report['report_type']} (similarity: {similarity:.3f})")
                    
            logger.info(f"🎯 Search complete: {len(results)} relevant reports found")
            return results
            
        except Exception as e:
            logger.error(f"❌ Search error: {e}")
            return []
            
    def get_context_for_query(self, query: str, user_id: str = None, max_reports: int = 3) -> str:
        """Get formatted context with enhanced debugging"""
        try:
            logger.info(f"📝 Generating context for query: '{query[:50]}...'")
            
            relevant_reports = self.search_reports(query, user_id, top_k=max_reports, similarity_threshold=0.1)
            
            if not relevant_reports:
                logger.warning("⚠️ No relevant reports found for context")
                return "No relevant threat intelligence found in the database."
                
            context_parts = ["=== THREAT INTELLIGENCE CONTEXT ==="]
            
            for i, result in enumerate(relevant_reports, 1):
                report = result['report']
                similarity = result['similarity']
                
                context_parts.append(f"\n--- Report {i} (Relevance: {similarity:.2f}) ---")
                context_parts.append(f"Type: {report['report_type']}")
                context_parts.append(f"User: {report['user_id']}")
                context_parts.append(f"Created: {report['created_at']}")
                context_parts.append(f"Source: {report.get('source', 'unknown')}")
                
                # Add specific content based on report type
                report_data = report['report_data']
                
                if report['report_type'] == 'USER_THREAT_REPORT':
                    title = report_data.get('title', 'Untitled')
                    threat_type = report_data.get('threat_type', 'Unknown')
                    severity = report_data.get('severity', 'Unknown')
                    description = report_data.get('description', '')
                    
                    context_parts.append(f"Title: {title}")
                    context_parts.append(f"Threat Type: {threat_type}")
                    context_parts.append(f"Severity: {severity}")
                    if description:
                        context_parts.append(f"Description: {description[:200]}...")
                        
                elif report['report_type'] == 'USER_SUMMARY_REPORT':
                    title = report_data.get('title', 'Untitled')
                    summary_type = report_data.get('summary_type', 'Unknown')
                    executive_summary = report_data.get('executive_summary', '')
                    
                    context_parts.append(f"Summary: {title}")
                    context_parts.append(f"Type: {summary_type}")
                    if executive_summary:
                        context_parts.append(f"Executive Summary: {executive_summary[:200]}...")
                        
                elif report['report_type'] == 'THREAT_ANALYSIS':
                    predicted_class = report_data.get('predicted_class', 'Unknown')
                    confidence = report_data.get('confidence', 0)
                    analyzed_text = report_data.get('analyzed_text', '')
                    
                    context_parts.append(f"Classification: {predicted_class}")
                    context_parts.append(f"Confidence: {confidence:.2f}")
                    if analyzed_text:
                        context_parts.append(f"Analyzed Text: {analyzed_text[:150]}...")
                        
                # Add key searchable text
                context_parts.append(f"Key Information: {result['relevant_text'][:300]}...")
                    
            context_parts.append("\n=== END THREAT INTELLIGENCE ===")
            
            context = "\n".join(context_parts)
            logger.info(f"✅ Context generated: {len(context)} characters from {len(relevant_reports)} reports")
            
            return context
            
        except Exception as e:
            logger.error(f"❌ Context generation error: {e}")
            return "Error generating threat intelligence context."
            
    def save_conversation(self, user_id: str, message: str, response: str, context_used: str = None, reports_found: int = 0) -> bool:
        """Save conversation with enhanced tracking"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO chat_conversations (user_id, message, response, context_used, reports_found)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, message, response, context_used, reports_found))
            
            conn.commit()
            conn.close()
            
            logger.info(f"💬 Conversation saved for user {user_id} with {reports_found} reports used")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error saving conversation: {e}")
            return False
            
    def get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get conversation history with enhanced data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT message, response, context_used, reports_found, created_at
                FROM chat_conversations
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (user_id, limit))
            
            history = []
            for row in cursor.fetchall():
                message, response, context_used, reports_found, created_at = row
                history.append({
                    'message': message,
                    'response': response,
                    'context_used': context_used,
                    'reports_found': reports_found,
                    'timestamp': created_at
                })
                
            conn.close()
            return list(reversed(history))
            
        except Exception as e:
            logger.error(f"❌ Error getting conversation history: {e}")
            return []
            
    def debug_status(self) -> Dict:
        """Get comprehensive debug information"""
        status = {
            'database_path': self.db_path,
            'model_loaded': self.model is not None,
            'reports_cached': len(self.reports_cache),
            'embeddings_cached': len(self.embeddings_cache),
            'report_types': {},
            'users': set(),
            'sources': set()
        }
        
        for report in self.reports_cache:
            report_type = report['report_type']
            status['report_types'][report_type] = status['report_types'].get(report_type, 0) + 1
            status['users'].add(report['user_id'])
            status['sources'].add(report.get('source', 'unknown'))
            
        status['users'] = list(status['users'])
        status['sources'] = list(status['sources'])
        
        return status

# Initialize the enhanced RAG service
enhanced_rag_service = EnhancedThreatReportRAG()