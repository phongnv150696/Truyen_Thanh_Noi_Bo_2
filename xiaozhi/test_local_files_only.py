"""
Test if local_files_only parameter works with SentenceTransformer
"""
import os
os.environ['HF_HUB_OFFLINE'] = '0'  # Allow online first

from sentence_transformers import SentenceTransformer

print("=" * 60)
print("TEST: local_files_only parameter")
print("=" * 60)

model_id = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Test 1: Try with local_files_only
print("\n1. Testing with local_files_only=True...")
try:
    model = SentenceTransformer(
        model_id,
        local_files_only=True
    )
    print("   ✅ SUCCESS with local_files_only=True")
except TypeError as e:
    print(f"   ❌ TypeError: {e}")
    print("   → Parameter not supported!")
except Exception as e:
    print(f"   ❌ Other error: {e}")

# Test 2: Check what parameters are actually accepted
print("\n2. Checking accepted parameters...")
import inspect
sig = inspect.signature(SentenceTransformer)
print(f"   Signature: {sig}")

print("\n3. Checking sentence-transformers version...")
import sentence_transformers
print(f"   Version: {sentence_transformers.__version__}")
