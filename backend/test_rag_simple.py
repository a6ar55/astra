"""
Simple RAG Integration Test
Tests the specific workflow: Save reports -> Search reports -> Chat with context
"""

import requests
import json
import time

def test_rag_integration():
    """Test the complete RAG integration workflow"""
    
    base_url = "http://localhost:8000"
    user_id = "test_rag_user"
    
    print("🧪 TESTING RAG INTEGRATION WORKFLOW")
    print("=" * 50)
    
    # Step 1: Test server health
    print("\n1️⃣ Testing server health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("   ✅ Server is running")
        else:
            print(f"   ❌ Server health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Server not accessible: {e}")
        return False
    
    # Step 2: Save a threat report
    print("\n2️⃣ Saving threat report...")
    threat_report = {
        "title": "Critical Network Breach - Test Report",
        "threat_type": "Network Intrusion", 
        "description": "Unauthorized access detected on main server. Attacker accessed customer database and downloaded sensitive files. Immediate containment required.",
        "severity": "Critical",
        "recommendations": [
            "Block attacker IP immediately",
            "Reset all admin passwords",
            "Review security logs",
            "Notify affected customers"
        ],
        "affected_systems": ["Main Server", "Customer Database"]
    }
    
    try:
        headers = {"user_id": user_id, "Content-Type": "application/json"}
        response = requests.post(
            f"{base_url}/api/user/reports/threat", 
            json=threat_report,
            headers=headers,
            timeout=30
        )
        if response.status_code == 200:
            print("   ✅ Threat report saved successfully")
        else:
            print(f"   ❌ Failed to save threat report: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error saving threat report: {e}")
        return False
    
    # Step 3: Save a summary report
    print("\n3️⃣ Saving summary report...")
    summary_report = {
        "title": "Weekly Security Summary - Test",
        "summary_type": "Weekly Security Review",
        "executive_summary": "This week we detected multiple security incidents including network intrusions and phishing attempts. Critical vulnerabilities were identified that require immediate attention.",
        "key_findings": [
            "Network intrusion attempts increased 40%",
            "Phishing emails targeting employees",
            "Critical vulnerabilities in web applications", 
            "Need for enhanced monitoring"
        ],
        "recommendations": [
            "Implement additional network monitoring",
            "Conduct security awareness training",
            "Patch web application vulnerabilities",
            "Review access controls"
        ]
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/user/reports/summary",
            json=summary_report, 
            headers=headers,
            timeout=30
        )
        if response.status_code == 200:
            print("   ✅ Summary report saved successfully")
        else:
            print(f"   ❌ Failed to save summary report: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error saving summary report: {e}")
        return False
    
    # Step 4: Wait for RAG processing
    print("\n4️⃣ Waiting for RAG processing...")
    time.sleep(3)
    
    # Step 5: Test RAG cache refresh
    print("\n5️⃣ Testing RAG cache refresh...")
    try:
        response = requests.post(
            f"{base_url}/api/chat/rag/refresh",
            headers=headers,
            timeout=30
        )
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ RAG cache refreshed: {result.get('reports_cached', 0)} reports")
        else:
            print(f"   ⚠️ RAG refresh warning: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️ RAG refresh error: {e}")
    
    # Step 6: Test chat health to verify RAG status
    print("\n6️⃣ Testing chat health (RAG status)...")
    try:
        response = requests.post(
            f"{base_url}/api/chat/health",
            json={"check_type": "full"},
            timeout=30
        )
        if response.status_code == 200:
            result = response.json()
            rag_service = result.get('rag_service', {})
            reports_cached = rag_service.get('reports_cached', 0)
            print(f"   ✅ Chat health OK - RAG has {reports_cached} reports cached")
            if reports_cached == 0:
                print("   ⚠️ WARNING: No reports in RAG cache!")
        else:
            print(f"   ❌ Chat health failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Chat health error: {e}")
    
    # Step 7: Test chatbot with RAG context
    print("\n7️⃣ Testing chatbot with RAG context...")
    
    test_questions = [
        "What network security incidents have been detected?",
        "Tell me about the critical threats",
        "What are the security recommendations?"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n   💬 Question {i}: {question}")
        try:
            response = requests.post(
                f"{base_url}/api/chat/message",
                json={"message": question},
                headers=headers,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                context_used = result.get('context_used', False)
                reports_found = result.get('reports_found', 0)
                response_text = result.get('response', '')
                
                print(f"      🧠 Context Used: {'✅ YES' if context_used else '❌ NO'}")
                print(f"      📊 Reports Found: {reports_found}")
                print(f"      📝 Response Length: {len(response_text)} characters")
                
                if context_used and reports_found > 0:
                    print(f"      ✅ RAG is working! Found context from {reports_found} reports")
                    # Show a preview of the response
                    preview = response_text[:200] + "..." if len(response_text) > 200 else response_text
                    print(f"      📄 Response Preview: {preview}")
                else:
                    print("      ❌ RAG not providing context")
                    
            else:
                print(f"      ❌ Chat failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"      ❌ Chat error: {e}")
    
    print(f"\n🏁 RAG INTEGRATION TEST COMPLETED")
    print("=" * 50)
    return True

if __name__ == "__main__":
    test_rag_integration() 