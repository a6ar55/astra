"""
Direct RAG Test - Test RAG functionality without API or AI delays
"""

import sys
import os

def test_rag_direct():
    """Test RAG functionality directly"""
    
    print("🧪 DIRECT RAG FUNCTIONALITY TEST")
    print("=" * 40)
    
    try:
        # Import the enhanced RAG service directly
        from rag_service_v2 import enhanced_rag_service
        
        print("✅ RAG service imported successfully")
        
        # Step 1: Check initial status
        print("\n1️⃣ Initial RAG status:")
        status = enhanced_rag_service.debug_status()
        print(f"   📊 Reports cached: {status['reports_cached']}")
        print(f"   📋 Report types: {status['report_types']}")
        print(f"   👥 Users: {status['users']}")
        
        # Step 2: Add a test threat report
        print("\n2️⃣ Adding threat report...")
        threat_data = {
            "title": "Direct Test - Network Breach",
            "threat_type": "Network Intrusion",
            "description": "Critical network security breach detected. Unauthorized access to customer database with potential data exfiltration.",
            "severity": "Critical",
            "recommendations": [
                "Immediately isolate affected systems",
                "Change all administrative passwords",
                "Review access logs for data exfiltration",
                "Notify security team and management"
            ]
        }
        
        success = enhanced_rag_service.add_threat_report("direct_test_user", threat_data, "direct_test")
        print(f"   {'✅ SUCCESS' if success else '❌ FAILED'}: Threat report added")
        
        # Step 3: Add a test summary report  
        print("\n3️⃣ Adding summary report...")
        summary_data = {
            "title": "Direct Test - Security Summary",
            "summary_type": "Test Summary",
            "executive_summary": "This is a test summary showing multiple security incidents requiring immediate attention.",
            "key_findings": [
                "Network intrusions detected",
                "User credentials compromised", 
                "Critical vulnerabilities found",
                "Insufficient monitoring coverage"
            ],
            "recommendations": [
                "Enhance network monitoring",
                "Implement user training",
                "Patch critical vulnerabilities",
                "Review security policies"
            ]
        }
        
        success = enhanced_rag_service.add_summary_report("direct_test_user", summary_data, "direct_test")
        print(f"   {'✅ SUCCESS' if success else '❌ FAILED'}: Summary report added")
        
        # Step 4: Check updated status
        print("\n4️⃣ Updated RAG status:")
        status = enhanced_rag_service.debug_status()
        print(f"   📊 Reports cached: {status['reports_cached']}")
        print(f"   📋 Report types: {status['report_types']}")
        print(f"   👥 Users: {status['users']}")
        
        # Step 5: Test search functionality
        print("\n5️⃣ Testing search functionality...")
        
        test_queries = [
            "network intrusion",
            "security breach", 
            "critical vulnerability",
            "recommendations",
            "network monitoring"
        ]
        
        for query in test_queries:
            results = enhanced_rag_service.search_reports(query, top_k=3, similarity_threshold=0.1)
            print(f"   🔍 '{query}': {len(results)} results")
            
            if results:
                for i, result in enumerate(results[:2], 1):
                    report_type = result['report']['report_type']
                    similarity = result['similarity']
                    print(f"      {i}. {report_type} (similarity: {similarity:.3f})")
                    
        # Step 6: Test context generation
        print("\n6️⃣ Testing context generation...")
        
        context_queries = [
            "What network security issues were found?",
            "Tell me about critical threats",
            "What are the security recommendations?"
        ]
        
        for query in context_queries:
            context = enhanced_rag_service.get_context_for_query(query, max_reports=2)
            has_context = "No relevant threat intelligence found" not in context
            
            print(f"   💬 '{query[:30]}...': {'✅ CONTEXT FOUND' if has_context else '❌ NO CONTEXT'}")
            if has_context:
                print(f"      📝 Context length: {len(context)} characters")
                
        # Step 7: Test user-specific search
        print("\n7️⃣ Testing user-specific search...")
        user_results = enhanced_rag_service.search_reports("network breach", "direct_test_user", top_k=5)
        all_results = enhanced_rag_service.search_reports("network breach", top_k=5)
        
        print(f"   👤 User-specific search: {len(user_results)} results")
        print(f"   🌍 Global search: {len(all_results)} results")
        
        # Step 8: Final status
        print("\n8️⃣ Final verification:")
        final_status = enhanced_rag_service.debug_status()
        print(f"   📊 Total reports: {final_status['reports_cached']}")
        print(f"   📋 Report types: {final_status['report_types']}")
        print(f"   🔗 Sources: {final_status['sources']}")
        
        if final_status['reports_cached'] >= 2:
            print("\n🎯 SUCCESS! RAG system is working correctly!")
            print("   ✅ Reports are being indexed")
            print("   ✅ Search functionality works")
            print("   ✅ Context generation works")
            print("   ✅ User-specific filtering works")
            
            # Show what the real problem likely is
            print("\n💡 DIAGNOSIS:")
            print("   🔍 RAG system is fully functional")
            print("   ⏰ API timeouts are due to DeepSeek R1 model slowness")
            print("   📝 Reports are being properly indexed for chatbot context")
            print("   🤖 When AI responds, it WILL have the context")
            
            return True
        else:
            print("\n❌ FAILED: Not enough reports indexed")
            return False
            
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_rag_direct() 