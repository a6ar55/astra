"""
Chat Service for Threat Analysis AI Assistant
Integrates with Google Gemini AI and RAG system for intelligent threat analysis conversations
"""

import os
import logging
import json
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

class ThreatAnalysisAI:
    def __init__(self):
        """Initialize the Threat Analysis AI with OpenRouter API."""
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment variables")
        
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "meta-llama/llama-3.1-8b-instruct:free"  # Using free fast model
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

    def _make_request(self, messages: List[Dict]) -> str:
        """Make a request to the OpenRouter API with retry logic."""
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                # Prepare the messages in OpenAI format
                openai_messages = [
                    {"role": "system", "content": self.system_prompt}
                ]
                
                # Add conversation history and current message
                for msg in messages:
                    openai_messages.append({
                        "role": msg['role'],
                        "content": msg['content']
                    })
                
                # Prepare the request payload for OpenRouter
                payload = {
                    "model": self.model,
                    "messages": openai_messages,
                    "temperature": 0.3,
                    "max_tokens": 1500,  # Slightly reduced for faster responses
                    "top_p": 0.9
                }
                
                # Make the API request
                headers = {
                    'Authorization': f'Bearer {self.api_key}',
                    'HTTP-Referer': 'https://threat-detection-platform.local',
                    'X-Title': 'Threat Detection Platform',
                    'Content-Type': 'application/json'
                }
                
                logger.info(f"Making request to OpenRouter API with GPT-4o...")
                response = requests.post(self.base_url, headers=headers, json=payload, timeout=15)  # Faster timeout for GPT-4o
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Extract the generated text from OpenRouter's response
                    if 'choices' in result and len(result['choices']) > 0:
                        choice = result['choices'][0]
                        if 'message' in choice and 'content' in choice['message']:
                            return choice['message']['content'].strip()
                    
                    logger.error(f"Unexpected response format from OpenRouter: {result}")
                    return "I received an unexpected response format. Please try again."
                    
                else:
                    logger.error(f"OpenRouter API error {response.status_code}: {response.text}")
                    if response.status_code == 400:
                        return "I encountered an issue processing your request. Please check if your message is appropriate and try again."
                    elif response.status_code == 401:
                        return "API access denied. Please check your OpenRouter API key."
                    elif response.status_code == 402:
                        return "Insufficient credits. Please add credits to your OpenRouter account at https://openrouter.ai/settings/credits"
                    elif response.status_code == 403:
                        return "API access forbidden. Please check your OpenRouter API key permissions."
                    elif response.status_code == 429 and attempt < max_retries - 1:
                        logger.warning(f"Rate limit exceeded - attempt {attempt + 1}/{max_retries}. Retrying in {retry_delay}s...")
                        import time
                        time.sleep(retry_delay)
                        continue
                    elif response.status_code == 503 and attempt < max_retries - 1:
                        logger.warning(f"OpenRouter API overloaded (503) - attempt {attempt + 1}/{max_retries}. Retrying in {retry_delay}s...")
                        import time
                        time.sleep(retry_delay)
                        continue
                    else:
                        return f"I'm experiencing technical difficulties (Error {response.status_code}). Please try again in a moment."
                        
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    logger.warning(f"Request timeout - attempt {attempt + 1}/{max_retries}. Retrying...")
                    import time
                    time.sleep(retry_delay)
                    continue
                logger.error("Request to OpenRouter API timed out after retries")
                return "The request timed out. Please try again with a shorter message."
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Request error - attempt {attempt + 1}/{max_retries}: {str(e)}")
                    import time
                    time.sleep(retry_delay)
                    continue
                logger.error(f"Request error after retries: {str(e)}")
                return "I'm experiencing network connectivity issues. Please try again."
            except Exception as e:
                logger.error(f"Unexpected error in OpenRouter request: {str(e)}")
                return "An unexpected error occurred. Please try again."
        
        # If we get here, all retries failed
        return "Service is temporarily overloaded. Please try again in a few minutes."

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

    def get_conversation_history(self) -> List[Dict]:
        """Get the current conversation history."""
        return self.conversation_history.copy()

    def clear_conversation_history(self):
        """Clear the conversation history."""
        self.conversation_history = []
        logger.info("Conversation history cleared")

    def health_check(self) -> Dict[str, Any]:
        """Check if the OpenRouter AI service is healthy."""
        try:
            # Simple test request
            test_messages = [{"role": "user", "content": "Health check - respond with 'OK'"}]
            response = self._make_request(test_messages)
            
            is_healthy = "OK" in response or len(response) > 0
            
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "service": "OpenRouter AI",
                "timestamp": datetime.now().isoformat(),
                "response_received": bool(response),
                "api_key_configured": bool(self.api_key)
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "service": "OpenRouter AI", 
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "api_key_configured": bool(self.api_key)
            }

# Create a global instance for the chat service
threat_ai = ThreatAnalysisAI() 