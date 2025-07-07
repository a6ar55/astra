# Final Documentation: Astra Threat Detection Platform

This document provides a comprehensive overview of the Astra Threat Detection Platform, detailing its architecture, features, and technical implementation.

## 1. High-Level Architecture

The platform is a full-stack web application composed of three main parts:

1.  **React Frontend:** A modern, responsive user interface built with React and Vite. It provides all user-facing features, including data visualization, interactive analysis, and reporting.
2.  **FastAPI Backend:** A powerful Python backend that serves as the application's core. It handles business logic, serves the machine learning models, interacts with the database, and provides a comprehensive REST API.
3.  **AI & Data Services:** A collection of integrated services that provide the platform's intelligence, including machine learning models for threat detection, a Retrieval-Augmented Generation (RAG) system for contextual chat, and a connection to a real-time web search API.

The entire application is orchestrated by a single `run.sh` script, which sets up the environment and starts both the frontend and backend servers.

---

## 2. Backend Architecture (`backend/`)

The backend is built using the **FastAPI** framework, chosen for its high performance and automatic API documentation generation.

### 2.1. Entrypoint & Application Setup (`main.py`)

The `main.py` script is the heart of the backend. It initializes the FastAPI application and defines all API endpoints.

**Key Responsibilities on Startup:**

*   **Service Loading:** It dynamically loads all core services (`chat_service`, `rag_service_v2`, `web_search_service`, etc.) using a robust `try-except` block, allowing the application to start even if optional dependencies are missing.
*   **Firebase Initialization:** It establishes a connection to the Firebase/Firestore database, which is used for all data persistence (user data, analysis history, reports, etc.).
*   **ML Model Loading:** It triggers the `model_loader` to load all configured AI models (DistilBERT and Astra) into memory, making them ready to serve predictions.
*   **API Configuration:** It configures Cross-Origin Resource Sharing (CORS) to allow the frontend application to communicate with it.

### 2.2. Core Services

#### 2.2.1. Machine Learning Model Service (`model_loader.py` & `astra_model.py`)

This service abstracts the complexity of handling different ML models.

*   **Multi-Model Support:** It is designed to manage two types of models:
    *   **Two-Stage DistilBERT:** A fast and efficient pipeline. A binary classifier first filters out non-threatening text. If a threat is detected, a second, more detailed multi-class classifier categorizes the specific threat type.
    *   **Single-Stage Astra:** A custom-trained, optimized PyTorch model that performs direct multi-class classification in a single step. The `astra_model.py` file defines the specific `OptimizedBertModel` architecture and the `OptimizedThreatPredictor` class that orchestrates the loading of the model weights (`.pth` file) and the entire inference pipeline.
*   **Prediction Abstraction:** It provides a single `predict()` method that takes text and a `model_type` as input. This allows the main API to be agnostic to the underlying model being used, returning a standardized JSON response in all cases.

#### 2.2.2. Chat AI Service (`chat_service.py`)

This service acts as the "brain" for the platform's AI assistant.

*   **Gemini Integration:** It connects to the **Google Gemini API** (`gemini-1.5-flash` model) to generate conversational responses.
*   **Advanced Prompt Engineering:** This is its most critical feature. The service uses a detailed **system prompt** to establish the AI's persona as "SENTINEL-AI," a senior threat intelligence analyst. The prompt dictates a professional tone, a specific 5-step analysis framework (Analyze, Correlate, Assess, Recommend, Prioritize), and a structured response format, ensuring high-quality, domain-specific output.
*   **Contextualization:** It has methods that take the context retrieved by the RAG and Web Search services and intelligently weave it into the prompt for the Gemini model, providing explicit instructions on how to synthesize the different sources of information.

#### 2.2.3. Retrieval-Augmented Generation (RAG) Service (`rag_service_v2.py`)

This service gives the chatbot long-term memory and grounds its responses in the user's actual data.

*   **How RAG Works:**
    1.  **Indexing:** Whenever a user analyzes text, saves a report, or performs other key actions, the data is passed to the RAG service. The service extracts the relevant text, converts it into a numerical vector (**embedding**) using a `SentenceTransformer` model (`all-MiniLM-L6-v2`), and stores this vector in a local **SQLite** database.
    2.  **Retrieval:** When a user asks the chatbot a question, the user's query is also converted into a vector. The service then searches the SQLite database by calculating the **cosine similarity** between the query vector and all the stored document vectors.
    3.  **Augmentation:** The top N most similar documents are retrieved from the database. Their text is formatted into a clean context block and "augmented" (prepended) to the user's original query before being sent to the Chat AI Service.
*   **Result:** This process allows the AI to answer questions based on the user's specific history, such as "What were the main findings of the report I generated yesterday?" or "Tell me more about the Twitter user who had multiple high-severity threats."

#### 2.2.4. Web Search Service (`web_search_service.py`)

This service connects the AI to the live internet.

