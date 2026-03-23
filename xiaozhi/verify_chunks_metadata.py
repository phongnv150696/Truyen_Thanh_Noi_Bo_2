"""
Kiểm tra CHI TIẾT chunks và metadata được return từ ChromaDB
Chạy trong VENV để đảm bảo đúng môi trường
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
print("KIỂM TRA EXACT CHUNKS VÀ METADATA")
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
    n_results=3,  # Chỉ lấy top 3
    include=['documents', 'distances', 'metadatas']
)

# Save to file
output_file = os.path.join(current_dir, "exact_chunks_metadata.txt")

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("=" * 80 + "\n")
    f.write(f"QUERY: '{query}'\n")
    f.write("=" * 80 + "\n\n")
    
    if results and results['documents'] and results['documents'][0]:
        docs = results['documents'][0]
        distances = results['distances'][0] if results.get('distances') else []
        metadatas = results['metadatas'][0] if results.get('metadatas') else []
        
        f.write(f"Found {len(docs)} chunks\n\n")
        
        for i, (doc, dist, meta) in enumerate(zip(docs, distances, metadatas)):
            print(f"\n{'=' * 80}")
            print(f"CHUNK {i+1}/{len(docs)}")
            print(f"Distance: {dist:.4f}")
            
            f.write("\n" + "=" * 80 + "\n")
            f.write(f"CHUNK {i+1}/{len(docs)}\n")
            f.write("=" * 80 + "\n")
            f.write(f"Distance: {dist:.4f}\n\n")
            
            # METADATA
            f.write("METADATA:\n")
            f.write("-" * 80 + "\n")
            if meta:
                for key, value in meta.items():
                    f.write(f"{key}: {value}\n")
                    print(f"  {key}: {value}")
            else:
                f.write("⚠️ NO METADATA!\n")
                print("  ⚠️ NO METADATA!")
            f.write("-" * 80 + "\n\n")
            
            # EXACT CONTENT
            f.write("EXACT CONTENT:\n")
            f.write("=" * 80 + "\n")
            f.write(doc)
            f.write("\n" + "=" * 80 + "\n")
            
            # Analysis
            has_name = "Nguyễn Văn Phong" in doc
            has_position = "Chính trị viên" in doc and "Đại đội 8" in doc
            
            if has_name and has_position:
                f.write("\n✅ THIS CHUNK HAS COMPLETE ANSWER!\n")
                f.write(f"   - Contains name: Nguyễn Văn Phong\n")
                f.write(f"   - Contains position: Chính trị viên Đại đội 8\n")
                print("\n✅ COMPLETE ANSWER IN THIS CHUNK!")
            elif has_name:
                f.write("\n⚠️ Has name but missing position context\n")
                print("⚠️ Has name but missing position")
            elif has_position:
                f.write("\n⚠️ Has position but missing name\n")
                print("⚠️ Has position but missing name")
            else:
                f.write("\n❌ Does not contain answer\n")
                print("❌ No answer in chunk")
            
            f.write("\n")
    else:
        f.write("❌ NO RESULTS FOUND!\n")
        print("❌ NO RESULTS!")

print(f"\n{'=' * 80}")
print(f"✅ Results saved to: {output_file}")
print(f"{'=' * 80}")

print("\nSummary:")
print("  Run: Get-Content exact_chunks_metadata.txt")
print("  to see full details including metadata")
