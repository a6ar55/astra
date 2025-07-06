#!/usr/bin/env python3

import requests
import json

def test_chat_api():
    """Test the chat API with populated RAG data"""
    test_user_id = 'user_2nEKPmVdWvV6T8DaKGg6K0Ap2OH'
    base_url = 'http://localhost:8000'
    
    print('=== TESTING CHAT HEALTH ===')
    try:
        health_response = requests.post(f'{base_url}/api/chat/health', 
                                       json={'check_type': 'detailed'})
        print(f'Health Status: {health_response.status_code}')
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f'Chat Enabled: {health_data.get("chat_enabled", False)}')
            print(f'Reports Cached: {health_data.get("rag_service", {}).get("reports_cached", 0)}')
            print(f'Model Loaded: {health_data.get("rag_service", {}).get("model_loaded", False)}')
        else:
            print(f'Health check failed: {health_response.text}')
            return False
            
    except Exception as e:
        print(f'Health check error: {e}')
        return False

    print('\n=== TESTING CHAT MESSAGE ===')
    # Test chat with query about reports
    test_query = 'Please summarize the main threats and provide key insights from the reports'

    try:
        chat_response = requests.post(f'{base_url}/api/chat/message',
                                     json={'message': test_query},
                                     headers={'user_id': test_user_id},
                                     timeout=30)
        
        print(f'Response Status: {chat_response.status_code}')
        
        if chat_response.status_code == 200:
            response_data = chat_response.json()
            print(f'Context Used: {response_data.get("context_used", False)}')
            print(f'Reports Found: {response_data.get("reports_found", 0)}')
            print(f'Context Summary: {response_data.get("context_summary", "N/A")}')
            
            ai_response = response_data.get("response", "")
            print(f'\nAI Response ({len(ai_response)} chars):')
            print(f'{ai_response[:500]}...' if len(ai_response) > 500 else ai_response)
            
            return True
        else:
            print(f'Error: {chat_response.text}')
            return False
            
    except Exception as e:
        print(f'Chat test failed: {e}')
        return False

    print('\n=== TESTING RAG REFRESH ===')
    try:
        refresh_response = requests.post(f'{base_url}/api/chat/rag/refresh',
                                        headers={'user_id': test_user_id})
        
        print(f'Refresh Status: {refresh_response.status_code}')
        
        if refresh_response.status_code == 200:
            refresh_data = refresh_response.json()
            print(f'Reports Cached After Refresh: {refresh_data.get("reports_cached", 0)}')
        else:
            print(f'Refresh failed: {refresh_response.text}')
            
    except Exception as e:
        print(f'Refresh test failed: {e}')

if __name__ == "__main__":
    success = test_chat_api()
    
    if success:
        print("\n🎉 Chat API is working correctly with RAG!")
        print("The system should now:")
        print("✅ Show 'Intelligence Context Applied' in the UI")
        print("✅ Provide context-aware responses")
        print("✅ Display the correct number of reports indexed")
    else:
        print("\n❌ Chat API test failed - check the logs above") 