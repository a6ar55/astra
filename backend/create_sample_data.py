#!/usr/bin/env python3

from firebase_config import get_firestore_db, initialize_firebase, add_analysis_to_history
from rag_service_v2 import enhanced_rag_service
import json
from datetime import datetime, timedelta
import random

def create_sample_threat_data():
    """Create comprehensive sample threat data for testing RAG"""
    print("=== CREATING SAMPLE THREAT DATA ===")
    
    # Initialize Firebase
    initialize_firebase()
    db = get_firestore_db()
    
    # Sample user ID (you can change this to your actual user ID)
    test_user_id = "user_2nEKPmVdWvV6T8DaKGg6K0Ap2OH"  # Using the real user from Firebase
    
    # Sample threat analysis data
    threat_analyses = [
        {
            "text": "I'm going to hack into the government database and steal classified information about nuclear weapons.",
            "prediction": {
                "predicted_class": "Criminal Activity",
                "confidence": 0.95,
                "stage1_confidence": 0.92,
                "stage2_confidence": 0.98,
                "details": "High confidence criminal activity threat involving government systems and classified information",
                "risk_level": "CRITICAL"
            }
        },
        {
            "text": "Death to all politicians! I'm going to bring my rifle to the rally tomorrow and show them what real power looks like.",
            "prediction": {
                "predicted_class": "Direct Violence Threats",
                "confidence": 0.98,
                "stage1_confidence": 0.97,
                "stage2_confidence": 0.99,
                "details": "Explicit threat of violence against politicians with weapon mention",
                "risk_level": "CRITICAL"
            }
        },
        {
            "text": "Those people don't belong here. We should burn down their mosque and drive them out of our neighborhood.",
            "prediction": {
                "predicted_class": "Hate Speech/Extremism",
                "confidence": 0.89,
                "stage1_confidence": 0.85,
                "stage2_confidence": 0.93,
                "details": "Religious hate speech with incitement to violence and property destruction",
                "risk_level": "HIGH"
            }
        },
        {
            "text": "I know where you live. I'm watching you every day. Tonight, I'm going to make you pay for what you did.",
            "prediction": {
                "predicted_class": "Harassment and Intimidation",
                "confidence": 0.93,
                "stage1_confidence": 0.90,
                "stage2_confidence": 0.96,
                "details": "Stalking behavior with implied threat of harm",
                "risk_level": "HIGH"
            }
        },
        {
            "text": "I can get you young girls, no questions asked. They're fresh and eager to please. Meet me at the usual place.",
            "prediction": {
                "predicted_class": "Child Safety Threats",
                "confidence": 0.96,
                "stage1_confidence": 0.94,
                "stage2_confidence": 0.98,
                "details": "Explicit child trafficking and exploitation threat",
                "risk_level": "CRITICAL"
            }
        },
        {
            "text": "Planning to distribute malware through fake security updates to steal banking credentials from major financial institutions.",
            "prediction": {
                "predicted_class": "Criminal Activity",
                "confidence": 0.91,
                "stage1_confidence": 0.88,
                "stage2_confidence": 0.94,
                "details": "Cybercrime threat targeting financial sector with malware distribution",
                "risk_level": "HIGH"
            }
        }
    ]
    
    # Sample threat reports
    threat_reports = [
        {
            "title": "Critical Infrastructure Cyber Attack Plot",
            "threat_type": "Cyber Terrorism",
            "severity": "Critical",
            "description": "Intercepted communications indicate coordinated plan to attack power grid infrastructure using advanced persistent threats. Multiple threat actors involved with state-level backing.",
            "date_created": datetime.now().isoformat(),
            "status": "Active Investigation",
            "affected_systems": ["Power Grid", "Communication Networks"],
            "recommendations": [
                "Increase monitoring of critical infrastructure",
                "Coordinate with DHS and FBI",
                "Implement additional access controls"
            ]
        },
        {
            "title": "Domestic Extremist Group Activity",
            "threat_type": "Domestic Terrorism",
            "severity": "High",
            "description": "Intelligence suggests local extremist group planning attack on government building. Group has been acquiring weapons and conducting surveillance.",
            "date_created": (datetime.now() - timedelta(days=2)).isoformat(),
            "status": "Under Surveillance",
            "affected_systems": ["Government Facilities", "Public Safety"],
            "recommendations": [
                "Enhanced security at target locations",
                "Coordinate with local law enforcement",
                "Monitor social media channels"
            ]
        },
        {
            "title": "International Drug Trafficking Network",
            "threat_type": "Organized Crime",
            "severity": "High",
            "description": "Large-scale drug trafficking operation using encrypted messaging and cryptocurrency payments. Network spans multiple countries.",
            "date_created": (datetime.now() - timedelta(days=5)).isoformat(),
            "status": "Multi-Agency Investigation",
            "affected_systems": ["Border Security", "Financial Systems"],
            "recommendations": [
                "Increase border inspection protocols",
                "Monitor cryptocurrency transactions",
                "International cooperation required"
            ]
        }
    ]
    
    # Sample summary reports
    summary_reports = [
        {
            "title": "Weekly Threat Intelligence Summary",
            "summary_type": "Weekly Intelligence",
            "date_created": datetime.now().isoformat(),
            "period": "Week of " + (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
            "executive_summary": "This week saw a significant increase in cyber threats targeting financial institutions. Three major threat actors have been identified planning coordinated attacks.",
            "key_findings": [
                "15% increase in phishing attacks targeting banks",
                "New malware variant discovered affecting payment systems",
                "State-sponsored actor linked to infrastructure probing"
            ],
            "threat_trends": [
                "Cryptocurrency-related cybercrime up 25%",
                "AI-generated deepfake threats emerging",
                "Supply chain attacks becoming more sophisticated"
            ],
            "recommendations": [
                "Update security protocols for financial sector",
                "Increase awareness training for employees",
                "Enhance monitoring of cryptocurrency transactions"
            ]
        },
        {
            "title": "Monthly Domestic Terrorism Assessment",
            "summary_type": "Monthly Assessment",
            "date_created": (datetime.now() - timedelta(days=15)).isoformat(),
            "period": "Month of " + (datetime.now() - timedelta(days=30)).strftime("%Y-%m"),
            "executive_summary": "Domestic extremist activity has shown concerning patterns with increased recruitment and coordination. Several groups are showing signs of operational planning.",
            "key_findings": [
                "12 active extremist groups identified",
                "Social media recruitment up 30%",
                "Weapons acquisition patterns detected"
            ],
            "threat_trends": [
                "Shift towards decentralized cell structure",
                "Increased use of encrypted communications",
                "Targeting of soft targets identified"
            ],
            "recommendations": [
                "Enhanced monitoring of extremist forums",
                "Coordinate with social media platforms",
                "Increase security at public events"
            ]
        }
    ]
    
    # Add data to Firebase and RAG
    print(f"\n🔄 Adding data for user: {test_user_id}")
    
    added_count = 0
    
    # Add threat analyses to Firebase and RAG
    print("\n📊 Adding threat analyses...")
    for i, analysis in enumerate(threat_analyses):
        try:
            # Add to Firebase
            history_item = add_analysis_to_history(test_user_id, analysis["text"], analysis["prediction"])
            if history_item:
                print(f"   ✅ Added analysis {i+1} to Firebase")
                
                # Add to RAG
                success = enhanced_rag_service.add_prediction_analysis(
                    user_id=test_user_id,
                    text=analysis["text"],
                    prediction_result=analysis["prediction"],
                    source='sample_data'
                )
                if success:
                    added_count += 1
                    print(f"   ✅ Added analysis {i+1} to RAG")
        except Exception as e:
            print(f"   ❌ Error adding analysis {i+1}: {e}")
    
    # Add threat reports to Firebase and RAG
    print("\n📋 Adding threat reports...")
    users_ref = db.collection('users')
    for i, report in enumerate(threat_reports):
        try:
            # Add to Firebase
            doc_ref = users_ref.document(test_user_id).collection('threat_reports').add(report)
            print(f"   ✅ Added threat report {i+1} to Firebase")
            
            # Add to RAG
            success = enhanced_rag_service.add_threat_report(
                user_id=test_user_id,
                report_data=report,
                source='sample_data'
            )
            if success:
                added_count += 1
                print(f"   ✅ Added threat report {i+1} to RAG")
        except Exception as e:
            print(f"   ❌ Error adding threat report {i+1}: {e}")
    
    # Add summary reports to Firebase and RAG
    print("\n📑 Adding summary reports...")
    for i, report in enumerate(summary_reports):
        try:
            # Add to Firebase
            doc_ref = users_ref.document(test_user_id).collection('summary_reports').add(report)
            print(f"   ✅ Added summary report {i+1} to Firebase")
            
            # Add to RAG
            success = enhanced_rag_service.add_summary_report(
                user_id=test_user_id,
                report_data=report,
                source='sample_data'
            )
            if success:
                added_count += 1
                print(f"   ✅ Added summary report {i+1} to RAG")
        except Exception as e:
            print(f"   ❌ Error adding summary report {i+1}: {e}")
    
    print(f"\n✅ Sample data creation complete!")
    print(f"   Total items added to RAG: {added_count}")
    
    # Check final RAG status
    final_status = enhanced_rag_service.debug_status()
    print(f"   Final RAG reports cached: {final_status['reports_cached']}")
    
    return added_count

def test_rag_search():
    """Test RAG search functionality with sample data"""
    print("\n=== TESTING RAG SEARCH ===")
    
    test_queries = [
        "summarize the reports",
        "what are the main threats",
        "cyber attack information",
        "extremist group activity",
        "critical threats this week"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Testing query: '{query}'")
        
        # Test search
        results = enhanced_rag_service.search_reports(query, top_k=3, similarity_threshold=0.1)
        print(f"   Found {len(results)} results")
        
        # Test context generation
        context = enhanced_rag_service.get_context_for_query(query, max_reports=2)
        has_context = "No relevant threat intelligence found" not in context
        print(f"   Context generated: {'Yes' if has_context else 'No'}")
        
        if has_context:
            print(f"   Context preview: {context[:150]}...")

if __name__ == "__main__":
    # Create sample data
    added_count = create_sample_threat_data()
    
    if added_count > 0:
        # Test RAG functionality
        test_rag_search()
        
        print(f"\n🎉 RAG system is now ready for testing!")
        print(f"   You can test the chat interface with queries like:")
        print(f"   - 'Summarize the threat reports'")
        print(f"   - 'What are the main security concerns?'")
        print(f"   - 'Tell me about the cyber threats'")
    else:
        print(f"\n❌ No data was added. Please check the errors above.") 