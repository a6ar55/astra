#!/bin/bash

# Train both stages of the threat detection model

echo "Starting two-stage threat detection model training..."

# Generate binary dataset
echo -e "\n\n===== Generating Binary Dataset for Stage 1 ====="
cd ../data
python stage1_binary_dataset.py

# Train Stage 1 (binary classifier)
echo -e "\n\n===== Training Stage 1: Binary Threat Classifier ====="
cd ../llm
python train_stage1_binary.py

# Train Stage 2 (multi-class classifier for threat types)
echo -e "\n\n===== Training Stage 2: Multi-class Threat Type Classifier ====="
python train_stage2_multi.py

echo -e "\n\n===== Training Complete! ====="
echo "Stage 1 model saved to: ../models/stage1_bin"
echo "Stage 2 model saved to: ../models/stage2_multi" 