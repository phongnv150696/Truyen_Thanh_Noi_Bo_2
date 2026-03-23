"""
Test script to verify models work (with cache)
"""

print("=" * 60)
print("TESTING MODEL LOADING (Cache Mode)")
print("=" * 60)
print("\n📁 This will use local cache if available\n")

try:
    from sentence_transformers import SentenceTransformer, CrossEncoder
    
    # Test embedding model
    print("1. Loading embedding model...")
    print("   Model: paraphrase-multilingual-MiniLM-L12-v2")
    
    embedding_model = SentenceTransformer(
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    print("   ✅ Embedding model loaded successfully!")
    
    # Test encoding
    test_text = "Xin chào, đây là test"
    embedding = embedding_model.encode(test_text)
    print(f"   ✅ Test encoding: shape={embedding.shape}, dim={len(embedding)}")
    
    # Test cross-encoder
    print("\n2. Loading cross-encoder...")
    print("   Model: ms-marco-MiniLM-L-6-v2")
    
    cross_encoder = CrossEncoder(
        "cross-encoder/ms-marco-MiniLM-L-6-v2",
        max_length=512
    )
    print("   ✅ Cross-encoder loaded successfully!")
    
    # Test scoring
    query = "Ai là chính ủy?"
    doc = "Chính ủy trung đoàn là Trung tá Trần Văn Tới"
    score = cross_encoder.predict([[query, doc]])[0]
    print(f"   ✅ Test scoring: score={score:.3f}")
    
    print("\n" + "=" * 60)
    print("✅ SUCCESS! ALL MODELS WORK!")
    print("=" * 60)
    print("\n🎉 Models are cached and ready!")
    print("📌 Next time you run offline, models will be loaded from cache")
    
except Exception as e:
    print("\n" + "=" * 60)
    print("❌ FAILED TO LOAD MODELS")
    print("=" * 60)
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
