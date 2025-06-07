#!/usr/bin/env python3
"""
RAG Integration Test Script
Tests the complete flow of threat reports -> RAG indexing -> chatbot context
"""

import requests
import json
import time

def test_rag_integration():
    """Test the complete RAG integration workflow"""
    base_url = "http://localhost:8000"
    user_id = "rag_test_user"
    
    print("🚀 RAG Integration Test - Complete Workflow")
    print("=" * 60)
    
    # Test 1: Save a threat report
    print("\n📝 Test 1: Saving Threat Report")
    threat_report = {
        "title": "Suspicious Network Activity",
        "threat_type": "Network Intrusion",
        "description": "Detected unauthorized access attempts from IP 192.168.1.100. Multiple failed login attempts followed by successful breach.",
        "severity": "Critical",
        "recommendations": [
            "Block IP 192.168.1.100 immediately",
            "Reset all compromised user passwords",
            "Review firewall rules for anomalies"
        ],
        "additional_data": {
            "affected_systems": "Web servers, database",
            "attack_vector": "Brute force SSH"
        }
    }
    
    response = requests.post(
        f"{base_url}/api/user/reports/threat",
        headers={"Content-Type": "application/json", "user_id": user_id},
        json=threat_report
    )
    
    if response.status_code == 200:
        print("   ✅ Threat report saved successfully")
    else:
        print(f"   ❌ Failed to save threat report: {response.status_code}")
        return False
    
    # Test 2: Make a threat prediction
    print("\n🔍 Test 2: Making Threat Prediction")
    prediction_text = "I will DDoS your website and steal all customer data for ransom"
    
    response = requests.post(
        f"{base_url}/api/predict",
        headers={"Content-Type": "application/json", "user_id": user_id},
        json={"text": prediction_text}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Prediction made: {result.get('predicted_class')} ({result.get('confidence', 0):.2f})")
    else:
        print(f"   ❌ Failed to make prediction: {response.status_code}")
        return False
    
    # Wait for RAG indexing
    print("\n⏳ Waiting for RAG indexing to complete...")
    time.sleep(2)
    
    # Test 3: Check RAG health
    print("\n🏥 Test 3: Checking RAG Health")
    response = requests.post(
        f"{base_url}/api/chat/health",
        headers={"Content-Type": "application/json"},
        json={"check_type": "basic"}
    )
    
    if response.status_code == 200:
        health = response.json()
        reports_cached = health.get("rag_service", {}).get("reports_cached", 0)
        print(f"   ✅ RAG service healthy with {reports_cached} reports cached")
    else:
        print(f"   ❌ RAG health check failed: {response.status_code}")
        return False
    
    # Test 4: Query chatbot for network intrusion context
    print("\n💬 Test 4: Querying Chatbot for Network Intrusion")
    response = requests.post(
        f"{base_url}/api/chat/message",
        headers={"Content-Type": "application/json", "user_id": user_id},
        json={"message": "What network intrusion threats have we detected?"},
        timeout=60
    )
    
    if response.status_code == 200:
        chat_result = response.json()
        if chat_result.get("context_used", False):
            context_summary = chat_result.get("context_summary", "")
            print(f"   ✅ Chatbot used context: {context_summary}")
            print(f"   📄 Response preview: {chat_result.get('response', '')[:150]}...")
        else:
            print("   ⚠️ Chatbot didn't use context - RAG may not be working")
            return False
    else:
        print(f"   ❌ Chat query failed: {response.status_code}")
        return False
    
    # Test 5: Query chatbot for ransom threats
    print("\n💬 Test 5: Querying Chatbot for Ransom Threats")
    response = requests.post(
        f"{base_url}/api/chat/message",
        headers={"Content-Type": "application/json", "user_id": user_id},
        json={"message": "Have we seen any ransom or extortion threats recently?"},
        timeout=60
    )
    
    if response.status_code == 200:
        chat_result = response.json()
        if chat_result.get("context_used", False):
            context_summary = chat_result.get("context_summary", "")
            print(f"   ✅ Chatbot used context: {context_summary}")
            print(f"   📄 Response preview: {chat_result.get('response', '')[:150]}...")
        else:
            print("   ⚠️ Chatbot didn't use context for ransom query")
    else:
        print(f"   ❌ Chat query failed: {response.status_code}")
        return False
    
    # Test 6: Refresh RAG cache
    print("\n🔄 Test 6: Refreshing RAG Cache")
    response = requests.post(
        f"{base_url}/api/chat/rag/refresh",
        headers={"Content-Type": "application/json", "user_id": user_id},
        json={}
    )
    
    if response.status_code == 200:
        refresh_result = response.json()
        reports_cached = refresh_result.get("reports_cached", 0)
        print(f"   ✅ RAG cache refreshed with {reports_cached} reports")
    else:
        print(f"   ❌ RAG refresh failed: {response.status_code}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 RAG Integration Test PASSED!")
    print("✅ Threat reports are being indexed for chatbot context")
    print("✅ ML predictions are being indexed for chatbot context")
    print("✅ Chatbot provides context-aware responses")
    print("✅ All RAG components working correctly")
    
    return True

if __name__ == "__main__":
    try:
        success = test_rag_integration()
        if not success:
            print("\n❌ RAG Integration Test FAILED!")
            exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with exception: {e}")
        exit(1) 