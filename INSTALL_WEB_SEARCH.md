# Quick Installation Guide - Web Search Feature

## 🚀 Installation Steps

### 1. Install Dependencies
```bash
cd backend
pip install beautifulsoup4==4.12.2
```

### 2. Start the Backend
```bash
cd backend
python main.py
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Test the Feature
1. Open the chat interface
2. Click the **globe button** to enable web search
3. Ask a question like "What are the latest cybersecurity threats?"
4. The response will include both internal and web intelligence

## 🎯 Key Features

- **🌐 Real-time Web Search**: Get current information from the internet
- **🔍 Smart Context**: Combines internal reports with web data
- **📊 Source Attribution**: See where information comes from
- **🛡️ Privacy-Focused**: Uses DuckDuckGo (no API keys required)
- **⚡ Fast Processing**: Parallel content extraction
- **🔄 Fallback**: Graceful degradation when web search fails

## 🎨 UI Changes

### New Web Search Button
- **Location**: Chat header controls
- **Icon**: Globe (🌐)
- **States**: 
  - Gray = Disabled
  - Blue = Enabled
- **Tooltip**: Shows enable/disable status

### Enhanced Message Display
- **Multi-context labels**: Different colors for RAG vs Web
- **Web source links**: Clickable links to original content
- **Extended context**: Shows both internal and web intelligence

### Status Indicators
- **Web Ready**: Shows in header when service is available
- **Web search enabled**: Shows below input when active
- **Source count**: Displays number of web sources used

## 🔧 Configuration

Default settings work out of the box. To customize:

```python
# In backend/web_search_service.py
max_results = 5        # Number of search results
timeout = 10          # Request timeout
chunk_size = 1000     # Content chunking
```

## 🧪 Testing

Test with these example queries:
- "Latest ransomware attacks"
- "Current cybersecurity threats"
- "Recent data breaches"
- "New malware families"

## 🚨 Troubleshooting

### Web Search Not Working
```bash
# Check service health
curl -X POST http://localhost:8000/api/chat/health

# Should show web_search_enabled: true
```

### Slow Responses
- Web search adds 5-15 seconds to response time
- Extended timeout to 90 seconds when enabled
- Consider disabling for time-sensitive queries

### No Web Results
- Some queries may not return relevant results
- System falls back to internal RAG context only
- Check network connectivity

## 📋 Requirements

- Python 3.8+
- BeautifulSoup4 4.12.2
- Internet connection
- No API keys required

## 🎉 Ready to Use!

The web search feature is now integrated into your threat analysis chatbot. Users can toggle it on/off as needed, and it will provide enhanced context by combining your internal threat intelligence with real-time web information.

**Pro Tip**: The feature works best with threat-related queries and current events. For historical data, the existing RAG system is usually sufficient. 