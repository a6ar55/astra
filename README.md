# Astra: Two-Stage Threat Detection Platform

Astra is a comprehensive threat detection platform that employs a two-stage approach to accurately identify and classify threatening content.

## Two-Stage Model Architecture

### Stage 1: Binary Classification
The first stage model performs binary classification to determine if content is a threat or non-threat. This approach:
- Increases efficiency by quickly filtering out non-threatening content
- Reduces false positives by applying specialized analysis only where needed
- Improves overall system performance

### Stage 2: Multi-class Classification
If content is identified as a threat in Stage 1, it is passed to the Stage 2 model which classifies the specific type of threat:
- Hate Speech/Extremism
- Direct Violence Threats
- Harassment and Intimidation
- Criminal Activity
- Child Safety Threats

## Project Structure

```
threat-detection-platform/
├── backend/               # FastAPI backend server
│   ├── app/               # API endpoints and core logic
│   │   ├── model_loader.py  # Two-stage model loading and prediction
│   │   └── main.py        # API routes
│   └── database/          # Database connectivity
├── data/                  # Dataset processing
│   ├── combined_dataset.csv       # Full multi-class dataset
│   └── stage1_binary_dataset.py   # Binary dataset generator
├── frontend/              # React frontend
│   └── src/
│       ├── components/    # Reusable UI components
│       └── pages/         # Application pages
└── llm/                   # Model training scripts
    ├── train_stage1_binary.py     # Stage 1 model training
    ├── train_stage2_multi.py      # Stage 2 model training
    └── train_models.sh            # Training automation script
```

## Getting Started

### 1. Setup Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/threat-detection-platform.git
cd threat-detection-platform

# Install dependencies
pip install -r requirements.txt
```

### 2. Data Preparation

```bash
# Generate binary dataset for Stage 1
cd data
python stage1_binary_dataset.py
```

### 3. Train Models

```bash
# Run the training script for both models
cd ../llm
./train_models.sh
```

### 4. Run the Application

```bash
# Start the backend server
cd ../backend
uvicorn app.main:app --reload

# In another terminal, start the frontend
cd ../frontend
npm install
npm start
```

## Using the Platform

1. **Input Content**: Enter text in the analysis field on the dashboard
2. **Two-Stage Analysis**: The system will:
   - First determine if the content is a threat (Stage 1)
   - If a threat, classify the specific type (Stage 2)
3. **View Results**: The interface displays:
   - Stage 1 results with confidence scores
   - Stage 2 detailed classification (if applicable)
   - Severity assessment and recommended actions

## API Endpoints

- `POST /api/predict`: Analyze a single text input
- `POST /api/predict/batch`: Analyze multiple texts
- `GET /api/user/stats`: Get user threat statistics
- `GET /api/user/history`: Get user analysis history

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Astra

## Overview

The Threat Detection Platform is a modern, full-stack threat intelligence and case management system designed for law enforcement, security agencies, and organizations seeking advanced situational awareness. It leverages state-of-the-art machine learning models to analyze and classify text data, identifying a wide spectrum of threats including direct violence, hate speech, extremism, harassment, and criminal activity.

The platform features a professional, law enforcement-inspired user interface with a dark theme, animated transitions, and advanced data visualizations. It provides real-time threat detection, interactive dashboards, case management, and geospatial threat mapping, all powered by a robust FastAPI backend and a React frontend.

## Features

- **Real-Time Threat Detection:** Analyze text for potential threats using advanced ML models.
- **Dashboard:** Visualize threat statistics, severity breakdowns, and actionable insights.
- **Case Management:** Create, track, and update threat cases with timelines and related case linking.
- **Threat Map:** Interactive geospatial visualization of threats with filtering by type, severity, and time.
- **Settings:** Security and configuration controls for platform customization.
- **Responsive Design:** Optimized for all devices with a modern, dark-themed UI.
- **Extensible Backend:** FastAPI-based API with endpoints for all features, ready for production integration.

## Architecture

- **Backend:** Python 3.13, FastAPI, Pandas, Geopy, and custom ML model loader.
- **Frontend:** React, Chart.js, React-Leaflet, Framer Motion, Axios, Tailwind CSS.
- **Data:** Uses combined datasets (`diverse_dataset.csv`, `gen_ds.csv`) for demonstration and simulation.

## Directory Structure

```
myProj/
  ├── threat-detection-platform/
  │   ├── backend/
  │   │   └── app/
  │   ├── frontend/
  │   │   └── src/
  │   ├── models/
  │   ├── tests/
  │   └── venv/
  ├── diverse_dataset.csv
  └── gen_ds.csv
```

## Setup Instructions

### Prerequisites
- Python 3.13+
- Node.js 18+
- npm 9+
- (Recommended) macOS, Linux, or WSL for best compatibility

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd myProj
```

### 2. Python Virtual Environment & Backend Setup
```bash
cd threat-detection-platform
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
# If requirements.txt is missing, install manually:
pip install fastapi uvicorn pandas geopy pydantic
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Start the Backend
```bash
cd ../backend
source ../../venv/bin/activate  # If not already activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Start the Frontend
Open a new terminal:
```bash
cd myProj/threat-detection-platform/frontend
npm run dev
```

### 6. Access the Platform
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Usage
- Use the Dashboard for real-time threat statistics and visualizations.
- Manage and track cases in the Case Management module.
- Explore geospatial threat data in the Threat Map.
- Adjust platform settings in the Settings page.

## Customization & Extensibility
- **Models:** Place your trained models in the `models/` directory and update backend paths as needed.
- **Datasets:** Replace or extend `diverse_dataset.csv` and `gen_ds.csv` for new data.
- **API:** Extend FastAPI endpoints in `backend/app/main.py` for new features.
- **UI:** Add or modify React components in `frontend/src/` for custom workflows.

## License
This project is provided for research and demonstration purposes. For production or sensitive use, review and adapt security, privacy, and deployment practices accordingly.

---

**Contributions and feedback are welcome!** 