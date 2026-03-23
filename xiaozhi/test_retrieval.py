"""
Test RAG retrieval cho query cụ thể
"""

import sys
import os

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(current_dir, "xiaozhi-local-chat", "main", "xiaozhi-server")
sys.path.insert(0, server_dir)

from core.providers.llm.rag.model_manager import get_model_manager
from core.providers.llm.rag.config import RAGConfig
import chromadb

print("=" * 60)
print("TEST RAG RETRIEVAL")
print("=" * 60)

# Initialize model
print("\n1. Initializing models...")
model_manager = get_model_manager()
rag_config = RAGConfig(embedding_model="balanced")
embedding_config = rag_config.get_embedding_config()

success, msg = model_manager.initialize(
    embedding_model_id=embedding_config.model_id,
    cross_encoder_id=rag_config.cross_encoder_model,
    requires_tokenizer=embedding_config.requires_tokenizer
)

if not success:
    print(f"❌ Failed: {msg}")
    sys.exit(1)

print(f"✅ {msg}")

# Connect to ChromaDB
print("\n2. Connecting to ChromaDB...")
chroma_path = os.path.join(server_dir, "data", "rag-chroma")
client = chromadb.PersistentClient(path=chroma_path)

# Test queries
test_queries = [
    "Chính trị viên đại đội 8 là ai",
    "Đại úy Nguyễn Văn Phong",
    "Chính trị viên Đại đội 8",
    "Nguyễn Văn Phong chức vụ gì"
]

collection_name = "xiaozhi_chinh_tri"
collection = client.get_collection(name=collection_name)

print(f"\n3. Testing retrieval on collection: {collection_name}")
print(f"   Total documents: {collection.count()}")

for query in test_queries:
    print(f"\n{'=' * 60}")
    print(f"Query: '{query}'")
    print(f"{'=' * 60}")
    
    # Generate embedding
    query_embedding = model_manager.encode([query], normalize=True)[0]
    
    # Search
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=5,
        include=['documents', 'distances', 'metadatas']
    )
    
    # Display results
    if results and results['documents'] and results['documents'][0]:
        docs = results['documents'][0]
        distances = results['distances'][0] if results.get('distances') else []
        metadatas = results['metadatas'][0] if results.get('metadatas') else []
        
        print(f"\nTop {len(docs)} results:")
        for i, (doc, dist, meta) in enumerate(zip(docs, distances, metadatas)):
            print(f"\n--- Result {i+1} ---")
            print(f"Distance: {dist:.4f}")
            print(f"Metadata: {meta}")
            print(f"Content preview:")
            preview = doc[:300].replace('\n', ' ')
            print(f"  {preview}...")
            
            # Check if this is the correct answer
            if "Nguyễn Văn Phong" in doc or "Chính trị viên Đại đội 8" in doc:
                print(f"  ✅ CONTAINS ANSWER!")
    else:
        print("❌ No results found!")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
