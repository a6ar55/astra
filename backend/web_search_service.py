"""
Web Search Service for Internet-Connected RAG System
Searches the web for relevant information and extracts content for chatbot context
"""

import os
import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv

# Load env (for RAPIDAPI_KEY)
load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "8d1cd79b4amshe05e1c93c31c055p16a3e2jsn2127cb0fc270")
RAPIDAPI_HOST = "duckduckgo8.p.rapidapi.com"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSearchService:
    """
    Enhanced web search service for threat analysis chatbot
    Provides real-time web content integration with RAG system
    """
    
    def __init__(self, max_results: int = 5, timeout: int = 10):
        self.max_results = max_results
        self.timeout = timeout
        self.session = requests.Session()
        # Default UA for extraction
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; ThreatPlatformBot/1.0; +https://example.com)'
        })
        
    def search_web(self, query: str, num_results: int = None) -> List[Dict[str, str]]:
        """Search the web using DuckDuckGo8 RapidAPI."""
        if num_results is None:
            num_results = self.max_results

        logger.info(f"🔍 Searching web (RapidAPI) for: '{query}'")

        if not RAPIDAPI_KEY:
            logger.error("RAPIDAPI_KEY not configured; cannot perform web search.")
            return []

        try:
            url = "https://duckduckgo8.p.rapidapi.com/"
            headers = {
                "x-rapidapi-host": RAPIDAPI_HOST,
                "x-rapidapi-key": RAPIDAPI_KEY,
            }
            params = {"q": query}
            resp = requests.get(url, headers=headers, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            results_json = data.get("results", [])
            results = []
            for item in results_json[:num_results]:
                title = item.get("title", "")
                link = item.get("url", "") or item.get("href", "")
                snippet = item.get("description", "")
                if title and link:
                    results.append({
                        "title": title,
                        "link": link,
                        "snippet": snippet,
                    })

            logger.info(f"✅ RapidAPI returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"❌ RapidAPI web search error: {e}")
            return []
    
    def extract_content_from_url(self, url: str) -> Optional[Dict[str, str]]:
        """
        Extract clean text content from a web page
        
        Args:
            url: URL to extract content from
            
        Returns:
            Dictionary containing extracted content and metadata
        """
        try:
            logger.debug(f"📄 Extracting content from: {url}")
            
            # Skip certain file types
            if any(url.lower().endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']):
                logger.debug(f"⏭️ Skipping document file: {url}")
                return None
                
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
                script.decompose()
            
            # Extract title
            title = ""
            if soup.title:
                title = soup.title.get_text(strip=True)
            
            # Extract main content
            content = ""
            
            # Try to find main content areas
            main_content_selectors = [
                'main', 'article', '.content', '.main-content', 
                '.post-content', '.article-content', '.entry-content'
            ]
            
            for selector in main_content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    content = content_elem.get_text(separator=' ', strip=True)
                    break
            
            # Fallback to body content
            if not content:
                content = soup.get_text(separator=' ', strip=True)
            
            # Clean up content
            content = self._clean_text(content)
            
            # Limit content length
            if len(content) > 5000:
                content = content[:5000] + "..."
            
            if content and len(content) > 100:  # Minimum content length
                logger.debug(f"✅ Extracted {len(content)} characters from {url}")
                return {
                    'url': url,
                    'title': title,
                    'content': content,
                    'word_count': len(content.split()),
                    'extracted_at': datetime.now().isoformat()
                }
            else:
                logger.debug(f"⚠️ Insufficient content from {url}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Content extraction error for {url}: {str(e)}")
            return None
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize extracted text
        """
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common noise
        text = re.sub(r'(Advertisement|Subscribe|Cookie|Privacy Policy|Terms of Service)', '', text, flags=re.IGNORECASE)
        
        # Remove email addresses and phone numbers for privacy
        text = re.sub(r'\S+@\S+\.\S+', '[EMAIL]', text)
        text = re.sub(r'\b\d{3}-\d{3}-\d{4}\b', '[PHONE]', text)
        
        return text.strip()
    
    def search_and_extract(self, query: str, num_results: int = None) -> Dict[str, Any]:
        """
        Complete pipeline: search web and extract content from results
        
        Args:
            query: Search query
            num_results: Number of results to process
            
        Returns:
            Dictionary containing search results and extracted content
        """
        if num_results is None:
            num_results = self.max_results
            
        start_time = time.time()
        
        try:
            # Step 1: Search web
            search_results = self.search_web(query, num_results)
            
            if not search_results:
                return {
                    'query': query,
                    'search_results': [],
                    'extracted_content': [],
                    'total_time': time.time() - start_time,
                    'error': 'No search results found'
                }
            
            # Step 2: Extract content from URLs (parallel processing)
            extracted_content = []
            urls = [result['link'] for result in search_results]
            
            with ThreadPoolExecutor(max_workers=3) as executor:
                # Submit extraction tasks
                future_to_url = {
                    executor.submit(self.extract_content_from_url, url): url 
                    for url in urls
                }
                
                # Collect results
                for future in as_completed(future_to_url, timeout=30):
                    url = future_to_url[future]
                    try:
                        content = future.result()
                        if content:
                            extracted_content.append(content)
                    except Exception as e:
                        logger.error(f"❌ Error extracting content from {url}: {str(e)}")
            
            total_time = time.time() - start_time
            
            logger.info(f"✅ Web search complete: {len(search_results)} results, {len(extracted_content)} content extracted in {total_time:.2f}s")
            
            return {
                'query': query,
                'search_results': search_results,
                'extracted_content': extracted_content,
                'total_time': total_time,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"❌ Search and extract error: {str(e)}")
            return {
                'query': query,
                'search_results': [],
                'extracted_content': [],
                'total_time': time.time() - start_time,
                'error': str(e)
            }
    
    def format_web_context(self, search_data: Dict[str, Any]) -> str:
        """
        Format extracted web content for RAG system consumption
        
        Args:
            search_data: Output from search_and_extract()
            
        Returns:
            Formatted context string for AI consumption
        """
        if not search_data.get('extracted_content'):
            return "No relevant web content found for this query."
        
        context_parts = ["=== WEB SEARCH RESULTS CONTEXT ==="]
        context_parts.append(f"Query: {search_data['query']}")
        context_parts.append(f"Sources: {len(search_data['extracted_content'])} web pages")
        context_parts.append("")
        
        for i, content in enumerate(search_data['extracted_content'], 1):
            context_parts.append(f"--- Source {i} ---")
            context_parts.append(f"Title: {content['title']}")
            context_parts.append(f"URL: {content['url']}")
            context_parts.append(f"Content: {content['content'][:1000]}...")
            context_parts.append("")
        
        context_parts.append("=== END WEB SEARCH CONTEXT ===")
        
        return "\n".join(context_parts)
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if web search service is working
        """
        try:
            # Test search
            test_results = self.search_web("test query", 1)
            
            return {
                'status': 'healthy' if test_results else 'degraded',
                'service': 'Web Search Service',
                'timestamp': datetime.now().isoformat(),
                'test_results_count': len(test_results),
                'max_results': self.max_results,
                'timeout': self.timeout
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'service': 'Web Search Service',
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }

    # Fallback now simply returns empty list (RapidAPI should be primary)
    def _fallback_search(self, query: str, num_results: int) -> List[Dict[str, str]]:
        return []

# Create global instance
web_search_service = WebSearchService() 