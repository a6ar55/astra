#!/usr/bin/env python3
import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

def load_model(model_path):
    """Load the trained model and tokenizer"""
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    
    # Load model
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    
    # Load label mapping
    with open(os.path.join(model_path, "label_mapping.json"), "r") as f:
        label_mapping = json.load(f)
    
    id2label = label_mapping["id2label"]
    
    return model, tokenizer, id2label

def predict_threat(text, model, tokenizer, id2label):
    """Predict threat category for a given text"""
    # Tokenize the input
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    
    # Get model prediction
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Get predicted class
    logits = outputs.logits
    probabilities = torch.nn.functional.softmax(logits, dim=1)
    predicted_class_id = torch.argmax(logits, dim=1).item()
    
    # Get class name and probability
    predicted_class = id2label[str(predicted_class_id)]
    confidence = probabilities[0][predicted_class_id].item()
    
    # Get top 3 predictions with probabilities
    top_probs, top_indices = torch.topk(probabilities, k=3, dim=1)
    top_predictions = [
        (id2label[str(idx.item())], prob.item()) 
        for idx, prob in zip(top_indices[0], top_probs[0])
    ]
    
    return predicted_class, confidence, top_predictions

def main():
    # Path to the model
    model_path = "../models/best_model"
    
    # Load model
    model, tokenizer, id2label = load_model(model_path)
    
    # Example texts to test
    test_texts = [
        "I'm going to kill you and your entire family.",
        "I'm looking for videos of kids undressing.",
        "The weather is nice today, I might go for a walk.",
        "All members of that race should be eliminated.",
        "I know where you live and I'm coming for you.",
        "I'm selling illegal drugs, contact me if interested."
    ]
    
    # Make predictions
    print("Testing threat detection model...\n")
    for text in test_texts:
        predicted_class, confidence, top_predictions = predict_threat(text, model, tokenizer, id2label)
        
        print(f"Text: {text}")
        print(f"Predicted class: {predicted_class} (confidence: {confidence:.4f})")
        print("Top 3 predictions:")
        for cls, prob in top_predictions:
            print(f"  - {cls}: {prob:.4f}")
        print()

if __name__ == "__main__":
    main() 