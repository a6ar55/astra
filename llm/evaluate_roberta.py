#!/usr/bin/env python3
"""
Evaluate RoBERTa PEFT model on threat detection dataset
"""
import os
import numpy as np
import pandas as pd
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    pipeline
)
from peft import PeftModel, PeftConfig
import json
import time
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    accuracy_score, 
    precision_recall_fscore_support
)
import matplotlib.pyplot as plt
import seaborn as sns

# Paths
ROBERTA_MODEL_PATH = "../models/roberta_peft_lora"
TEST_DATASET_PATH = "../111.csv"
OUTPUT_DIR = "../../roberta_evaluation_results"
MAX_LENGTH = 128

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

def evaluate_roberta():
    """Evaluate RoBERTa model on the test dataset"""
    print("Evaluating RoBERTa model on threat detection dataset")
    
    # Load test data
    print(f"Loading data from {TEST_DATASET_PATH}")
    df = pd.read_csv(TEST_DATASET_PATH)
    print(f"Loaded {len(df)} samples")
    
    # Process data
    if 'content' in df.columns and 'class' in df.columns:
        df = df.rename(columns={'content': 'text', 'class': 'label'})
    
    # Print distribution
    print("Label distribution:")
    for label, count in df['label'].value_counts().items():
        print(f"  {label}: {count}")
    
    # Define label mapping
    label_mapping = {
        "Child Safety Threats": 0,
        "Criminal Activity": 1,
        "Direct Violence Threats": 2,
        "Harassment and Intimidation": 3,
        "Hate Speech/Extremism": 4,
        "Non-threat/Neutral": 5
    }
    
    id2label = {v: k for k, v in label_mapping.items()}
    
    # Load the model and tokenizer using PEFT
    try:
        print(f"Loading PEFT model from {ROBERTA_MODEL_PATH}")
        
        # Load the PEFT configuration
        peft_config = PeftConfig.from_pretrained(ROBERTA_MODEL_PATH)
        print(f"Base model: {peft_config.base_model_name_or_path}")
        
        # Load base model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(peft_config.base_model_name_or_path)
        
        # Load base model
        base_model = AutoModelForSequenceClassification.from_pretrained(
            peft_config.base_model_name_or_path,
            num_labels=len(label_mapping),
            id2label=id2label,
            label2id=label_mapping
        )
        
        # Load the PEFT model
        model = PeftModel.from_pretrained(base_model, ROBERTA_MODEL_PATH)
        print("PEFT model loaded successfully")
    except Exception as e:
        print(f"Error loading PEFT model: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # Evaluate model
    print("\nRunning predictions...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()
    
    # Create pipeline
    try:
        classifier = pipeline(
            "text-classification",
            model=model,
            tokenizer=tokenizer,
            device=0 if device == "cuda" else -1
        )
        
        # Process in batches
        batch_size = 16
        predictions = []
        confidences = []
        true_labels = []
        texts = []
        
        start_time = time.time()
        
        for i in range(0, len(df), batch_size):
            batch_texts = df['text'][i:i+batch_size].tolist()
            texts.extend(batch_texts)
            
            # Get predictions
            try:
                batch_results = classifier(batch_texts)
                
                # Extract prediction labels and scores
                for result in batch_results:
                    label = result['label']
                    score = result['score']
                    
                    # Map to numeric label if needed
                    if label.startswith("LABEL_"):
                        label_id = int(label.split("_")[1])
                    else:
                        # Try to find in mapping
                        label_id = -1
                        for key, val in id2label.items():
                            if val in label:
                                label_id = key
                                break
                    
                    predictions.append(label_id)
                    confidences.append(score)
            except Exception as e:
                print(f"Error in batch prediction: {str(e)}")
                # Try using direct model inference
                inputs = tokenizer(
                    batch_texts, 
                    truncation=True, 
                    padding=True, 
                    return_tensors="pt",
                    max_length=MAX_LENGTH
                ).to(device)
                
                with torch.no_grad():
                    outputs = model(**inputs)
                
                batch_preds = torch.argmax(outputs.logits, dim=-1).cpu().tolist()
                batch_confidences = torch.softmax(outputs.logits, dim=-1).max(dim=-1).values.cpu().tolist()
                
                predictions.extend(batch_preds)
                confidences.extend(batch_confidences)
            
            # Get true labels
            batch_labels = df['label'][i:i+batch_size]
            for label in batch_labels:
                label_id = label_mapping.get(label, -1)
                true_labels.append(label_id)
            
            # Print progress
            if (i+batch_size) % 100 == 0 or (i+batch_size) >= len(df):
                print(f"Processed {min(i+batch_size, len(df))}/{len(df)} samples")
        
        # Calculate metrics
        inference_time = time.time() - start_time
        
        # Handle any mismatched lengths
        min_length = min(len(true_labels), len(predictions))
        true_labels = true_labels[:min_length]
        predictions = predictions[:min_length]
        
        # Calculate metrics
        accuracy = accuracy_score(true_labels, predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, predictions, average='weighted', zero_division=0
        )
        
        print(f"\nRoBERTa Evaluation Results:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1 Score: {f1:.4f}")
        print(f"  Inference time: {inference_time:.2f}s ({inference_time/len(df):.4f}s per sample)")
        
        # Generate confusion matrix
        cm = confusion_matrix(true_labels, predictions)
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=[id2label.get(i, f"Unknown-{i}") for i in range(len(id2label))],
            yticklabels=[id2label.get(i, f"Unknown-{i}") for i in range(len(id2label))]
        )
        plt.xlabel('Predicted')
        plt.ylabel('True')
        plt.title('RoBERTa Confusion Matrix')
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'roberta_confusion_matrix.png'))
        
        # Get classification report
        report = classification_report(
            true_labels,
            predictions,
            labels=list(id2label.keys()),
            target_names=list(id2label.values()),
            output_dict=True
        )
        
        # Save results
        results = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'inference_time': inference_time,
            'inference_time_per_sample': inference_time / len(df),
            'confusion_matrix': cm.tolist(),
            'classification_report': report
        }
        
        with open(os.path.join(OUTPUT_DIR, 'roberta_results.json'), 'w') as f:
            json.dump(results, f, indent=2)
            
        # Create detailed report comparing with DistilBERT
        # Load DistilBERT results
        try:
            with open('../../model_detailed_analysis/detailed_results.json', 'r') as f:
                distilbert_results = json.load(f)
                
            # Create comparison report
            with open(os.path.join(OUTPUT_DIR, 'model_comparison.txt'), 'w') as f:
                f.write("MODEL COMPARISON REPORT\n")
                f.write("======================\n\n")
                
                f.write(f"Test dataset: {TEST_DATASET_PATH}\n")
                f.write(f"Number of samples: {len(df)}\n\n")
                
                # Overall metrics comparison
                f.write("OVERALL METRICS\n")
                f.write("--------------\n\n")
                
                metrics = ['accuracy', 'precision', 'recall', 'f1']
                f.write(f"{'Metric':<15} {'DistilBERT':<15} {'RoBERTa':<15}\n")
                f.write(f"{'-'*45}\n")
                
                for metric in metrics:
                    distil_value = distilbert_results.get(metric, 'N/A')
                    roberta_value = results.get(metric, 'N/A')
                    
                    if isinstance(distil_value, float):
                        distil_value = f"{distil_value:.4f}"
                    if isinstance(roberta_value, float):
                        roberta_value = f"{roberta_value:.4f}"
                        
                    f.write(f"{metric:<15} {distil_value:<15} {roberta_value:<15}\n")
                
                # Inference time
                f.write(f"\n{'Inference time':<15} {distilbert_results.get('inference_time', 'N/A'):<15} {results.get('inference_time', 'N/A'):<15}\n")
                f.write(f"{'Time per sample':<15} {distilbert_results.get('inference_time_per_sample', 'N/A'):<15} {results.get('inference_time_per_sample', 'N/A'):<15}\n")
                
                # Per-class comparison
                f.write("\nPER-CLASS F1 SCORES\n")
                f.write("-----------------\n\n")
                
                distil_report = distilbert_results.get('classification_report', {})
                roberta_report = results.get('classification_report', {})
                
                # Find common classes
                distil_classes = {k for k in distil_report.keys() if k not in ('accuracy', 'macro avg', 'weighted avg')}
                roberta_classes = {k for k in roberta_report.keys() if k not in ('accuracy', 'macro avg', 'weighted avg')}
                
                common_classes = distil_classes & roberta_classes
                all_classes = distil_classes | roberta_classes
                
                f.write(f"{'Class':<25} {'DistilBERT':<15} {'RoBERTa':<15}\n")
                f.write(f"{'-'*55}\n")
                
                for cls in sorted(all_classes):
                    distil_f1 = distil_report.get(cls, {}).get('f1-score', 'N/A')
                    roberta_f1 = roberta_report.get(cls, {}).get('f1-score', 'N/A')
                    
                    if isinstance(distil_f1, float):
                        distil_f1 = f"{distil_f1:.4f}"
                    if isinstance(roberta_f1, float):
                        roberta_f1 = f"{roberta_f1:.4f}"
                        
                    f.write(f"{cls:<25} {distil_f1:<15} {roberta_f1:<15}\n")
                
                # Analysis
                f.write("\n\nANALYSIS\n")
                f.write("--------\n\n")
                
                # Compare accuracy
                distil_acc = distilbert_results.get('accuracy', 0)
                roberta_acc = results.get('accuracy', 0)
                
                if distil_acc > roberta_acc:
                    f.write(f"- DistilBERT outperforms RoBERTa in accuracy by {distil_acc - roberta_acc:.4f}\n")
                elif roberta_acc > distil_acc:
                    f.write(f"- RoBERTa outperforms DistilBERT in accuracy by {roberta_acc - distil_acc:.4f}\n")
                else:
                    f.write("- Both models have identical accuracy\n")
                
                # Compare F1
                distil_f1 = distilbert_results.get('f1', 0)
                roberta_f1 = results.get('f1', 0)
                
                if distil_f1 > roberta_f1:
                    f.write(f"- DistilBERT outperforms RoBERTa in F1 score by {distil_f1 - roberta_f1:.4f}\n")
                elif roberta_f1 > distil_f1:
                    f.write(f"- RoBERTa outperforms DistilBERT in F1 score by {roberta_f1 - distil_f1:.4f}\n")
                else:
                    f.write("- Both models have identical F1 scores\n")
                
                # Compare speed
                distil_time = distilbert_results.get('inference_time_per_sample', 0)
                roberta_time = results.get('inference_time_per_sample', 0)
                
                if distil_time < roberta_time:
                    speedup = roberta_time / distil_time if distil_time > 0 else float('inf')
                    f.write(f"- DistilBERT is {speedup:.2f}x faster than RoBERTa ({distil_time:.4f}s vs {roberta_time:.4f}s per sample)\n")
                else:
                    speedup = distil_time / roberta_time if roberta_time > 0 else float('inf')
                    f.write(f"- RoBERTa is {speedup:.2f}x faster than DistilBERT ({roberta_time:.4f}s vs {distil_time:.4f}s per sample)\n")
                
        except Exception as e:
            print(f"Error creating comparison report: {str(e)}")
    
    except Exception as e:
        print(f"Error evaluating model: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    evaluate_roberta() 