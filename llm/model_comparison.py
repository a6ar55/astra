#!/usr/bin/env python3
"""
Compare DistilBERT and RoBERTa PEFT models for threat detection
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
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    accuracy_score, 
    precision_recall_fscore_support
)
import matplotlib.pyplot as plt
import seaborn as sns
import json
import time

# Paths
DISTILBERT_MODEL_PATH = "../../models/best_model"  # path to the DistilBERT model
ROBERTA_PEFT_PATH = "../../models/roberta_peft_lora"  # path to the RoBERTa PEFT model
TEST_DATASET_PATH = "../111.csv"  # test dataset path
OUTPUT_DIR = "../../model_comparison_results"  # output directory for results
MAX_LENGTH = 128  # max sequence length for tokenization

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

class ModelEvaluator:
    def __init__(self):
        self.distilbert_model = None
        self.distilbert_tokenizer = None
        self.roberta_model = None 
        self.roberta_tokenizer = None
        self.roberta_label_mapping = None
        self.test_data = None
        self.results = {}

    def load_test_data(self):
        """Load and preprocess test data"""
        print(f"Loading test data from {TEST_DATASET_PATH}")
        
        df = pd.read_csv(TEST_DATASET_PATH)
        print(f"Test dataset loaded with {len(df)} samples")
        
        # Ensure required columns exist
        if 'content' in df.columns and 'class' in df.columns:
            df = df.rename(columns={'content': 'text', 'class': 'label'})
        elif not ('text' in df.columns and 'label' in df.columns):
            raise ValueError("Dataset must have 'text'/'content' and 'label'/'class' columns")
        
        # Clean data
        df = df.dropna(subset=['text', 'label'])
        df['text'] = df['text'].astype(str).str.strip()
        
        # Print label distribution
        label_counts = df['label'].value_counts()
        print("Label distribution:")
        for label, count in label_counts.items():
            print(f"  {label}: {count}")
            
        self.test_data = df
        return True

    def load_distilbert_model(self):
        """Load the DistilBERT model"""
        print(f"Loading DistilBERT model from {DISTILBERT_MODEL_PATH}")
        try:
            self.distilbert_tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_MODEL_PATH)
            self.distilbert_model = AutoModelForSequenceClassification.from_pretrained(DISTILBERT_MODEL_PATH)
            
            # Get label mapping
            if hasattr(self.distilbert_model.config, 'id2label'):
                self.distilbert_id2label = self.distilbert_model.config.id2label
                self.distilbert_label2id = self.distilbert_model.config.label2id
                print(f"DistilBERT label mapping: {self.distilbert_id2label}")
            else:
                # Try to find label mapping file
                try:
                    with open(os.path.join(DISTILBERT_MODEL_PATH, "label_mapping.json"), "r") as f:
                        mapping = json.load(f)
                        self.distilbert_id2label = {int(k): v for k, v in mapping.get("id2label", {}).items()}
                        self.distilbert_label2id = mapping.get("label2id", {})
                except:
                    print("Warning: Could not find label mapping for DistilBERT")
            
            return True
        except Exception as e:
            print(f"Error loading DistilBERT model: {str(e)}")
            return False

    def load_roberta_peft_model(self):
        """Load the RoBERTa PEFT model"""
        print(f"Loading RoBERTa PEFT model from {ROBERTA_PEFT_PATH}")
        try:
            # First try to load label mapping
            try:
                with open(os.path.join(ROBERTA_PEFT_PATH, "label_mapping.json"), "r") as f:
                    self.roberta_label_mapping = json.load(f)
                    print(f"RoBERTa label mapping loaded: {self.roberta_label_mapping}")
            except:
                print("Warning: Could not find separate label mapping for RoBERTa")
                
            # Load base model and tokenizer
            base_model_name = "unitary/unbiased-toxic-roberta"
            self.roberta_tokenizer = AutoTokenizer.from_pretrained(base_model_name)
            
            # Load config and get num_labels
            try:
                peft_config = PeftConfig.from_pretrained(ROBERTA_PEFT_PATH)
                base_model = AutoModelForSequenceClassification.from_pretrained(
                    base_model_name,
                    num_labels=6,  # We know we have 6 classes
                    ignore_mismatched_sizes=True,
                    problem_type="single_label_classification"
                )
                
                # Load PEFT model
                self.roberta_model = PeftModel.from_pretrained(base_model, ROBERTA_PEFT_PATH)
                
                # Get label mapping from model if not already loaded
                if not self.roberta_label_mapping:
                    if hasattr(self.roberta_model.config, 'id2label'):
                        self.roberta_id2label = self.roberta_model.config.id2label
                        self.roberta_label2id = self.roberta_model.config.label2id
                    else:
                        print("Warning: No label mapping found for RoBERTa, creating default mapping")
                        self.roberta_id2label = {
                            0: "Child Safety Threats",
                            1: "Criminal Activity", 
                            2: "Direct Violence Threats", 
                            3: "Harassment and Intimidation",
                            4: "Hate Speech/Extremism", 
                            5: "Non-threat/Neutral"
                        }
                        self.roberta_label2id = {v: k for k, v in self.roberta_id2label.items()}
                else:
                    self.roberta_id2label = {int(k): v for k, v in self.roberta_label_mapping["id2label"].items()}
                    self.roberta_label2id = self.roberta_label_mapping["label2id"]
                
                print("RoBERTa PEFT model loaded successfully")
                return True
                
            except Exception as e:
                print(f"Error loading RoBERTa PEFT model: {str(e)}")
                return False
                
        except Exception as e:
            print(f"Error loading RoBERTa PEFT model: {str(e)}")
            return False

    def evaluate_distilbert(self):
        """Evaluate DistilBERT model on test data"""
        print("\nEvaluating DistilBERT model...")
        
        # Put model in evaluation mode
        self.distilbert_model.eval()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.distilbert_model.to(device)
        
        # Create predictions
        predictions = []
        true_labels = []
        start_time = time.time()
        
        # Create pipeline
        classifier = pipeline(
            "text-classification", 
            model=self.distilbert_model, 
            tokenizer=self.distilbert_tokenizer,
            device=0 if device == "cuda" else -1
        )
        
        # Process in batches
        batch_size = 16
        for i in range(0, len(self.test_data), batch_size):
            batch = self.test_data['text'][i:i+batch_size].tolist()
            batch_results = classifier(batch)
            
            for result in batch_results:
                label = result['label']
                # Extract the numeric label from format like "LABEL_0"
                if label.startswith("LABEL_"):
                    label_id = int(label.split("_")[1])
                else:
                    # Try to map to ID
                    label_id = self.distilbert_label2id.get(label, -1)
                predictions.append(label_id)
            
            # Get true labels for this batch
            true_batch = self.test_data['label'][i:i+batch_size]
            for label in true_batch:
                # Try to map the string label to ID
                if label in self.distilbert_label2id:
                    true_labels.append(self.distilbert_label2id[label])
                else:
                    # If not found, try to find the closest match
                    matches = [l for l in self.distilbert_label2id.keys() if label in l or l in label]
                    if matches:
                        true_labels.append(self.distilbert_label2id[matches[0]])
                    else:
                        print(f"Warning: Could not map label '{label}' to ID")
                        true_labels.append(-1)
            
            # Print progress
            if (i+batch_size) % 100 == 0 or (i+batch_size) >= len(self.test_data):
                print(f"Processed {i+len(batch)}/{len(self.test_data)} samples")
        
        # Calculate metrics
        inference_time = time.time() - start_time
        accuracy = accuracy_score(true_labels, predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, predictions, average='weighted', zero_division=0
        )
        
        # Create confusion matrix
        cm = confusion_matrix(true_labels, predictions)
        
        # Get classification report
        unique_labels = sorted(set(true_labels + predictions))
        target_names = [self.distilbert_id2label.get(i, f"Unknown-{i}") for i in unique_labels]
        
        report = classification_report(
            true_labels, 
            predictions, 
            labels=unique_labels,
            target_names=target_names,
            output_dict=True,
            zero_division=0
        )
        
        # Store results
        self.results['distilbert'] = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'inference_time': inference_time,
            'inference_time_per_sample': inference_time / len(self.test_data),
            'confusion_matrix': cm.tolist(),
            'classification_report': report,
            'predictions': predictions,
            'true_labels': true_labels
        }
        
        print(f"DistilBERT Evaluation Results:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1 Score: {f1:.4f}")
        print(f"  Inference time: {inference_time:.2f}s ({inference_time/len(self.test_data):.4f}s per sample)")
        
        return True

    def evaluate_roberta_peft(self):
        """Evaluate RoBERTa PEFT model on test data"""
        print("\nEvaluating RoBERTa PEFT model...")
        
        # Put model in evaluation mode
        self.roberta_model.eval()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.roberta_model.to(device)
        
        # Create predictions
        predictions = []
        true_labels = []
        start_time = time.time()
        
        # Process in batches
        batch_size = 16
        for i in range(0, len(self.test_data), batch_size):
            batch = self.test_data['text'][i:i+batch_size].tolist()
            
            # Tokenize
            inputs = self.roberta_tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=MAX_LENGTH,
                return_tensors="pt"
            ).to(device)
            
            # Get predictions
            with torch.no_grad():
                outputs = self.roberta_model(**inputs)
                
            # Get predicted class IDs
            batch_predictions = outputs.logits.argmax(dim=-1).cpu().numpy()
            predictions.extend(batch_predictions.tolist())
            
            # Get true labels for this batch
            true_batch = self.test_data['label'][i:i+batch_size]
            for label in true_batch:
                # Try to map the string label to ID
                if label in self.roberta_label2id:
                    true_labels.append(self.roberta_label2id[label])
                else:
                    # If not found, try to find the closest match
                    matches = [l for l in self.roberta_label2id.keys() if label in l or l in label]
                    if matches:
                        true_labels.append(self.roberta_label2id[matches[0]])
                    else:
                        print(f"Warning: Could not map label '{label}' to ID")
                        true_labels.append(-1)
            
            # Print progress
            if (i+batch_size) % 100 == 0 or (i+batch_size) >= len(self.test_data):
                print(f"Processed {i+len(batch)}/{len(self.test_data)} samples")
        
        # Calculate metrics
        inference_time = time.time() - start_time
        accuracy = accuracy_score(true_labels, predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, predictions, average='weighted', zero_division=0
        )
        
        # Create confusion matrix
        cm = confusion_matrix(true_labels, predictions)
        
        # Get classification report
        unique_labels = sorted(set(true_labels + predictions))
        target_names = [self.roberta_id2label.get(i, f"Unknown-{i}") for i in unique_labels]
        
        report = classification_report(
            true_labels, 
            predictions, 
            labels=unique_labels,
            target_names=target_names,
            output_dict=True,
            zero_division=0
        )
        
        # Store results
        self.results['roberta_peft'] = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'inference_time': inference_time,
            'inference_time_per_sample': inference_time / len(self.test_data),
            'confusion_matrix': cm.tolist(),
            'classification_report': report,
            'predictions': predictions,
            'true_labels': true_labels
        }
        
        print(f"RoBERTa PEFT Evaluation Results:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1 Score: {f1:.4f}")
        print(f"  Inference time: {inference_time:.2f}s ({inference_time/len(self.test_data):.4f}s per sample)")
        
        return True

    def plot_confusion_matrices(self):
        """Plot confusion matrices for both models"""
        print("\nGenerating confusion matrix plots...")
        
        # Plot DistilBERT confusion matrix
        if 'distilbert' in self.results:
            plt.figure(figsize=(10, 8))
            sns.heatmap(
                self.results['distilbert']['confusion_matrix'],
                annot=True,
                fmt='d',
                cmap='Blues',
                xticklabels=[self.distilbert_id2label[i] for i in range(len(self.distilbert_id2label))],
                yticklabels=[self.distilbert_id2label[i] for i in range(len(self.distilbert_id2label))]
            )
            plt.xlabel('Predicted')
            plt.ylabel('True')
            plt.title('DistilBERT Confusion Matrix')
            plt.tight_layout()
            plt.savefig(os.path.join(OUTPUT_DIR, 'distilbert_confusion_matrix.png'))
            print(f"Saved DistilBERT confusion matrix to {os.path.join(OUTPUT_DIR, 'distilbert_confusion_matrix.png')}")
        
        # Plot RoBERTa confusion matrix
        if 'roberta_peft' in self.results:
            plt.figure(figsize=(10, 8))
            sns.heatmap(
                self.results['roberta_peft']['confusion_matrix'],
                annot=True,
                fmt='d',
                cmap='Blues',
                xticklabels=[self.roberta_id2label[i] for i in range(len(self.roberta_id2label))],
                yticklabels=[self.roberta_id2label[i] for i in range(len(self.roberta_id2label))]
            )
            plt.xlabel('Predicted')
            plt.ylabel('True')
            plt.title('RoBERTa PEFT Confusion Matrix')
            plt.tight_layout()
            plt.savefig(os.path.join(OUTPUT_DIR, 'roberta_peft_confusion_matrix.png'))
            print(f"Saved RoBERTa PEFT confusion matrix to {os.path.join(OUTPUT_DIR, 'roberta_peft_confusion_matrix.png')}")
        
        return True

    def plot_comparison_metrics(self):
        """Plot comparison metrics for both models"""
        print("\nGenerating comparison plots...")
        
        if 'distilbert' in self.results and 'roberta_peft' in self.results:
            # Compare overall metrics
            metrics = ['accuracy', 'precision', 'recall', 'f1']
            distilbert_values = [self.results['distilbert'][m] for m in metrics]
            roberta_values = [self.results['roberta_peft'][m] for m in metrics]
            
            plt.figure(figsize=(10, 6))
            x = range(len(metrics))
            width = 0.35
            
            plt.bar([i - width/2 for i in x], distilbert_values, width, label='DistilBERT')
            plt.bar([i + width/2 for i in x], roberta_values, width, label='RoBERTa PEFT')
            
            plt.xlabel('Metrics')
            plt.ylabel('Score')
            plt.title('Model Performance Comparison')
            plt.xticks(x, metrics)
            plt.legend()
            plt.tight_layout()
            plt.savefig(os.path.join(OUTPUT_DIR, 'model_comparison_metrics.png'))
            print(f"Saved model comparison plot to {os.path.join(OUTPUT_DIR, 'model_comparison_metrics.png')}")
            
            # Compare per-class F1 scores
            distilbert_f1 = {k: v['f1-score'] for k, v in self.results['distilbert']['classification_report'].items() 
                            if k not in ('accuracy', 'macro avg', 'weighted avg')}
            roberta_f1 = {k: v['f1-score'] for k, v in self.results['roberta_peft']['classification_report'].items()
                         if k not in ('accuracy', 'macro avg', 'weighted avg')}
            
            # Ensure the same classes are being compared
            common_classes = set(distilbert_f1.keys()) & set(roberta_f1.keys())
            
            if common_classes:
                plt.figure(figsize=(12, 6))
                
                sorted_classes = sorted(common_classes)
                distilbert_class_values = [distilbert_f1.get(cls, 0) for cls in sorted_classes]
                roberta_class_values = [roberta_f1.get(cls, 0) for cls in sorted_classes]
                
                x = range(len(sorted_classes))
                width = 0.35
                
                plt.bar([i - width/2 for i in x], distilbert_class_values, width, label='DistilBERT')
                plt.bar([i + width/2 for i in x], roberta_class_values, width, label='RoBERTa PEFT')
                
                plt.xlabel('Class')
                plt.ylabel('F1 Score')
                plt.title('Per-Class F1 Score Comparison')
                plt.xticks(x, sorted_classes, rotation=45, ha='right')
                plt.legend()
                plt.tight_layout()
                plt.savefig(os.path.join(OUTPUT_DIR, 'per_class_f1_comparison.png'))
                print(f"Saved per-class F1 comparison plot to {os.path.join(OUTPUT_DIR, 'per_class_f1_comparison.png')}")
            
        return True

    def save_results(self):
        """Save all results to disk"""
        print("\nSaving results...")
        
        # Save the results as JSON
        with open(os.path.join(OUTPUT_DIR, 'model_comparison_results.json'), 'w') as f:
            json.dump(self.results, f, indent=2)
        
        # Create a detailed report as text
        with open(os.path.join(OUTPUT_DIR, 'model_comparison_report.txt'), 'w') as f:
            f.write("MODEL COMPARISON REPORT\n")
            f.write("======================\n\n")
            
            # Dataset info
            f.write(f"Test dataset: {TEST_DATASET_PATH}\n")
            f.write(f"Number of samples: {len(self.test_data)}\n\n")
            
            # Overall metrics comparison
            f.write("OVERALL METRICS\n")
            f.write("--------------\n\n")
            
            metrics = ['accuracy', 'precision', 'recall', 'f1']
            f.write(f"{'Metric':<15} {'DistilBERT':<15} {'RoBERTa PEFT':<15}\n")
            f.write(f"{'-'*45}\n")
            
            for metric in metrics:
                distil_value = self.results.get('distilbert', {}).get(metric, 'N/A')
                roberta_value = self.results.get('roberta_peft', {}).get(metric, 'N/A')
                
                if isinstance(distil_value, float):
                    distil_value = f"{distil_value:.4f}"
                if isinstance(roberta_value, float):
                    roberta_value = f"{roberta_value:.4f}"
                    
                f.write(f"{metric:<15} {distil_value:<15} {roberta_value:<15}\n")
            
            # Inference time
            f.write(f"\n{'Inference time':<15} {self.results.get('distilbert', {}).get('inference_time', 'N/A'):<15} {self.results.get('roberta_peft', {}).get('inference_time', 'N/A'):<15}\n")
            f.write(f"{'Time per sample':<15} {self.results.get('distilbert', {}).get('inference_time_per_sample', 'N/A'):<15} {self.results.get('roberta_peft', {}).get('inference_time_per_sample', 'N/A'):<15}\n")
            
            # Detailed per-class metrics
            f.write("\nPER-CLASS METRICS\n")
            f.write("----------------\n\n")
            
            if 'distilbert' in self.results:
                f.write("DistilBERT:\n")
                report = self.results['distilbert'].get('classification_report', {})
                f.write(f"Classification report:\n")
                for cls in report:
                    if cls not in ('accuracy', 'macro avg', 'weighted avg'):
                        metrics = report[cls]
                        f.write(f"  {cls}: precision={metrics['precision']:.4f}, recall={metrics['recall']:.4f}, f1-score={metrics['f1-score']:.4f}\n")
                f.write(f"  Accuracy: {report.get('accuracy', 'N/A')}\n\n")
            
            if 'roberta_peft' in self.results:
                f.write("RoBERTa PEFT:\n")
                report = self.results['roberta_peft'].get('classification_report', {})
                f.write(f"Classification report:\n")
                for cls in report:
                    if cls not in ('accuracy', 'macro avg', 'weighted avg'):
                        metrics = report[cls]
                        f.write(f"  {cls}: precision={metrics['precision']:.4f}, recall={metrics['recall']:.4f}, f1-score={metrics['f1-score']:.4f}\n")
                f.write(f"  Accuracy: {report.get('accuracy', 'N/A')}\n\n")
            
            f.write("\n\nAnalysis:\n")
            
            # Add a simple analysis
            if 'distilbert' in self.results and 'roberta_peft' in self.results:
                distil_acc = self.results['distilbert']['accuracy']
                roberta_acc = self.results['roberta_peft']['accuracy']
                
                if distil_acc > roberta_acc:
                    f.write(f"- DistilBERT outperforms RoBERTa PEFT in overall accuracy by {(distil_acc - roberta_acc):.4f}\n")
                elif roberta_acc > distil_acc:
                    f.write(f"- RoBERTa PEFT outperforms DistilBERT in overall accuracy by {(roberta_acc - distil_acc):.4f}\n")
                else:
                    f.write("- Both models have identical overall accuracy\n")
                    
                # Compare F1 scores
                distil_f1 = self.results['distilbert']['f1']
                roberta_f1 = self.results['roberta_peft']['f1']
                
                if distil_f1 > roberta_f1:
                    f.write(f"- DistilBERT outperforms RoBERTa PEFT in F1 score by {(distil_f1 - roberta_f1):.4f}\n")
                elif roberta_f1 > distil_f1:
                    f.write(f"- RoBERTa PEFT outperforms DistilBERT in F1 score by {(roberta_f1 - distil_f1):.4f}\n")
                else:
                    f.write("- Both models have identical F1 scores\n")
                    
                # Compare inference time
                distil_time = self.results['distilbert']['inference_time_per_sample']
                roberta_time = self.results['roberta_peft']['inference_time_per_sample']
                
                if distil_time < roberta_time:
                    f.write(f"- DistilBERT is faster ({distil_time:.4f}s vs {roberta_time:.4f}s per sample)\n")
                else:
                    f.write(f"- RoBERTa PEFT is faster ({roberta_time:.4f}s vs {distil_time:.4f}s per sample)\n")
            
        print(f"Saved detailed report to {os.path.join(OUTPUT_DIR, 'model_comparison_report.txt')}")
        return True

def main():
    evaluator = ModelEvaluator()
    
    # Load test data
    if not evaluator.load_test_data():
        print("Failed to load test data. Exiting.")
        return
    
    # Load DistilBERT model
    if not evaluator.load_distilbert_model():
        print("Failed to load DistilBERT model. Skipping evaluation.")
    else:
        # Evaluate DistilBERT
        evaluator.evaluate_distilbert()
    
    # Load RoBERTa PEFT model
    if not evaluator.load_roberta_peft_model():
        print("Failed to load RoBERTa PEFT model. Skipping evaluation.")
    else:
        # Evaluate RoBERTa PEFT
        evaluator.evaluate_roberta_peft()
    
    # Plot results and save
    if 'distilbert' in evaluator.results or 'roberta_peft' in evaluator.results:
        evaluator.plot_confusion_matrices()
        evaluator.plot_comparison_metrics()
        evaluator.save_results()
        print(f"\nResults saved to {OUTPUT_DIR}")
    else:
        print("No evaluation results to save.")

if __name__ == "__main__":
    main() 