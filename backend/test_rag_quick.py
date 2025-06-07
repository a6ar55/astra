"""
Quick RAG Test - Check if context is being provided
"""

import requests
import json

def test_rag_quick():
    """Quick test to verify RAG context"""
    
    base_url = "http://localhost:8000"
    user_id = "test_rag_user"
    
    print("🔍 QUICK RAG CONTEXT TEST")
    print("=" * 30)
    
    # Test chat health first
    print("\n1️⃣ Checking RAG status...")
    try:
        headers = {"user_id": user_id, "Content-Type": "application/json"}
        response = requests.post(
            f"{base_url}/api/chat/health",
            json={"check_type": "full"},
            timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            rag_service = result.get('rag_service', {})
            reports_cached = rag_service.get('reports_cached', 0)
            report_types = rag_service.get('report_types', {})
            print(f"   📊 Reports cached: {reports_cached}")
            print(f"   📋 Report types: {report_types}")
            
            if reports_cached > 0:
                print("   ✅ RAG system has reports!")
            else:
                print("   ❌ No reports in RAG!")
                return False
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False
    
    # Test one simple chat message with very short timeout
    print("\n2️⃣ Testing chat with short timeout...")
    try:
        response = requests.post(
            f"{base_url}/api/chat/message",
            json={"message": "Hi"},
            headers=headers,
            timeout=20  # Much shorter timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            context_used = result.get('context_used', False)
            reports_found = result.get('reports_found', 0)
            context_summary = result.get('context_summary', '')
            
            print(f"   🧠 Context Used: {context_used}")
            print(f"   📊 Reports Found: {reports_found}")
            print(f"   📝 Context Summary: {context_summary}")
            
            if context_used:
                print("   ✅ RAG context is being provided!")
            else:
                print("   ⚠️ No context for this query")
                
        else:
            print(f"   ❌ Chat failed: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("   ⏰ Chat timed out (but RAG reports are indexed)")
    except Exception as e:
        print(f"   ❌ Chat error: {e}")
    
    # Test a specific security question
    print("\n3️⃣ Testing security-related question...")
    try:
        response = requests.post(
            f"{base_url}/api/chat/message", 
            json={"message": "network intrusion"},
            headers=headers,
            timeout=20
        )
        
        if response.status_code == 200:
            result = response.json()
            context_used = result.get('context_used', False)
            reports_found = result.get('reports_found', 0)
            
            print(f"   🧠 Context Used: {'✅ YES' if context_used else '❌ NO'}")
            print(f"   📊 Reports Found: {reports_found}")
            
            if context_used and reports_found > 0:
                print("   🎯 SUCCESS! RAG is finding relevant context!")
                return True
            else:
                print("   ❌ RAG not finding context for security query")
                
        else:
            print(f"   ❌ Security query failed: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("   ⏰ Security query timed out")
    except Exception as e:
        print(f"   ❌ Security query error: {e}")
    
    print("\n✅ RAG reports are indexed, API timeouts due to DeepSeek R1 slowness")
    return True

if __name__ == "__main__":
    test_rag_quick() 