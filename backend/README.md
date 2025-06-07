# Astra Threat Detection Platform Backend

This is the backend service for the Astra Threat Detection Platform, now using Firebase for data storage.

## Firebase Setup Instructions

Follow these steps to set up Firebase for your threat detection platform:

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click "Add project" and follow the prompts to create a new project.
3. Choose a project name (e.g., "astra-threat-detection").
4. Enable Google Analytics if desired (optional).
5. Click "Create project".

### 2. Set Up Firestore Database

1. In the Firebase Console, navigate to your project.
2. In the left sidebar, click "Firestore Database".
3. Click "Create database".
4. Choose "Start in production mode" and select a location that's close to your users.
5. Click "Enable".

### 3. Set Up Service Account Credentials

1. In the Firebase Console, click the gear icon ⚙️ next to "Project Overview" and select "Project settings".
2. Navigate to the "Service accounts" tab.
3. Click "Generate new private key".
4. A JSON file will be downloaded. This contains your Firebase service account credentials.
5. Rename this file to `firebase-credentials.json` and place it in the backend directory of your project.

> **IMPORTANT**: Never commit this file to version control. It contains sensitive credentials that should be kept private.

### 4. Configure Firebase Rules

1. In the Firebase Console, go to "Firestore Database" > "Rules" tab.
2. Configure rules to secure your data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Secure user data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow access to subcollections
      match /stats/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /categories/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /history/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish".

### 5. Install Dependencies

Install required Python dependencies:

```bash
pip install -r requirements.txt
```

### 6. Run the Application

Start the backend server:

```bash
python -m app.main
```

## API Endpoints

The API will be available at http://localhost:8000. Key endpoints include:

- `/health` - Health check endpoint
- `/api/predict` - Text threat analysis endpoint
- `/api/user/register` - Register or update a user
- `/api/user/stats` - Get user-specific threat statistics
- `/api/user/history` - Get user-specific analysis history

See the Swagger documentation at `/docs` for complete API details.

## Firebase Data Structure

The Firebase database is structured as follows:

```
users/
  {user_id}/
    - id: string
    - email: string
    - first_name: string (optional)
    - last_name: string (optional)
    - created_at: timestamp
    - updated_at: timestamp
    
    stats/
      threat_stats/
        - total_analyzed: number
        - threats_detected: number
        - high_severity: number
        - average_confidence: number
        - recent_change: number
        - last_updated: string
        - updated_at: timestamp
    
    categories/
      {category_id}/
        - category: string
        - count: number
        - trend: string (up, down, neutral)
        - percentage: number
        - updated_at: timestamp
    
    history/
      {history_id}/
        - user_id: string
        - text: string
        - result: object
        - timestamp: timestamp
```

## Environment Variables

You can configure the application using these environment variables:

- `FIREBASE_CREDENTIALS`: Path to the Firebase service account credentials JSON file (default: `firebase-credentials.json`) 