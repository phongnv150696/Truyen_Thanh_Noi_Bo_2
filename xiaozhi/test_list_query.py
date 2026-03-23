"""
Test direct ChromaDB query for list_name metadata
"""
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(current_dir, "xiaozhi-local-chat", "main", "xiaozhi-server")
sys.path.insert(0, server_dir)

import chromadb

chroma_path = os.path.join(server_dir, "data", "rag-chroma")
client = chromadb.PersistentClient(path=chroma_path)

print("=" * 60)
print("TESTING DIRECT QUERY FOR list_name='10_loi_the'")
print("=" * 60)

collections = ['xiaozhi_chinh_tri', 'xiaozhi_quan_su', 'xiaozhi_hau_can', 'xiaozhi_ky_thuat']

for coll_name in collections:
    try:
        coll = client.get_collection(name=coll_name)
        
        print(f"\n📚 Collection: {coll_name}")
        
        # Try to query with where clause
        try:
            results = coll.get(
                where={'list_name': '10_loi_the'},
                limit=100
            )
            
            if results and results['ids']:
                print(f"   ✅ FOUND {len(results['ids'])} documents with list_name='10_loi_the'!")
                print(f"   Sample IDs: {results['ids'][:3]}")
                if results['documents']:
                    print(f"   Sample text: {results['documents'][0][:100]}...")
            else:
                print(f"   ❌ NO documents found with list_name='10_loi_the'")
                
        except Exception as e:
            print(f"   ⚠️  Query failed: {e}")
        
    except Exception as e:
        print(f"\n❌ Error with {coll_name}: {e}")

print("\n" + "=" * 60)
print("Now checking what list_name values actually exist...")
print("=" * 60)

for coll_name in collections:
    try:
        coll = client.get_collection(name=coll_name)
        
        # Get all docs and check list_name values
        results = coll.get(limit=200)  # Get more docs
        
        list_names = set()
        if results['metadatas']:
            for meta in results['metadatas']:
                if meta and 'list_name' in meta:
                    list_names.add(meta['list_name'])
        
        if list_names:
            print(f"\n📚 {coll_name}")
            print(f"   Unique list_name values: {sorted(list_names)}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

print("\n" + "=" * 60)
print("✅ CHECK COMPLETE")
print("=" * 60)
