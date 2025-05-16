import os
import sys
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add app directory to path so we can import from it
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    # Import the model loader
    from app.model_loader import model_loader
    
    # Check possible model paths
    project_root = current_dir.parent.parent
    
    model_paths = [
        project_root / "models" / "best_model.pt",
        project_root / "models" / "best_model" / "pytorch_model.bin",
        project_root / "models" / "checkpoint-405" / "pytorch_model.bin",
    ]
    
    # Try each model path
    success = False
    for path in model_paths:
        logger.info(f"Trying to load model from: {path.absolute()}")
        if path.exists():
            logger.info(f"File exists at: {path.absolute()}")
            if model_loader.load_model(str(path)):
                logger.info(f"Successfully loaded model from {path}")
                success = True
                break
        else:
            logger.info(f"File does not exist at: {path.absolute()}")
    
    if not success:
        logger.error("Could not load model from any path")
    else:
        # Test the model with a sample prediction
        result = model_loader.predict("This is a test message")
        logger.info(f"Prediction result: {result}")
        
except Exception as e:
    logger.error(f"Error: {str(e)}")
    import traceback
    logger.error(traceback.format_exc()) 