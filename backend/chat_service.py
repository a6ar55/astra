"""
Chat Service for Threat Analysis AI Assistant
Integrates with Google Gemini and RAG system for intelligent threat analysis conversations
Enhanced with web search capabilities for real-time information retrieval
"""

import os
import logging
import json
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

class ThreatAnalysisAI:
    def __init__(self):
        """Initialize the Threat Analysis AI with Google Gemini."""
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        
        self.model_name = "gemini-1.5-flash" 
        self.model = genai.GenerativeModel(self.model_name)
        self.conversation_history = []
        
        # Advanced threat analysis system prompt
        self.system_prompt = """You are SENTINEL-AI, an advanced threat intelligence analyst designed for law enforcement and cybersecurity operations. Your expertise covers:

🔍 CORE CAPABILITIES:
- Malware analysis and behavioral patterns
- Network intrusion detection and response
- Threat actor profiling and attribution
- Vulnerability assessment and exploitation analysis
- Digital forensics and incident response
- Cyber threat intelligence correlation

🎯 ANALYSIS FRAMEWORK - Follow this 5-step process:

1. ANALYZE: Examine the threat data for technical indicators, attack vectors, and malicious behaviors
2. CORRELATE: Cross-reference with known threat patterns, TTPs, and historical incidents
3. ASSESS: Evaluate severity, impact potential, and confidence levels
4. RECOMMEND: Provide actionable mitigation strategies and defensive measures
5. PRIORITIZE: Rank threats by criticality and suggest response timelines

📊 RESPONSE FORMAT:
- Use professional, concise language appropriate for security operations
- Highlight critical findings with appropriate severity indicators
- Provide specific, actionable recommendations
- Include confidence scores when making assessments
- Reference relevant frameworks (MITRE ATT&CK, NIST, etc.) when applicable

🚨 PRIORITY INDICATORS:
- 🔴 CRITICAL: Immediate action required
- 🟡 HIGH: Address within 24 hours  
- 🟢 MEDIUM: Standard investigation timeline
- ⚪ LOW: Monitor and document

Remember: You are analyzing real threat data to protect organizations and infrastructure. Accuracy and actionability are paramount."""

    def _make_gemini_request(self, messages: List[Dict]) -> str:
        """Make a request to the Google Gemini API."""
        try:
            full_prompt = self.system_prompt + "\n\n" + "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            
            logger.info(f"Making request to Gemini API with model {self.model_name}...")
            response = self.model.generate_content(full_prompt)
            
            if response.text:
                return response.text.strip()
            else:
                logger.error(f"Unexpected empty response from Gemini: {response}")
                return "I received an empty response. Please try again."
                
        except Exception as e:
            logger.error(f"Error in Gemini request: {str(e)}")
            return f"I'm experiencing technical difficulties with the AI service. Please try again in a moment. Error: {str(e)}"

    def _make_request(self, messages: List[Dict]) -> str:
        """Main request handler, now points to Gemini."""
        return self._make_gemini_request(messages)

    def analyze_with_context(self, user_message: str, context_text: str = None) -> str:
        """
        Analyze user query with optional RAG context using advanced prompting strategy.
        
        Args:
            user_message: The user's question or request
            context_text: Optional formatted context string from enhanced RAG
        
        Returns:
            AI-generated analysis and response
        """
        try:
            # Prepare the enhanced message with context
            enhanced_message = self._prepare_contextual_message_v2(user_message, context_text)
            
            # Prepare conversation messages
            messages = self.conversation_history + [
                {"role": "user", "content": enhanced_message}
            ]
            
            # Get AI response
            response = self._make_request(messages)
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": user_message})
            self.conversation_history.append({"role": "assistant", "content": response})
            
            # Keep conversation history manageable (last 10 exchanges)
            if len(self.conversation_history) > 20:
                self.conversation_history = self.conversation_history[-20:]
            
            logger.info(f"Generated response for user query: {user_message[:100]}...")
            return response
            
        except Exception as e:
            logger.error(f"Error in analyze_with_context: {str(e)}")
            return "I apologize, but I encountered an error while processing your request. Please try again."

    def analyze_with_web_context(self, user_message: str, rag_context: str = None, web_context: str = None) -> str:
        """
        Analyze user query with both RAG context and web search context
        
        Args:
            user_message: The user's question or request
            rag_context: Optional RAG context from existing reports
            web_context: Optional web search context from real-time search
        
        Returns:
            AI-generated analysis and response with web-enhanced information
        """
        try:
            # Prepare enhanced message with both contexts
            enhanced_message = self._prepare_web_enhanced_message(user_message, rag_context, web_context)
            
            # Prepare conversation messages
            messages = self.conversation_history + [
                {"role": "user", "content": enhanced_message}
            ]
            
            # Get AI response
            response = self._make_request(messages)
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": user_message})
            self.conversation_history.append({"role": "assistant", "content": response})
            
            # Keep conversation history manageable
            if len(self.conversation_history) > 20:
                self.conversation_history = self.conversation_history[-20:]
            
            logger.info(f"Generated web-enhanced response for user query: {user_message[:100]}...")
            return response
            
        except Exception as e:
            logger.error(f"Error in analyze_with_web_context: {str(e)}")
            return "I apologize, but I encountered an error while processing your web-enhanced request. Please try again."

    def _prepare_contextual_message(self, user_message: str, context_data: List[Dict] = None) -> str:
        """Prepare an enhanced message with RAG context using advanced prompting."""
        
        if not context_data:
            return f"""THREAT ANALYSIS REQUEST:
{user_message}

Note: No specific threat reports found in database for this query. Please provide general threat intelligence guidance."""

        # Build context from RAG data
        context_sections = []
        for i, item in enumerate(context_data, 1):
            threat_type = item.get('threat_type', 'Unknown')
            description = item.get('description', 'No description available')
            severity = item.get('severity', 'Unknown')
            timestamp = item.get('timestamp', 'Unknown time')
            
            context_sections.append(f"""
THREAT REPORT #{i}:
- Type: {threat_type}
- Severity: {severity}  
- Timestamp: {timestamp}
- Description: {description[:500]}{'...' if len(description) > 500 else ''}
""")
        
        enhanced_message = f"""THREAT ANALYSIS REQUEST WITH CONTEXT:

USER QUERY: {user_message}

RELEVANT THREAT INTELLIGENCE:
{''.join(context_sections)}

ANALYSIS INSTRUCTIONS:
Please analyze the user's query in the context of the provided threat intelligence data. Apply the 5-step SENTINEL-AI framework:

1. ANALYZE the user's question and the relevant threat data
2. CORRELATE patterns between the query and historical threat reports  
3. ASSESS the implications and potential risks
4. RECOMMEND specific actions based on the available intelligence
5. PRIORITIZE your recommendations with appropriate severity indicators

Focus on actionable insights and maintain professional security analyst perspective."""

        return enhanced_message

    def _prepare_contextual_message_v2(self, user_message: str, context_text: str = None) -> str:
        """Prepare an enhanced message with RAG context using the enhanced RAG format."""
        
        if not context_text or "No relevant threat intelligence found" in context_text:
            return f"""THREAT ANALYSIS REQUEST:

USER QUERY: {user_message}

CONTEXT STATUS: No specific threat reports found in database for this query.

ANALYSIS INSTRUCTIONS:
Please provide general threat intelligence guidance based on your training and cybersecurity best practices. Apply the SENTINEL-AI framework:

1. ANALYZE the user's question from a cybersecurity perspective
2. CORRELATE with general threat intelligence patterns
3. ASSESS potential security implications
4. RECOMMEND actionable security measures
5. PRIORITIZE recommendations by importance

Maintain a professional security analyst perspective and provide practical, actionable advice."""

        # Use the provided context directly from enhanced RAG
        enhanced_message = f"""THREAT ANALYSIS REQUEST WITH INTELLIGENCE CONTEXT:

USER QUERY: {user_message}

{context_text}

ANALYSIS INSTRUCTIONS:
Please analyze the user's query using the provided threat intelligence context. Apply the 5-step SENTINEL-AI framework:

1. ANALYZE the user's question in relation to the provided intelligence
2. CORRELATE patterns between the query and the specific threat reports
3. ASSESS the implications and potential risks based on your findings  
4. RECOMMEND specific actions derived from the intelligence data
5. PRIORITIZE your recommendations with appropriate severity indicators

Focus on actionable insights directly tied to the provided intelligence. Maintain professional security analyst perspective."""

        return enhanced_message

    def _prepare_web_enhanced_message(self, user_message: str, rag_context: str = None, web_context: str = None) -> str:
        """Prepare an enhanced message with both RAG and web search context."""
        
        # Build context sections
        context_sections = []
        
        if rag_context and "No relevant threat intelligence found" not in rag_context:
            context_sections.append("=== INTERNAL THREAT INTELLIGENCE ===")
            context_sections.append(rag_context)
            context_sections.append("")
        
        if web_context and "No relevant web content found" not in web_context:
            context_sections.append("=== REAL-TIME WEB INTELLIGENCE ===")
            context_sections.append(web_context)
            context_sections.append("")
        
        # Determine context status
        has_internal_context = bool(rag_context and "No relevant threat intelligence found" not in rag_context)
        has_web_context = bool(web_context and "No relevant web content found" not in web_context)
        
        if not has_internal_context and not has_web_context:
            return f"""THREAT ANALYSIS REQUEST:

USER QUERY: {user_message}

CONTEXT STATUS: No specific threat reports or web intelligence found for this query.

ANALYSIS INSTRUCTIONS:
Please provide general threat intelligence guidance based on your training and cybersecurity best practices. Apply the SENTINEL-AI framework:

1. ANALYZE the user's question from a cybersecurity perspective
2. CORRELATE with general threat intelligence patterns
3. ASSESS potential security implications
4. RECOMMEND actionable security measures
5. PRIORITIZE recommendations by importance

Maintain a professional security analyst perspective and provide practical, actionable advice."""

        # Enhanced message with available context
        enhanced_message = f"""ENHANCED THREAT ANALYSIS REQUEST WITH MULTI-SOURCE INTELLIGENCE:

USER QUERY: {user_message}

AVAILABLE INTELLIGENCE SOURCES:
- Internal Database: {'✓ Available' if has_internal_context else '✗ No relevant data'}
- Real-time Web Search: {'✓ Available' if has_web_context else '✗ No relevant data'}

{chr(10).join(context_sections)}

COMPREHENSIVE ANALYSIS INSTRUCTIONS:
You have access to both internal threat intelligence and real-time web information. Apply the enhanced SENTINEL-AI framework:

1. ANALYZE the user's question using ALL available intelligence sources
2. CORRELATE patterns between internal reports and current web information
3. ASSESS implications considering both historical data and real-time context
4. RECOMMEND specific actions derived from comprehensive intelligence
5. PRIORITIZE recommendations with appropriate severity indicators

IMPORTANT GUIDELINES:
- Synthesize information from both internal and web sources
- Highlight any discrepancies or complementary information
- Provide source attribution when referencing specific intelligence
- Focus on actionable insights backed by evidence
- Maintain professional security analyst perspective
- Note the recency and reliability of web sources vs. internal data

Generate a comprehensive threat analysis that leverages all available intelligence."""

        return enhanced_message

    def get_conversation_history(self) -> List[Dict]:
        """Get the current conversation history."""
        return self.conversation_history.copy()

    def clear_conversation_history(self):
        """Clear the conversation history."""
        self.conversation_history = []
        logger.info("Conversation history cleared")

    def health_check(self) -> Dict[str, Any]:
        """Check if the Google Gemini service is healthy."""
        try:
            # Simple test request
            response = self.model.generate_content("Health check - respond with 'OK'")
            
            is_healthy = response.text and "OK" in response.text
            
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "service": "Google Gemini",
                "model": self.model_name,
                "timestamp": datetime.now().isoformat(),
                "response_received": bool(response.text),
                "api_key_configured": bool(self.api_key)
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "service": "Google Gemini", 
                "model": self.model_name,
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "api_key_configured": bool(self.api_key)
            }

# Create a global instance for the chat service
threat_ai = ThreatAnalysisAI() 