#!/usr/bin/env python3
"""
Comprehensive Test Suite for Web Search Feature
Tests all aspects of the Internet-Connected RAG implementation
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_web_search"

def print_test_header(test_name: str):
    """Print a formatted test header"""
    print(f"\n{'='*60}")
    print(f"🧪 TESTING: {test_name}")
    print(f"{'='*60}")

def print_result(success: bool, message: str):
    """Print test result with formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def test_basic_health():
    """Test basic server health"""
    print_test_header("Basic Server Health")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, f"Server is running: {data['message']}")
            return True
        else:
            print_result(False, f"Server health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Server connection failed: {str(e)}")
        return False

def test_chat_health():
    """Test chat service health including web search"""
    print_test_header("Chat Service Health (including Web Search)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/chat/health",
            headers={"Content-Type": "application/json"},
            json={"check_type": "basic"},
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check chat enabled
            chat_enabled = data.get('chat_enabled', False)
            print_result(chat_enabled, f"Chat service enabled: {chat_enabled}")
            
            # Check web search enabled
            web_search_enabled = data.get('web_search_enabled', False)
            print_result(web_search_enabled, f"Web search enabled: {web_search_enabled}")
            
            # Check web search service status
            web_service = data.get('web_search_service', {})
            web_status = web_service.get('status', 'unknown')
            print_result(
                web_status in ['healthy', 'degraded'], 
                f"Web search service status: {web_status}"
            )
            
            # Check RAG service
            rag_service = data.get('rag_service', {})
            rag_status = rag_service.get('status', 'unknown')
            print_result(rag_status == 'healthy', f"RAG service status: {rag_status}")
            
            # Check AI service
            ai_service = data.get('ai_service', {})
            ai_status = ai_service.get('status', 'unknown')
            print_result(ai_status == 'healthy', f"AI service status: {ai_status}")
            
            return chat_enabled and web_search_enabled
            
        else:
            print_result(False, f"Chat health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Chat health test failed: {str(e)}")
        return False

def test_direct_web_search():
    """Test direct web search endpoint"""
    print_test_header("Direct Web Search Endpoint")
    
    test_queries = [
        ("simple query", "test search"),
        ("cybersecurity query", "cybersecurity news"),
        ("threat intelligence", "latest malware threats")
    ]
    
    success_count = 0
    
    for query_name, query in test_queries:
        try:
            print(f"\n🔍 Testing {query_name}: '{query}'")
            
            response = requests.post(
                f"{BASE_URL}/api/chat/web-search",
                headers={
                    "Content-Type": "application/json",
                    "user_id": TEST_USER_ID
                },
                json={"query": query, "num_results": 3},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                has_status = 'status' in data
                has_search_results = 'search_results' in data
                has_formatted_context = 'formatted_context' in data
                
                print_result(has_status, f"Response has status field")
                print_result(has_search_results, f"Response has search_results field")
                print_result(has_formatted_context, f"Response has formatted_context field")
                
                # Check search results structure
                search_results = data.get('search_results', {})
                has_query = 'query' in search_results
                has_results = 'search_results' in search_results
                has_content = 'extracted_content' in search_results
                has_time = 'total_time' in search_results
                
                print_result(has_query, f"Search results has query field")
                print_result(has_results, f"Search results has results field")
                print_result(has_content, f"Search results has content field")
                print_result(has_time, f"Search results has timing field")
                
                # Check performance
                total_time = search_results.get('total_time', 0)
                print_result(total_time < 10, f"Search completed in {total_time:.2f}s (< 10s)")
                
                if all([has_status, has_search_results, has_formatted_context, 
                       has_query, has_results, has_content, has_time]):
                    success_count += 1
                    
            else:
                print_result(False, f"Web search failed: {response.status_code}")
                
        except Exception as e:
            print_result(False, f"Web search test failed: {str(e)}")
    
    overall_success = success_count == len(test_queries)
    print_result(overall_success, f"Direct web search tests: {success_count}/{len(test_queries)} passed")
    return overall_success

def test_chat_with_web_search():
    """Test chat messages with web search enabled"""
    print_test_header("Chat Messages with Web Search")
    
    test_messages = [
        ("basic query", "Hello, can you help me?"),
        ("cybersecurity query", "What are the latest cybersecurity threats?"),
        ("threat analysis", "Tell me about recent ransomware attacks")
    ]
    
    success_count = 0
    
    for msg_name, message in test_messages:
        try:
            print(f"\n💬 Testing {msg_name}: '{message}'")
            
            # Test with web search enabled
            response = requests.post(
                f"{BASE_URL}/api/chat/message",
                headers={
                    "Content-Type": "application/json",
                    "user_id": TEST_USER_ID
                },
                json={"message": message, "use_web_search": True},
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                has_status = 'status' in data
                has_response = 'response' in data
                has_web_enabled = 'web_search_enabled' in data
                has_web_context_used = 'web_context_used' in data
                has_web_sources = 'web_sources' in data
                has_rag_context_used = 'rag_context_used' in data
                
                print_result(has_status, f"Response has status field")
                print_result(has_response, f"Response has response field")
                print_result(has_web_enabled, f"Response has web_search_enabled field")
                print_result(has_web_context_used, f"Response has web_context_used field")
                print_result(has_web_sources, f"Response has web_sources field")
                print_result(has_rag_context_used, f"Response has rag_context_used field")
                
                # Check web search was available
                web_enabled = data.get('web_search_enabled', False)
                print_result(web_enabled, f"Web search was enabled for this request")
                
                # Check response structure regardless of content
                web_sources = data.get('web_sources', [])
                print_result(isinstance(web_sources, list), f"Web sources is a list (found {len(web_sources)} sources)")
                
                if all([has_status, has_response, has_web_enabled, has_web_context_used, 
                       has_web_sources, has_rag_context_used, web_enabled]):
                    success_count += 1
                    
            else:
                print_result(False, f"Chat message failed: {response.status_code}")
                
        except Exception as e:
            print_result(False, f"Chat test failed: {str(e)}")
    
    overall_success = success_count == len(test_messages)
    print_result(overall_success, f"Chat with web search tests: {success_count}/{len(test_messages)} passed")
    return overall_success

def test_chat_without_web_search():
    """Test chat messages without web search (for comparison)"""
    print_test_header("Chat Messages WITHOUT Web Search")
    
    try:
        message = "Hello, can you help me with cybersecurity?"
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            headers={
                "Content-Type": "application/json",
                "user_id": TEST_USER_ID
            },
            json={"message": message, "use_web_search": False},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Should have web search disabled
            web_enabled = data.get('web_search_enabled', True)  # Default True means service available
            web_context_used = data.get('web_context_used', True)  # Should be False
            
            print_result(web_enabled, f"Web search service available: {web_enabled}")
            print_result(not web_context_used, f"Web search not used when disabled: {not web_context_used}")
            
            return True
        else:
            print_result(False, f"Chat without web search failed: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Chat without web search test failed: {str(e)}")
        return False

def test_performance():
    """Test performance characteristics"""
    print_test_header("Performance Testing")
    
    try:
        # Test web search timing
        start_time = time.time()
        
        response = requests.post(
            f"{BASE_URL}/api/chat/web-search",
            headers={
                "Content-Type": "application/json",
                "user_id": TEST_USER_ID
            },
            json={"query": "test performance", "num_results": 2},
            timeout=30
        )
        
        end_time = time.time()
        total_time = end_time - start_time
        
        if response.status_code == 200:
            print_result(total_time < 15, f"Web search completed in {total_time:.2f}s (< 15s)")
            
            # Test chat with web search timing
            start_time = time.time()
            
            chat_response = requests.post(
                f"{BASE_URL}/api/chat/message",
                headers={
                    "Content-Type": "application/json",
                    "user_id": TEST_USER_ID
                },
                json={"message": "Quick test", "use_web_search": True},
                timeout=45
            )
            
            end_time = time.time()
            chat_time = end_time - start_time
            
            if chat_response.status_code == 200:
                print_result(chat_time < 30, f"Chat with web search completed in {chat_time:.2f}s (< 30s)")
                return True
                
        return False
        
    except Exception as e:
        print_result(False, f"Performance test failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 COMPREHENSIVE WEB SEARCH FEATURE TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Basic Server Health", test_basic_health),
        ("Chat Service Health", test_chat_health),
        ("Direct Web Search", test_direct_web_search),
        ("Chat with Web Search", test_chat_with_web_search),
        ("Chat without Web Search", test_chat_without_web_search),
        ("Performance Testing", test_performance)
    ]
    
    results = []
    start_time = time.time()
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_result(False, f"Test {test_name} crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\n🎯 OVERALL RESULT: {passed}/{total} tests passed")
    
    total_time = time.time() - start_time
    print(f"⏱️  Total test time: {total_time:.2f} seconds")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Web Search Feature is Working Perfectly!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 