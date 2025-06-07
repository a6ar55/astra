#!/usr/bin/env python3
"""
Comprehensive Chat Service Test Suite - OpenRouter Integration
Tests all aspects of the threat analysis chat system with OpenRouter API
"""

import os
import sys
import json
import asyncio
import traceback
from datetime import datetime
from typing import Dict, Any

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment variables from multiple locations
load_dotenv()
load_dotenv('../.env')
load_dotenv('../../.env')

def test_dependencies():
    """Test if all required dependencies are available"""
    print("📦 Testing Dependencies...")
    
    required_modules = [
        'requests',
        'sentence_transformers', 
        'numpy',
        'sqlite3',
        'dotenv'
    ]
    
    missing = []
    for module in required_modules:
        try:
            __import__(module if module != 'dotenv' else 'dotenv')
            print(f"   ✅ {module}")
        except ImportError:
            print(f"   ❌ {module}")
            missing.append(module)
    
    if missing:
        print(f"\n⚠️ Missing dependencies: {', '.join(missing)}")
        return False
    
    print("   ✅ All dependencies available")
    return True

def test_environment_setup():
    """Test environment configuration"""
    print("\n🔧 Testing Environment Setup...")
    
    # Check for OpenRouter API key
    openrouter_key = os.getenv('OPENROUTER_API_KEY')
    if openrouter_key:
        print(f"   ✅ OpenRouter API Key: {openrouter_key[:10]}...****")
    else:
        print("   ❌ OpenRouter API Key not found")
        print("      Set OPENROUTER_API_KEY environment variable")
        return False
    
    # Check database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'threat_reports.db')
    if os.path.exists(db_path):
        print(f"   ✅ Database exists: {db_path}")
    else:
        print(f"   ⚠️ Database not found: {db_path}")
        print("      Database will be created on first use")
    
    return True

def test_chat_service_import():
    """Test importing chat service"""
    print("\n📡 Testing Chat Service Import...")
    
    try:
        from chat_service import ThreatAnalysisAI
        print("   ✅ Chat service imported successfully")
        
        # Test initialization
        threat_ai = ThreatAnalysisAI()
        print("   ✅ ThreatAnalysisAI initialized")
        
        return threat_ai
        
    except Exception as e:
        print(f"   ❌ Import failed: {str(e)}")
        traceback.print_exc()
        return None

def test_rag_service_import():
    """Test importing RAG service"""
    print("\n🔍 Testing RAG Service Import...")
    
    try:
        from rag_service import rag_service
        print("   ✅ RAG service imported successfully")
        
        # Test basic functionality
        test_reports = rag_service.search_reports("test query", user_id=1)
        print(f"   ✅ RAG search returned {len(test_reports)} results")
        
        return True
        
    except Exception as e:
        print(f"   ❌ RAG import failed: {str(e)}")
        traceback.print_exc()
        return False

def test_health_check(threat_ai):
    """Test AI service health check"""
    print("\n🏥 Testing Health Check...")
    
    try:
        health = threat_ai.health_check()
        print(f"   Status: {health.get('status', 'unknown')}")
        print(f"   Service: {health.get('service', 'unknown')}")
        print(f"🔑 OpenRouter API Key Configured: {health.get('api_key_configured', False)}")
        print(f"   Timestamp: {health.get('timestamp', 'unknown')}")
        
        is_healthy = health.get('status') == 'healthy'
        
        if is_healthy:
            print("   ✅ Health check passed")
        else:
            print("   ❌ Health check failed")
            if 'error' in health:
                print(f"   Error: {health['error']}")
        
        return is_healthy
        
    except Exception as e:
        print(f"   ❌ Health check exception: {str(e)}")
        return False

def test_basic_chat(threat_ai):
    """Test basic chat functionality"""
    print("\n💬 Testing Basic Chat...")
    
    test_messages = [
        "Hello, can you help me with threat analysis?",
        "What is malware?",
        "How do I analyze suspicious network traffic?"
    ]
    
    results = []
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n   Test {i}: {message}")
        
        try:
            response = threat_ai.analyze_with_context(message)
            
            if response and len(response) > 10:
                print(f"   ✅ Response received ({len(response)} chars)")
                print(f"   Preview: {response[:100]}...")
                results.append(True)
            else:
                print(f"   ❌ Poor response: {response}")
                results.append(False)
                
        except Exception as e:
            print(f"   ❌ Chat failed: {str(e)}")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    print(f"\n   Success rate: {success_rate:.1f}% ({sum(results)}/{len(results)})")
    
    return success_rate >= 60  # At least 60% success rate

