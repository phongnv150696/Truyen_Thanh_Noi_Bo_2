"""
Quick script to check if list_name metadata exists in ChromaDB
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
print("CHECKING CHROMADB METADATA")
print("=" * 60)

collections = ['xiaozhi_chinh_tri', 'xiaozhi_quan_su', 'xiaozhi_hau_can', 'xiaozhi_ky_thuat']

for coll_name in collections:
    try:
        coll = client.get_collection(name=coll_name)
        
        # Get all documents
        results = coll.get(limit=5)  # Only check first 5 docs
        
        print(f"\n📚 Collection: {coll_name}")
        print(f"   Total docs: {coll.count()}")
        
        # Check metadata
        if results['metadatas']:
            print(f"   Sample metadata keys: {list(results['metadatas'][0].keys())}")
            
            # Check for list_name
            has_list_name = any('list_name' in meta for meta in results['metadatas'] if meta)
            if has_list_name:
                print(f"   ✅ HAS list_name metadata!")
                # Show examples
                for i, meta in enumerate(results['metadatas'][:3]):
                    if meta and 'list_name' in meta:
                        print(f"      Example {i+1}: list_name = {meta['list_name']}")
            else:
                print(f"   ❌ NO list_name metadata found!")
        
    except Exception as e:
        print(f"\n❌ Error checking {coll_name}: {e}")

print("\n" + "=" * 60)
print("✅ CHECK COMPLETE")
print("=" * 60)
