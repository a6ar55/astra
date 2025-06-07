#!/usr/bin/env python3
import os
import sys
import json
import torch
import numpy as np
import argparse
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, List, Any, Tuple, Union

def parse_args():
    parser = argparse.ArgumentParser(description="Make predictions with the threat detection model")
    parser.add_argument("--model_path", type=str, default="../models/best_model.pt", 
                        help="Path to the saved model file")
    parser.add_argument("--text", type=str, help="Text to classify")
    parser.add_argument("--file", type=str, help="File with text to classify (one text per line)")
    return parser.parse_args()

def load_model(model_path: str) -> Tuple[torch.nn.Module, AutoTokenizer, Dict[int, str], int]:
    """
    Load the pre-trained model from a saved file
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    # Load the saved model data
    checkpoint = torch.load(model_path, map_location=torch.device('cpu'))
    
    # Extract model information
    model_name = checkpoint.get("model_name", "distilbert-base-uncased")
    max_length = checkpoint.get("max_length", 128)
    id2label = checkpoint.get("id2label", {})
    label2id = checkpoint.get("label2id", {})
    
    # Convert string keys back to integers if needed
    if all(isinstance(k, str) for k in id2label.keys()):
        id2label = {int(k): v for k, v in id2label.items()}
    
    # Initialize model and tokenizer
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(id2label),
        id2label=id2label,
        label2id=label2id
    )
    
    # Load trained weights
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()  # Set model to evaluation mode
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    return model, tokenizer, id2label, max_length

def predict(text: str, model, tokenizer, id2label: Dict[int, str], max_length: int) -> Dict[str, Any]:
    """
    Make a prediction on the input text
    """
    # Tokenize the input text
    inputs = tokenizer(
        text,
        return_tensors="pt",
        padding="max_length",
        truncation=True,
        max_length=max_length
    )
    
    # Make prediction
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
    
    # Convert logits to probabilities
    probabilities = torch.nn.functional.softmax(logits, dim=1)[0]
    
    # Get the predicted class
    predicted_class_id = torch.argmax(probabilities).item()
    predicted_label = id2label[predicted_class_id]
    
    # Create result dictionary with all class probabilities
    result = {
        "text": text,
        "predicted_class": predicted_label,
        "confidence": probabilities[predicted_class_id].item(),
        "probabilities": {id2label[i]: prob.item() for i, prob in enumerate(probabilities)}
    }
    
    return result

def batch_predict(texts: List[str], model, tokenizer, id2label: Dict[int, str], max_length: int, batch_size: int = 8) -> List[Dict[str, Any]]:
    """
    Make predictions on a batch of texts
    """
    results = []
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]
        
        # Tokenize the batch
        inputs = tokenizer(
            batch_texts,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=max_length
        )
        
        # Make predictions
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
        
        # Convert logits to probabilities
        probabilities = torch.nn.functional.softmax(logits, dim=1)
        
        # Get the predicted class for each text in the batch
        predicted_class_ids = torch.argmax(probabilities, dim=1)
        
        # Build results for the batch
        for j, (text, pred_id, probs) in enumerate(zip(batch_texts, predicted_class_ids, probabilities)):
            predicted_label = id2label[pred_id.item()]
            
            result = {
                "text": text,
                "predicted_class": predicted_label,
                "confidence": probs[pred_id].item(),
                "probabilities": {id2label[k]: prob.item() for k, prob in enumerate(probs)}
            }
            
            results.append(result)
    
    return results

def main():
    args = parse_args()
    
    if not args.text and not args.file:
        print("Error: Either --text or --file must be provided.")
        sys.exit(1)
    
    # Load model
    try:
        model, tokenizer, id2label, max_length = load_model(args.model_path)
        print(f"Model loaded from {args.model_path}")
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)
    
    # Make prediction(s)
    if args.text:
        # Single text prediction
        result = predict(args.text, model, tokenizer, id2label, max_length)
        
        # Print the result
        print(f"Prediction for text: \"{args.text[:50]}{'...' if len(args.text) > 50 else ''}\"")
        print(f"  Predicted class: {result['predicted_class']}")
        print(f"  Confidence: {result['confidence']:.4f}")
        print("\nProbabilities for all classes:")
        for label, prob in sorted(result['probabilities'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {label}: {prob:.4f}")
            
    elif args.file:
        # Batch prediction from file
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                texts = [line.strip() for line in f if line.strip()]
        except Exception as e:
            print(f"Error reading file {args.file}: {e}")
            sys.exit(1)
        
        if not texts:
            print("No texts found in the input file.")
            sys.exit(1)
        
        print(f"Making predictions on {len(texts)} texts...")
        results = batch_predict(texts, model, tokenizer, id2label, max_length)
        
        # Print summary
        print("\nPrediction results:")
        for i, result in enumerate(results):
            text_preview = result['text'][:50] + ('...' if len(result['text']) > 50 else '')
            print(f"{i+1}. \"{text_preview}\"")
            print(f"   Class: {result['predicted_class']}")
            print(f"   Confidence: {result['confidence']:.4f}")
        
        # Ask if detailed results should be saved
        save_path = args.file + ".predictions.json"
        print(f"\nDetailed results will be saved to: {save_path}")
        
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
            
        print(f"Detailed results saved to {save_path}")

if __name__ == "__main__":
    main() 