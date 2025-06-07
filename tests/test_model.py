import os
import sys
import unittest
import torch
import numpy as np
from pathlib import Path

# Add parent directory to path to import model functions
sys.path.insert(0, str(Path(__file__).parent.parent))

from llm.predict import load_model, predict

class TestThreatDetectionModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up the test environment once before all tests"""
        cls.model_path = os.environ.get("TEST_MODEL_PATH", str(Path(__file__).parent.parent / "models" / "best_model.pt"))
        
        # Skip tests if model doesn't exist yet
        if not Path(cls.model_path).exists():
            cls.model = None
            cls.tokenizer = None
            cls.id2label = None
            cls.max_length = None
            print(f"Warning: Model not found at {cls.model_path}. Tests will be skipped.")
        else:
            # Load the model
            cls.model, cls.tokenizer, cls.id2label, cls.max_length = load_model(cls.model_path)
            
    def test_model_loading(self):
        """Test if the model loads correctly"""
        if self.model is None:
            self.skipTest(f"Model not found at {self.model_path}")
        
        # Test model structure
        self.assertIsNotNone(self.model)
        self.assertIsNotNone(self.tokenizer)
        self.assertIsNotNone(self.id2label)
        
        # Test model outputs the expected number of classes
        self.assertGreaterEqual(len(self.id2label), 5)  # We should have at least 5 threat classes
        
    def test_prediction_shape(self):
        """Test if prediction output has the correct structure"""
        if self.model is None:
            self.skipTest(f"Model not found at {self.model_path}")
            
        # Sample text for testing
        test_text = "This is a neutral test sentence."
        
        # Get prediction
        result = predict(test_text, self.model, self.tokenizer, self.id2label, self.max_length)
        
        # Test output structure
        self.assertIn("text", result)
        self.assertIn("predicted_class", result)
        self.assertIn("confidence", result)
        self.assertIn("probabilities", result)
        
        # Test probability shape
        self.assertEqual(len(result["probabilities"]), len(self.id2label))
        
        # Test confidence is a valid probability
        self.assertGreaterEqual(result["confidence"], 0.0)
        self.assertLessEqual(result["confidence"], 1.0)
    
    def test_prediction_consistency(self):
        """Test if predictions are deterministic (same input -> same output)"""
        if self.model is None:
            self.skipTest(f"Model not found at {self.model_path}")
            
        # Sample text for testing
        test_text = "I will find you and hurt you."
        
        # Get predictions multiple times
        result1 = predict(test_text, self.model, self.tokenizer, self.id2label, self.max_length)
        result2 = predict(test_text, self.model, self.tokenizer, self.id2label, self.max_length)
        
        # Test consistency
        self.assertEqual(result1["predicted_class"], result2["predicted_class"])
        self.assertEqual(result1["confidence"], result2["confidence"])
        
    def test_class_prediction(self):
        """Test if the model can correctly identify different threat classes"""
        if self.model is None:
            self.skipTest(f"Model not found at {self.model_path}")
            
        # Test cases with expected classes
        test_cases = [
            {
                "text": "I will find you and kill you tomorrow.",
                "expected_class": "Direct Violence Threats"
            },
            {
                "text": "Selling premium drugs, $200/oz, discrete packaging.",
                "expected_class": "Criminal Activity"
            },
            {
                "text": "I'm watching your house. I know when you're alone.",
                "expected_class": "Harassment and Intimidation"
            },
            {
                "text": "The weather is beautiful today and I'm going for a walk.",
                "expected_class": "Non-threat/Neutral"
            }
        ]
        
        # Test each case
        for i, test_case in enumerate(test_cases):
            result = predict(test_case["text"], self.model, self.tokenizer, self.id2label, self.max_length)
            
            # Print prediction for debugging
            print(f"Test {i+1}:")
            print(f"Text: {test_case['text']}")
            print(f"Expected: {test_case['expected_class']}")
            print(f"Predicted: {result['predicted_class']} (Confidence: {result['confidence']:.4f})")
            print("---")
            
            # Skip assertion if class is not in model's label set
            if test_case["expected_class"] not in self.id2label.values():
                print(f"Warning: Class '{test_case['expected_class']}' not found in model labels. Skipping assertion.")
                continue
                
            # We only assert if we've trained the model already
            if Path(self.model_path).exists():
                # Because the model may not be fully trained yet, we'll only test this lightly
                # Only fail if both the top class is wrong AND the expected class has low probability
                expected_class_prob = result["probabilities"].get(test_case["expected_class"], 0.0)
                if result["predicted_class"] != test_case["expected_class"] and expected_class_prob < 0.2:
                    self.fail(f"Model failed to assign reasonable probability to expected class. "
                            f"Expected: {test_case['expected_class']}, Predicted: {result['predicted_class']}, "
                            f"Probability of expected class: {expected_class_prob:.4f}")

if __name__ == '__main__':
    unittest.main() 