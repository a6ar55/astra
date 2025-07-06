import torch
import torch.nn as nn
import pickle
import json
import os
from transformers import BertTokenizer, BertModel, BertConfig
import logging

logger = logging.getLogger(__name__)

class OptimizedBertModel(nn.Module):
    """Optimized BERT model for threat detection - EXACT match to training code"""
    
    def __init__(self, model_name, num_classes, dropout=0.3):
        super(OptimizedBertModel, self).__init__()
        
        # Create BERT architecture based on model name without downloading pretrained weights
        if model_name == 'bert-large-uncased':
            config = BertConfig(
                vocab_size=30522,
                hidden_size=1024,
                num_hidden_layers=24,
                num_attention_heads=16,
                intermediate_size=4096,
                max_position_embeddings=512,
                type_vocab_size=2,
                hidden_dropout_prob=0.1,
                attention_probs_dropout_prob=0.1
            )
        else:
            # Default BERT-base config
            config = BertConfig(
                vocab_size=30522,
                hidden_size=768,
                num_hidden_layers=12,
                num_attention_heads=12,
                intermediate_size=3072,
                max_position_embeddings=512,
                type_vocab_size=2,
                hidden_dropout_prob=0.1,
                attention_probs_dropout_prob=0.1
            )
        
        # Initialize BERT with the config (no pretrained weights)
        self.bert = BertModel(config)
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(self.bert.config.hidden_size, num_classes)
        
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        return logits

