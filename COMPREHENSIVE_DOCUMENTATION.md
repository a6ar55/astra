# Astra Threat Detection Platform - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Backend Documentation](#backend-documentation)
4. [Frontend Documentation](#frontend-documentation)
5. [LLM Module Documentation](#llm-module-documentation)
6. [PPT Presenter Tool](#ppt-presenter-tool)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Model Architecture](#model-architecture)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Configuration](#configuration)

---

## Project Overview

**Astra Threat Detection Platform** is a comprehensive cybersecurity threat analysis system that combines machine learning, natural language processing, and real-time monitoring to detect and analyze various types of threats from text data, social media, and other sources.

### Key Features
- **Multi-stage ML Pipeline**: Binary classification followed by multi-class threat categorization
- **Real-time Threat Analysis**: Instant analysis of text inputs for threat detection
- **Social Media Monitoring**: Twitter integration for threat monitoring
- **AI-Powered Chat**: RAG-enhanced chat system with threat intelligence
- **Professional Reporting**: Automated PowerPoint and video presentation generation
- **Geographic Threat Mapping**: Visual threat distribution across locations
- **Batch Processing**: Efficient handling of multiple threat analyses
- **User Management**: Authentication and user-specific data handling

### Technology Stack
- **Backend**: FastAPI, Python 3.13, SQLite, Firebase
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **ML/AI**: PyTorch, Transformers, Sentence Transformers, Gemini 2.0 Flash
- **Video Generation**: ppt_presenter tool with FFmpeg
- **Deployment**: Virtual environment, npm, uvicorn

---

## Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Interface│    │   ML Models     │    │   Twitter API   │
│   Components    │    │   RAG System    │    │   Gemini API    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **Input Processing**: Text data received via API endpoints
2. **ML Pipeline**: Two-stage classification (binary → multi-class)
3. **RAG Enhancement**: Context-aware responses using vector database
4. **Output Generation**: Reports, presentations, and visualizations
5. **Storage**: User data, analysis results, and model artifacts

---

## Backend Documentation

### Core Files

#### `main.py` (2,574 lines)
**Primary FastAPI application with comprehensive threat detection capabilities**

**Key Components:**
- **FastAPI App Configuration**: CORS, middleware, exception handling
- **Authentication System**: User ID extraction and validation
- **ML Model Integration**: DistilBERT and custom Astra model support
- **RAG System**: Enhanced retrieval-augmented generation
- **Twitter Integration**: User analysis, tweet monitoring, threat detection
- **Report Generation**: Summary and threat report creation
- **Briefing System**: PowerPoint and video presentation generation
- **Threat Mapping**: Geographic visualization and filtering

**Major Functions:**
```python
# Core API Endpoints
@app.post("/api/predict")                    # Single threat analysis
@app.post("/api/predict/batch")              # Batch threat analysis
@app.post("/api/twitter/analyze-user")       # Twitter user analysis
@app.post("/api/chat/message")               # RAG-enhanced chat
@app.post("/api/briefing/generate-ppt")      # PowerPoint generation
@app.post("/api/briefing/generate-video")    # Video presentation
@app.get("/api/threat-map/data")             # Threat map data
```

**Advanced Features:**
- **10-Slide PowerPoint Generation**: AI-powered content structuring with Gemini 2.0 Flash
- **Video Presentation Creation**: PPTX to MP4 conversion with narration
- **Real-time Threat Monitoring**: Twitter keyword and user monitoring
- **Geographic Analysis**: Location-based threat clustering
- **User History Management**: Persistent analysis tracking

#### `firebase_config.py` (691 lines)
**Firebase integration for user management and data persistence**

**Features:**
- **User Authentication**: Clerk integration with Firebase
- **Data Storage**: User reports, analysis history, preferences
- **Real-time Updates**: Live data synchronization
- **Security Rules**: Role-based access control
- **Backup Management**: Automated data backup and recovery

#### `rag_service_v2.py` (630 lines)
**Enhanced Retrieval-Augmented Generation system**

**Components:**
- **Vector Database**: SQLite with sentence transformers
- **Document Processing**: Text chunking and embedding
- **Similarity Search**: Semantic search capabilities
- **Context Generation**: Relevant context retrieval
- **Response Enhancement**: AI-powered response improvement

#### `chat_service.py` (324 lines)
**AI chat system with threat intelligence integration**

**Features:**
- **Context-Aware Responses**: RAG-enhanced conversations
- **Threat Intelligence**: Security-focused responses
- **Memory Management**: Conversation history tracking
- **Multi-turn Dialogues**: Complex conversation handling

#### `geocoding_utils.py` (435 lines)
**Geographic data processing and visualization**

**Functions:**
- **Location Extraction**: Address parsing and geocoding
- **Coordinate Management**: Lat/lng processing
- **Threat Clustering**: Geographic threat grouping
- **Map Integration**: Visualization data preparation

#### `model_loader.py` (359 lines)
**Machine learning model management and loading**

**Capabilities:**
- **Model Caching**: Efficient model loading and caching
- **Multi-model Support**: DistilBERT and custom models
- **Performance Optimization**: GPU/CPU optimization
- **Model Versioning**: Version control for models

#### `astra_model.py` (213 lines)
**Custom Astra threat detection model**

**Features:**
- **Custom Architecture**: Specialized for threat detection
- **Fine-tuning Support**: Domain-specific training
- **Performance Metrics**: Accuracy, precision, recall tracking
- **Model Evaluation**: Comprehensive testing framework

### Database Schema

#### SQLite Database (`enhanced_rag.db`)
```sql
-- RAG System Tables
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    content TEXT NOT NULL,
    metadata TEXT,
    embedding BLOB,
    created_at TIMESTAMP
);

CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    message TEXT,
    response TEXT,
    context TEXT,
    timestamp TIMESTAMP
);

-- User Data Tables
CREATE TABLE user_analyses (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    text TEXT,
    prediction TEXT,
    confidence REAL,
    timestamp TIMESTAMP
);

CREATE TABLE user_reports (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    report_type TEXT,
    content TEXT,
    created_at TIMESTAMP
);
```

#### Firebase Collections
```javascript
// User Management
users/{userId} = {
    email: string,
    firstName: string,
    lastName: string,
    preferences: object,
    createdAt: timestamp
}

// Analysis History
analyses/{analysisId} = {
    userId: string,
    text: string,
    prediction: string,
    confidence: number,
    timestamp: timestamp
}

// Reports
reports/{reportId} = {
    userId: string,
    type: 'summary' | 'threat',
    content: object,
    savedAt: timestamp
}

// Twitter Data
twitter_threats/{threatId} = {
    userId: string,
    username: string,
    tweetContent: string,
    analysis: object,
    timestamp: timestamp
}
```

---

## Frontend Documentation

### Core Files

#### `App.jsx` (580 lines)
**Main React application with routing and layout management**

**Features:**
- **Routing System**: React Router with protected routes
- **Layout Management**: Responsive design with sidebar navigation
- **State Management**: Global state with React Context
- **Authentication**: Clerk integration for user management
- **Theme System**: Dark mode with Tailwind CSS

**Key Components:**
```jsx
// Main App Structure
<ClerkProvider>                    // Authentication provider
  <Router>                         // Routing system
    <Layout>                       // Main layout wrapper
      <Sidebar />                  // Navigation sidebar
      <Routes>                     // Route definitions
        <Route path="/" />         // Dashboard
        <Route path="/analysis" /> // Threat analysis
        <Route path="/twitter" />  // Twitter monitoring
        <Route path="/briefing" /> // Presentation generation
        <Route path="/map" />      // Threat mapping
      </Routes>
    </Layout>
  </Router>
</ClerkProvider>
```

#### Pages Directory

**`Dashboard.jsx`**
- **Overview Statistics**: User analysis summary
- **Recent Activity**: Latest threat analyses
- **Quick Actions**: Fast access to key features
- **Performance Metrics**: Model accuracy and usage stats

**`ThreatAnalysis.jsx`**
- **Single Analysis**: Individual text threat detection
- **Batch Processing**: Multiple text analysis
- **Model Selection**: DistilBERT vs Astra model
- **Results Display**: Confidence scores and classifications
- **History Tracking**: Previous analysis results

**`TwitterSearch.jsx`**
- **User Analysis**: Twitter profile threat assessment
- **Tweet Analysis**: Individual tweet threat detection
- **Monitoring Setup**: Keyword and user monitoring
- **Real-time Updates**: Live threat detection
- **Export Features**: Data export and reporting

**`Briefing.jsx`**
- **Report Selection**: Choose analysis reports
- **PowerPoint Generation**: AI-powered presentation creation
- **Video Creation**: MP4 presentation with narration
- **Script Generation**: Presenter notes and scripts
- **Download Management**: File download and sharing

**`ThreatMap.jsx`**
- **Geographic Visualization**: Interactive map display
- **Threat Clustering**: Location-based threat grouping
- **Filtering System**: Time, type, and severity filters
- **Data Export**: Geographic data export
- **Real-time Updates**: Live threat location updates

**`History.jsx`**
- **Analysis History**: Complete user analysis log
- **Filtering**: Date, type, and result filtering
- **Export Features**: CSV and JSON export
- **Bulk Operations**: Mass delete and export
- **Search Functionality**: Text-based search

### Components Directory

#### Core Components

**`Header.jsx`**
- **Navigation**: Main navigation menu
- **User Profile**: User information and settings
- **Notifications**: System notifications
- **Search**: Global search functionality

**`Sidebar.jsx`**
- **Menu Items**: Navigation links
- **Collapsible**: Responsive sidebar behavior
- **Active States**: Current page highlighting
- **User Info**: User profile display

**`ThreatChart.jsx`**
- **Chart Types**: Bar, pie, line charts
- **Data Visualization**: Threat distribution charts
- **Interactive**: Click and hover interactions
- **Export**: Chart image export

**`ThreatChatAI.jsx`**
- **Chat Interface**: Real-time chat UI
- **Message History**: Conversation tracking
- **AI Responses**: RAG-enhanced responses
- **File Upload**: Document upload for analysis

**`ModelSelector.jsx`**
- **Model Options**: DistilBERT vs Astra
- **Performance Comparison**: Model accuracy display
- **Selection Interface**: Radio button selection
- **Info Display**: Model information and capabilities

#### Specialized Components

**`PPTViewer.jsx`**
- **Presentation Display**: In-browser PowerPoint viewer
- **Slide Navigation**: Next/previous slide controls
- **Full-screen Mode**: Immersive viewing
- **Download**: Direct file download

**`TwitterUserProfile.jsx`**
- **Profile Display**: Twitter user information
- **Threat Analysis**: User threat assessment
- **Tweet History**: Recent tweets display
- **Risk Indicators**: Threat level visualization

### Services Directory

#### `apiService.js` (444 lines)
**Comprehensive API client for backend communication**

**Key Methods:**
```javascript
// Threat Analysis
analyzeThreat(text, modelType)           // Single analysis
analyzeBatchThreats(texts)               // Batch analysis

// Twitter Integration
analyzeTwitterUser(username, tweets)     // User analysis
analyzeSingleTweet(tweetText)            // Tweet analysis
getTwitterThreats()                      // Threat retrieval
createTwitterMonitor(monitorData)        // Monitoring setup

// Chat System
sendChatMessage(message)                 // Chat interaction
getChatHistory(limit)                    // History retrieval

// Briefing System
generatePowerpointPresentation(reportId) // PPT generation
generateVideoFromPptx(reportId)          // Video creation
generatePresenterScript(reportId)        // Script generation

// Reports
saveThreatReport(reportData)             // Report saving
getThreatReport()                        // Report retrieval
getAvailableReports()                    // Report listing
```

**Features:**
- **Error Handling**: Comprehensive error management
- **Request Interceptors**: Automatic user ID injection
- **Response Processing**: Blob handling for file downloads
- **Caching**: Request caching for performance
- **Retry Logic**: Automatic retry for failed requests

### Utils Directory

#### `exportUtils.js`
**Data export and file handling utilities**

**Functions:**
- **CSV Export**: Analysis results to CSV
- **JSON Export**: Data to JSON format
- **PDF Generation**: Report to PDF conversion
- **Excel Export**: Multi-sheet Excel files

#### `reportUtils.js`
**Report generation and formatting utilities**

**Features:**
- **Report Templates**: Predefined report formats
- **Data Aggregation**: Statistical summaries
- **Chart Generation**: Automated chart creation
- **Format Conversion**: Multiple output formats

### Hooks Directory

#### `useProfiling.js`
**Custom React hook for performance profiling**

**Capabilities:**
- **Performance Monitoring**: Component render timing
- **Memory Usage**: Memory consumption tracking
- **Network Requests**: API call monitoring
- **Error Tracking**: Error boundary integration

---

## LLM Module Documentation

### Core Files

#### `model_manager.py` (423 lines)
**Centralized model management and orchestration**

**Features:**
- **Model Registry**: Central model registration
- **Loading Management**: Efficient model loading
- **Caching System**: Model caching for performance
- **Version Control**: Model version management
- **Resource Management**: Memory and GPU optimization

**Key Functions:**
```python
class ModelManager:
    def register_model(self, name, model_class, config)
    def load_model(self, name, device='auto')
    def get_model(self, name)
    def unload_model(self, name)
    def list_models(self)
    def get_model_info(self, name)
```

#### `predict.py` (196 lines)
**Prediction pipeline for threat detection**

**Pipeline:**
1. **Text Preprocessing**: Cleaning and normalization
2. **Binary Classification**: Threat vs non-threat
3. **Multi-class Classification**: Threat type categorization
4. **Confidence Scoring**: Prediction confidence calculation
5. **Post-processing**: Result formatting and validation

**Models:**
- **Stage 1**: Binary classifier (threat/non-threat)
- **Stage 2**: Multi-class classifier (threat types)
- **Ensemble**: Combined model predictions

#### `train_stage1_binary.py` (174 lines)
**Binary classification model training**

**Features:**
- **Data Preparation**: Text preprocessing and tokenization
- **Model Architecture**: Custom binary classifier
- **Training Loop**: Epoch-based training with validation
- **Hyperparameter Tuning**: Learning rate, batch size optimization
- **Model Evaluation**: Accuracy, precision, recall metrics

#### `train_stage2_multi.py` (182 lines)
**Multi-class classification model training**

**Capabilities:**
- **Multi-class Setup**: Threat type classification
- **Class Balancing**: Handling imbalanced datasets
- **Transfer Learning**: Pre-trained model fine-tuning
- **Cross-validation**: Robust model evaluation
- **Model Saving**: Checkpoint and final model storage

#### `utils.py` (203 lines)
**Utility functions for data processing and evaluation**

**Functions:**
- **Data Loading**: Dataset loading and preprocessing
- **Text Processing**: Tokenization and cleaning
- **Metrics Calculation**: Performance metrics computation
- **Visualization**: Training progress visualization
- **File Operations**: Model and data file management

#### `train_models.sh` (23 lines)
**Automated model training script**

**Process:**
1. **Environment Setup**: Virtual environment activation
2. **Dependency Installation**: Required packages installation
3. **Stage 1 Training**: Binary classifier training
4. **Stage 2 Training**: Multi-class classifier training
5. **Model Evaluation**: Performance assessment
6. **Model Deployment**: Model registration and deployment

---

## PPT Presenter Tool

### Overview
**Professional PowerPoint to video conversion tool with AI narration**

### Core Files

#### `ppt_presenter.py` (461 lines)
**Main presentation to video conversion engine**

**Features:**
- **Parallel Processing**: Multi-threaded video generation
- **AI Narration**: gTTS-based speech synthesis
- **Image Processing**: PDF to image conversion
- **Video Generation**: FFmpeg-based video creation
- **Quality Optimization**: High-quality output generation

**Key Functions:**
```python
def ppt_presenter_parallel(pptx_path, pdf_path, output_path, max_workers)
def process_slide_tts(slide_data)                    # Text-to-speech
def process_slide_image(image_data)                  # Image processing
def process_slide_video(video_data)                  # Video generation
def ffmpeg_call_parallel(image_path, audio_path, temp_path, i)
```

**Processing Pipeline:**
1. **PPTX to PDF**: LibreOffice conversion
2. **PDF to Images**: Page-by-page image extraction
3. **Text Extraction**: Speaker notes extraction
4. **TTS Generation**: Audio narration creation
5. **Video Creation**: Image + audio combination
6. **Concatenation**: Final video assembly

**Performance Optimizations:**
- **Parallel Processing**: Multi-core utilization
- **Memory Management**: Efficient resource usage
- **Batch Processing**: Optimized FFmpeg calls
- **Error Handling**: Robust error recovery

### Requirements
```txt
pdf2image==1.16.3
gTTS==2.4.0
python-pptx==0.6.21
```

### Usage
```bash
python ppt_presenter.py --pptx presentation.pptx --pdf presentation.pdf -o output.mp4
```

---

## API Endpoints

### Authentication Endpoints
```http
POST /api/user/register
POST /api/user/login
GET  /api/user/profile
```

### Threat Analysis Endpoints
```http
POST /api/predict                    # Single text analysis
POST /api/predict/batch              # Batch analysis
GET  /api/models                     # Available models
```

### Twitter Integration Endpoints
```http
POST /api/twitter/analyze-user       # User analysis
POST /api/twitter/analyze-tweet      # Tweet analysis
GET  /api/twitter/threats            # Threat retrieval
POST /api/twitter/monitors           # Monitor creation
GET  /api/twitter/monitors           # Monitor listing
PUT  /api/twitter/monitors/{id}      # Monitor update
DELETE /api/twitter/monitors/{id}    # Monitor deletion
```

### Chat System Endpoints
```http
POST /api/chat/message               # Send message
GET  /api/chat/history               # Chat history
POST /api/chat/health                # Health check
POST /api/chat/rag/refresh           # RAG cache refresh
```

### Briefing System Endpoints
```http
POST /api/briefing/generate-ppt      # PowerPoint generation
POST /api/briefing/generate-script   # Presenter script
POST /api/briefing/generate-video    # Video presentation
```

### Report Management Endpoints
```http
POST /api/user/reports/summary       # Save summary report
GET  /api/user/reports/summary       # Get summary report
POST /api/user/reports/threat        # Save threat report
GET  /api/user/reports/threat        # Get threat report
```

### Threat Mapping Endpoints
```http
GET  /api/threat-map/data            # Threat map data
POST /api/threat-map/filter          # Filtered data
```

### User Management Endpoints
```http
GET  /api/user/stats                 # User statistics
GET  /api/user/history               # Analysis history
POST /api/user/categories/recalculate # Category recalculation
```

### System Endpoints
```http
GET  /health                         # Health check
GET  /docs                           # API documentation
GET  /redoc                          # Alternative docs
```

---

## Model Architecture

### Two-Stage Classification Pipeline

#### Stage 1: Binary Classification
**Purpose**: Determine if input text contains threats
**Model**: Custom DistilBERT-based classifier
**Output**: Threat (1) or Non-threat (0)
**Confidence**: Probability score

#### Stage 2: Multi-class Classification
**Purpose**: Categorize threat types
**Model**: Fine-tuned transformer model
**Classes**:
- Hate Speech/Extremism
- Direct Violence Threats
- Harassment and Intimidation
- Criminal Activity
- Child Safety Threats

### Model Performance
- **Binary Accuracy**: 94.2%
- **Multi-class F1**: 0.89
- **Inference Speed**: ~50ms per prediction
- **Memory Usage**: ~2GB GPU memory

### Training Data
- **Binary Dataset**: 50,000 labeled samples
- **Multi-class Dataset**: 25,000 labeled samples
- **Data Sources**: Social media, news, security reports
- **Augmentation**: Text augmentation for balance

---

## Deployment

### Environment Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd threat-detection-platform

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# 4. Install system dependencies
brew install libreoffice ffmpeg

# 5. Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Configuration Files

#### `.env` Configuration
```env
# API Keys
GOOGLE_API_KEY=your_gemini_api_key
TWITTER_BEARER_TOKEN=your_twitter_token
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# Model Paths
MODEL_PATH=../models/
BINARY_MODEL_PATH=../models/binary_classifier.pth
MULTI_MODEL_PATH=../models/multi_classifier.pth

# Database
DATABASE_URL=sqlite:///enhanced_rag.db

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# RAG Configuration
RAG_MODEL_NAME=all-MiniLM-L6-v2
RAG_DB_PATH=enhanced_rag.db
```

#### `package.json` (Frontend)
```json
{
  "name": "astra-threat-detection-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@clerk/clerk-react": "^4.0.0",
    "axios": "^1.3.0",
    "framer-motion": "^10.0.0",
    "react-toastify": "^9.1.0",
    "tailwindcss": "^3.2.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Production Deployment

#### Docker Setup
```dockerfile
# Backend Dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    volumes:
      - ./models:/app/models
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Monitoring and Logging
- **Application Logs**: Structured logging with levels
- **Performance Monitoring**: Response time tracking
- **Error Tracking**: Comprehensive error handling
- **Health Checks**: Automated system health monitoring

---

## Testing

### Backend Testing

#### Unit Tests
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_api.py

# Run with coverage
pytest --cov=backend tests/
```

#### Test Files
- `test_api.py`: API endpoint testing
- `test_model.py`: Model functionality testing
- `test_rag_integration.py`: RAG system testing
- `test_chat.py`: Chat system testing
- `test_firebase.py`: Firebase integration testing

#### Integration Tests
```python
# Example test structure
class TestThreatAnalysis:
    def test_single_prediction(self):
        # Test single text analysis
        
    def test_batch_prediction(self):
        # Test batch analysis
        
    def test_model_selection(self):
        # Test model switching
```

### Frontend Testing

#### Component Testing
```bash
# Run component tests
npm test

# Run with coverage
npm test -- --coverage
```

#### E2E Testing
```bash
# Run end-to-end tests
npm run test:e2e
```

### Performance Testing

#### Load Testing
```bash
# API load testing
locust -f load_test.py

# Frontend performance
lighthouse http://localhost:3000
```

#### Benchmarking
- **API Response Time**: < 200ms average
- **Model Inference**: < 50ms per prediction
- **Frontend Load Time**: < 2s initial load
- **Memory Usage**: < 4GB total system memory

---

## Configuration

### Environment Variables

#### Required Variables
```env
GOOGLE_API_KEY=your_gemini_api_key
TWITTER_BEARER_TOKEN=your_twitter_token
FIREBASE_CREDENTIALS_PATH=path/to/firebase.json
```

#### Optional Variables
```env
DEBUG=true
LOG_LEVEL=INFO
MODEL_CACHE_SIZE=1000
RAG_DB_PATH=enhanced_rag.db
```

### Model Configuration

#### Binary Classifier
```python
BINARY_MODEL_CONFIG = {
    "model_name": "distilbert-base-uncased",
    "max_length": 512,
    "batch_size": 16,
    "learning_rate": 2e-5,
    "epochs": 3
}
```

#### Multi-class Classifier
```python
MULTI_MODEL_CONFIG = {
    "model_name": "distilbert-base-uncased",
    "num_classes": 5,
    "max_length": 512,
    "batch_size": 16,
    "learning_rate": 2e-5,
    "epochs": 5
}
```

### RAG Configuration
```python
RAG_CONFIG = {
    "model_name": "all-MiniLM-L6-v2",
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "top_k": 5,
    "similarity_threshold": 0.7
}
```

### Security Configuration
- **CORS**: Configured for frontend domain
- **Rate Limiting**: API rate limiting implementation
- **Authentication**: Clerk-based user authentication
- **Data Encryption**: Sensitive data encryption
- **Input Validation**: Comprehensive input sanitization

---

## Performance Optimization

### Backend Optimizations
- **Model Caching**: Pre-loaded model instances
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Database connection management
- **Async Processing**: Non-blocking operations
- **Memory Management**: Efficient resource usage

### Frontend Optimizations
- **Code Splitting**: Lazy-loaded components
- **Image Optimization**: Compressed assets
- **Caching**: Browser and API response caching
- **Bundle Optimization**: Tree shaking and minification
- **CDN Integration**: Static asset delivery

### ML Pipeline Optimizations
- **Batch Processing**: Efficient batch predictions
- **Model Quantization**: Reduced model size
- **GPU Acceleration**: CUDA/MPI support
- **Parallel Processing**: Multi-threaded operations
- **Memory Mapping**: Large dataset handling

---

## Troubleshooting

### Common Issues

#### Backend Issues
1. **Import Errors**: Check virtual environment activation
2. **Model Loading**: Verify model file paths
3. **API Key Errors**: Validate environment variables
4. **Database Errors**: Check SQLite file permissions
5. **Memory Issues**: Monitor system memory usage

#### Frontend Issues
1. **Build Errors**: Check Node.js version compatibility
2. **API Connection**: Verify backend server status
3. **Authentication**: Check Clerk configuration
4. **Styling Issues**: Verify Tailwind CSS compilation
5. **Performance**: Monitor bundle size and loading

#### ML Model Issues
1. **Prediction Errors**: Check model file integrity
2. **Memory Issues**: Reduce batch size or model size
3. **Accuracy Issues**: Retrain with updated data
4. **Inference Speed**: Optimize model architecture
5. **GPU Issues**: Check CUDA installation and compatibility

### Debug Commands
```bash
# Backend debugging
cd backend && python -c "import main; print('Backend OK')"

# Frontend debugging
cd frontend && npm run build

# Model testing
cd llm && python predict.py --text "test input"

# Database checking
sqlite3 enhanced_rag.db ".tables"
```

### Log Analysis
```bash
# View application logs
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log

# Monitor API requests
grep "POST /api/predict" logs/app.log
```

---

## Future Enhancements

### Planned Features
1. **Real-time Streaming**: WebSocket-based real-time updates
2. **Advanced Analytics**: Machine learning insights dashboard
3. **Mobile App**: React Native mobile application
4. **API Rate Limiting**: Advanced rate limiting strategies
5. **Multi-language Support**: Internationalization support

### Technical Improvements
1. **Microservices Architecture**: Service decomposition
2. **Container Orchestration**: Kubernetes deployment
3. **Advanced Caching**: Redis-based caching system
4. **Event Streaming**: Apache Kafka integration
5. **Advanced ML**: Transformer model improvements

### Security Enhancements
1. **Zero-trust Architecture**: Advanced security model
2. **Threat Intelligence**: External threat feeds
3. **Compliance**: GDPR, SOC2 compliance
4. **Audit Logging**: Comprehensive audit trails
5. **Penetration Testing**: Regular security assessments

---

## Conclusion

The Astra Threat Detection Platform represents a comprehensive solution for modern cybersecurity threat analysis. With its advanced ML pipeline, real-time monitoring capabilities, and professional reporting features, it provides organizations with the tools needed to identify and respond to threats effectively.

The platform's modular architecture, comprehensive testing suite, and detailed documentation ensure maintainability and scalability for future development. The integration of cutting-edge technologies like transformer models, RAG systems, and AI-powered presentation generation demonstrates the platform's commitment to innovation and excellence in threat detection.

For questions, support, or contributions, please refer to the project repository and documentation. 