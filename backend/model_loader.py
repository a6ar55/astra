#!/usr/bin/env python3
"""
Enhanced Model Loader for Threat Detection System
Supports both Two-Stage DistilBERT and Single-Stage Astra models
"""
import os
import torch
import logging
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, Any, Optional
from astra_model import OptimizedThreatPredictor

# Configure logging
logger = logging.getLogger(__name__)

class EnhancedModelLoader:
    """
    Enhanced model loader supporting multiple model architectures:
    - Two-Stage DistilBERT: Binary classifier (stage 1) + Multi-class classifier (stage 2)
    - Single-Stage Astra: Direct multi-class classification
    """
    
    def __init__(self):
        # Two-stage DistilBERT models
        self.stage1_model = None
        self.stage1_tokenizer = None
        self.stage2_model = None
        self.stage2_tokenizer = None
        self.distilbert_loaded = False
        
        # Single-stage Astra model
        self.astra_model = None
        self.astra_tokenizer = None
        self.astra_loaded = False
        
        # Label mappings for DistilBERT
        self.stage1_labels = {0: "Not a Threat", 1: "Threat"}
        self.stage2_labels = {
            0: "Hate Speech/Extremism",
            1: "Direct Violence Threats", 
            2: "Harassment and Intimidation",
            3: "Criminal Activity",
            4: "Child Safety Threats"
        }
        
        # Label mappings for Astra (all threat types in single stage)
        self.astra_labels = {
            0: "Not a Threat",
            1: "Hate Speech/Extremism",
            2: "Direct Violence Threats", 
            3: "Harassment and Intimidation",
            4: "Criminal Activity",
            5: "Child Safety Threats"
        }
    
    def load_distilbert_models(self, stage1_path: str, stage2_path: str) -> bool:
        """
        Load the two-stage DistilBERT models
        
        Args:
            stage1_path: Path to stage 1 model directory
            stage2_path: Path to stage 2 model directory
            
        Returns:
            bool: True if both models loaded successfully
        """
        try:
            # Reset DistilBERT loading state
            self.distilbert_loaded = False
            
            # Load Stage 1 model
            logger.info(f"Loading DistilBERT Stage 1 model from: {stage1_path}")
            if not os.path.exists(stage1_path):
                logger.error(f"❌ Stage 1 model path does not exist: {stage1_path}")
                return False
            
            try:
                self.stage1_tokenizer = AutoTokenizer.from_pretrained(stage1_path)
                self.stage1_model = AutoModelForSequenceClassification.from_pretrained(stage1_path)
                self.stage1_model.eval()
                logger.info("✅ DistilBERT Stage 1 model loaded successfully")
            except Exception as stage1_error:
                logger.error(f"❌ Error loading Stage 1 model: {stage1_error}")
                return False
            
            # Load Stage 2 model
            logger.info(f"Loading DistilBERT Stage 2 model from: {stage2_path}")
            if not os.path.exists(stage2_path):
                logger.error(f"❌ Stage 2 model path does not exist: {stage2_path}")
                return False
            
            try:
                self.stage2_tokenizer = AutoTokenizer.from_pretrained(stage2_path)
                self.stage2_model = AutoModelForSequenceClassification.from_pretrained(stage2_path)
                self.stage2_model.eval()
                logger.info("✅ DistilBERT Stage 2 model loaded successfully")
            except Exception as stage2_error:
                logger.error(f"❌ Error loading Stage 2 model: {stage2_error}")
                return False
            
            self.distilbert_loaded = True
            logger.info("✅ DistilBERT two-stage models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error loading DistilBERT models: {str(e)}")
            logger.exception("Full traceback:")
            self.distilbert_loaded = False
            return False
    
    def load_astra_model(self, model_path: str) -> bool:
        """
        Load the single-stage Astra model using OptimizedThreatPredictor
        
        Args:
            model_path: Path to the Astra model file (.pth)
            
        Returns:
            bool: True if model loaded successfully
        """
        try:
            logger.info(f"🚀 Loading Astra model using OptimizedThreatPredictor...")
            
            # Get absolute paths based on your training code structure
            base_dir = os.path.dirname(model_path)
            tokenizer_path = os.path.join(base_dir, 'optimized_threat_detection_tokenizer')
            label_encoder_path = os.path.join(base_dir, 'optimized_label_encoder.pkl')
            
            logger.info(f"📁 Model path: {model_path}")
            logger.info(f"📁 Tokenizer path: {tokenizer_path}")
            logger.info(f"📁 Label encoder path: {label_encoder_path}")
            
            # Initialize the OptimizedThreatPredictor with correct paths
            self.astra_model = OptimizedThreatPredictor(
                model_path=model_path,
                tokenizer_path=tokenizer_path,
                label_encoder_path=label_encoder_path
            )
            
            # Test the model with a simple prediction to verify it's working
            test_result = self.astra_model.predict("This is a test message")
            logger.info(f"🧪 Test prediction successful: {test_result}")
            
            self.astra_loaded = True
            logger.info("✅ Astra model loaded successfully using OptimizedThreatPredictor")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error loading Astra model: {str(e)}")
            logger.exception("Full traceback:")
            self.astra_loaded = False
            return False
    
    def load_all_models(self, stage1_path: str, stage2_path: str, astra_path: str) -> Dict[str, bool]:
        """
        Load all available models
        
        Returns:
            Dict with loading status for each model
        """
        results = {
            "distilbert": False,
            "astra": False
        }
        
        # Load DistilBERT models
        results["distilbert"] = self.load_distilbert_models(stage1_path, stage2_path)
        
        # Load Astra model
        results["astra"] = self.load_astra_model(astra_path)
        
        return results
    
    def predict_with_distilbert(self, text: str, max_length: int = 128) -> Dict[str, Any]:
        """
        Make prediction using two-stage DistilBERT models
        """
        if not self.distilbert_loaded:
            return {
                "success": False,
                "error": "DistilBERT models not loaded"
            }
        
        try:
            # Stage 1: Binary classification
            stage1_inputs = self.stage1_tokenizer(
                text,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=max_length
            )
            
            with torch.no_grad():
                stage1_outputs = self.stage1_model(**stage1_inputs)
                stage1_logits = stage1_outputs.logits
                stage1_probs = torch.nn.functional.softmax(stage1_logits, dim=1)[0]
                stage1_pred = torch.argmax(stage1_probs).item()
                stage1_confidence = stage1_probs[stage1_pred].item()
            
            # If Stage 1 predicts "Not a Threat", return early
            if stage1_pred == 0:  # Not a threat
                return {
                    "success": True,
                    "model_used": "distilbert",
                    "model_type": "two_stage",
                    "stage": "stage1_only",
                    "threat": False,
                    "predicted_class": self.stage1_labels[stage1_pred],
                    "confidence": stage1_confidence,
                    "stage1_prediction": {
                        "class": self.stage1_labels[stage1_pred],
                        "confidence": stage1_confidence
                    }
                }
            
            # Stage 2: Multi-class classification
            stage2_inputs = self.stage2_tokenizer(
                text,
                return_tensors="pt", 
                padding="max_length",
                truncation=True,
                max_length=max_length
            )
            
            with torch.no_grad():
                stage2_outputs = self.stage2_model(**stage2_inputs)
                stage2_logits = stage2_outputs.logits
                stage2_probs = torch.nn.functional.softmax(stage2_logits, dim=1)[0]
                stage2_pred = torch.argmax(stage2_probs).item()
                stage2_confidence = stage2_probs[stage2_pred].item()
            
            return {
                "success": True,
                "model_used": "distilbert",
                "model_type": "two_stage",
                "stage": "two_stage",
                "threat": True,
                "predicted_class": self.stage2_labels[stage2_pred],
                "confidence": stage2_confidence,
                "stage1_prediction": {
                    "class": self.stage1_labels[stage1_pred],
                    "confidence": stage1_confidence
                },
                "stage2_prediction": {
                    "class": self.stage2_labels[stage2_pred],
                    "confidence": stage2_confidence
                }
            }
            
        except Exception as e:
            logger.error(f"Error during DistilBERT prediction: {str(e)}")
            return {
                "success": False,
                "error": f"DistilBERT prediction failed: {str(e)}"
            }
    
    def predict_with_astra(self, text: str, max_length: int = 128) -> Dict[str, Any]:
        """
        Make prediction using single-stage Astra model with OptimizedThreatPredictor
        """
        if not self.astra_loaded:
            return {
                "success": False,
                "error": "Astra model not loaded"
            }
        
        try:
            logger.info(f"🔍 Making Astra prediction for: {text[:100]}...")
            
            # Use the OptimizedThreatPredictor for inference
            predicted_label, prob_dict = self.astra_model.predict(text, return_probabilities=True)
            confidence = prob_dict[predicted_label]
            is_threat = self.astra_model.is_threat(predicted_label)
            
            logger.info(f"✅ Astra prediction: {predicted_label} (threat: {is_threat}, confidence: {confidence:.3f})")
            
            return {
                "success": True,
                "model_used": "astra",
                "model_type": "single_stage",
                "stage": "single_stage",
                "threat": is_threat,
                "predicted_class": predicted_label,
                "confidence": confidence,
                "class_probabilities": prob_dict,
                "astra_prediction": {
                    "class": predicted_label,
                    "confidence": confidence,
                    "all_probabilities": list(prob_dict.values())
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error during Astra prediction: {str(e)}")
            logger.exception("Full traceback:")
            return {
                "success": False,
                "error": f"Astra prediction failed: {str(e)}"
            }
    
    def predict(self, text: str, model_type: str = "distilbert", max_length: int = 128) -> Dict[str, Any]:
        """
        Make prediction using specified model type
        
        Args:
            text: Input text to classify
            model_type: "distilbert" or "astra"
            max_length: Maximum sequence length for tokenization
            
        Returns:
            Dict containing prediction results
        """
        if model_type.lower() == "astra":
            return self.predict_with_astra(text, max_length)
        else:
            return self.predict_with_distilbert(text, max_length)
    
    def get_available_models(self) -> Dict[str, bool]:
        """Get status of all available models"""
        return {
            "distilbert": self.distilbert_loaded,
            "astra": self.astra_loaded
        }
    
    def get_model_info(self) -> Dict[str, Dict[str, Any]]:
        """Get detailed information about all models"""
        # Get Astra classes from the loaded model if available
        astra_classes = list(self.astra_labels.values())
        if self.astra_loaded and hasattr(self.astra_model, 'get_available_classes'):
            try:
                astra_classes = self.astra_model.get_available_classes()
            except:
                pass  # Fall back to default labels
        
        return {
            "distilbert": {
                "name": "DistilBERT Two-Stage",
                "type": "two_stage",
                "loaded": self.distilbert_loaded,
                "description": "Binary classification (stage 1) + Multi-class threat type classification (stage 2)",
                "classes": list(self.stage2_labels.values()) + ["Not a Threat"]
            },
            "astra": {
                "name": "Astra Single-Stage",
                "type": "single_stage", 
                "loaded": self.astra_loaded,
                "description": "Direct multi-class threat classification in single stage",
                "classes": astra_classes
            }
        }

# Create a global instance for easy importing
model_loader = EnhancedModelLoader()

# Legacy compatibility - maintain original function names
def load_models(stage1_path: str, stage2_path: str) -> bool:
    """Legacy function for backward compatibility"""
    return model_loader.load_distilbert_models(stage1_path, stage2_path) 