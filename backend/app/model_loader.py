import os
import logging
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, Any, Tuple, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TwoStageModelLoader:
    def __init__(self):
        self.stage1_model = None
        self.stage1_tokenizer = None
        self.stage1_id2label = {0: "Non-threat/Neutral", 1: "Threat"}
        self.stage1_max_length = 128

        self.stage2_model = None
        self.stage2_tokenizer = None
        self.stage2_id2label = {}
        self.stage2_max_length = 128

    def load_models(self, stage1_dir: str, stage2_dir: str) -> bool:
        """
        Load both stage1 (binary) and stage2 (multiclass) models
        """
        try:
            # Stage 1
            stage1_dir = Path(stage1_dir)
            logger.info(f"Loading Stage 1 model from {stage1_dir}")
            if not stage1_dir.exists():
                logger.error(f"Stage 1 model directory does not exist: {stage1_dir}")
                return False
            self.stage1_tokenizer = AutoTokenizer.from_pretrained(stage1_dir)
            self.stage1_model = AutoModelForSequenceClassification.from_pretrained(stage1_dir)
            self.stage1_model.eval()
            logger.info("Stage 1 model loaded successfully.")
            # Stage 2
            stage2_dir = Path(stage2_dir)
            logger.info(f"Loading Stage 2 model from {stage2_dir}")
            if not stage2_dir.exists():
                logger.error(f"Stage 2 model directory does not exist: {stage2_dir}")
                return False
            self.stage2_tokenizer = AutoTokenizer.from_pretrained(stage2_dir)
            self.stage2_model = AutoModelForSequenceClassification.from_pretrained(stage2_dir)
            self.stage2_model.eval()
            logger.info("Stage 2 model loaded successfully.")
            # Load id2label for stage2
            config = self.stage2_model.config
            self.stage2_id2label = config.id2label if hasattr(config, 'id2label') else {}
            logger.info(f"Stage 2 id2label: {self.stage2_id2label}")
            return True
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    def predict(self, text: str) -> Dict[str, Any]:
        """
        Two-stage prediction: first binary, then multiclass if threat
        """
        if not self.stage1_model or not self.stage2_model:
            logger.error("Models not loaded. Call load_models() first.")
            return {"error": "Models not loaded", "success": False}
        try:
            # Stage 1: Threat vs Non-threat
            inputs1 = self.stage1_tokenizer(
                text,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=self.stage1_max_length
            )
            with torch.no_grad():
                logits1 = self.stage1_model(**inputs1).logits
            probs1 = torch.nn.functional.softmax(logits1, dim=1)[0]
            pred1 = torch.argmax(probs1).item()
            label1 = self.stage1_id2label[pred1]
            conf1 = float(probs1[pred1].item())
            is_threat = (label1 != "Non-threat/Neutral")
            
            # Create stage 1 probabilities breakdown in visualization-friendly format
            stage1_probs = []
            for i in range(len(probs1)):
                stage1_probs.append({
                    "label": self.stage1_id2label[i],
                    "probability": float(probs1[i].item()),
                    "is_predicted": i == pred1
                })
            
            # Standard fields for both threat and non-threat responses
            result = {
                "text": text,
                "predicted_class": label1,
                "threat": is_threat,
                "confidence": conf1,  # Primary confidence (for top-level class)
                "stage1_result": {
                    "predicted_class": label1,
                    "confidence": conf1,
                    "is_threat": is_threat
                },
                "stage1_breakdown": stage1_probs,
                "probabilities": {self.stage1_id2label[i]: float(probs1[i].item()) for i in range(len(probs1))},
                "visualization_data": {
                    "stage1": {
                        "labels": [self.stage1_id2label[i] for i in range(len(probs1))],
                        "values": [float(probs1[i].item()) for i in range(len(probs1))],
                        "predicted_index": int(pred1)
                    }
                },
                "stage": 1,
                "success": True
            }
            
            # If non-threat, return immediately
            if not is_threat:
                return result
                
            # Stage 2: Threat type
            inputs2 = self.stage2_tokenizer(
                text,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=self.stage2_max_length
            )
            with torch.no_grad():
                logits2 = self.stage2_model(**inputs2).logits
            probs2 = torch.nn.functional.softmax(logits2, dim=1)[0]
            pred2 = torch.argmax(probs2).item()
            label2 = self.stage2_id2label[str(pred2)] if isinstance(self.stage2_id2label, dict) and str(pred2) in self.stage2_id2label else self.stage2_id2label.get(pred2, str(pred2))
            conf2 = float(probs2[pred2].item())
            
            # Create stage 2 probabilities breakdown in visualization-friendly format
            stage2_probs = []
            stage2_probs_dict = {}
            for i in range(len(probs2)):
                label_key = str(i)
                label_value = self.stage2_id2label[label_key] if isinstance(self.stage2_id2label, dict) and label_key in self.stage2_id2label else self.stage2_id2label.get(i, str(i))
                stage2_probs.append({
                    "label": label_value,
                    "probability": float(probs2[i].item()),
                    "is_predicted": i == pred2
                })
                stage2_probs_dict[label_value] = float(probs2[i].item())
            
            # Update result with stage 2 information
            result.update({
                "predicted_class": label2,  # Override with specific threat class
                "confidence": conf2,  # Override with confidence of specific threat class
                "threat_type": label2,
                "threat_confidence": conf1,  # Confidence from stage 1
                "stage2_result": {
                    "predicted_class": label2,
                    "confidence": conf2,
                    "threat_type": label2
                },
                "stage2_breakdown": stage2_probs,
                "probabilities": stage2_probs_dict,  # Override with stage 2 probabilities
                "stage": 2,
                "hierarchical_classification": {
                    "is_threat": True,
                    "threat_confidence": conf1,
                    "threat_type": label2,
                    "type_confidence": conf2
                }
            })
            
            # Add stage 2 visualization data
            result["visualization_data"]["stage2"] = {
                "labels": [self.stage2_id2label[str(i)] if isinstance(self.stage2_id2label, dict) and str(i) in self.stage2_id2label else self.stage2_id2label.get(i, str(i)) for i in range(len(probs2))],
                "values": [float(probs2[i].item()) for i in range(len(probs2))],
                "predicted_index": int(pred2)
            }
            
            # Add overall classification flow visualization data
            result["visualization_data"]["hierarchical"] = {
                "stage1": {
                    "class": "Threat",
                    "confidence": conf1,
                    "leads_to_stage2": True
                },
                "stage2": {
                    "class": label2,
                    "confidence": conf2
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {"error": str(e), "success": False}

# Singleton instance
model_loader = TwoStageModelLoader() 