#!/bin/bash

# Activate the virtual environment
echo "Activating virtual environment..."
source ../venv/bin/activate

# Set model paths
export STAGE1_MODEL_PATH=$(pwd)/../models/stage1_bin
export STAGE2_MODEL_PATH=$(pwd)/../models/stage2_multi

# Check if model directories exist
if [ ! -d "$STAGE1_MODEL_PATH" ]; then
  echo "Error: Stage 1 model directory not found at $STAGE1_MODEL_PATH"
  exit 1
fi

if [ ! -d "$STAGE2_MODEL_PATH" ]; then
  echo "Error: Stage 2 model directory not found at $STAGE2_MODEL_PATH"
  exit 1
fi

echo "Running Astra Threat Detection API with models from:"
echo "- Stage 1: $STAGE1_MODEL_PATH"
echo "- Stage 2: $STAGE2_MODEL_PATH"

# Run the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 