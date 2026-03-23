"""
Final Re-index Trigger
"""
import sys
sys.path.insert(0, '.')

import chromadb
from pathlib import Path
import shutil

print("=" * 70)
print("🧹 FINAL CLEANUP & RE_INDEX SETUP")
print("=" * 70)

# Paths
chroma_paths = ["./data/chroma_db", "./data/rag-chroma"]
cache_file = Path("data/document_cache.json")

# 1. Delete Collections
for path in chroma_paths:
    if Path(path).exists():
        try:
            client = chromadb.PersistentClient(path=path)
            try:
                client.delete_collection("xiaozhi_chinh_tri")
                print(f"✅ Deleted collection from: {path}")
            except Exception as e:
                print(f"ℹ️  Collection not in {path}: {e}")
        except Exception as e:
            print(f"⚠️  Error accessing {path}: {e}")

# 2. Delete Cache
if cache_file.exists():
    cache_file.unlink()
    print(f"✅ Deleted cache file: {cache_file}")

print("\n" + "=" * 70)
print("🚀 READY! Restart server now.")
print("=" * 70)
