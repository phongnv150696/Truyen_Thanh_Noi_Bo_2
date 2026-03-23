"""
Manual Re-index Trigger
Quick script để force re-index tất cả documents
"""
import os
import sys

# Add project root
sys.path.insert(0, '.')

print("=" * 70)
print("🔄 MANUAL RE-INDEX TRIGGER")
print("=" * 70)

# Delete cache to force re-index
cache_file = "data/document_cache.json"

if os.path.exists(cache_file):
    os.remove(cache_file)
    print(f"\n✅ Deleted cache: {cache_file}")
    print("📝 Server will auto re-index ALL documents on next startup")
else:
    print(f"\n⚠️  Cache not found: {cache_file}")
    print("📝 Server will index documents on next startup anyway")

print("\n" + "=" * 70)
print("🚀 NEXT STEP: Restart server")
print("=" * 70)
print("\nCommand:")
print("  cd xiaozhi-server")
print("  .\\venv\\Scripts\\python app.py")