class OptimizedThreatPredictor:
    """Optimized inference class for threat detection - EXACT match to training code"""
    
    def __init__(self, model_path='optimized_threat_detection_model.pth', 
                 tokenizer_path='optimized_threat_detection_tokenizer',
                 label_encoder_path='optimized_label_encoder.pkl'):
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')
        logger.info(f"🔧 Using device: {self.device}")
        
        try:
            # Load model checkpoint
            logger.info(f"📥 Loading model checkpoint from: {model_path}")
            checkpoint = torch.load(model_path, map_location=self.device)
            self.model_config = checkpoint['model_config']
            logger.info(f"📋 Model config: {self.model_config}")
            
            # Initialize model with EXACT same architecture as training
            logger.info(f"🏗️ Initializing model architecture: {self.model_config['model_name']}")
            self.model = OptimizedBertModel(
                self.model_config['model_name'], 
                self.model_config['num_classes']
            ).to(self.device)
            
            # Load the trained weights (with strict=False to handle version differences)
            logger.info("⚡ Loading trained model weights...")
            missing_keys, unexpected_keys = self.model.load_state_dict(checkpoint['model_state_dict'], strict=False)
            
            if missing_keys:
                logger.warning(f"⚠️ Missing keys in state dict: {missing_keys}")
            if unexpected_keys:
                logger.warning(f"⚠️ Unexpected keys in state dict (ignoring): {unexpected_keys}")
            
            self.model.eval()
            logger.info("✅ Model weights loaded successfully")
            
            # Load tokenizer - try saved first, fallback to model name
            logger.info(f"🔤 Loading tokenizer...")
            try:
                if os.path.exists(tokenizer_path):
                    self.tokenizer = BertTokenizer.from_pretrained(tokenizer_path)
                    logger.info(f"✅ Loaded tokenizer from: {tokenizer_path}")
                else:
                    # Use the same tokenizer as the model was trained with
                    self.tokenizer = BertTokenizer.from_pretrained(self.model_config['model_name'])
                    logger.info(f"✅ Loaded tokenizer for: {self.model_config['model_name']}")
            except Exception as tokenizer_error:
                logger.warning(f"⚠️ Could not load model tokenizer: {tokenizer_error}")
                # Fallback to smaller model
                self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
                logger.info("✅ Loaded fallback bert-base-uncased tokenizer")
            
            # Load label encoder - try saved first, fallback to label mapping
            logger.info(f"🏷️ Loading label classes...")
            try:
                if os.path.exists(label_encoder_path):
                    with open(label_encoder_path, 'rb') as f:
                        self.label_encoder = pickle.load(f)
                    logger.info(f"✅ Label encoder loaded with classes: {self.label_encoder.classes_}")
                else:
                    # Try to load from label_mapping.json in best_model directory
                    base_dir = os.path.dirname(model_path)
                    label_mapping_path = os.path.join(base_dir, 'best_model', 'label_mapping.json')
                    
                    if os.path.exists(label_mapping_path):
                        with open(label_mapping_path, 'r') as f:
                            label_data = json.load(f)
                        # Create a simple label encoder from the mapping
                        self.label_classes = [label_data['id2label'][str(i)] for i in range(len(label_data['id2label']))]
                        logger.info(f"✅ Loaded label mapping: {self.label_classes}")
                    else:
                        # Final fallback - create based on number of classes
                        self.label_classes = [
                            "Child Safety Threats", "Criminal Activity", "Direct Violence Threats",
                            "Harassment and Intimidation", "Hate Speech", "Hate Speech/Extremism",
                            "Non-threat/Neutral"
                        ][:self.model_config['num_classes']]
                        logger.warning(f"⚠️ Using fallback labels: {self.label_classes}")
                    
                    # Create a mock label encoder
                    self.label_encoder = None
            except Exception as label_error:
                logger.warning(f"⚠️ Could not load labels: {label_error}")
                # Final fallback
                self.label_classes = [f"Class_{i}" for i in range(self.model_config['num_classes'])]
                self.label_encoder = None
                logger.info(f"✅ Using generic labels: {self.label_classes}")
            
            logger.info("🎉 Astra model initialization complete!")
            
        except Exception as e:
            logger.error(f"❌ Error initializing Astra model: {str(e)}")
            raise

    def predict(self, text, return_probabilities=False):
        """Predict threat class for given text - EXACT match to training code"""
        try:
            logger.info(f"🔍 Predicting for text: {text[:100]}...")
            
            # Tokenize exactly as in training
            encoding = self.tokenizer(
                text,
                truncation=True,
                padding='max_length',
                max_length=self.model_config['max_length'],
                return_tensors='pt'
            )
            
            input_ids = encoding['input_ids'].to(self.device)
            attention_mask = encoding['attention_mask'].to(self.device)
            
            with torch.no_grad():
                outputs = self.model(input_ids, attention_mask)
                probabilities = torch.softmax(outputs, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
            
            # Get predicted label
            if self.label_encoder is not None:
                predicted_label = self.label_encoder.inverse_transform([predicted_class])[0]
            else:
                predicted_label = self.label_classes[predicted_class]
            
            confidence = probabilities[0][predicted_class].item()
            
            logger.info(f"✅ Prediction: {predicted_label} (confidence: {confidence:.3f})")
            
            if return_probabilities:
                if self.label_encoder is not None:
                    prob_dict = {
                        self.label_encoder.inverse_transform([i])[0]: prob.item() 
                        for i, prob in enumerate(probabilities[0])
                    }
                else:
                    prob_dict = {
                        self.label_classes[i]: prob.item() 
                        for i, prob in enumerate(probabilities[0])
                    }
                return predicted_label, prob_dict
            
            return predicted_label, confidence
            
        except Exception as e:
            logger.error(f"❌ Error during prediction: {str(e)}")
            raise

    def is_threat(self, predicted_label):
        """Determine if the predicted label represents a threat"""
        # Add logic to determine what labels are threats vs non-threats
        # This depends on your label classes
        non_threat_labels = ['Non-threat/Neutral', 'Normal', 'Safe']  # Adjust based on your actual labels
        return predicted_label not in non_threat_labels
        
    def get_available_classes(self):
        """Get list of available threat classes"""
        if self.label_encoder is not None:
            return self.label_encoder.classes_.tolist()
        else:
            return self.label_classes 