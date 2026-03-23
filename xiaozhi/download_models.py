"""
Script to download all required models for offline usage
Run this ONCE when you have internet connection
"""

from sentence_transformers import SentenceTransformer, CrossEncoder
import os

# Create models directory
models_dir = "./models/embedding"
os.makedirs(models_dir, exist_ok=True)

print("=" * 60)
print("DOWNLOADING MODELS FOR OFFLINE USE")
print("=" * 60)

# Download embedding model
print("\n1. Downloading embedding model...")
print("   Model: paraphrase-multilingual-MiniLM-L12-v2")
print("   Size: ~120MB")

embedding_model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    cache_folder=models_dir
)
print("   ✅ Embedding model downloaded successfully!")

# Download cross-encoder model  
print("\n2. Downloading cross-encoder model...")
print("   Model: ms-marco-MiniLM-L-6-v2")
print("   Size: ~90MB")

cross_encoder = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2",
    max_length=512
)
print("   ✅ Cross-encoder model downloaded successfully!")

print("\n" + "=" * 60)
print("✅ ALL MODELS DOWNLOADED!")
print("=" * 60)
print(f"\nModels saved to: {os.path.abspath(models_dir)}")
print("\n📌 Next steps:")
print("1. Disconnect from internet")
print("2. Run your server normally - it will use cached models")
print("\n💡 Model cache location:")
print(f"   - Embedding: {models_dir}")
print(f"   - HuggingFace default cache: ~/.cache/huggingface/")
