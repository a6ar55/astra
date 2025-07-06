# Internet-Connected RAG Feature Documentation

## Overview

The Internet-Connected RAG feature enhances the threat analysis chatbot with real-time web search capabilities. Users can enable web search to retrieve current information from the internet, which is then combined with internal threat intelligence to provide comprehensive, up-to-date analysis.

## Features

### 🌐 Real-time Web Search
- **DuckDuckGo Integration**: Privacy-focused search engine with no API key required
- **Content Extraction**: Intelligent extraction of relevant text from web pages
- **Multi-source Analysis**: Combines web content with internal RAG database
- **Source Attribution**: Shows links and metadata for transparency

### 🔄 Enhanced Context Integration
- **Dual Context Mode**: Combines internal intelligence with web search results
- **Smart Filtering**: Only includes threat-relevant content
- **Context Prioritization**: Balances internal vs. external information
- **Source Tracking**: Clear attribution of information sources

### 🛡️ Security & Privacy
- **User-Agent Rotation**: Prevents blocking and ensures reliability
- **Content Sanitization**: Removes sensitive information from extracted content
- **Rate Limiting**: Prevents abuse and ensures service stability
- **Error Handling**: Graceful degradation when web search fails

## Architecture

### Backend Components

#### 1. Web Search Service (`web_search_service.py`)
```python
class WebSearchService:
    - search_web(): Search using DuckDuckGo
    - extract_content_from_url(): Extract clean text from web pages
    - search_and_extract(): Complete pipeline
    - format_web_context(): Format for AI consumption
```

#### 2. Enhanced Chat Service (`chat_service.py`)
```python
class ThreatAnalysisAI:
    - analyze_with_web_context(): Handle dual-context analysis
    - _prepare_web_enhanced_message(): Combine contexts for AI
```

#### 3. API Endpoints (`main.py`)
```python
POST /api/chat/message          # Enhanced with web search option
POST /api/chat/web-search       # Direct web search endpoint
POST /api/chat/health           # Includes web search status
```

### Frontend Components

#### 1. Enhanced Chat Interface
- **Web Search Toggle**: Enable/disable web search per message
- **Context Indicators**: Visual feedback for context sources
- **Source Display**: Expandable web source links
- **Status Indicators**: Real-time service health

#### 2. Visual Enhancements
- **Multi-Context Labels**: Different colors for RAG vs Web context
- **Source Attribution**: Clickable links to original sources
- **Loading States**: Extended timeouts for web search requests

## Usage

### For Users

1. **Enable Web Search**
   - Click the globe button in the chat interface
   - Button turns blue when enabled
   - Web search indicator appears below input

2. **Send Enhanced Messages**
   - Type your question as normal
   - Web search will automatically fetch relevant content
   - Response includes both internal and web intelligence

3. **View Sources**
   - Web sources appear below AI responses
   - Click links to view original content
   - See word count and relevance indicators

### For Developers

#### Install Dependencies
```bash
pip install beautifulsoup4==4.12.2
```

#### Environment Variables
```bash
# No additional API keys required for basic web search
# DuckDuckGo used for privacy-focused, free search
```

#### Configuration
```python
# Adjust search parameters in web_search_service.py
max_results = 5        # Number of search results
timeout = 10          # Request timeout in seconds
chunk_size = 1000     # Content chunking for large pages
```

## API Reference

### Chat Message with Web Search
```http
POST /api/chat/message
Content-Type: application/json

{
    "message": "What are the latest cybersecurity threats?",
    "use_web_search": true
}
```

**Response:**
```json
{
    "status": "success",
    "response": "AI response with web-enhanced context",
    "context_used": true,
    "rag_context_used": true,
    "web_context_used": true,
    "web_sources": [
        {
            "title": "Latest Cybersecurity Report",
            "url": "https://example.com/report",
            "word_count": 1500
        }
    ],
    "context_summary": "Internal Intelligence (2 reports) + Web Intelligence (3 sources)"
}
```

### Direct Web Search
```http
POST /api/chat/web-search
Content-Type: application/json

{
    "query": "latest ransomware attacks",
    "num_results": 3
}
```

**Response:**
```json
{
    "status": "success",
    "search_results": {
        "query": "latest ransomware attacks",
        "search_results": [...],
        "extracted_content": [...],
        "total_time": 2.45
    },
    "formatted_context": "Formatted context string for AI"
}
```

## Performance Considerations

### Optimizations
- **Parallel Processing**: Multiple URLs extracted simultaneously
- **Content Caching**: Avoids re-extracting same URLs
- **Smart Timeouts**: Prevents hanging on slow websites
- **Fallback Search**: Multiple search engines for reliability

### Limitations
- **Rate Limiting**: Limited to prevent abuse
- **Content Length**: Large pages truncated to 5000 characters
- **File Types**: PDFs and documents skipped
- **Geographic Restrictions**: Some content may be geo-blocked

## Troubleshooting

### Common Issues

1. **Web Search Not Working**
   ```bash
   # Check service health
   curl -X POST http://localhost:8000/api/chat/health
   
   # Verify dependencies
   pip list | grep beautifulsoup4
   ```

2. **Slow Response Times**
   - Web search adds 5-15 seconds to response time
   - Timeout extends to 90 seconds when web search enabled
   - Consider disabling for time-sensitive queries

3. **No Web Results**
   - Some queries may not return relevant results
   - DuckDuckGo may be temporarily unavailable
   - Fallback to internal RAG context only

### Error Handling
- **Graceful Degradation**: Falls back to RAG-only when web search fails
- **User Feedback**: Clear error messages in chat interface
- **Logging**: Comprehensive logging for debugging

## Security Considerations

### Privacy Protection
- **No API Keys**: Uses DuckDuckGo which doesn't require registration
- **User-Agent Masking**: Appears as regular browser traffic
- **Content Sanitization**: Removes email addresses and phone numbers

### Content Safety
- **Source Filtering**: Skips potentially harmful file types
- **Content Validation**: Checks minimum content length
- **Error Isolation**: Web search errors don't break core chat

## Future Enhancements

### Planned Features
- **Search Engine Options**: Support for multiple search providers
- **Content Summarization**: AI-powered content summarization
- **Source Ranking**: Relevance scoring for web sources
- **Caching System**: Redis-based caching for frequent queries

### Advanced Integration
- **Real-time Feeds**: RSS/API integration for threat feeds
- **Social Media**: Twitter/Reddit integration for social intelligence
- **Document Processing**: PDF/DOC content extraction
- **Image Analysis**: Screenshot and diagram analysis

## Support

For issues or feature requests related to web search functionality:
1. Check the health endpoint: `/api/chat/health`
2. Review logs for web search service errors
3. Test with simple queries first
4. Verify network connectivity and firewall settings

The web search feature significantly enhances the chatbot's capabilities by providing access to real-time information while maintaining the security and privacy standards required for threat analysis platforms. 