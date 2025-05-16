#!/usr/bin/env python3
import os
import json
import time
import argparse
import torch
import numpy as np
from tqdm import tqdm
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    TrainingArguments, 
    Trainer, 
    EarlyStoppingCallback,
    set_seed
)
from datasets import Dataset
import pandas as pd
from sklearn.model_selection import train_test_split
from typing import Dict, List, Any
from sklearn.metrics import classification_report, confusion_matrix

from utils import (
    load_and_preprocess_data, 
    compute_metrics as compute_metrics_fn,
    THREAT_CLASSES
)

# Set seed for reproducibility
set_seed(42)

def parse_args():
    parser = argparse.ArgumentParser(description="Train a threat detection model")
    parser.add_argument("--model_name", type=str, default="distilbert-base-uncased", 
                        help="Pretrained model name from HuggingFace")
    parser.add_argument("--batch_size", type=int, default=16, help="Training batch size")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--lr", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--max_length", type=int, default=128, help="Maximum sequence length")
    parser.add_argument("--output_dir", type=str, default="../models", help="Directory to save model")
    parser.add_argument("--fp16", action="store_true", help="Use mixed precision training (faster on GPUs)")
    parser.add_argument("--data_path", type=str, default="../data/combined_dataset.csv", help="Path to combined dataset CSV")
    return parser.parse_args()

# New function to load and split the combined dataset
def load_combined_dataset(data_path, test_size=0.2, random_state=42):
    df = pd.read_csv(data_path)
    print("\nDATASET DETAILS:")
    print(f"Total samples: {len(df)}")
    print("Class distribution:\n", df['class'].value_counts())
    print("Sample lengths:\n", df['content'].str.len().describe())
    # Split
    train_df, eval_df = train_test_split(df, test_size=test_size, random_state=random_state, stratify=df['class'])
    return train_df, eval_df

def main():
    args = parse_args()
    
    # Set up paths
    model_name = args.model_name
    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)
    
    # Use the new combined dataset
    data_path = args.data_path
    train_df, eval_df = load_combined_dataset(data_path)
    
    # Create label mapping
    labels = sorted(train_df['class'].unique())
    label2id = {label: i for i, label in enumerate(labels)}
    id2label = {i: label for i, label in enumerate(labels)}
    
    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    def tokenize_function(examples):
        return tokenizer(
            examples["content"],
            padding="max_length",
            truncation=True,
            max_length=args.max_length
        )
    def convert_to_dataset(df):
        df = df.copy()
        df['label_id'] = df['class'].map(label2id)
        df = df.drop(columns=['class'])
        df = df.rename(columns={'label_id': 'label'})
        dataset = Dataset.from_pandas(df)
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            desc="Tokenizing",
            remove_columns=["content"]
        )
        return tokenized_dataset
    train_dataset = convert_to_dataset(train_df)
    eval_dataset = convert_to_dataset(eval_df)
    
    # Initialize model
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id
    )
    
    # Define the compute_metrics function with access to id2label
    def compute_metrics_with_mapping(eval_pred):
        """
        Compute evaluation metrics for the Trainer with access to id2label mapping
        """
        predictions, labels = eval_pred
        
        # Get predicted class IDs
        predicted_class_ids = np.argmax(predictions, axis=1)
        
        # Convert IDs to class names using id2label mapping
        y_pred = [id2label[class_id] for class_id in predicted_class_ids]
        y_true = [id2label[label_id] for label_id in labels]
        
        # Compute probabilities from logits
        probabilities = torch.nn.functional.softmax(torch.tensor(predictions), dim=1).numpy()
        
        # Calculate basic metrics ourselves to avoid issues with ROC AUC calculation
        accuracy = sum(p == t for p, t in zip(y_pred, y_true)) / len(y_pred)
        
        # Get metrics from util function but handle exceptions
        try:
            metrics = compute_metrics_fn(y_true, y_pred, probabilities)
            f1_macro = metrics["f1_macro"]
            f1_weighted = metrics["f1_weighted"]
            roc_auc = metrics.get("roc_auc")
        except Exception as e:
            print(f"Warning: Error calculating some metrics: {e}")
            # Fall back to basic metrics
            from sklearn.metrics import f1_score
            f1_macro = f1_score(y_true, y_pred, average='macro')
            f1_weighted = f1_score(y_true, y_pred, average='weighted')
            roc_auc = None
        
        # Return basic metrics
        result = {
            "accuracy": accuracy,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
        }
        
        if roc_auc is not None:
            result["roc_auc"] = roc_auc
        
        return result
    
    # Define training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        eval_strategy="steps",
        save_strategy="steps",
        eval_steps=500,
        save_steps=500,
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1_weighted",
        push_to_hub=False,
        report_to="none",
        fp16=args.fp16,
        logging_dir=os.path.join(output_dir, "logs"),
    )
    
    # Initialize Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics_with_mapping,
        tokenizer=tokenizer,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
    )
    
    # Train the model
    print("Starting training...")
    trainer.train()
    
    # Evaluate model
    print("Evaluating model...")
    eval_results = trainer.evaluate()
    print(f"Evaluation results: {eval_results}")

    # Detailed metrics
    # Get predictions on eval set
    predictions = trainer.predict(eval_dataset)
    y_true = predictions.label_ids
    y_pred = np.argmax(predictions.predictions, axis=1)
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=[id2label[i] for i in range(len(id2label))]))
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_true, y_pred))
    
    # Save model and tokenizer
    print(f"Saving model to {output_dir}")
    trainer.save_model(os.path.join(output_dir, "best_model"))
    tokenizer.save_pretrained(os.path.join(output_dir, "best_model"))
    
    # Save label mappings
    with open(os.path.join(output_dir, "best_model", "label_mapping.json"), "w") as f:
        json.dump({
            "label2id": label2id,
            "id2label": id2label
        }, f)
    
    # Save best model separately as best_model.pt
    # This saves both the model and tokenizer information in a single file
    torch.save({
        "model_state_dict": model.state_dict(),
        "label2id": label2id,
        "id2label": id2label,
        "model_name": model_name,
        "max_length": args.max_length
    }, os.path.join(output_dir, "best_model.pt"))
    
    print("Training complete!")

if __name__ == "__main__":
    main() 