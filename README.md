# Threat Detection Platform

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