"""
Re-index all documents với model mới (offline)
Sau khi thay đổi embedding model, cần re-generate embeddings
"""

import sys
import os

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(current_dir, "xiaozhi-local-chat", "main", "xiaozhi-server")
sys.path.insert(0, server_dir)

from core.providers.llm.rag.vector_store import get_chroma_manager
from core.providers.llm.rag.model_manager import get_model_manager
from core.providers.llm.rag.document_loader import DocumentLoader
from core.providers.llm.rag.config import RAGConfig

print("=" * 60)
print("RE-INDEXING DOCUMENTS WITH NEW MODEL")
print("=" * 60)

# Document paths
document_paths = {
    'xiaozhi_chinh_tri': os.path.join(current_dir, 'chinh_tri.md'),
    'xiaozhi_quan_su': os.path.join(current_dir, 'quan_su.md'),
    'xiaozhi_hau_can': os.path.join(current_dir, 'hau_can.md'),
    'xiaozhi_ky_thuat': os.path.join(current_dir, 'ky_thuat.md'),
}

# Initialize model manager
print("\n1. Initializing model manager...")
model_manager = get_model_manager()

rag_config = RAGConfig(
    embedding_model="balanced",  # Will use local path from config.py
    cross_encoder_model="cross-encoder/ms-marco-MiniLM-L-6-v2",
    chunk_size=600,
    chunk_overlap=150,
)

embedding_config = rag_config.get_embedding_config()

success, msg = model_manager.initialize(
    embedding_model_id=embedding_config.model_id,
    cross_encoder_id=rag_config.cross_encoder_model,
    requires_tokenizer=embedding_config.requires_tokenizer
)

if not success:
    print(f"❌ Failed to initialize models: {msg}")
    sys.exit(1)

print(f"✅ Models initialized: {msg}")

# Re-index each collection
chroma_path = os.path.join(server_dir, "data", "rag-chroma")
print(f"\n2. ChromaDB path: {chroma_path}")

for collection_name, doc_path in document_paths.items():
    if not os.path.exists(doc_path):
        print(f"\n⚠️  Skipping {collection_name}: File not found")
        continue
    
    print(f"\n{'=' * 60}")
    print(f"Processing: {collection_name}")
    print(f"File: {doc_path}")
    print(f"{'=' * 60}")
    
    # Load document
    print("\n  Loading document...")
    loader = DocumentLoader(
        chunk_size=rag_config.chunk_size,
        chunk_overlap=rag_config.chunk_overlap
    )
    
    # load_and_split returns (List[Document], stats)
    chunks, load_stats = loader.load_and_split(doc_path)
    
    if not chunks:
        print(f"  ❌ No chunks extracted!")
        continue
    
    print(f"  ✅ Extracted {len(chunks)} chunks")
    
    # Generate embeddings
    print(f"  Generating embeddings...")
    # Extract text from Document objects
    texts = [chunk.page_content for chunk in chunks]
    
    embeddings = model_manager.encode(
        texts,
        normalize=True,
        batch_size=32,
        show_progress=True
    )
    
    print(f"  ✅ Generated {len(embeddings)} embeddings")
    
    # Clear old collection
    print(f"  Clearing old data...")
    chroma = get_chroma_manager()
    
    # Delete old collection
    try:
        import chromadb
        client = chromadb.PersistentClient(path=chroma_path)
        try:
            client.delete_collection(name=collection_name)
            print(f"  ✅ Deleted old collection")
        except:
            print(f"  ℹ️  No old collection to delete")
    except Exception as e:
        print(f"  ⚠️  Error deleting: {e}")
    
    # Create new collection
    print(f"  Creating new collection...")
    chroma.initialize(chroma_path, collection_name)
    
    # Add documents
    print(f"  Adding documents to ChromaDB...")
    
    ids = [f"{collection_name}_{i}" for i in range(len(chunks))]
    # Extract metadata from Document objects
    metadatas = []
    for chunk in chunks:
        # Sanitize metadata for ChromaDB (no lists/nested dicts)
        safe_metadata = {}
        for key, value in chunk.metadata.items():
            if isinstance(value, (list, tuple)):
                # Convert lists to comma-separated strings
                safe_metadata[key] = ', '.join(str(v) for v in value)
            elif isinstance(value, dict):
                # Skip nested dicts
                continue
            elif value is not None:
                safe_metadata[key] = str(value)
        metadatas.append(safe_metadata)
    
    # Add to collection
    chroma.collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=metadatas
    )
    
    print(f"  ✅ Added {len(texts)} documents to ChromaDB")
    
    # Verify
    count = chroma.collection.count()
    print(f"  ✅ Final count: {count} documents")

print("\n" + "=" * 60)
print("✅ RE-INDEXING COMPLETE!")
print("=" * 60)
print("\n📊 Summary:")

# Check all collections
import chromadb
client = chromadb.PersistentClient(path=chroma_path)

total_docs = 0
for collection_name in document_paths.keys():
    try:
        coll = client.get_collection(name=collection_name)
        count = coll.count()
        total_docs += count
        print(f"  ✅ {collection_name}: {count} documents")
    except:
        print(f"  ⚠️  {collection_name}: Not found")

print(f"\n  📈 Total: {total_docs} documents")
print("\n🎉 Ready to use with new embeddings!")
