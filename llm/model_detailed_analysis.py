#!/usr/bin/env python3
"""
Detailed analysis of DistilBERT model performance on threat detection
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
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    accuracy_score, 
    precision_recall_fscore_support,
    ConfusionMatrixDisplay
)
import matplotlib.pyplot as plt
import seaborn as sns
import json
import time
from collections import Counter

# Paths
DISTILBERT_MODEL_PATH = "../../models/best_model"  # path to the DistilBERT model
TEST_DATASET_PATH = "../111.csv"  # test dataset path
OUTPUT_DIR = "../../model_detailed_analysis"  # output directory for results
MAX_LENGTH = 128  # max sequence length for tokenization

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

class ModelAnalyzer:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.id2label = None
        self.label2id = None
        self.test_data = None
        self.results = {}
        self.predictions = None
        self.true_labels = None
        self.predicted_labels = None
        self.text_samples = None
        
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
        
    def load_model(self):
        """Load the model"""
        print(f"Loading model from {DISTILBERT_MODEL_PATH}")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_MODEL_PATH)
            self.model = AutoModelForSequenceClassification.from_pretrained(DISTILBERT_MODEL_PATH)
            
            # Get label mapping
            if hasattr(self.model.config, 'id2label'):
                self.id2label = self.model.config.id2label
                self.label2id = self.model.config.label2id
                print(f"Label mapping: {self.id2label}")
            else:
                # Try to find label mapping file
                try:
                    with open(os.path.join(DISTILBERT_MODEL_PATH, "label_mapping.json"), "r") as f:
                        mapping = json.load(f)
                        self.id2label = {int(k): v for k, v in mapping.get("id2label", {}).items()}
                        self.label2id = mapping.get("label2id", {})
                except:
                    print("Warning: Could not find label mapping for model")
            
            return True
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return False
    
    def evaluate(self):
        """Evaluate model on test data"""
        print("\nEvaluating model...")
        
        # Put model in evaluation mode
        self.model.eval()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(device)
        
        # Create predictions
        predictions = []
        true_labels = []
        start_time = time.time()
        self.text_samples = []
        
        # Create pipeline
        classifier = pipeline(
            "text-classification", 
            model=self.model, 
            tokenizer=self.tokenizer,
            device=0 if device == "cuda" else -1
        )
        
        # Process in batches
        batch_size = 16
        for i in range(0, len(self.test_data), batch_size):
            batch = self.test_data['text'][i:i+batch_size].tolist()
            self.text_samples.extend(batch)
            batch_results = classifier(batch)
            
            for result in batch_results:
                label = result['label']
                score = result['score']
                
                # Extract the numeric label from format like "LABEL_0"
                if label.startswith("LABEL_"):
                    label_id = int(label.split("_")[1])
                else:
                    # Try to map to ID
                    label_id = self.label2id.get(label, -1)
                predictions.append((label_id, score))
            
            # Get true labels for this batch
            true_batch = self.test_data['label'][i:i+batch_size]
            for label in true_batch:
                # Try to map the string label to ID
                if label in self.label2id:
                    true_labels.append(self.label2id[label])
                else:
                    # If not found, try to find the closest match
                    matches = [l for l in self.label2id.keys() if label in l or l in label]
                    if matches:
                        true_labels.append(self.label2id[matches[0]])
                    else:
                        print(f"Warning: Could not map label '{label}' to ID")
                        true_labels.append(-1)
            
            # Print progress
            if (i+batch_size) % 100 == 0 or (i+batch_size) >= len(self.test_data):
                print(f"Processed {min(i+len(batch), len(self.test_data))}/{len(self.test_data)} samples")
        
        # Unpack predictions and confidence scores
        pred_ids, confidence_scores = zip(*predictions)
        pred_ids = list(pred_ids)  # Convert to list for concatenation
        confidence_scores = list(confidence_scores)
        
        # Calculate metrics
        inference_time = time.time() - start_time
        accuracy = accuracy_score(true_labels, pred_ids)
        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, pred_ids, average='weighted', zero_division=0
        )
        
        # Create confusion matrix
        cm = confusion_matrix(true_labels, pred_ids)
        
        # Get classification report
        unique_labels = sorted(set(true_labels + pred_ids))
        target_names = [self.id2label.get(i, f"Unknown-{i}") for i in unique_labels]
        
        report = classification_report(
            true_labels, 
            pred_ids, 
            labels=unique_labels,
            target_names=target_names,
            output_dict=True,
            zero_division=0
        )
        
        # Store results
        self.results = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'inference_time': inference_time,
            'inference_time_per_sample': inference_time / len(self.test_data),
            'confusion_matrix': cm.tolist(),
            'classification_report': report
        }
        
        self.predictions = pred_ids
        self.true_labels = true_labels
        self.confidence_scores = confidence_scores
        
        # Convert to string labels for easier analysis
        self.predicted_labels = [self.id2label.get(p, f"Unknown-{p}") for p in pred_ids]
        self.true_string_labels = [self.id2label.get(t, f"Unknown-{t}") for t in true_labels]
        
        print(f"Evaluation Results:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1 Score: {f1:.4f}")
        print(f"  Inference time: {inference_time:.2f}s ({inference_time/len(self.test_data):.4f}s per sample)")
        
        return True

    def generate_visualizations(self):
        """Generate visualizations of model performance"""
        print("\nGenerating visualizations...")
        
        # 1. Confusion Matrix
        plt.figure(figsize=(12, 10))
        unique_labels = sorted(set(self.true_labels + list(self.predictions)))
        labels = [self.id2label.get(i, f"Unknown-{i}") for i in unique_labels]
        
        cm_display = ConfusionMatrixDisplay(
            confusion_matrix=confusion_matrix(
                self.true_labels, 
                self.predictions, 
                labels=unique_labels
            ),
            display_labels=labels
        )
        cm_display.plot(cmap='Blues', xticks_rotation=45, values_format='d')
        plt.title('Confusion Matrix')
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'confusion_matrix.png'))
        print(f"Saved confusion matrix to {os.path.join(OUTPUT_DIR, 'confusion_matrix.png')}")
        
        # 2. Per-class metrics
        plt.figure(figsize=(12, 8))
        
        # Get per-class metrics
        metrics = ['precision', 'recall', 'f1-score']
        report = self.results['classification_report']
        classes = [c for c in report.keys() if c not in ('accuracy', 'macro avg', 'weighted avg')]
        
        # Setup plot
        x = np.arange(len(classes))
        width = 0.25
        
        # Plot bars for each metric
        for i, metric in enumerate(metrics):
            values = [report[c][metric] for c in classes]
            plt.bar(x + i*width - width, values, width, label=metric)
        
        plt.xlabel('Class')
        plt.ylabel('Score')
        plt.title('Per-class Performance Metrics')
        plt.xticks(x, classes, rotation=45, ha='right')
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'per_class_metrics.png'))
        print(f"Saved per-class metrics to {os.path.join(OUTPUT_DIR, 'per_class_metrics.png')}")
        
        # 3. Confidence distribution
        plt.figure(figsize=(10, 6))
        
        # Plot histogram of confidence scores
        plt.hist(self.confidence_scores, bins=20)
        plt.xlabel('Confidence Score')
        plt.ylabel('Count')
        plt.title('Distribution of Confidence Scores')
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'confidence_distribution.png'))
        print(f"Saved confidence distribution to {os.path.join(OUTPUT_DIR, 'confidence_distribution.png')}")
        
        # 4. Confidence vs. Correctness
        plt.figure(figsize=(10, 6))
        
        # Group by correct/incorrect
        correct = [score for pred, score, true in zip(self.predictions, self.confidence_scores, self.true_labels) if pred == true]
        incorrect = [score for pred, score, true in zip(self.predictions, self.confidence_scores, self.true_labels) if pred != true]
        
        plt.hist([correct, incorrect], bins=20, label=['Correct', 'Incorrect'], alpha=0.7)
        plt.xlabel('Confidence Score')
        plt.ylabel('Count')
        plt.title('Confidence Scores for Correct vs. Incorrect Predictions')
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'confidence_vs_correctness.png'))
        print(f"Saved confidence vs. correctness to {os.path.join(OUTPUT_DIR, 'confidence_vs_correctness.png')}")
        
        return True
        
    def analyze_errors(self):
        """Analyze error patterns"""
        print("\nAnalyzing errors...")
        
        # Find all misclassifications
        misclassifications = []
        for i, (pred, true, text, confidence) in enumerate(zip(
            self.predictions, self.true_labels, self.text_samples, self.confidence_scores
        )):
            if pred != true:
                pred_label = self.id2label.get(pred, f"Unknown-{pred}")
                true_label = self.id2label.get(true, f"Unknown-{true}")
                misclassifications.append({
                    'index': i,
                    'text': text,
                    'true_label': true_label,
                    'predicted_label': pred_label,
                    'confidence': confidence
                })
        
        # Sort by confidence (most confident errors first)
        misclassifications.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Analyze error patterns
        error_pairs = Counter([(item['true_label'], item['predicted_label']) for item in misclassifications])
        most_common_errors = error_pairs.most_common(5)
        
        # Write error analysis to file
        with open(os.path.join(OUTPUT_DIR, 'error_analysis.txt'), 'w') as f:
            f.write("ERROR ANALYSIS\n")
            f.write("=============\n\n")
            
            f.write(f"Total errors: {len(misclassifications)} out of {len(self.predictions)} ({len(misclassifications)/len(self.predictions):.2%})\n\n")
            
            f.write("Most common error patterns:\n")
            for (true, pred), count in most_common_errors:
                f.write(f"  {true} → {pred}: {count} instances\n")
            
            f.write("\nHigh confidence errors (top 10):\n")
            for i, item in enumerate(misclassifications[:10]):
                f.write(f"\n{i+1}. Text: \"{item['text'][:100]}{'...' if len(item['text']) > 100 else ''}\"\n")
                f.write(f"   True: {item['true_label']}, Predicted: {item['predicted_label']}, Confidence: {item['confidence']:.4f}\n")
            
            # Examples of each error pattern
            f.write("\nExamples of most common error patterns:\n")
            for (true, pred), _ in most_common_errors:
                examples = [item for item in misclassifications if item['true_label'] == true and item['predicted_label'] == pred][:3]
                f.write(f"\n{true} → {pred}:\n")
                for i, example in enumerate(examples):
                    f.write(f" {i+1}. \"{example['text'][:100]}{'...' if len(example['text']) > 100 else ''}\"\n")
                    f.write(f"    Confidence: {example['confidence']:.4f}\n")
        
        print(f"Saved error analysis to {os.path.join(OUTPUT_DIR, 'error_analysis.txt')}")
        
        # Generate confusion matrix highlighting errors
        plt.figure(figsize=(12, 10))
        cm = confusion_matrix(self.true_labels, self.predictions)
        
        # Plot as heatmap
        labels = [self.id2label.get(i, f"Unknown-{i}") for i in range(len(self.id2label))]
        sns.heatmap(
            cm, 
            annot=True, 
            fmt='d',
            cmap='Reds',
            xticklabels=labels,
            yticklabels=labels
        )
        plt.xlabel('Predicted')
        plt.ylabel('True')
        plt.title('Error Confusion Matrix')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, 'error_confusion_matrix.png'))
        print(f"Saved error confusion matrix to {os.path.join(OUTPUT_DIR, 'error_confusion_matrix.png')}")
        
        # Plot common error types
        if most_common_errors:
            plt.figure(figsize=(12, 6))
            labels = [f"{true} → {pred}" for (true, pred), _ in most_common_errors]
            values = [count for _, count in most_common_errors]
            plt.bar(range(len(labels)), values)
            plt.xlabel('Error Type')
            plt.ylabel('Count')
            plt.title('Most Common Error Types')
            plt.xticks(range(len(labels)), labels, rotation=45, ha='right')
            plt.tight_layout()
            plt.savefig(os.path.join(OUTPUT_DIR, 'common_error_types.png'))
            print(f"Saved common error types to {os.path.join(OUTPUT_DIR, 'common_error_types.png')}")
        
        return True
        
    def save_detailed_results(self):
        """Save detailed results and analysis"""
        print("\nSaving detailed results...")
        
        # Save the complete results as JSON
        detailed_results = {
            **self.results,
            'predictions': self.predictions,
            'true_labels': self.true_labels,
            'confidence_scores': self.confidence_scores
        }
        
        with open(os.path.join(OUTPUT_DIR, 'detailed_results.json'), 'w') as f:
            json.dump(detailed_results, f, indent=2)
        
        # Save per-sample predictions
        predictions_df = pd.DataFrame({
            'text': self.text_samples,
            'true_label': self.true_string_labels,
            'predicted_label': self.predicted_labels,
            'confidence': self.confidence_scores,
            'is_correct': [p == t for p, t in zip(self.predictions, self.true_labels)]
        })
        
        predictions_df.to_csv(os.path.join(OUTPUT_DIR, 'predictions.csv'), index=False)
        
        # Create summary report
        with open(os.path.join(OUTPUT_DIR, 'summary_report.txt'), 'w') as f:
            f.write("MODEL PERFORMANCE SUMMARY\n")
            f.write("=======================\n\n")
            
            # Basic info
            f.write(f"Model: {DISTILBERT_MODEL_PATH}\n")
            f.write(f"Test dataset: {TEST_DATASET_PATH}\n")
            f.write(f"Number of samples: {len(self.test_data)}\n\n")
            
            # Overall metrics
            f.write("OVERALL METRICS\n")
            f.write("--------------\n")
            f.write(f"Accuracy:  {self.results['accuracy']:.4f}\n")
            f.write(f"Precision: {self.results['precision']:.4f}\n")
            f.write(f"Recall:    {self.results['recall']:.4f}\n")
            f.write(f"F1 Score:  {self.results['f1']:.4f}\n")
            f.write(f"Inference time: {self.results['inference_time']:.2f}s total, {self.results['inference_time_per_sample']:.4f}s per sample\n\n")
            
            # Class distribution
            f.write("CLASS DISTRIBUTION\n")
            f.write("-----------------\n")
            true_distribution = Counter(self.true_string_labels)
            pred_distribution = Counter(self.predicted_labels)
            
            f.write(f"{'Class':<25} {'True':<10} {'Predicted':<10}\n")
            f.write(f"{'-' * 45}\n")
            
            for label in sorted(set(true_distribution.keys()) | set(pred_distribution.keys())):
                true_count = true_distribution.get(label, 0)
                pred_count = pred_distribution.get(label, 0)
                f.write(f"{label:<25} {true_count:<10} {pred_count:<10}\n")
            
            # Per-class metrics
            f.write("\nPER-CLASS METRICS\n")
            f.write("----------------\n")
            
            report = self.results['classification_report']
            f.write(f"{'Class':<25} {'Precision':<10} {'Recall':<10} {'F1':<10} {'Support':<10}\n")
            f.write(f"{'-' * 65}\n")
            
            for cls in sorted(report.keys()):
                if cls not in ('accuracy', 'macro avg', 'weighted avg'):
                    metrics = report[cls]
                    f.write(f"{cls:<25} {metrics['precision']:<10.4f} {metrics['recall']:<10.4f} {metrics['f1-score']:<10.4f} {metrics['support']:<10}\n")
            
            # Add summary of errors
            correct = sum(1 for p, t in zip(self.predictions, self.true_labels) if p == t)
            incorrect = len(self.predictions) - correct
            
            f.write("\nERROR ANALYSIS\n")
            f.write("-------------\n")
            f.write(f"Correct predictions: {correct} ({correct/len(self.predictions):.2%})\n")
            f.write(f"Incorrect predictions: {incorrect} ({incorrect/len(self.predictions):.2%})\n\n")
            
            # Confidence analysis
            avg_confidence = sum(self.confidence_scores) / len(self.confidence_scores)
            correct_confidence = [score for pred, score, true in zip(self.predictions, self.confidence_scores, self.true_labels) if pred == true]
            incorrect_confidence = [score for pred, score, true in zip(self.predictions, self.confidence_scores, self.true_labels) if pred != true]
            
            f.write("CONFIDENCE ANALYSIS\n")
            f.write("------------------\n")
            f.write(f"Average confidence: {avg_confidence:.4f}\n")
            if correct_confidence:
                f.write(f"Average confidence when correct: {sum(correct_confidence)/len(correct_confidence):.4f}\n")
            if incorrect_confidence:
                f.write(f"Average confidence when incorrect: {sum(incorrect_confidence)/len(incorrect_confidence):.4f}\n")
            
        print(f"Saved summary report to {os.path.join(OUTPUT_DIR, 'summary_report.txt')}")
        return True

def main():
    analyzer = ModelAnalyzer()
    
    # Load test data
    if not analyzer.load_test_data():
        print("Failed to load test data. Exiting.")
        return
    
    # Load model
    if not analyzer.load_model():
        print("Failed to load model. Exiting.")
        return
    
    # Evaluate model
    if not analyzer.evaluate():
        print("Failed to evaluate model. Exiting.")
        return
    
    # Generate visualizations
    analyzer.generate_visualizations()
    
    # Analyze errors
    analyzer.analyze_errors()
    
    # Save detailed results
    analyzer.save_detailed_results()
    
    print(f"\nAll analysis results saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main() 