#!/usr/bin/env python3
"""
PEFT (LoRA) fine-tuning for unitary/unbiased-toxic-roberta model
for threat classification
"""
import os
import pandas as pd
import numpy as np
import torch
import logging
from datetime import datetime
import datasets
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    set_seed,
    DataCollatorWithPadding
)
from transformers.trainer_callback import TrainerCallback
from peft import (
    get_peft_model,
    LoraConfig,
    TaskType,
    PeftModel
)
import matplotlib.pyplot as plt
import seaborn as sns

# Configure logging
logging_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(logging_dir, "peft_roberta_training.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file)
    ]
)
logger = logging.getLogger(__name__)

# Set seed for reproducibility
set_seed(42)

# Constants
ROBERTA_MODEL_NAME = "unitary/unbiased-toxic-roberta"
DATASET_PATH = "/Users/darkarmy/Downloads/threat_detection/myProj/threat-detection-platform/final.csv"
LORA_RANK = 16
LORA_ALPHA = 32
LEARNING_RATE = 1e-4
BATCH_SIZE = 8
NUM_EPOCHS = 5
MAX_LENGTH = 128
OUTPUT_DIR = "../models/roberta_peft_lora"

def main():
    logger.info("====== Starting PEFT training for RoBERTa model ======")
    
    try:
        # Create output directory
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Initialize trainer
        trainer = RobertaTrainer()
        
        # Load tokenizer first
        if not trainer.load_tokenizer():
            logger.error("Failed to load tokenizer. Exiting.")
            return
            
        # Load and preprocess data
        if not trainer.load_and_preprocess_data():
            logger.error("Failed to load and preprocess data. Exiting.")
            return
        
        # Load model
        if not trainer.load_model():
            logger.error("Failed to load model. Exiting.")
            return
        
        # Train model
        if not trainer.train():
            logger.error("Training failed. Exiting.")
            return
        
        # Success message
        logger.info("====== PEFT training completed successfully ======")
        logger.info(f"Model saved to {OUTPUT_DIR}")
        
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())


