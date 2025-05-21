"""
Deprecated database module notice.

This module is retained for backward compatibility, but its functionality
has been replaced by Firebase. See firebase_config.py in the parent directory.
"""

# This file is kept to maintain backward compatibility
# Firebase is now used for all database operations

"""
Database package initialization
"""
from database.db import init_db, get_db
from database.models import User, ThreatStats, ThreatCategory, AnalysisHistory 