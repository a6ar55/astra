#!/usr/bin/env python3
"""
Enhanced Chat Service Test - Gemini Integration
Tests the updated chat service with Google Gemini API
"""

import os
import sys
import traceback
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from chat_service import ThreatAnalysisAI
from rag_service import rag_service

# Load environment variables
load_dotenv()
load_dotenv('../.env')
load_dotenv('../../.env')

def test_health_check():
    """Test the health check functionality"""
    print("🔍 Testing Health Check...")
    try:
        threat_ai = ThreatAnalysisAI()
        health = threat_ai.health_check()
        print(f"   Status: {health.get('status', 'unknown')}")
        print(f"   Service: {health.get('service', 'unknown')}")
        print(f"🔑 Gemini API Key Configured: {health.get('api_key_configured', False)}")
        return health.get('status') == 'healthy'
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        if not threat_ai.api_key:
            print("❌ No Gemini API key found. Please set GEMINI_API_KEY environment variable.")
        return False

def test_basic_conversation():
    """Test basic conversation without RAG context"""
    print("\n💬 Testing Basic Conversation...")
    try:
        threat_ai = ThreatAnalysisAI()
        
        # Simple test message
        response = threat_ai.analyze_with_context("Hello, can you help me with threat analysis?")
        print(f"   Response received: {len(response)} characters")
        print(f"   Preview: {response[:100]}...")
        
        return len(response) > 0 and "error" not in response.lower()
        
    except Exception as e:
        print(f"❌ Basic conversation test failed: {str(e)}")
        return False

def test_rag_integration():
    """Test RAG integration with chat"""
    print("\n🔍 Testing RAG Integration...")
    try:
        # Add a test threat report if database is empty
        test_report = {
            "threat_type": "Malware",
            "description": "This is a test malware sample for testing purposes. It demonstrates typical malicious behavior patterns including file encryption and network communication.",
            "severity": "Medium",
            "indicators": ["suspicious_file.exe", "192.168.1.100"],
            "mitigation": ["Update antivirus", "Block IP address"]
        }
        
        # Save test report
        try:
            rag_service.save_report("1", "THREAT_ANALYSIS_REPORT", test_report)
            print("   ✅ Test data added to RAG")
        except Exception as e:
            print(f"   ℹ️ Test data save issue: {str(e)}")
        
        # Test RAG search
        test_query = "malware analysis"
        search_results = rag_service.search_reports(test_query, user_id="1")
        
        print(f"   Found {len(search_results)} relevant reports")
        
        if search_results:
            print("   Sample context:")
            for i, result in enumerate(search_results[:2]):
                report = result['report']
                similarity = result['similarity']
                print(f"     {i+1}. Similarity: {similarity:.3f} - {result['relevant_text'][:50]}...")
            
            # Convert search results to format expected by chat service
            context_data = []
            for result in search_results:
                report_data = result['report']['report_data']
                context_item = {
                    'threat_type': report_data.get('threat_type', 'Unknown'),
                    'description': report_data.get('description', ''),
                    'severity': report_data.get('severity', 'Unknown'),
                    'timestamp': result['report'].get('created_at', 'Unknown')
                }
                context_data.append(context_item)
        
            # Test chat with context
            threat_ai = ThreatAnalysisAI()
            response = threat_ai.analyze_with_context(test_query, context_data)
            
            if response and len(response) > 50:
                print("   ✅ RAG-enhanced response generated")
                print(f"   Response length: {len(response)} characters")
                return True
            else:
                print("   ❌ Poor RAG-enhanced response")
                return False
        else:
            print("   ⚠️ No search results found")
            # Test without context
            threat_ai = ThreatAnalysisAI()
            response = threat_ai.analyze_with_context(test_query)
            return len(response) > 0
        
    except Exception as e:
        print(f"❌ RAG integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def check_environment():
    """Check environment setup"""
    print("🔧 Checking Environment Setup...")
    
    # Check API key
    token = os.getenv('GEMINI_API_KEY')
    if token:
        print(f"✅ Gemini API key found: {token[:10]}...")
    else:
        print("❌ No Gemini API key found in environment")
        print("Please set: export GEMINI_API_KEY='your_api_key_here'")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🚀 Enhanced Chat Service Test - Gemini Integration")
    print("=" * 50)
    
    # Check environment first
    if not check_environment():
        print("\n❌ Environment setup incomplete. Exiting.")
        print("Please check your Gemini API key configuration.")
        return
    
    # Run tests
    tests = [
        ("Health Check", test_health_check),
        ("Basic Conversation", test_basic_conversation), 
        ("RAG Integration", test_rag_integration)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        except Exception as e:
            print(f"❌ FAIL {test_name}: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Chat service is working with Gemini.")
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
        
        # Provide helpful troubleshooting info
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Verify your Gemini API key is correct")
        print("2. Check API key permissions and quotas") 
        print("3. Ensure network connectivity to Gemini API")
        print("4. Review error messages above for specific issues")

if __name__ == "__main__":
    main() 