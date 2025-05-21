#!/usr/bin/env python3
"""
Train a multi-class threat type detection model (Stage 2)
This model classifies the specific type of threat for texts already identified as threats in Stage 1.
"""
import os
import argparse
import torch
import numpy as np
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    TrainingArguments, 
    Trainer,
    set_seed
)
from datasets import Dataset
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

# Set seed for reproducibility
set_seed(42)

def parse_args():
    parser = argparse.ArgumentParser(description="Train a multi-class threat type detection model (Stage 2)")
    parser.add_argument("--model_name", type=str, default="distilbert-base-uncased", 
                        help="Pretrained model name from HuggingFace")
    parser.add_argument("--batch_size", type=int, default=16, help="Training batch size")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--lr", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--max_length", type=int, default=128, help="Maximum sequence length")
    parser.add_argument("--output_dir", type=str, default="../models/stage2_multi", help="Directory to save model")
    parser.add_argument("--data_path", type=str, default="../data/combined_dataset.csv", 
                        help="Path to combined dataset CSV")
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Set up paths
    model_name = args.model_name
    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)
    
    # Load dataset
    print(f"Loading data from {args.data_path}")
    try:
        df = pd.read_csv(args.data_path)
        print(f"Dataset loaded with {len(df)} samples")
        print("Original class distribution:")
        print(df['class'].value_counts())
        
        # Filter out non-threats for stage 2
        threat_df = df[df['class'] != 'Non-threat/Neutral'].copy()
        print(f"\nFiltered threat dataset with {len(threat_df)} samples")
        print("Threat class distribution:")
        print(threat_df['class'].value_counts())
        
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return
    
    # Create label mapping for threat classes only
    labels = sorted(threat_df['class'].unique())
    label2id = {label: i for i, label in enumerate(labels)}
    id2label = {i: label for i, label in enumerate(labels)}
    
    print(f"Threat type labels: {labels}")
    print(f"Label mapping: {label2id}")
    
    # Split into train/eval
    train_df, eval_df = train_test_split(threat_df, test_size=0.2, random_state=42, stratify=threat_df['class'])
    print(f"Train samples: {len(train_df)}, Eval samples: {len(eval_df)}")
    
    # Tokenize data
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
    
    # Set up training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        push_to_hub=False,
        report_to="none",
    )
    
    # Set up metrics function
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        return {
            "accuracy": (predictions == labels).mean(),
        }
    
    # Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
    )
    
    # Train model
    print("Starting training...")
    trainer.train()
    
    # Evaluate model
    print("Evaluating model...")
    eval_results = trainer.evaluate()
    print(f"Evaluation results: {eval_results}")
    
    # Calculate classification report
    eval_pred = trainer.predict(eval_dataset)
    predictions = np.argmax(eval_pred.predictions, axis=-1)
    labels = eval_pred.label_ids
    
    # Print classification report
    target_names = list(id2label.values())
    print("\nClassification Report:")
    print(classification_report(labels, predictions, target_names=target_names))
    
    # Print confusion matrix
    print("\nConfusion Matrix:")
    print(confusion_matrix(labels, predictions))
    
    # Save model
    print(f"Saving model to {output_dir}")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Save id2label and label2id mapping
    with open(os.path.join(output_dir, "label_mapping.txt"), "w") as f:
        f.write(f"id2label = {id2label}\n")
        f.write(f"label2id = {label2id}\n")
    
    print("Training complete!")

if __name__ == "__main__":
    main() 