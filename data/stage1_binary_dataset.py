#!/usr/bin/env python3
"""
Create a binary classification dataset (Threat vs Non-threat)
for the first stage of the two-stage threat detection model.
"""
import pandas as pd
import os
from sklearn.model_selection import train_test_split

def create_binary_dataset(input_file, output_file):
    """
    Convert the multi-class threat dataset to a binary classification dataset.
    
    Args:
        input_file: Path to the original dataset CSV file
        output_file: Path to save the binary dataset CSV file
    """
    print(f"Reading input dataset from {input_file}")
    df = pd.read_csv(input_file)
    
    # Print the original class distribution
    print("Original class distribution:")
    print(df['class'].value_counts())
    
    # Convert to binary classification: 
    # "Non-threat/Neutral" -> "Non-threat"
    # All other classes -> "Threat"
    df['binary_class'] = df['class'].apply(
        lambda x: "Non-threat" if x == "Non-threat/Neutral" else "Threat"
    )
    
    # Print the new binary class distribution
    print("\nBinary class distribution:")
    print(df['binary_class'].value_counts())
    
    # Create the binary dataset with 'content' and 'binary_class' columns
    binary_df = df[['content', 'binary_class']]
    binary_df.rename(columns={'binary_class': 'class'}, inplace=True)
    
    # Save the binary dataset
    binary_df.to_csv(output_file, index=False)
    print(f"Binary dataset saved to {output_file}")
    
    # Create train/test split to verify dataset
    train_df, test_df = train_test_split(binary_df, test_size=0.2, random_state=42, stratify=binary_df['class'])
    train_output = os.path.splitext(output_file)[0] + '_train.csv'
    test_output = os.path.splitext(output_file)[0] + '_test.csv'
    
    train_df.to_csv(train_output, index=False)
    test_df.to_csv(test_output, index=False)
    print(f"Train dataset saved to {train_output}")
    print(f"Test dataset saved to {test_output}")

if __name__ == "__main__":
    input_file = "data/combined_dataset.csv"
    output_file = "data/stage1_binary_dataset.csv"
    create_binary_dataset(input_file, output_file) 