import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path

stage1_dir = Path('../models/stage1_bin')
stage2_dir = Path('../models/stage2_multi')

print(f"Testing Stage 1 model load from {stage1_dir}")
try:
    tokenizer1 = AutoTokenizer.from_pretrained(stage1_dir)
    model1 = AutoModelForSequenceClassification.from_pretrained(stage1_dir)
    print("Stage 1 model loaded successfully.")
except Exception as e:
    print(f"Stage 1 model load error: {e}")

print(f"Testing Stage 2 model load from {stage2_dir}")
try:
    tokenizer2 = AutoTokenizer.from_pretrained(stage2_dir)
    model2 = AutoModelForSequenceClassification.from_pretrained(stage2_dir)
    print("Stage 2 model loaded successfully.")
    print(f"Stage 2 id2label: {getattr(model2.config, 'id2label', None)}")
except Exception as e:
    print(f"Stage 2 model load error: {e}") 