*   **Search API:** It uses the **DuckDuckGo Search API** (via RapidAPI) to perform real-time web searches based on the user's query.
*   **Content Extraction:** It uses a `ThreadPoolExecutor` for high-performance, parallel scraping of the top search result URLs. It uses the `BeautifulSoup` library to parse the HTML of these pages, intelligently removing irrelevant content (like ads, headers, footers) to extract the main article text.
*   **Formatting:** The cleaned text from the web pages is formatted into a structured context block, which is then passed to the Chat AI Service to be included in the prompt. This enables the AI to answer questions about current events or emerging threats not present in its training data.

### 2.3. Database (`firebase_config.py`)

*   **Firebase/Firestore:** The platform uses Google's Firestore as its primary NoSQL database for all persistent data, including user profiles, analysis history, generated reports, and threat map locations.
*   **`firebase_config.py`:** This file contains the initialization logic and a set of utility functions that abstract away the direct Firestore API calls, providing clean methods like `get_or_create_user`, `add_analysis_to_history`, and `get_user_threat_locations`.

---

## 3. Frontend Architecture (`frontend/`)

The frontend is a modern Single-Page Application (SPA) built with **React** and the **Vite** build tool for a fast development experience.

### 3.1. Application Entrypoint (`App.jsx`)

This is the root component of the React application.

*   **Authentication:** It uses the **Clerk** library for user authentication, which handles the entire sign-in/sign-up flow and provides user session management. It conditionally renders a public home page or the main application based on the user's login status.
*   **Routing:** It uses `react-router-dom` to manage all client-side routes, rendering the appropriate page component (e.g., `Dashboard`, `ThreatMap`, `History`) in the main content area.
*   **Global State & Data Fetching:** It manages key global state (like user stats and history) and is responsible for the initial data-loading sequence when a user logs in. It implements a robust data-loading strategy with API retries and a **local storage fallback** to ensure the app is usable even if the backend is temporarily unavailable.

### 3.2. API Service Layer (`services/apiService.js`)

This file provides a clean abstraction layer for all communication with the backend.

*   **Centralized Logic:** It encapsulates all `axios` calls into a single `ApiService` class. Components do not make API calls directly; they call methods on this service (e.g., `apiService.analyzeThreat(text)`).
*   **Automatic Authentication:** It uses an `axios request interceptor` to **automatically attach the logged-in user's ID to every outgoing request**. This is a critical feature that simplifies component logic immensely.
*   **File Download Handling:** It includes logic to correctly handle `blob` response types from the backend, enabling the download of generated PowerPoint presentations and video files.

### 3.3. Key Pages and Components

*   **`pages/Dashboard.jsx`:** The main user dashboard. It contains the primary text analysis form, statistics widgets, and a chart visualizing the user's threat category distribution. It uses a polling mechanism to keep the stats up-to-date.
*   **`components/ThreatChatAI.jsx`:** The user interface for the AI assistant. It manages the conversation flow, provides a toggle for enabling/disabling the real-time web search, and displays the AI's formatted responses.
*   **`pages/ThreatMap.jsx`:** An interactive world map (using `react-leaflet`) that visualizes the geographic location of identified threats, pulling data from the `/api/threat-map/data` endpoint.
*   **`pages/TwitterThreats.jsx` & `pages/TwitterUserAnalysis.jsx`:** A suite of tools dedicated to searching for threats on Twitter, analyzing specific user profiles, and displaying the results.
*   **`pages/FIRs.jsx`:** A page for viewing and managing First Information Reports generated from high-severity threats.
*   **`pages/Briefing.jsx`:** A feature that allows the user to generate multi-media briefings from their threat reports, including PowerPoint presentations, speaker scripts, and full video presentations with AI-generated narration.

---
## 4. How to run the Project

To run the project execute the `run.sh` file from the root of the directory.

```bash
./run.sh
```
The script will install all the necessary dependencies for the project and start the frontend and backend servers.
Once the servers are up and running, you can access the frontend at http://localhost:5173/ and the backend at http://localhost:8000/

The project uses Clerk for authentication. To use the project create an account on Clerk and add the following environment variables to a `.env` file in the `frontend` directory:

- `VITE_CLERK_PUBLISHABLE_KEY`

To get the Gemini API key, create an account on [Google AI Studio](https://aistudio.google.com/) and get your key.

To use the Web search feature, create an account on [RapidAPI](https://rapidapi.com) and subscribe to the [DuckDuckGo Search API](https://rapidapi.com/msprak/api/duckduckgo8/). Then, add the API key to the `.env` file in the `backend` directory.

- `GEMINI_API_KEY`
- `RAPIDAPI_KEY`

The project uses Firebase for the database. To set up the database, create a project on the [Firebase console](httpsp://console.firebase.google.com/), and get your credentials. Save the credentials in a file named `firebase-credentials.json` in the `backend` directory.

After adding the environment variables, restart the servers to apply the changes. 