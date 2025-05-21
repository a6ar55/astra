#!/usr/bin/env python3
"""
Test the two-stage threat detection model (binary + multiclass)
"""
import os
import sys
import torch
import numpy as np
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import the model loader
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app.model_loader import TwoStageModelLoader

def test_two_stage_model():
    # Path to the models
    project_root = Path(__file__).parent.parent.parent
    
    stage1_dir = project_root / "models" / "stage1_bin"
    stage2_dir = project_root / "models" / "stage2_multi"
    
    # Load model
    model_loader = TwoStageModelLoader()
    
    logger.info(f"Loading Stage 1 model from: {stage1_dir}")
    logger.info(f"Loading Stage 2 model from: {stage2_dir}")
    
    success = model_loader.load_models(str(stage1_dir), str(stage2_dir))
    
    if not success:
        logger.error("Failed to load models")
        return
    
    logger.info("Models loaded successfully")
    
    # Test examples with various types of content
    test_texts = [
        "I'm going to kill you and your entire family.",  # Direct violence threat
        "I'm looking for videos of kids undressing.",  # Child safety threat
        "The weather is nice today, I might go for a walk.",  # Non-threat
        "All members of that race should be eliminated.",  # Hate speech
        "I know where you live and I'm coming for you.",  # Harassment/intimidation
        "I'm selling illegal drugs, contact me if interested.",  # Criminal activity
        "This is a test message that should not trigger any alerts."  # Non-threat
    ]
    
    # Test prediction for each text
    for i, text in enumerate(test_texts):
        logger.info(f"\n\n===== Test {i+1}: {text} =====")
        result = model_loader.predict(text)
        
        if not result.get("success", False):
            logger.error(f"Prediction failed: {result.get('error', 'Unknown error')}")
            continue
        
        # Display Stage 1 results
        logger.info(f"STAGE 1 RESULT:")
        logger.info(f"Classification: {result['stage1_result']['predicted_class']} (Confidence: {result['stage1_result']['confidence']:.4f})")
        logger.info(f"Is threat: {result['stage1_result']['is_threat']}")
        
        # Display stage 1 breakdown
        logger.info("Stage 1 class probabilities:")
        for class_info in result.get('stage1_breakdown', []):
            logger.info(f"  {class_info['label']}: {class_info['probability']:.4f}")
        
        # If it's a threat, display Stage 2 results
        if result['threat']:
            logger.info(f"\nSTAGE 2 RESULT:")
            logger.info(f"Threat type: {result['stage2_result']['predicted_class']} (Confidence: {result['stage2_result']['confidence']:.4f})")
            
            # Display stage 2 breakdown
            logger.info("Stage 2 class probabilities:")
            for class_info in result.get('stage2_breakdown', []):
                logger.info(f"  {class_info['label']}: {class_info['probability']:.4f}")
        
        logger.info(f"\nFINAL PREDICTION: {result['predicted_class']} (Confidence: {result['confidence']:.4f})")
        logger.info("=" * 50)

if __name__ == "__main__":
    test_two_stage_model() 