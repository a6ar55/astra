#!/usr/bin/env python3
"""
Model Manager for Threat Detection System

This script allows users to choose between the existing fine-tuned DistilBERT model
and the PEFT fine-tuned RoBERTa model.
"""
import os
import sys
import json
import torch
import logging
from pathlib import Path
import numpy as np
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    pipeline
)
from peft import PeftModel

# Add parent directory to path for importing existing model loader
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.model_loader import TwoStageModelLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("model_selection.log")
    ]
)
logger = logging.getLogger(__name__)

# Path definitions
PROJECT_ROOT = Path(__file__).parent.parent.parent
DISTILBERT_STAGE1_PATH = PROJECT_ROOT / "models" / "stage1_bin" / "checkpoint-1772"
DISTILBERT_STAGE2_PATH = PROJECT_ROOT / "models" / "stage2_multi" / "checkpoint-1296"
ROBERTA_PATH = PROJECT_ROOT / "models" / "roberta_peft_lora"

class ModelManager:
    def __init__(self):
        self.model_options = {
            1: "DistilBERT (pre-trained two-stage model)",
            2: "RoBERTa (PEFT fine-tuned model)"
        }
        self.selected_model_type = None
        self.model = None
        self.tokenizer = None
        self.distilbert_loader = None
        self.roberta_id2label = None
        self.roberta_label2id = None
        
        # Display welcome message
        self.display_welcome()
        
    def display_welcome(self):
        """Display welcome message and options"""
        print("\n" + "=" * 60)
        print("THREAT DETECTION MODEL SELECTION SYSTEM")
        print("=" * 60)
        print("\nThis system allows you to choose between two threat detection models:")
        print("  1) DistilBERT: Pre-trained two-stage hierarchical model")
        print("     - Stage 1: Binary threat/non-threat classifier")
        print("     - Stage 2: Multi-class threat type classifier")
        print("\n  2) RoBERTa: PEFT (LoRA) fine-tuned model")
        print("     - Based on unitary/unbiased-toxic-roberta")
        print("     - Fine-tuned with LoRA (rank=16, alpha=32)")
        print("\nBoth models support the following threat classes:")
        print("  - Child Safety Threats")
        print("  - Criminal Activity")
        print("  - Direct Violence Threats")
        print("  - Harassment and Intimidation")
        print("  - Hate Speech/Extremism")
        print("=" * 60 + "\n")

    def display_model_selection(self):
        """Display model selection menu"""
        print("\nAvailable models:")
        for key, value in self.model_options.items():
            print(f"{key}) {value}")
        
    def select_model(self):
        """Let user select a model"""
        self.display_model_selection()
        
        while True:
            try:
                choice = int(input("\nSelect model (1-2): "))
                if choice in self.model_options:
                    self.selected_model_type = choice
                    print(f"Selected: {self.model_options[choice]}")
                    break
                else:
                    print("Invalid choice. Please select 1 or 2.")
            except ValueError:
                print("Please enter a number.")
        
        # Load the selected model
        if self.selected_model_type == 1:
            self.load_distilbert_model()
        else:
            self.load_roberta_model()
    
    def load_distilbert_model(self):
        """Load the existing DistilBERT model"""
        try:
            print("\nLoading DistilBERT model...")
            self.distilbert_loader = TwoStageModelLoader()
            
            # Check if model paths exist
            if not DISTILBERT_STAGE1_PATH.exists():
                print(f"Error: Stage 1 model path not found at {DISTILBERT_STAGE1_PATH}")
                return False
            
            if not DISTILBERT_STAGE2_PATH.exists():
                print(f"Error: Stage 2 model path not found at {DISTILBERT_STAGE2_PATH}")
                return False
            
            # Load both stages
            success = self.distilbert_loader.load_models(
                str(DISTILBERT_STAGE1_PATH),
                str(DISTILBERT_STAGE2_PATH)
            )
            
            if success:
                print("DistilBERT two-stage model loaded successfully!")
                return True
            else:
                print("Failed to load DistilBERT model.")
                return False
        
        except Exception as e:
            print(f"Error loading DistilBERT model: {str(e)}")
            return False
    
    def load_roberta_model(self):
        """Load the PEFT fine-tuned RoBERTa model"""
        try:
            print("\nLoading RoBERTa PEFT model...")
            
            # Check if model path exists
            if not ROBERTA_PATH.exists():
                print("RoBERTa model not found. Would you like to:")
                print("1) Train it now")
                print("2) Exit")
                
                choice = input("Select option (1-2): ")
                if choice == "1":
                    self.train_roberta_model()
                else:
                    return False
                
                # Recheck if model exists after training attempt
                if not ROBERTA_PATH.exists():
                    print("RoBERTa model not found even after training attempt. Exiting.")
                    return False
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(ROBERTA_PATH)
            
            # Load label mappings
            label_mapping_path = ROBERTA_PATH / "label_mapping.json"
            if label_mapping_path.exists():
                with open(label_mapping_path, "r") as f:
                    label_mapping = json.load(f)
                    self.roberta_id2label = label_mapping.get("id2label")
                    self.roberta_label2id = label_mapping.get("label2id")
            else:
                print("Label mapping not found. Using default mapping.")
                # Default mapping
                labels = ["Child Safety Threats", "Criminal Activity", "Direct Violence Threats", 
                         "Harassment and Intimidation", "Hate Speech/Extremism"]
                self.roberta_id2label = {i: label for i, label in enumerate(labels)}
                self.roberta_label2id = {label: i for i, label in enumerate(labels)}
            
            # Convert string keys to integers if needed
            if all(isinstance(k, str) for k in self.roberta_id2label.keys()):
                self.roberta_id2label = {int(k): v for k, v in self.roberta_id2label.items()}
            
            # Load base model
            base_model = AutoModelForSequenceClassification.from_pretrained(
                "unitary/unbiased-toxic-roberta",
                num_labels=len(self.roberta_label2id),
                id2label=self.roberta_id2label,
                label2id=self.roberta_label2id
            )
            
            # Load PEFT model
            self.model = PeftModel.from_pretrained(base_model, ROBERTA_PATH)
            print("RoBERTa PEFT model loaded successfully!")
            return True
        
        except Exception as e:
            print(f"Error loading RoBERTa model: {str(e)}")
            return False
    
    def train_roberta_model(self):
        """Train the RoBERTa model with PEFT"""
        try:
            print("\nTraining RoBERTa model with PEFT...")
            
            # Use subprocess to run the training script
            import subprocess
            training_script = os.path.join(os.path.dirname(__file__), "peft_train_roberta.py")
            
            if os.path.exists(training_script):
                print(f"Running training script: {training_script}")
                result = subprocess.run(
                    [sys.executable, training_script],
                    capture_output=True, 
                    text=True
                )
                
                # Print output
                print("\nTraining Output:")
                print(result.stdout)
                
                if result.returncode != 0:
                    print("\nTraining Error:")
                    print(result.stderr)
                    print("Training failed. Please check the error message above.")
                    return False
                else:
                    print("Training completed successfully!")
                    return True
            else:
                print(f"Training script not found: {training_script}")
                return False
                
        except Exception as e:
            print(f"Error during training: {str(e)}")
            return False
    
    def predict(self, text):
        """Make a prediction using the selected model"""
        if self.selected_model_type == 1:
            return self.predict_with_distilbert(text)
        else:
            return self.predict_with_roberta(text)
    
    def predict_with_distilbert(self, text):
        """Make a prediction using the DistilBERT model"""
        if not self.distilbert_loader:
            print("DistilBERT model not loaded.")
            return None
        
        result = self.distilbert_loader.predict(text)
        return result
    
    def predict_with_roberta(self, text):
        """Make a prediction using the RoBERTa model"""
        if not self.model or not self.tokenizer:
            print("RoBERTa model not loaded.")
            return None
        
        # Tokenize input text
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=128
        )
        
        # Get prediction
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
        
        # Get probabilities
        probabilities = torch.nn.functional.softmax(logits, dim=1)[0]
        
        # Get predicted class
        predicted_class_id = torch.argmax(logits, dim=1).item()
        predicted_class = self.roberta_id2label[predicted_class_id]
        confidence = probabilities[predicted_class_id].item()
        
        # Create result in similar format to DistilBERT for consistency
        result = {
            "text": text,
            "predicted_class": predicted_class,
            "confidence": confidence,
            "probabilities": {self.roberta_id2label[i]: prob.item() for i, prob in enumerate(probabilities)},
            "success": True
        }
        
        return result
    
    def interactive_mode(self):
        """Run interactive prediction mode"""
        if (self.selected_model_type == 1 and not self.distilbert_loader) or \
           (self.selected_model_type == 2 and (not self.model or not self.tokenizer)):
            print("No model loaded. Please select a model first.")
            return
        
        print("\n" + "=" * 60)
        print("INTERACTIVE PREDICTION MODE")
        print("=" * 60)
        print("Type 'exit' to quit.")
        
        while True:
            text = input("\nEnter text to analyze: ")
            
            if text.lower() == 'exit':
                break
            
            if not text.strip():
                print("Please enter some text.")
                continue
            
            result = self.predict(text)
            
            if result and result.get("success", False):
                print("\nPREDICTION RESULT:")
                print(f"Class: {result['predicted_class']}")
                print(f"Confidence: {result['confidence']:.4f}")
                
                print("\nClass Probabilities:")
                for label, prob in sorted(result['probabilities'].items(), key=lambda x: x[1], reverse=True):
                    print(f"  {label}: {prob:.4f}")
            else:
                print("Error making prediction.")
    
    def compare_models(self, text):
        """Compare predictions from both models"""
        print("\n" + "=" * 60)
        print("MODEL COMPARISON")
        print("=" * 60)
        
        # Load both models if needed
        if not self.distilbert_loader:
            print("Loading DistilBERT model for comparison...")
            self.load_distilbert_model()
        
        if not self.model or not self.tokenizer:
            print("Loading RoBERTa model for comparison...")
            self.load_roberta_model()
        
        # Make predictions
        print("\nAnalyzing with both models...")
        distilbert_result = self.predict_with_distilbert(text)
        roberta_result = self.predict_with_roberta(text)
        
        # Display results
        print("\nCOMPARISON RESULTS:")
        print(f"Text: {text}")
        
        print("\nDistilBERT prediction:")
        if distilbert_result and distilbert_result.get("success", False):
            if distilbert_result.get("threat", False):
                print(f"  Class: {distilbert_result.get('predicted_class')}")
                print(f"  Confidence: {distilbert_result.get('confidence', 0):.4f}")
                print(f"  Initial threat assessment: {distilbert_result.get('stage1_result', {}).get('is_threat')}")
            else:
                print(f"  Class: {distilbert_result.get('predicted_class')} (Non-threat)")
                print(f"  Confidence: {distilbert_result.get('confidence', 0):.4f}")
        else:
            print("  Error making prediction.")
        
        print("\nRoBERTa prediction:")
        if roberta_result and roberta_result.get("success", False):
            print(f"  Class: {roberta_result.get('predicted_class')}")
            print(f"  Confidence: {roberta_result.get('confidence', 0):.4f}")
        else:
            print("  Error making prediction.")
        
        print("\nAgreement analysis:")
        if distilbert_result and roberta_result and \
           distilbert_result.get("success", False) and roberta_result.get("success", False):
            # For DistilBERT, use the final predicted_class
            distilbert_class = distilbert_result.get("predicted_class", "")
            roberta_class = roberta_result.get("predicted_class", "")
            
            if distilbert_class == roberta_class:
                print(f"  ✓ Both models agree: {distilbert_class}")
            else:
                print(f"  ✗ Models disagree:")
                print(f"    - DistilBERT: {distilbert_class}")
                print(f"    - RoBERTa: {roberta_class}")
        else:
            print("  Cannot compare due to prediction errors.")

def main():
    manager = ModelManager()
    
    while True:
        print("\n" + "=" * 60)
        print("MAIN MENU")
        print("=" * 60)
        print("1) Select model")
        print("2) Interactive prediction")
        print("3) Compare models on sample text")
        print("4) Exit")
        
        try:
            choice = int(input("\nSelect option (1-4): "))
            
            if choice == 1:
                manager.select_model()
            elif choice == 2:
                if manager.selected_model_type is None:
                    print("Please select a model first (option 1).")
                else:
                    manager.interactive_mode()
            elif choice == 3:
                text = input("\nEnter text to compare: ")
                if text.strip():
                    manager.compare_models(text)
                else:
                    print("Please enter some text.")
            elif choice == 4:
                print("\nExiting. Thank you for using the Threat Detection System!\n")
                break
            else:
                print("Invalid option. Please select 1-4.")
        except ValueError:
            print("Please enter a number.")

if __name__ == "__main__":
    main() 