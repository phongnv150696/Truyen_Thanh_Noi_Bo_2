"""
Script đơn giản để xem CHUNK 1 - chunk quan trọng nhất
"""
import sys, os
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(current_dir, "xiaozhi-local-chat", "main", "xiaozhi-server")
sys.path.insert(0, server_dir)

from core.providers.llm.rag.model_manager import get_model_manager
from core.providers.llm.rag.config import RAGConfig
import chromadb

model_manager = get_model_manager()
rag_config = RAGConfig(embedding_model="balanced")
model_manager.initialize(
    embedding_model_id=rag_config.get_embedding_config().model_id,
    cross_encoder_id=rag_config.cross_encoder_model,
    requires_tokenizer=False
)

chroma_path = os.path.join(server_dir, "data", "rag-chroma")
client = chromadb.PersistentClient(path=chroma_path)
collection = client.get_collection(name="xiaozhi_chinh_tri")

query = "Chính trị viên đại đội 8 là ai"
query_embedding = model_manager.encode([query], normalize=True)[0]

results = collection.query(
    query_embeddings=[query_embedding.tolist()],
    n_results=1,  # CHỈ LẤY CHUNK 1
    include=['documents', 'distances', 'metadatas']
)

print("=" * 80)
print("CHUNK #1 - TOP RESULT")
print("=" * 80)

if results['documents'][0]:
    doc = results['documents'][0][0]
    dist = results['distances'][0][0]
    meta = results['metadatas'][0][0]
    
    print(f"\nDistance: {dist:.4f}\n")
    
    print("METADATA:")
    print("-" * 80)
    for k, v in meta.items():
        print(f"{k}: {v}")
    
    print("\n" + "=" * 80)
    print("CONTENT:")
    print("=" * 80)
    print(doc)
    print("=" * 80)
    
    print("\nAnalysis:")
    if "Nguyễn Văn Phong" in doc:
        print("✅ Contains: Nguyễn Văn Phong")
    if "Chính trị viên Đại đội 8" in doc:
        print("✅ Contains: Chính trị viên Đại đội 8")
    
    if "Nguyễn Văn Phong" in doc and "Chính trị viên" in doc:
        print("\n⭐ THIS IS THE CORRECT CHUNK!")