def test_rag_integration(threat_ai):
    """Test RAG integration with chat"""
    print("\n🔍 Testing RAG Integration...")
    
    # First, let's add some test data to make sure we have context
    try:
        from rag_service import rag_service
        
        # Add a test threat report if database is empty
        test_report = {
            'user_id': 1,
            'title': 'Test Malware Analysis',
            'threat_type': 'Malware',
            'description': 'This is a test malware sample for testing purposes. It demonstrates typical malicious behavior patterns.',
            'severity': 'Medium',
            'timestamp': datetime.now().isoformat()
        }
        
        # Try to add test data
        try:
            rag_service.add_threat_report(**test_report)
            print("   ✅ Test data added to RAG")
        except:
            print("   ℹ️ Test data may already exist")
        
        # Test RAG search
        context_data = rag_service.search_reports("malware analysis", user_id=1)
        print(f"   Found {len(context_data)} relevant reports")
        
        if context_data:
            # Test chat with context
            response = threat_ai.analyze_with_context(
                "Tell me about malware analysis techniques", 
                context_data
            )
            
            if response and len(response) > 50:
                print("   ✅ RAG-enhanced response generated")
                print(f"   Response length: {len(response)} characters")
                return True
            else:
                print("   ❌ Poor RAG-enhanced response")
                return False
        else:
            print("   ⚠️ No context data found for RAG test")
            return False
            
    except Exception as e:
        print(f"   ❌ RAG integration failed: {str(e)}")
        traceback.print_exc()
        return False

def test_conversation_history(threat_ai):
    """Test conversation history functionality"""
    print("\n📚 Testing Conversation History...")
    
    try:
        # Clear history first
        threat_ai.clear_conversation_history()
        
        # Send a few messages
        messages = [
            "What is phishing?",
            "How do I detect it?",
            "What are the prevention methods?"
        ]
        
        for msg in messages:
            threat_ai.analyze_with_context(msg)
        
        # Check history
        history = threat_ai.get_conversation_history()
        
        if len(history) >= 6:  # Should have user + assistant messages
            print(f"   ✅ History maintained ({len(history)} entries)")
            return True
        else:
            print(f"   ❌ History incomplete ({len(history)} entries)")
            return False
            
    except Exception as e:
        print(f"   ❌ History test failed: {str(e)}")
        return False

def main():
    """Run comprehensive test suite"""
    print("🚀 COMPREHENSIVE CHAT SERVICE TEST - OPENROUTER INTEGRATION")
    print("=" * 60)
    print(f"🕒 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Test results tracking
    test_results = []
    
    # 1. Dependencies
    deps_ok = test_dependencies()
    test_results.append(("Dependencies", deps_ok))
    
    if not deps_ok:
        print("\n❌ Dependency issues detected. Install requirements:")
        print("   pip install -r requirements.txt")
        return
    
    # 2. Environment
    env_ok = test_environment_setup()
    test_results.append(("Environment", env_ok))
    
    if not env_ok:
        print("\n❌ Environment setup incomplete")
        return
    
    # 3. Service imports
    threat_ai = test_chat_service_import()
    chat_import_ok = threat_ai is not None
    test_results.append(("Chat Service Import", chat_import_ok))
    
    rag_import_ok = test_rag_service_import()
    test_results.append(("RAG Service Import", rag_import_ok))
    
    if not chat_import_ok:
        print("\n❌ Chat service import failed. Cannot continue.")
        return
    
    # 4. Core functionality tests
    if threat_ai:
        health_ok = test_health_check(threat_ai)
        test_results.append(("Health Check", health_ok))
        
        if health_ok:
            basic_chat_ok = test_basic_chat(threat_ai)
            test_results.append(("Basic Chat", basic_chat_ok))
            
            if rag_import_ok:
                rag_ok = test_rag_integration(threat_ai)
                test_results.append(("RAG Integration", rag_ok))
            
            history_ok = test_conversation_history(threat_ai)
            test_results.append(("Conversation History", history_ok))
    
    # Test Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print("=" * 60)
    print(f"📈 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! Chat system is fully functional with OpenRouter.")
    elif passed >= total * 0.8:
        print("✅ Most tests passed. System is largely functional.")
    else:
        print("⚠️ Several tests failed. Check configuration and setup.")
    
    print("\n🔧 NEXT STEPS:")
    if passed == total:
        print("1. 🌐 Start the backend server: python main.py")
        print("2. 🖥️ Start the frontend: npm run dev")
        print("3. 🗨️ Test the chat interface in your browser")
    else:
        print("1. 🔑 Verify your OpenRouter API key is correctly set")
        print("2. 📦 Ensure all dependencies are installed")
        print("3. 🔄 Re-run this test after fixes")
        print("4. 📋 Check logs for specific error details")

if __name__ == "__main__":
    main() 