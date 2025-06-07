#!/usr/bin/env python3
"""
Test script to verify API fixes are working
"""

import requests
import json

def test_chat_health():
    """Test chat health endpoint"""
    print('🔍 Testing chat health...')
    try:
        response = requests.post('http://localhost:8000/api/chat/health', json={'check_type': 'basic'})
        print(f'   Health Status: {response.status_code}')
        
        if response.status_code == 200:
            health = response.json()
            print(f'   Chat Enabled: {health.get("chat_enabled", False)}')
            print(f'   AI Service Status: {health.get("ai_service", {}).get("status", "unknown")}')
            print(f'   Model: {health.get("model", "unknown")}')
            return True
        else:
            print(f'   Error: {response.text}')
            return False
            
    except Exception as e:
        print(f'   Exception: {e}')
        return False

def test_chat_message():
    """Test chat message endpoint"""
    print('\n💬 Testing chat message...')
    try:
        response = requests.post('http://localhost:8000/api/chat/message', 
                                json={'message': 'Hello, what is threat analysis?'},
                                headers={'x-user-id': 'test_user'})
        print(f'   Chat Response Status: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            print(f'   ✅ Response received: {len(result.get("response", ""))} characters')
            print(f'   Context used: {result.get("context_used", False)}')
            print(f'   Model: {result.get("model", "unknown")}')
            print(f'   Preview: {result.get("response", "")[:100]}...')
            return True
        else:
            print(f'   ❌ Error: {response.text}')
            return False
            
    except Exception as e:
        print(f'   ❌ Exception: {e}')
        return False

def main():
    print("🚀 Testing API Fixes")
    print("=" * 30)
    
    health_ok = test_chat_health()
    message_ok = test_chat_message()
    
    print("\n" + "=" * 30)
    print("📊 RESULTS")
    print("=" * 30)
    
    print(f"✅ Health Check: {'PASS' if health_ok else 'FAIL'}")
    print(f"✅ Chat Message: {'PASS' if message_ok else 'FAIL'}")
    
    if health_ok and message_ok:
        print("\n🎉 All tests passed! Chat API is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the server logs for details.")

if __name__ == "__main__":
    main() 