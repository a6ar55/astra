# Threat Detection LLM System

This module provides a dual-model threat detection system that allows users to choose between a pre-trained DistilBERT model and a PEFT fine-tuned RoBERTa model for text classification.

## Overview

The system supports detection and classification of 5 threat categories:
- Child Safety Threats
- Criminal Activity
- Direct Violence Threats
- Harassment and Intimidation
- Hate Speech/Extremism

## Features

- **Dual Model Support**: Choose between two state-of-the-art threat detection models
- **PEFT Fine-tuning**: Parameter-efficient training for the RoBERTa model
- **Interactive Prediction**: Test both models interactively
- **Model Comparison**: Compare prediction results between models
- **Detailed Metrics**: View confidence scores and class probabilities

## Models

### 1. DistilBERT Two-Stage Model
- **Architecture**: Two-stage hierarchical classification
  - Stage 1: Binary threat/non-threat classification
  - Stage 2: Multi-class threat type classification
- **Status**: Pre-trained, ready for inference
- **Location**: Stored in `models/stage1_bin` and `models/stage2_multi`

### 2. RoBERTa PEFT Model
- **Base Model**: `unitary/unbiased-toxic-roberta`
- **Fine-tuning**: PEFT (LoRA) with rank=16, alpha=32
- **Status**: Will be trained on first use
- **Location**: Will be stored in `models/roberta_peft_lora`

## Usage Instructions

### Running the Model Manager

```bash
cd threat-detection-platform/llm
python model_manager.py
```

This will launch the interactive model selection system with the following options:

1. **Select model**: Choose between DistilBERT and RoBERTa
2. **Interactive prediction**: Test the selected model with your own text
3. **Compare models**: Test both models on the same text
4. **Exit**: Exit the application

### First-time RoBERTa Setup

When selecting the RoBERTa model for the first time, you'll be prompted to train it. This process:
1. Downloads the base `unitary/unbiased-toxic-roberta` model
2. Applies PEFT fine-tuning using LoRA on the dataset
3. Saves the fine-tuned model for future use

The training process takes approximately 15-30 minutes depending on your hardware.

## Implementation Details

### PEFT Training Process

The RoBERTa model is fine-tuned using PEFT (Parameter-Efficient Fine-Tuning) with LoRA:

- **Dataset**: Uses `final.csv` (70% train, 15% validation, 15% test)
- **PEFT Config**:
  - Rank: 16
  - Alpha: 32
  - Target modules: query, key, value attention layers
- **Training Config**:
  - Learning rate: 1e-4
  - Batch size: 8
  - Epochs: 5 with early stopping
  - Optimizer: AdamW

### Files

- `model_manager.py`: Main interface for model selection and prediction
- `peft_train_roberta.py`: PEFT training script for RoBERTa model

## Requirements

- Python 3.8+
- PyTorch 2.0+
- Transformers 4.30+
- PEFT 0.4+
- Datasets 2.12+

## Example Usage

```
============================================================
THREAT DETECTION MODEL SELECTION SYSTEM
============================================================

This system allows you to choose between two threat detection models:
  1) DistilBERT: Pre-trained two-stage hierarchical model
     - Stage 1: Binary threat/non-threat classifier
     - Stage 2: Multi-class threat type classifier

  2) RoBERTa: PEFT (LoRA) fine-tuned model
     - Based on unitary/unbiased-toxic-roberta
     - Fine-tuned with LoRA (rank=16, alpha=32)

Both models support the following threat classes:
  - Child Safety Threats
  - Criminal Activity
  - Direct Violence Threats
  - Harassment and Intimidation
  - Hate Speech/Extremism
============================================================

Select model (1-2): 2

Loading RoBERTa PEFT model...
RoBERTa model not found. Would you like to:
1) Train it now
2) Exit
Select option (1-2): 1

Training RoBERTa model with PEFT...
Running training script: /path/to/threat-detection-platform/llm/peft_train_roberta.py
...
```

## Performance Comparison

After training, you can compare the performance of both models:

- **DistilBERT** advantages:
  - Two-stage approach provides explainable threat detection
  - More nuanced for borderline cases

- **RoBERTa** advantages:
  - Based on a toxicity-specialized model
  - More efficient inference (single pass vs. two-stage)

## Extending the System

To add new models to the system:
1. Create a new training script similar to `peft_train_roberta.py`
2. Add the model option in `model_manager.py`
3. Implement the corresponding load and predict methods 