class DebugCallback(TrainerCallback):
    """Custom callback for debugging training issues."""
    
    def on_init_end(self, args, state, control, **kwargs):
        logger.info("Training initialization completed successfully.")
    
    def on_train_begin(self, args, state, control, **kwargs):
        logger.info("Training loop started.")
    
    def on_train_error(self, args, state, control, error, **kwargs):
        logger.error(f"Error during training: {error}")
        import traceback
        logger.error(traceback.format_exc())
        
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            logger.info(f"Training logs: {logs}")
            
            
class RobertaTrainer:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.peft_model = None
        self.id2label = None
        self.label2id = None
        self.trainer = None
        self.train_dataset = None
        self.val_dataset = None
        self.test_dataset = None
        self.metrics = {}

    def load_tokenizer(self):
        """Load the tokenizer"""
        try:
            logger.info(f"Loading tokenizer from {ROBERTA_MODEL_NAME}")
            self.tokenizer = AutoTokenizer.from_pretrained(ROBERTA_MODEL_NAME)
            logger.info("Tokenizer loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading tokenizer: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    def load_and_preprocess_data(self):
        """
        Load the dataset and preprocess it for training
        """
        logger.info(f"Loading dataset from {DATASET_PATH}")
        
        try:
            # First try to load the CSV file
            try:
                df = pd.read_csv(DATASET_PATH)
                logger.info(f"Dataset loaded with {len(df)} samples")
            except Exception as csv_err:
                logger.error(f"Failed to load CSV file: {str(csv_err)}")
                if not os.path.exists(DATASET_PATH):
                    logger.error(f"Dataset file does not exist at {DATASET_PATH}")
                return False
            
            # Check columns
            logger.info(f"Dataset columns: {df.columns.tolist()}")
            
            # Check and fix column names
            if 'text' in df.columns and 'label' in df.columns:
                logger.info("Found required columns: 'text' and 'label'")
            elif 'content' in df.columns and 'class' in df.columns:
                logger.info("Renaming columns: 'content' to 'text', 'class' to 'label'")
                df = df.rename(columns={'content': 'text', 'class': 'label'})
            else:
                logger.error(f"Missing required columns. Available columns: {df.columns.tolist()}")
                raise ValueError("Dataset must have 'text'/'content' and 'label'/'class' columns")
            
            # Clean and preprocess data
            # 1. Drop rows with missing values
            logger.info(f"Checking for missing values - text: {df['text'].isna().sum()}, label: {df['label'].isna().sum()}")
            df = df.dropna(subset=['text', 'label'])
            logger.info(f"After dropping NA rows: {len(df)} samples")
            
            # 2. Clean text
            df['text'] = df['text'].astype(str).str.strip()
            
            # 3. Convert labels to strings and clean them
            df['label'] = df['label'].astype(str)
            df = df[~df['label'].isin(['nan', '', 'None', 'NaN'])]
            logger.info(f"After removing invalid labels: {len(df)} samples")
            
            # 4. Get unique labels and create mappings
            unique_labels = sorted(df['label'].unique())
            logger.info(f"Unique labels ({len(unique_labels)}): {unique_labels}")
            
            self.label2id = {label: i for i, label in enumerate(unique_labels)}
            self.id2label = {i: label for i, label in enumerate(unique_labels)}
            logger.info(f"Label mapping: {self.label2id}")
            
            # 5. Map labels to IDs
            df['label_id'] = df['label'].map(self.label2id)
            
            # 6. Check for unmapped labels
            if df['label_id'].isna().any():
                unmapped_count = df['label_id'].isna().sum()
                logger.error(f"Found {unmapped_count} unmapped labels. Removing them.")
                df = df.dropna(subset=['label_id'])
            
            # 7. Split dataset
            try:
                train_df, temp_df = train_test_split(df, test_size=0.3, random_state=42, stratify=df['label_id'])
                val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42, stratify=temp_df['label_id'])
            except Exception as e:
                logger.error(f"Error splitting dataset: {str(e)}")
                logger.info("Trying split without stratification...")
                train_df, temp_df = train_test_split(df, test_size=0.3, random_state=42)
                val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42)
            
            logger.info(f"Train samples: {len(train_df)}, Validation samples: {len(val_df)}, Test samples: {len(test_df)}")
            logger.info(f"Train label distribution:\n{train_df['label'].value_counts().to_dict()}")
            
            # 8. Convert to HuggingFace datasets
            logger.info("Converting to HuggingFace datasets...")
            self.train_dataset = self._convert_to_dataset(train_df)
            self.val_dataset = self._convert_to_dataset(val_df)
            self.test_dataset = self._convert_to_dataset(test_df)
            
            logger.info("Data preprocessing completed successfully")
            return True
        
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def _convert_to_dataset(self, df):
        """Convert DataFrame to HuggingFace Dataset with tokenization"""
        if self.tokenizer is None:
            logger.error("Tokenizer is None in _convert_to_dataset")
            raise ValueError("Tokenizer must be initialized before converting to dataset")
            
        try:
            # Create a clean dataframe with only the required columns
            clean_df = pd.DataFrame({
                'text': df['text'].astype(str),
                'label': df['label_id'].astype(int)
            })
            
            # Reset the index to avoid __index_level_0__ issues
            clean_df = clean_df.reset_index(drop=True)
            
            # Log some samples to verify
            logger.info(f"Clean dataset sample (first 3 rows):")
            for i in range(min(3, len(clean_df))):
                logger.info(f"  Row {i}: text='{clean_df['text'].iloc[i][:30]}...', label={clean_df['label'].iloc[i]}")
            
            # Convert to Dataset directly specifying columns to keep
            features = datasets.Features({
                "text": datasets.Value("string"),
                "label": datasets.Value("int64")
            })
            
            dataset = datasets.Dataset.from_pandas(clean_df, features=features)
            
            # Define preprocessing function
            def preprocess_function(examples):
                return self.tokenizer(
                    examples["text"],
                    padding="max_length",
                    truncation=True,
                    max_length=MAX_LENGTH
                )
            
            # Process and prepare dataset
            tokenized_dataset = dataset.map(
                preprocess_function,
                batched=True,
                desc="Tokenizing",
                remove_columns=["text"]  # Only remove 'text', keep 'label'
            )
            
            # Verify the structure of the dataset
            logger.info(f"Tokenized dataset features: {tokenized_dataset.features}")
            logger.info(f"Tokenized dataset size: {len(tokenized_dataset)}")
            
            # Check for any unexpected columns
            if '__index_level_0__' in tokenized_dataset.column_names:
                logger.warning("Found '__index_level_0__' column, removing it")
                tokenized_dataset = tokenized_dataset.remove_columns(['__index_level_0__'])
            
            # Final verification
            logger.info(f"Final dataset columns: {tokenized_dataset.column_names}")
            
            return tokenized_dataset
            
        except Exception as e:
            logger.error(f"Error in _convert_to_dataset: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    def _tokenize_function(self, examples):
        """Tokenize text examples"""
        if self.tokenizer is None:
            logger.error("Tokenizer is None in _tokenize_function")
            raise ValueError("Tokenizer must be initialized")
            
        return self.tokenizer(
            examples["text"],
            padding="max_length",
            truncation=True,
            max_length=MAX_LENGTH
        )
    
    def load_model(self):
        """
        Load the RoBERTa model and tokenizer
        """
        try:
            # Ensure tokenizer is loaded
            if self.tokenizer is None:
                logger.info(f"Loading tokenizer from {ROBERTA_MODEL_NAME}")
                self.tokenizer = AutoTokenizer.from_pretrained(ROBERTA_MODEL_NAME)
            
            logger.info(f"Loading model from {ROBERTA_MODEL_NAME}")
            logger.info(f"Number of labels: {len(self.label2id)}")
            logger.info(f"Using ignore_mismatched_sizes=True to handle classifier head reshaping")
            logger.info(f"Setting problem_type to 'single_label_classification' for multi-class classification")
            
            self.model = AutoModelForSequenceClassification.from_pretrained(
                ROBERTA_MODEL_NAME,
                num_labels=len(self.label2id),
                id2label=self.id2label,
                label2id=self.label2id,
                ignore_mismatched_sizes=True,  # Allow reshaping the classification head
                problem_type="single_label_classification"  # This is multi-class classification
            )
            
            # Configure LoRA
            logger.info(f"Configuring LoRA with rank={LORA_RANK}, alpha={LORA_ALPHA}")
            peft_config = LoraConfig(
                task_type=TaskType.SEQ_CLS,
                inference_mode=False,
                r=LORA_RANK,
                lora_alpha=LORA_ALPHA,
                lora_dropout=0.1,
                target_modules=["query", "key", "value"]
            )
            
            # Get PEFT model
            self.peft_model = get_peft_model(self.model, peft_config)
            logger.info(f"PEFT model created")
            self.peft_model.print_trainable_parameters()
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def train(self):
        """
        Train the PEFT model
        """
        try:
            logger.info("Setting up training arguments")
            
            # Set up deterministic training for reproducibility
            set_seed(42)
            
            # Define training arguments
            training_args = TrainingArguments(
                output_dir=OUTPUT_DIR,
                learning_rate=LEARNING_RATE,
                per_device_train_batch_size=BATCH_SIZE,
                per_device_eval_batch_size=BATCH_SIZE,
                num_train_epochs=NUM_EPOCHS,
                weight_decay=0.01,
                eval_strategy="epoch",
                save_strategy="epoch",
                load_best_model_at_end=True,
                metric_for_best_model="accuracy",
                push_to_hub=False,
                report_to="none",
                logging_dir=os.path.join(OUTPUT_DIR, "logs"),
                logging_steps=100,
                
                # Avoid problematic features
                fp16=False,
                dataloader_num_workers=0
            )
            
            # Define data collator that will handle dynamic padding
            data_collator = DataCollatorWithPadding(
                tokenizer=self.tokenizer, 
                padding="longest"
            )
            
            # Prepare callbacks
            callbacks = [
                DebugCallback(),
                EarlyStoppingCallback(early_stopping_patience=2)
            ]
            
            # Create the trainer
            logger.info("Creating trainer")
            self.trainer = Trainer(
                model=self.peft_model,
                args=training_args,
                train_dataset=self.train_dataset,
                eval_dataset=self.val_dataset,
                compute_metrics=self._compute_metrics,
                data_collator=data_collator,
                callbacks=callbacks
            )
            
            # Verify dataset structure before training
            logger.info(f"Train dataset features: {self.train_dataset.features}")
            example = self.train_dataset[0]
            logger.info(f"Sample example: {example}")
            
            # Start training
            logger.info("Starting training")
            train_result = self.trainer.train()
            
            # Log and save results
            logger.info(f"Training metrics: {train_result.metrics}")
            self.metrics["train"] = train_result.metrics
            
            # Evaluate on test set
            logger.info("Evaluating model on test set")
            test_results = self.trainer.evaluate(self.test_dataset)
            logger.info(f"Test results: {test_results}")
            self.metrics["test"] = test_results
            
            # Save the model
            self.save_model()
            
            return True
            
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def evaluate(self):
        """
        Evaluate the model on test set
        """
        try:
            logger.info("Evaluating model on test set")
            test_results = self.trainer.evaluate(self.test_dataset)
            self.metrics["test"] = test_results
            logger.info(f"Test results: {test_results}")
            
            # Get detailed metrics
            logger.info("Computing detailed metrics")
            predictions = self.trainer.predict(self.test_dataset)
            
            # Get predicted class IDs
            y_pred = np.argmax(predictions.predictions, axis=1)
            y_true = predictions.label_ids
            
            # Classification report
            report = classification_report(
                y_true, y_pred,
                target_names=list(self.id2label.values()),
                output_dict=True
            )
            self.metrics["classification_report"] = report
            logger.info(f"Classification report:\n{classification_report(y_true, y_pred, target_names=list(self.id2label.values()))}")
            
            # Confusion matrix
            cm = confusion_matrix(y_true, y_pred)
            self.metrics["confusion_matrix"] = cm.tolist()
            logger.info(f"Confusion matrix:\n{cm}")
            
            # Plot and save confusion matrix
            self._plot_confusion_matrix(cm)
            
            return True
            
        except Exception as e:
            logger.error(f"Error during evaluation: {str(e)}")
            return False
    
    def _compute_metrics(self, eval_pred):
        """Compute metrics for evaluation"""
        logits, labels = eval_pred
        
        # Log shape information
        logger.info(f"Compute metrics - logits shape: {logits.shape}, labels shape: {labels.shape}")
        
        # For single label classification (multi-class), take argmax
        predictions = np.argmax(logits, axis=1)
        
        # Calculate various metrics
        accuracy = accuracy_score(labels, predictions)
        
        # For detailed reporting, compute other metrics if available
        try:
            from sklearn.metrics import precision_recall_fscore_support
            precision, recall, f1, _ = precision_recall_fscore_support(
                labels, predictions, average='weighted'
            )
            result = {
                "accuracy": accuracy,
                "f1": f1,
                "precision": precision,
                "recall": recall
            }
        except Exception as e:
            logger.warning(f"Could not compute additional metrics: {e}")
            result = {"accuracy": accuracy}
        
        # Log class distribution
        try:
            logger.info(f"Label distribution: {np.unique(labels, return_counts=True)}")
            logger.info(f"Prediction distribution: {np.unique(predictions, return_counts=True)}")
        except Exception as e:
            logger.warning(f"Could not log distribution info: {e}")
        
        return result
    
    def _plot_confusion_matrix(self, cm):
        """Plot and save confusion matrix"""
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            cm, 
            annot=True, 
            fmt="d", 
            cmap="Blues",
            xticklabels=list(self.id2label.values()),
            yticklabels=list(self.id2label.values())
        )
        plt.xlabel('Predicted')
        plt.ylabel('True')
        plt.title('Confusion Matrix')
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, "confusion_matrix.png"))
        logger.info(f"Confusion matrix saved to {os.path.join(OUTPUT_DIR, 'confusion_matrix.png')}")
    
    def save_model(self):
        """Save the trained model"""
        logger.info(f"Saving model to {OUTPUT_DIR}")
        self.peft_model.save_pretrained(OUTPUT_DIR)
        self.tokenizer.save_pretrained(OUTPUT_DIR)
        
        # Save label mappings
        with open(os.path.join(OUTPUT_DIR, "label_mapping.json"), "w") as f:
            import json
            json.dump({
                "id2label": self.id2label,
                "label2id": self.label2id
            }, f, indent=2)
        
        # Save metrics
        with open(os.path.join(OUTPUT_DIR, "metrics.json"), "w") as f:
            import json
            json.dump(self.metrics, f, indent=2)
        
        logger.info("Model and artifacts saved successfully")

if __name__ == "__main__":
    main() 