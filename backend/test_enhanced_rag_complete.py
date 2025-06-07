"""
Comprehensive test script for the Enhanced RAG System
Tests all aspects including threat reports, summary reports, ML predictions, and chatbot integration
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any

# Configure logging for better visibility
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_enhanced_rag_system():
    """Comprehensive test of the enhanced RAG system"""
    
    try:
        # Import the enhanced RAG service
        from rag_service_v2 import enhanced_rag_service
        from chat_service import threat_ai
        
        print("🚀 ENHANCED RAG SYSTEM COMPREHENSIVE TEST")
        print("=" * 60)
        
        # Test 1: System Status
        print("\n📊 TEST 1: System Status")
        status = enhanced_rag_service.debug_status()
        print(f"   Database: {status['database_path']}")
        print(f"   Model Loaded: {status['model_loaded']}")
        print(f"   Initial Reports: {status['reports_cached']}")
        print(f"   Report Types: {status['report_types']}")
        print(f"   Users: {status['users']}")
        
        # Test 2: Add Sample Threat Reports
        print("\n📝 TEST 2: Adding Sample Threat Reports")
        
        threat_reports = [
            {
                "title": "Network Intrusion Detected - Critical Alert",
                "threat_type": "Network Intrusion",
                "description": "Detected unauthorized access attempt from IP 192.168.1.100. Multiple failed login attempts followed by successful breach of web server. Attacker attempted to access sensitive customer database.",
                "severity": "Critical",
                "recommendations": [
                    "Immediately block IP 192.168.1.100",
                    "Change all administrative passwords", 
                    "Review web server logs for data exfiltration",
                    "Implement additional network monitoring"
                ],
                "affected_systems": ["Web Server", "Customer Database"],
                "detection_time": "2024-01-15T10:30:00Z"
            },
            {
                "title": "Phishing Campaign Targeting Employees",
                "threat_type": "Phishing",
                "description": "Multiple employees received sophisticated phishing emails impersonating IT support. Emails request credential updates and contain malicious links leading to credential harvesting sites.",
                "severity": "High", 
                "recommendations": [
                    "Send company-wide phishing alert",
                    "Block malicious domains",
                    "Conduct security awareness training",
                    "Review email security filters"
                ],
                "indicators_of_compromise": ["malicious-site.com", "fake-it-portal.net"],
                "affected_departments": ["HR", "Finance", "Sales"]
            },
            {
                "title": "Malware Detection - Ransomware Strain",
                "threat_type": "Malware",
                "description": "Advanced ransomware strain detected on endpoint systems. Malware appears to be a variant of LockBit targeting file shares and backup systems. Immediate containment required.",
                "severity": "Critical",
                "recommendations": [
                    "Isolate infected systems immediately",
                    "Activate incident response team",
                    "Do not pay ransom demands",
                    "Restore from clean backups"
                ],
                "malware_family": "LockBit Variant",
                "encryption_targets": ["File shares", "Backup systems"]
            }
        ]
        
        for i, report in enumerate(threat_reports, 1):
            user_id = f"test_user_{i}"
            success = enhanced_rag_service.add_threat_report(user_id, report, f"test_threat_{i}")
            print(f"   ✅ Threat Report {i}: {'SUCCESS' if success else 'FAILED'} - {report['title'][:50]}...")
        
        # Test 3: Add Sample Summary Reports
        print("\n📊 TEST 3: Adding Sample Summary Reports")
        
        summary_reports = [
            {
                "title": "Weekly Threat Intelligence Summary",
                "summary_type": "Weekly Intelligence",
                "executive_summary": "This week showed increased phishing activity targeting financial services. Network intrusion attempts rose 45% compared to last week. Three critical vulnerabilities were identified in commonly used enterprise software.",
                "key_findings": [
                    "Phishing attacks increased 60% targeting financial sector",
                    "Network intrusions up 45% week-over-week",
                    "Three zero-day vulnerabilities discovered in enterprise software",
                    "Ransomware groups shifting tactics to target backup systems"
                ],
                "recommendations": [
                    "Enhance email security filtering",
                    "Patch enterprise software immediately",
                    "Review backup security configurations",
                    "Increase network monitoring sensitivity"
                ],
                "threat_landscape": "Financial services under heavy attack",
                "period": "January 8-14, 2024"
            },
            {
                "title": "Monthly Security Posture Assessment",
                "summary_type": "Security Assessment",
                "executive_summary": "Overall security posture has improved with implementation of new monitoring tools. However, gaps remain in endpoint security and user awareness. Threat actors are adapting to our defensive measures.",
                "key_findings": [
                    "Network monitoring effectiveness increased 80%",
                    "Endpoint security coverage gaps identified",
                    "User security awareness training needed",
                    "Advanced persistent threats showing new techniques"
                ],
                "recommendations": [
                    "Deploy additional endpoint protection",
                    "Mandatory security training for all staff",
                    "Implement zero-trust architecture",
                    "Enhance threat hunting capabilities"
                ],
                "security_score": "7.2/10",
                "assessment_period": "December 2023"
            }
        ]
        
        for i, report in enumerate(summary_reports, 1):
            user_id = f"test_user_{i}"
            success = enhanced_rag_service.add_summary_report(user_id, report, f"test_summary_{i}")
            print(f"   ✅ Summary Report {i}: {'SUCCESS' if success else 'FAILED'} - {report['title'][:50]}...")
        
        # Test 4: Add Sample ML Predictions  
        print("\n🤖 TEST 4: Adding Sample ML Predictions")
        
        ml_predictions = [
            {
                "text": "Urgent: Your account has been compromised. Click here to secure it immediately: http://malicious-site.com/secure",
                "prediction_result": {
                    "predicted_class": "Phishing/Scam",
                    "confidence": 0.94,
                    "probabilities": {
                        "Phishing/Scam": 0.94,
                        "Harassment and Intimidation": 0.03,
                        "Not a Threat": 0.03
                    }
                }
            },
            {
                "text": "I will hack into your systems and steal all your data if you don't pay me $10,000 in Bitcoin within 24 hours.",
                "prediction_result": {
                    "predicted_class": "Direct Violence Threats",
                    "confidence": 0.91,
                    "probabilities": {
                        "Direct Violence Threats": 0.91,
                        "Criminal Activity": 0.07,
                        "Not a Threat": 0.02
                    }
                }
            },
            {
                "text": "Meeting scheduled for tomorrow at 2 PM in conference room B. Please bring quarterly reports.",
                "prediction_result": {
                    "predicted_class": "Non-threat/Neutral",
                    "confidence": 0.98,
                    "probabilities": {
                        "Non-threat/Neutral": 0.98,
                        "Not a Threat": 0.02
                    }
                }
            }
        ]
        
        for i, item in enumerate(ml_predictions, 1):
            user_id = f"prediction_user_{i}"
            success = enhanced_rag_service.add_prediction_analysis(
                user_id, 
                item["text"], 
                item["prediction_result"], 
                f"test_ml_{i}"
            )
            threat_class = item["prediction_result"]["predicted_class"]
            print(f"   ✅ ML Prediction {i}: {'SUCCESS' if success else 'FAILED'} - {threat_class}")
        
        # Test 5: Search and Context Generation
        print("\n🔍 TEST 5: Search and Context Generation")
        
        test_queries = [
            "network intrusion",
            "phishing attack",
            "malware ransomware", 
            "security assessment summary",
            "threat intelligence weekly",
            "employee training recommendations",
            "backup system security"
        ]
        
        for query in test_queries:
            # Test search functionality
            search_results = enhanced_rag_service.search_reports(query, top_k=3, similarity_threshold=0.1)
            
            # Test context generation
            context = enhanced_rag_service.get_context_for_query(query, max_reports=2)
            
            print(f"   🔍 Query: '{query}'")
            print(f"      📊 Search Results: {len(search_results)} reports found")
            if search_results:
                for result in search_results[:2]:
                    print(f"         - {result['report']['report_type']} (similarity: {result['similarity']:.3f})")
            print(f"      📝 Context Length: {len(context)} characters")
            print()
        
        # Test 6: Chatbot Integration Test
        print("\n💬 TEST 6: Chatbot Integration")
        
        chat_tests = [
            "Give me a summary of all threat reports",
            "What network security issues have been detected?", 
            "Tell me about phishing threats",
            "What are the current security recommendations?",
            "Show me critical alerts",
            "What malware has been detected?"
        ]
        
        print("   Testing chatbot with enhanced RAG context...")
        for question in chat_tests[:3]:  # Test first 3 to avoid too much output
            try:
                # Get context from enhanced RAG
                context = enhanced_rag_service.get_context_for_query(question, max_reports=2)
                context_found = "No relevant threat intelligence found" not in context
                
                # Generate AI response
                ai_response = threat_ai.analyze_with_context(question, context)
                
                print(f"   💬 Q: {question}")
                print(f"      🧠 Context Found: {'YES' if context_found else 'NO'}")
                print(f"      🤖 Response Length: {len(ai_response)} characters")
                print(f"      📄 Response Preview: {ai_response[:100]}...")
                print()
                
                # Save conversation
                enhanced_rag_service.save_conversation(
                    "test_chat_user", 
                    question, 
                    ai_response, 
                    context if context_found else None,
                    len(enhanced_rag_service.search_reports(question, top_k=3))
                )
                
            except Exception as e:
                print(f"   ❌ Chat test failed for: {question} - Error: {e}")
        
        # Test 7: Final System Status
        print("\n📈 TEST 7: Final System Status")
        final_status = enhanced_rag_service.debug_status()
        print(f"   📊 Total Reports Cached: {final_status['reports_cached']}")
        print(f"   📋 Report Types: {final_status['report_types']}")
        print(f"   👥 Users: {len(final_status['users'])}")
        print(f"   🔗 Sources: {final_status['sources']}")
        
        # Test conversation history
        history = enhanced_rag_service.get_conversation_history("test_chat_user", limit=5)
        print(f"   💬 Conversations Saved: {len(history)}")
        
        print("\n✅ ENHANCED RAG SYSTEM TEST COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        logger.exception("Full test error:")
        return False

def test_specific_user_scenario():
    """Test a specific user scenario to verify RAG is working for specific users"""
    
    try:
        from rag_service_v2 import enhanced_rag_service
        
        print("\n🎯 SPECIFIC USER SCENARIO TEST")
        print("=" * 40)
        
        user_id = "demo_user_123"
        
        # Add user-specific reports
        user_threat = {
            "title": "Credential Theft Incident - Demo User",
            "threat_type": "Credential Theft",
            "description": "Demo user's credentials were compromised through a targeted spear-phishing attack. Attacker gained access to email and attempted to access financial systems.",
            "severity": "High",
            "recommendations": ["Force password reset", "Enable 2FA", "Monitor account activity"]
        }
        
        user_summary = {
            "title": "Demo User Security Assessment",
            "summary_type": "Personal Assessment", 
            "executive_summary": "Demo user shows high risk due to recent credential compromise. Immediate security measures needed.",
            "key_findings": ["Credentials compromised", "Financial systems targeted", "Need enhanced monitoring"],
            "recommendations": ["Immediate password change", "2FA implementation", "Security training"]
        }
        
        # Add reports for this specific user
        enhanced_rag_service.add_threat_report(user_id, user_threat, "demo_threat")
        enhanced_rag_service.add_summary_report(user_id, user_summary, "demo_summary")
        
        # Test user-specific search
        user_results = enhanced_rag_service.search_reports("credential theft", user_id, top_k=5)
        all_results = enhanced_rag_service.search_reports("credential theft", top_k=5)
        
        print(f"   🔍 User-specific search: {len(user_results)} results")
        print(f"   🔍 Global search: {len(all_results)} results")
        
        # Test user-specific context
        user_context = enhanced_rag_service.get_context_for_query("my security status", user_id)
        print(f"   📝 User context length: {len(user_context)} characters")
        print(f"   ✅ Context contains user data: {'Demo User' in user_context}")
        
        return True
        
    except Exception as e:
        print(f"❌ User scenario test failed: {e}")
        return False

async def main():
    """Main test runner"""
    print("🧪 STARTING ENHANCED RAG COMPREHENSIVE TESTS")
    print("=" * 70)
    
    # Run system test
    system_test_passed = test_enhanced_rag_system()
    
    # Run user scenario test
    user_test_passed = test_specific_user_scenario()
    
    print(f"\n🏁 FINAL RESULTS:")
    print(f"   System Test: {'✅ PASSED' if system_test_passed else '❌ FAILED'}")
    print(f"   User Test: {'✅ PASSED' if user_test_passed else '❌ FAILED'}")
    print(f"   Overall: {'✅ ALL TESTS PASSED' if system_test_passed and user_test_passed else '❌ SOME TESTS FAILED'}")

if __name__ == "__main__":
    asyncio.run(main())