
import sys
import os
import chromadb
from sentence_transformers import SentenceTransformer

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir) # Adjust as needed based on where you run it
sys.path.append(project_root)

# Initialize Chroma
client = chromadb.PersistentClient(path="./data/rag-chroma")
collection_name = "xiaozhi_chinh_tri" # We know it's in chinh_tri

try:
    collection = client.get_collection(name=collection_name)
    print(f"✅ Found collection: {collection_name}")
    print(f"Total docs: {collection.count()}")
except Exception as e:
    print(f"❌ Collection not found: {e}")
    sys.exit(1)

# Initialize Embedding Model (to query effectively)
# We'll just search by text keyword first to find the ID, then check metadata
# Actually querying by text is easier if we just iterate or peek
# But let's use query with a placeholder embedding or just search content

query_text = "Chính trị viên Đại đội 8"
print(f"\n🔍 Searching for: '{query_text}' using simple text matching in metadata/documents...")

# Get all docs to search manually (since dataset is small)
result = collection.get(include=['documents', 'metadatas'])
ids = result['ids']
documents = result['documents']
metadatas = result['metadatas']

found_count = 0
for idx, doc in enumerate(documents):
    if "Chính trị viên Đại đội 8" in doc:
        print(f"\nExample Matching Chunk {found_count+1}:")
        print(f"ID: {ids[idx]}")
        print(f"Metadata: {metadatas[idx]}")
        print(f"Snippet: {doc[:100]}...")
        found_count += 1
        if found_count >= 5: break

if found_count == 0:
    print("❌ No chunks found containing the exact text.")
