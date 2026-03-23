"""
Kiểm tra nội dung CHÍNH XÁC của chunks được retrieve
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

print("=" * 80)
print("KIỂM TRA CHUNKS THỰC TẾ")
print("=" * 80)

# Initialize model
print("\n1. Initializing model...")
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

print(f"✅ Models ready")

# Connect to ChromaDB
print("\n2. Connecting to ChromaDB...")
chroma_path = os.path.join(server_dir, "data", "rag-chroma")
client = chromadb.PersistentClient(path=chroma_path)

collection_name = "xiaozhi_chinh_tri"
collection = client.get_collection(name=collection_name)

print(f"✅ Connected to: {collection_name}")
print(f"   Total documents: {collection.count()}")

# QUERY
query = "Chính trị viên đại đội 8 là ai"

print(f"\n{'=' * 80}")
print(f"QUERY: '{query}'")
print(f"{'=' * 80}")

# Generate embedding
query_embedding = model_manager.encode([query], normalize=True)[0]

# Search
results = collection.query(
    query_embeddings=[query_embedding.tolist()],
    n_results=10,  # Lấy nhiều hơn để xem
    include=['documents', 'distances', 'metadatas']
)

# Display FULL results
if results and results['documents'] and results['documents'][0]:
    docs = results['documents'][0]
    distances = results['distances'][0] if results.get('distances') else []
    metadatas = results['metadatas'][0] if results.get('metadatas') else []
    
    print(f"\n📊 Found {len(docs)} chunks\n")
    
    for i, (doc, dist, meta) in enumerate(zip(docs, distances, metadatas)):
        print(f"\n{'=' * 80}")
        print(f"CHUNK {i+1}/{len(docs)}")
        print(f"{'=' * 80}")
        print(f"Distance: {dist:.4f}")
        print(f"\nMetadata:")
        for key, value in meta.items():
            print(f"  {key}: {value}")
        
        print(f"\nFULL CONTENT:")
        print("-" * 80)
        print(doc)
        print("-" * 80)
        
        # Check if contains answer
        has_answer = False
        if "Nguyễn Văn Phong" in doc:
            print("✅ CONTAINS: 'Nguyễn Văn Phong'")
            has_answer = True
        if "Chính trị viên Đại đội 8" in doc or "Chính trị viên đại đội 8" in doc.lower():
            print("✅ CONTAINS: 'Chính trị viên Đại đội 8'")
            has_answer = True
        
        if has_answer:
            print("⭐ THIS IS THE CORRECT CHUNK! ⭐")
        
        # Show first few chunks in detail, then summarize
        if i >= 4:
            print(f"\n... (showing first 5 chunks in detail)")
            print(f"Remaining {len(docs) - 5} chunks have distances > {dist:.4f}")
            break
            
else:
    print("❌ No chunks found!")

print("\n" + "=" * 80)
print("ANALYSIS")
print("=" * 80)

# Check if correct chunk is in top results
found_answer = False
for i, doc in enumerate(docs[:5]):  # Check top 5
    if "Nguyễn Văn Phong" in doc and ("Chính trị viên" in doc):
        print(f"\n✅ CORRECT CHUNK FOUND at position {i+1}")
        print(f"   Distance: {distances[i]:.4f}")
        found_answer = True
        break

if not found_answer:
    print("\n❌ PROBLEM: Correct chunk NOT in top 5 results!")
    print("\nPossible reasons:")
    print("  1. Chunking split the header and content")
    print("  2. Embedding similarity too low")
    print("  3. Need to increase n_results or adjust threshold")

print("\n" + "=" * 80)
