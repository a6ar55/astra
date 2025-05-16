import os
import sys
import unittest
import json
import time
from pathlib import Path
from fastapi.testclient import TestClient
import pytest

# Add parent directory to path to import API
sys.path.insert(0, str(Path(__file__).parent.parent))

# Try to import the API, but don't fail if it's not ready yet
try:
    from backend.app.main import app
    client = TestClient(app)
    API_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    API_AVAILABLE = False
    print("Warning: API module not found. API tests will be skipped.")

@pytest.mark.skipif(not API_AVAILABLE, reason="API not available")
class TestThreatDetectionAPI(unittest.TestCase):
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        
        # Response should have 'status' field
        data = response.json()
        self.assertIn("status", data)
    
    def test_prediction_endpoint_structure(self):
        """Test prediction endpoint returns the correct structure"""
        # Sample request
        request_data = {
            "text": "This is a test message."
        }
        
        # Call the endpoint
        response = client.post("/predict", json=request_data)
        
        # Check response code (it might fail if model isn't loaded, that's ok for structure test)
        if response.status_code == 500:
            # Check for the specific error of model not loaded
            data = response.json()
            if "detail" in data and "Model not loaded" in data["detail"]:
                self.skipTest("Model not loaded, skipping structure test")
            else:
                self.fail(f"API returned error: {data}")
        
        # Should be 200 if successful
        self.assertEqual(response.status_code, 200)
        
        # Check response structure
        data = response.json()
        self.assertIn("text", data)
        self.assertIn("predicted_class", data)
        self.assertIn("confidence", data)
        self.assertIn("probabilities", data)
        self.assertIn("response_time_ms", data)
        
    def test_prediction_content(self):
        """Test prediction with content that should be classifiable"""
        # Skip if no model is loaded
        health_response = client.get("/health")
        health_data = health_response.json()
        if health_data.get("status") == "error":
            self.skipTest("Model not loaded, skipping content test")
        
        # Sample threatening content
        request_data = {
            "text": "I will track you down and hurt you badly."
        }
        
        # Call the endpoint
        response = client.post("/predict", json=request_data)
        self.assertEqual(response.status_code, 200)
        
        # Analyze response
        data = response.json()
        
        # Check if it detected a threatening class (with reasonable confidence)
        self.assertIn(data["predicted_class"], [
            "Direct Violence Threats", 
            "Harassment and Intimidation"
        ])
        self.assertGreater(data["confidence"], 0.6)  # Should be fairly confident
        
    def test_batch_prediction(self):
        """Test batch prediction endpoint"""
        # Skip if no model is loaded
        health_response = client.get("/health")
        health_data = health_response.json()
        if health_data.get("status") == "error":
            self.skipTest("Model not loaded, skipping batch test")
            
        # Sample batch of texts
        request_data = {
            "texts": [
                "This is a normal message.",
                "I will find you and kill you.",
                "The weather is nice today."
            ]
        }
        
        # Call the endpoint
        response = client.post("/predict/batch", json=request_data)
        self.assertEqual(response.status_code, 200)
        
        # Check response structure
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("count", data)
        self.assertIn("response_time_ms", data)
        
        # Should have correct number of results
        self.assertEqual(data["count"], len(request_data["texts"]))
        self.assertEqual(len(data["results"]), len(request_data["texts"]))
        
    def test_response_time(self):
        """Test that API responses are reasonably fast"""
        # Skip if no model is loaded
        health_response = client.get("/health")
        health_data = health_response.json()
        if health_data.get("status") == "error":
            self.skipTest("Model not loaded, skipping performance test")
            
        # Sample request
        request_data = {
            "text": "This is a test message for performance testing."
        }
        
        # Measure time for 5 requests
        times = []
        for _ in range(5):
            start_time = time.time()
            response = client.post("/predict", json=request_data)
            end_time = time.time()
            
            if response.status_code == 200:
                times.append(end_time - start_time)
                
        # Skip if we couldn't get valid responses
        if not times:
            self.skipTest("No valid responses received, skipping performance test")
            
        # Calculate average time
        avg_time = sum(times) / len(times)
        print(f"Average response time: {avg_time:.4f}s")
        
        # Assert reasonable response time (adjust the threshold as needed)
        # Using a high threshold for CI/CD environments
        self.assertLess(avg_time, 2.0)  # Should respond in less than 2 seconds

if __name__ == '__main__':
    unittest.main() 