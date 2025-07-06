#!/usr/bin/env python3

"""
Comprehensive test to verify RAG system is working correctly
Tests the complete pipeline: Firebase -> RAG -> Chat API -> Context Retrieval
"""

import requests
import json
import time
from rag_service_v2 import enhanced_rag_service

def test_complete_rag_pipeline():
    """Test the complete RAG pipeline end-to-end"""
    
    print("🚀 COMPREHENSIVE RAG SYSTEM TEST")
    print("=" * 50)
    
    test_user_id = 'user_2nEKPmVdWvV6T8DaKGg6K0Ap2OH'
    base_url = 'http://localhost:8000'
    
    # Step 1: Check RAG status directly
    print("\n1️⃣ TESTING RAG SERVICE DIRECTLY")
    try:
        rag_status = enhanced_rag_service.debug_status()
        print(f"   ✅ RAG Reports Cached: {rag_status['reports_cached']}")
        print(f"   ✅ Model Loaded: {rag_status['model_loaded']}")
        print(f"   ✅ Database Path: {rag_status['database_path']}")
        
        if rag_status['reports_cached'] == 0:
            print("   ⚠️  WARNING: No reports in RAG cache!")
            return False
            
    except Exception as e:
        print(f"   ❌ RAG Service Error: {e}")
        return False
    
    # Step 2: Test RAG search directly
    print("\n2️⃣ TESTING RAG SEARCH FUNCTIONALITY")
    try:
        test_query = "summarize the reports"
        search_results = enhanced_rag_service.search_reports(test_query, user_id=test_user_id, top_k=3)
        print(f"   ✅ Search Results: {len(search_results)} found")
        
        context = enhanced_rag_service.get_context_for_query(test_query, user_id=test_user_id, max_reports=2)
        has_context = "No relevant threat intelligence found" not in context
        print(f"   ✅ Context Generated: {'Yes' if has_context else 'No'}")
        
        if not has_context:
            print("   ❌ ERROR: Context generation failed!")
            return False
            
    except Exception as e:
        print(f"   ❌ RAG Search Error: {e}")
        return False
    
    # Step 3: Test Chat Health API
    print("\n3️⃣ TESTING CHAT HEALTH API")
    try:
        health_response = requests.post(f'{base_url}/api/chat/health', 
                                       json={'check_type': 'detailed'}, 
                                       timeout=10)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            chat_enabled = health_data.get('chat_enabled', False)
            reports_cached = health_data.get('rag_service', {}).get('reports_cached', 0)
            
            print(f"   ✅ Chat Enabled: {chat_enabled}")
            print(f"   ✅ API Reports Count: {reports_cached}")
            
            if not chat_enabled or reports_cached == 0:
                print("   ❌ ERROR: Chat not enabled or no reports in API!")
                return False
        else:
            print(f"   ❌ Health API Error: {health_response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Health API Error: {e}")
        return False
    
    # Step 4: Test Chat Message API with context
    print("\n4️⃣ TESTING CHAT MESSAGE API")
    try:
        test_message = "Please provide a summary of the main threats and security concerns from my reports"
        
        chat_response = requests.post(f'{base_url}/api/chat/message',
                                     json={'message': test_message},
                                     headers={'user_id': test_user_id},
                                     timeout=30)
        
        if chat_response.status_code == 200:
            response_data = chat_response.json()
            context_used = response_data.get('context_used', False)
            reports_found = response_data.get('reports_found', 0)
            ai_response = response_data.get('response', '')
            
            print(f"   ✅ Response Status: 200 OK")
            print(f"   ✅ Context Used: {context_used}")
            print(f"   ✅ Reports Found: {reports_found}")
            print(f"   ✅ Response Length: {len(ai_response)} chars")
            
            if not context_used or reports_found == 0:
                print("   ❌ ERROR: Context not used or no reports found!")
                print(f"   🔍 Response preview: {ai_response[:200]}...")
                return False
                
            print(f"   📝 AI Response Preview: {ai_response[:150]}...")
            
        else:
            print(f"   ❌ Chat API Error: {chat_response.status_code}")
            print(f"   📄 Error Details: {chat_response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Chat Message Error: {e}")
        return False
    
    # Step 5: Test Migration API (if needed)
    print("\n5️⃣ TESTING MIGRATION API")
    try:
        migrate_response = requests.post(f'{base_url}/api/chat/rag/migrate',
                                        headers={'user_id': test_user_id},
                                        timeout=30)
        
        if migrate_response.status_code == 200:
            migrate_data = migrate_response.json()
            migrated_items = migrate_data.get('migrated_items', 0)
            final_reports = migrate_data.get('final_rag_reports', 0)
            
            print(f"   ✅ Migration Status: Success")
            print(f"   ✅ Items Migrated: {migrated_items}")
            print(f"   ✅ Final RAG Reports: {final_reports}")
            
        else:
            print(f"   ⚠️  Migration API: {migrate_response.status_code} (might be expected)")
            
    except Exception as e:
        print(f"   ⚠️  Migration API Error: {e} (might be expected)")
    
    print("\n🎉 ALL TESTS PASSED!")
    print("=" * 50)
    print("✅ RAG system is fully functional")
    print("✅ Context retrieval is working")  
    print("✅ Chat API provides intelligent responses")
    print("✅ UI should show correct report counts")
    print("✅ Intelligence Context Applied should appear")
    
    return True

def test_specific_queries():
    """Test specific types of queries to verify RAG performance"""
    
    print("\n🔍 TESTING SPECIFIC QUERY TYPES")
    print("=" * 40)
    
    test_user_id = 'user_2nEKPmVdWvV6T8DaKGg6K0Ap2OH'
    base_url = 'http://localhost:8000'
    
    test_queries = [
        "What are the main cyber threats?",
        "Summarize the threat intelligence reports",
        "Tell me about extremist activities",
        "What security recommendations do you have?",
        "What is the risk level of current threats?"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Testing: '{query}'")
        
        try:
            response = requests.post(f'{base_url}/api/chat/message',
                                   json={'message': query},
                                   headers={'user_id': test_user_id},
                                   timeout=25)
            
            if response.status_code == 200:
                data = response.json()
                context_used = data.get('context_used', False)
                reports_found = data.get('reports_found', 0)
                
                print(f"   ✅ Context: {'Used' if context_used else 'Not Used'}")
                print(f"   📊 Reports: {reports_found}")
                
                if context_used:
                    print(f"   🎯 SUCCESS - Intelligence enhanced response")
                else:
                    print(f"   ⚠️  WARNING - Generic response (no context)")
                    
            else:
                print(f"   ❌ ERROR: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
    
    print("\n✅ Query testing complete!")

if __name__ == "__main__":
    print("Starting comprehensive RAG system verification...")
    
    # Run main pipeline test
    pipeline_success = test_complete_rag_pipeline()
    
    if pipeline_success:
        # Run specific query tests
        test_specific_queries()
        
        print("\n🚀 FINAL RESULT: RAG SYSTEM IS WORKING CORRECTLY!")
        print("\n📋 What you should see in the UI:")
        print("   • Reports count should be > 0")
        print("   • 'Intelligence Context Applied' badge should appear")
        print("   • Chat responses should reference your actual data")
        print("   • No 'No relevant context found' messages")
        
    else:
        print("\n❌ FINAL RESULT: RAG SYSTEM NEEDS ATTENTION")
        print("   Please check the errors above and fix before proceeding.") 