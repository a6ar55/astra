#!/usr/bin/env python3

from firebase_config import get_firestore_db, initialize_firebase
from rag_service_v2 import enhanced_rag_service
import json

def debug_firebase_and_rag():
    print("=== FIREBASE AND RAG DEBUG ===")
    
    # Initialize Firebase
    initialize_firebase()
    db = get_firestore_db()
    
    # Check users collection
    users_ref = db.collection('users')
    users = list(users_ref.stream())
    print(f"\nFound {len(users)} users:")
    
    total_analysis_history = 0
    total_threat_reports = 0
    total_summary_reports = 0
    
    for user_doc in users:
        user_data = user_doc.to_dict()
        user_id = user_doc.id
        print(f"\n📊 User ID: {user_id}")
        print(f"   Email: {user_data.get('email', 'N/A')}")
        
        # Check user subcollections
        analysis_history = list(users_ref.document(user_id).collection('analysis_history').stream())
        print(f"   - Analysis history: {len(analysis_history)} items")
        total_analysis_history += len(analysis_history)
        
        # Sample some analysis history for debugging
        for i, doc in enumerate(analysis_history[:3]):  # Show first 3
            doc_data = doc.to_dict()
            print(f"     [{i+1}] Prediction: {doc_data.get('prediction', {}).get('predicted_class', 'Unknown')}")
            print(f"         Text: {doc_data.get('text', '')[:100]}...")
        
        threat_reports = list(users_ref.document(user_id).collection('threat_reports').stream())
        print(f"   - Threat reports: {len(threat_reports)} items")
        total_threat_reports += len(threat_reports)
        
        # Sample threat reports
        for i, doc in enumerate(threat_reports[:2]):  # Show first 2
            doc_data = doc.to_dict()
            print(f"     [{i+1}] Title: {doc_data.get('title', 'No title')}")
            print(f"         Type: {doc_data.get('threat_type', 'Unknown')}")
        
        summary_reports = list(users_ref.document(user_id).collection('summary_reports').stream())
        print(f"   - Summary reports: {len(summary_reports)} items")
        total_summary_reports += len(summary_reports)
        
        # Sample summary reports
        for i, doc in enumerate(summary_reports[:2]):  # Show first 2
            doc_data = doc.to_dict()
            print(f"     [{i+1}] Title: {doc_data.get('title', 'No title')}")
            print(f"         Type: {doc_data.get('summary_type', 'Unknown')}")
    
    print(f"\n=== TOTALS ===")
    print(f"Analysis History: {total_analysis_history}")
    print(f"Threat Reports: {total_threat_reports}")
    print(f"Summary Reports: {total_summary_reports}")
    
    # Check RAG status
    print(f"\n=== RAG STATUS ===")
    rag_status = enhanced_rag_service.debug_status()
    print(f"Reports cached: {rag_status['reports_cached']}")
    print(f"Embeddings cached: {rag_status['embeddings_cached']}")
    
    return {
        'total_analysis_history': total_analysis_history,
        'total_threat_reports': total_threat_reports,
        'total_summary_reports': total_summary_reports,
        'rag_reports_cached': rag_status['reports_cached']
    }

def manually_index_firebase_data():
    """Manually index existing Firebase data into RAG"""
    print("\n=== MANUALLY INDEXING FIREBASE DATA ===")
    
    initialize_firebase()
    db = get_firestore_db()
    
    users_ref = db.collection('users')
    users = list(users_ref.stream())
    
    indexed_count = 0
    
    for user_doc in users:
        user_id = user_doc.id
        print(f"\n🔄 Processing user: {user_id}")
        
        # Index analysis history
        analysis_history = list(users_ref.document(user_id).collection('analysis_history').stream())
        for doc in analysis_history:
            doc_data = doc.to_dict()
            text = doc_data.get('text', '')
            prediction = doc_data.get('prediction', {})
            
            if text and prediction:
                try:
                    success = enhanced_rag_service.add_prediction_analysis(
                        user_id=user_id,
                        text=text,
                        prediction_result=prediction,
                        source='firebase_migration'
                    )
                    if success:
                        indexed_count += 1
                except Exception as e:
                    print(f"   ❌ Error indexing analysis: {e}")
        
        # Index threat reports
        threat_reports = list(users_ref.document(user_id).collection('threat_reports').stream())
        for doc in threat_reports:
            doc_data = doc.to_dict()
            try:
                success = enhanced_rag_service.add_threat_report(
                    user_id=user_id,
                    report_data=doc_data,
                    source='firebase_migration'
                )
                if success:
                    indexed_count += 1
            except Exception as e:
                print(f"   ❌ Error indexing threat report: {e}")
        
        # Index summary reports
        summary_reports = list(users_ref.document(user_id).collection('summary_reports').stream())
        for doc in summary_reports:
            doc_data = doc.to_dict()
            try:
                success = enhanced_rag_service.add_summary_report(
                    user_id=user_id,
                    report_data=doc_data,
                    source='firebase_migration'
                )
                if success:
                    indexed_count += 1
            except Exception as e:
                print(f"   ❌ Error indexing summary report: {e}")
    
    print(f"\n✅ Successfully indexed {indexed_count} items into RAG")
    
    # Check updated RAG status
    updated_status = enhanced_rag_service.debug_status()
    print(f"Updated RAG status: {updated_status['reports_cached']} reports cached")
    
    return indexed_count

if __name__ == "__main__":
    # First debug what's in Firebase
    stats = debug_firebase_and_rag()
    
    # If we have data in Firebase but not in RAG, index it
    if (stats['total_analysis_history'] > 0 or 
        stats['total_threat_reports'] > 0 or 
        stats['total_summary_reports'] > 0) and stats['rag_reports_cached'] == 0:
        
        print("\n🚨 Found Firebase data but RAG is empty. Running migration...")
        indexed_count = manually_index_firebase_data()
        print(f"Migration complete: {indexed_count} items indexed")
    else:
        print("\n✅ RAG is already populated or no data to migrate") 