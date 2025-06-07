import pandas as pd
import os
import argparse
import torch
import numpy as np
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer, set_seed
)
from datasets import Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

set_seed(42)

def parse_args():
    parser = argparse.ArgumentParser(description="Train threat type classifier (stage 2)")
    parser.add_argument("--model_name", type=str, default="distilbert-base-uncased")
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--lr", type=float, default=5e-5)
    parser.add_argument("--max_length", type=int, default=128)
    parser.add_argument("--output_dir", type=str, default="../models/stage2_multi")
    parser.add_argument("--data_path", type=str, default="../data/combined_dataset.csv")
    return parser.parse_args()

def main():
    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    df = pd.read_csv(args.data_path)
    # Only threat samples
    threat_df = df[df['class'] != 'Non-threat/Neutral'].copy()
    threat_labels = sorted(threat_df['class'].unique())
    label2id = {label: i for i, label in enumerate(threat_labels)}
    id2label = {i: label for i, label in enumerate(threat_labels)}
    threat_df['label'] = threat_df['class'].map(label2id)
    print("\nStage 2 DATASET DETAILS:")
    print(threat_df['class'].value_counts())
    train_df, eval_df = train_test_split(threat_df, test_size=0.2, random_state=42, stratify=threat_df['label'])
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    def tokenize_fn(examples):
        return tokenizer(examples['content'], padding='max_length', truncation=True, max_length=args.max_length)
    def convert(df):
        df = df.copy()
        ds = Dataset.from_pandas(df)
        return ds.map(tokenize_fn, batched=True, remove_columns=['content', 'class'])
    train_ds = convert(train_df)
    eval_ds = convert(eval_df)
    model = AutoModelForSequenceClassification.from_pretrained(args.model_name, num_labels=len(label2id), id2label=id2label, label2id=label2id)
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        report_to="none",
        fp16=False,
        logging_dir=os.path.join(args.output_dir, "logs"),
    )
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=1)
        return {
            'accuracy': (preds == labels).mean(),
        }
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        compute_metrics=compute_metrics,
        tokenizer=tokenizer
    )
    print("Starting Stage 2 training...")
    trainer.train()
    print("Evaluating Stage 2...")
    preds = trainer.predict(eval_ds)
    y_true = preds.label_ids
    y_pred = np.argmax(preds.predictions, axis=1)
    print(classification_report(y_true, y_pred, target_names=[id2label[i] for i in range(len(id2label))]))
    print(confusion_matrix(y_true, y_pred))
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print("Stage 2 model saved.")

if __name__ == "__main__":
    main() 