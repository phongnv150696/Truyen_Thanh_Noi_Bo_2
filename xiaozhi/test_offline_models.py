"""
Test script to verify models can be loaded offline
"""

import os
os.environ['HF_HUB_OFFLINE'] = '1'  # Force offline mode

print("=" * 60)
print("TESTING OFFLINE MODEL LOADING")
print("=" * 60)
print("\n🔌 Offline mode: ENABLED")
print("📁 This test will FAIL if models are not cached locally\n")

try:
    from sentence_transformers import SentenceTransformer, CrossEncoder
    
    # Test embedding model
    print("1. Loading embedding model...")
    print("   Model: paraphrase-multilingual-MiniLM-L12-v2")
    
    embedding_model = SentenceTransformer(
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    print("   ✅ Embedding model loaded successfully (OFFLINE)!")
    
    # Test encoding
    test_text = "Xin chào, đây là test offline"
    embedding = embedding_model.encode(test_text)
    print(f"   ✅ Test encoding: {embedding.shape}")
    
    # Test cross-encoder
    print("\n2. Loading cross-encoder...")
    print("   Model: ms-marco-MiniLM-L-6-v2")
    
    cross_encoder = CrossEncoder(
        "cross-encoder/ms-marco-MiniLM-L-6-v2",
        max_length=512
    )
    print("   ✅ Cross-encoder loaded successfully (OFFLINE)!")
    
    # Test scoring
    query = "Ai là chính ủy?"
    doc = "Chính ủy trung đoàn là Trung tá Trần Văn Tới"
    score = cross_encoder.predict([[query, doc]])[0]
    print(f"   ✅ Test scoring: {score:.3f}")
    
    print("\n" + "=" * 60)
    print("✅ SUCCESS! ALL MODELS WORK OFFLINE!")
    print("=" * 60)
    print("\n🎉 Your system is now 100% offline-ready!")
    print("📌 You can safely disconnect from internet")
    
except Exception as e:
    print("\n" + "=" * 60)
    print("❌ FAILED TO LOAD MODELS OFFLINE")
    print("=" * 60)
    print(f"\nError: {e}")
    print("\n💡 Possible causes:")
    print("   - Models not cached locally")
    print("   - Cache directory not accessible")
    print("   - sentence-transformers not installed")
