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

# Install Python dependencies if needed
if [ -f "requirements.txt" ]; then
  echo "Installing Python dependencies..."
  pip install -r requirements.txt
fi

# Check models directory
echo "Checking model paths..."
MODEL_DIR="../models"
if [ ! -d "$MODEL_DIR" ]; then
  echo "Warning: Model directory not found at $MODEL_DIR"
fi

# Install frontend dependencies if package.json exists
if [ -f "frontend/package.json" ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

# Start the backend in the background
echo "Starting backend API server..."
cd backend
# Use the correct main.py file in the backend root, not in app subdirectory
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for the backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null; then
  echo "✅ Backend server started successfully on http://localhost:8000"
else
  echo "❌ Backend server failed to start"
fi

# Start the frontend
echo "Starting frontend development server..."
cd frontend && npm run dev

# Clean up when the script is terminated
trap "echo 'Shutting down servers...'; kill $BACKEND_PID; exit" SIGINT SIGTERM EXIT 