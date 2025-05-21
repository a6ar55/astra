#!/bin/bash

echo "Starting Astra Threat Detection Platform..."

# Verify virtual environment
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check models directory
echo "Checking model paths..."
MODEL_DIR="../models"
if [ ! -d "$MODEL_DIR" ]; then
  echo "Warning: Model directory not found at $MODEL_DIR"
fi

# Install dependencies if package.json exists
if [ -f "frontend/package.json" ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

# Start the backend in the background
echo "Starting backend API server..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for the backend to start
echo "Waiting for backend to start..."
sleep 3

# Start the frontend
echo "Starting frontend development server..."
cd frontend && npm run dev

# Clean up when the script is terminated
trap "echo 'Shutting down servers...'; kill $BACKEND_PID; exit" SIGINT SIGTERM EXIT 