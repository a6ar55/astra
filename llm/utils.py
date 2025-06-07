import pandas as pd
import numpy as np
import torch
from sklearn.metrics import classification_report, f1_score, confusion_matrix, roc_auc_score, accuracy_score
from transformers import pipeline
import random
from typing import List, Dict, Tuple, Any, Optional

# Define our label classes
THREAT_CLASSES = [
    "Direct Violence Threats",
    "Criminal Activity",
    "Harassment and Intimidation",
    "Hate Speech/Extremism",
    "Child Safety Threats",
    "Non-threat/Neutral"
]

def load_and_preprocess_data(diverse_dataset_path: str, gen_ds_path: str, 
                            test_size: float = 0.2, 
                            add_synthetic: bool = True,
                            num_synthetic: int = 200) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load and preprocess the datasets for training
    
    Args:
        diverse_dataset_path: Path to diverse_dataset.csv
        gen_ds_path: Path to gen_ds.csv
        test_size: Fraction of data to use for testing
        add_synthetic: Whether to add synthetic non-threat data
        num_synthetic: Number of synthetic samples to generate
        
    Returns:
        Tuple of (train_df, test_df)
    """
    # Load datasets
    df1 = pd.read_csv(diverse_dataset_path)
    df2 = pd.read_csv(gen_ds_path)
    
    # Rename columns in gen_ds if needed
    if 'content' in df2.columns and 'class' in df2.columns:
        df2 = df2.rename(columns={'content': 'text', 'class': 'label'})
        
    # Combine datasets
    df = pd.concat([df1, df2], axis=0, ignore_index=True)
    
    # Add synthetic non-threat data
    if add_synthetic:
        non_threats = generate_non_threat_samples(num_synthetic)
        non_threat_df = pd.DataFrame({
            'text': non_threats,
            'label': ['Non-threat/Neutral'] * len(non_threats)
        })
        df = pd.concat([df, non_threat_df], axis=0, ignore_index=True)
    
    # Shuffle data
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Split into train and test sets
    test_idx = int(len(df) * (1 - test_size))
    train_df = df.iloc[:test_idx]
    test_df = df.iloc[test_idx:]
    
    return train_df, test_df

def generate_non_threat_samples(num_samples: int = 200) -> List[str]:
    """
    Generate synthetic non-threatening text samples
    
    Args:
        num_samples: Number of samples to generate
        
    Returns:
        List of non-threatening text samples
    """
    # Common neutral phrases and templates
    neutral_templates = [
        "I enjoyed the movie we watched yesterday.",
        "The weather today is {weather}, perfect for {activity}.",
        "I'm planning to visit {location} next {timeframe}.",
        "Have you tried the new {food} restaurant downtown?",
        "The concert last night was absolutely amazing!",
        "I just finished reading {book_title}. It was {opinion}.",
        "I need to pick up some groceries on my way home.",
        "The traffic was terrible this morning.",
        "Looking forward to the weekend plans!",
        "Just submitted my report to the team.",
        "The flowers in the garden are blooming beautifully.",
        "I think I'll make {food} for dinner tonight.",
        "Did you catch the game last night? It was close!",
        "My phone battery is almost dead, need to charge it.",
        "Just enrolled in a new {course} course online.",
        "Can you recommend a good {genre} book to read?",
        "I've been working on this project for weeks now.",
        "The new software update is much better than the previous one.",
        "Remember to bring your umbrella, it might rain later.",
        "I'm thinking of repainting my living room walls.",
        "The customer service was excellent at that store."
    ]
    
    # Fill-in values for templates
    weather = ["sunny", "cloudy", "rainy", "warm", "cold", "perfect", "beautiful"]
    activities = ["hiking", "reading", "a walk", "staying indoors", "meeting friends", "gardening"]
    locations = ["Paris", "New York", "the mountains", "the beach", "Japan", "Canada", "Australia"]
    timeframes = ["month", "summer", "weekend", "holiday", "spring", "winter"]
    foods = ["Italian", "Mexican", "Thai", "Chinese", "Indian", "vegetarian", "seafood", "burger"]
    books = ["The Great Gatsby", "To Kill a Mockingbird", "1984", "Pride and Prejudice", 
             "The Silent Patient", "Where the Crawdads Sing", "Educated", "Atomic Habits"]
    opinions = ["fascinating", "thought-provoking", "enjoyable", "interesting", "a bit slow", "amazing"]
    courses = ["photography", "coding", "cooking", "language", "fitness", "data science", "art"]
    genres = ["mystery", "sci-fi", "romance", "non-fiction", "biography", "fantasy", "thriller"]
    
    non_threat_samples = []
    
    # Generate samples using templates
    for _ in range(num_samples):
        if random.random() < 0.7:  # Use template 70% of the time
            template = random.choice(neutral_templates)
            if "{weather}" in template and "{activity}" in template:
                text = template.format(
                    weather=random.choice(weather),
                    activity=random.choice(activities)
                )
            elif "{location}" in template and "{timeframe}" in template:
                text = template.format(
                    location=random.choice(locations),
                    timeframe=random.choice(timeframes)
                )
            elif "{food}" in template:
                text = template.format(
                    food=random.choice(foods)
                )
            elif "{book_title}" in template and "{opinion}" in template:
                text = template.format(
                    book_title=random.choice(books),
                    opinion=random.choice(opinions)
                )
            elif "{course}" in template:
                text = template.format(
                    course=random.choice(courses)
                )
            elif "{genre}" in template:
                text = template.format(
                    genre=random.choice(genres)
                )
            else:
                text = template
        else:  # Create random combinations 30% of the time
            patterns = [
                f"I just watched a {random.choice(['great', 'decent', 'interesting'])} {random.choice(['movie', 'show', 'documentary'])} about {random.choice(['science', 'history', 'nature', 'technology'])}.",
                f"The {random.choice(['conference', 'meeting', 'workshop'])} went {random.choice(['well', 'smoothly', 'as planned'])} today.",
                f"I'm learning to {random.choice(['cook', 'play guitar', 'speak Spanish', 'code', 'draw'])} in my free time.",
                f"The {random.choice(['report', 'presentation', 'project'])} is {random.choice(['ready', 'almost complete', 'coming along well'])}.",
                f"I'm considering {random.choice(['buying a new laptop', 'adopting a pet', 'changing jobs', 'moving apartments'])} soon."
            ]
            text = random.choice(patterns)
            
        non_threat_samples.append(text)
    
    return non_threat_samples

def compute_metrics(y_true: List[str], y_pred: List[str], y_proba: Optional[np.ndarray] = None) -> Dict[str, Any]:
    """
    Compute evaluation metrics for the model
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        y_proba: Prediction probabilities for each class
        
    Returns:
        Dictionary of metrics
    """
    metrics = {}
    
    # Basic metrics
    metrics['accuracy'] = accuracy_score(y_true, y_pred)
    metrics['f1_macro'] = f1_score(y_true, y_pred, average='macro')
    metrics['f1_weighted'] = f1_score(y_true, y_pred, average='weighted')
    metrics['classification_report'] = classification_report(y_true, y_pred, output_dict=True)
    
    # Confusion matrix
    metrics['confusion_matrix'] = confusion_matrix(y_true, y_pred).tolist()
    
    # AUC if probabilities are provided
    if y_proba is not None:
        # Convert labels to indices for ROC AUC calculation
        classes = sorted(list(set(y_true)))
        class_to_idx = {cls: idx for idx, cls in enumerate(classes)}
        y_true_idx = [class_to_idx[label] for label in y_true]
        
        try:
            metrics['roc_auc'] = roc_auc_score(
                np.eye(len(classes))[y_true_idx], 
                y_proba, 
                multi_class='ovr', 
                average='macro'
            )
        except ValueError:
            # In case of any issues with AUC calculation
            metrics['roc_auc'] = None
    
    return metrics 