"""
Script để setup local models - OFFLINE 100%
Tìm models đã có trong cache và config để dùng local
"""

import os
import glob

print("=" * 60)
print("SETUP LOCAL MODELS - OFFLINE 100%")
print("=" * 60)

# Đường dẫn cache HuggingFace
cache_dir = os.path.expanduser("~/.cache/huggingface/hub")

print(f"\n📁 Checking cache: {cache_dir}")

# Tìm model embedding
model_name = "models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2"
model_path = os.path.join(cache_dir, model_name)

if os.path.exists(model_path):
    print(f"✅ Found model: {model_name}")
    
    # Tìm snapshot directory
    snapshots_dir = os.path.join(model_path, "snapshots")
    if os.path.exists(snapshots_dir):
        snapshots = [d for d in os.listdir(snapshots_dir) 
                    if os.path.isdir(os.path.join(snapshots_dir, d))]
        
        if snapshots:
            # Lấy snapshot mới nhất
            snapshot_id = snapshots[0]
            full_path = os.path.join(snapshots_dir, snapshot_id)
            
            print(f"\n✅ Snapshot found: {snapshot_id}")
            print(f"📂 Full path: {full_path}")
            
            # Kiểm tra files
            required_files = ['config.json', 'modules.json', 'model.safetensors']
            files_exist = all(
                os.path.exists(os.path.join(full_path, f)) 
                for f in required_files
            )
            
            if files_exist:
                print("\n✅ All required files present!")
                print("\n" + "=" * 60)
                print("📋 CONFIG SETUP")
                print("=" * 60)
                
                # Windows path với forward slash
                config_path = full_path.replace("\\", "/")
                
                print(f"\n📝 Add this to config.py:\n")
                print(f'model_id="{config_path}"')
                
                print("\n" + "=" * 60)
                print("✅ READY FOR OFFLINE USE!")
                print("=" * 60)
                print("\nNow you can run server 100% offline!")
                
                # Tự động update config.py
                config_file = os.path.join(
                    os.path.dirname(__file__),
                    "xiaozhi-local-chat", "main", "xiaozhi-server",
                    "core", "providers", "llm", "rag", "config.py"
                )
                
                if os.path.exists(config_file):
                    print(f"\n🔧 Updating config.py automatically...")
                    
                    with open(config_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Replace model_id
                    old_line = 'model_id="C:/Users/Admin/.cache/huggingface/hub/models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2/snapshots/<snapshot_id>"'
                    new_line = f'model_id="{config_path}"'
                    
                    if old_line in content:
                        content = content.replace(old_line, new_line)
                        
                        with open(config_file, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        print(f"✅ Config updated!")
                        print(f"   Path: {config_path}")
                    else:
                        print(f"⚠️  Could not auto-update. Please manually set:")
                        print(f'   model_id="{config_path}"')
                else:
                    print(f"\n⚠️  Config file not found, please manually update:")
                    print(f'   model_id="{config_path}"')
            else:
                print("\n❌ Some required files missing!")
                print("   You need to download the model first.")
        else:
            print("\n❌ No snapshots found")
    else:
        print("\n❌ Snapshots directory not found")
else:
    print(f"\n❌ Model not found in cache!")
    print("\n💡 You need to either:")
    print("   1. Run server with internet once to download")
    print("   2. Manually download model to this location")
    print("   3. Use a different model")

print("\n" + "=" * 60)

# Tìm cross-encoder
print("\n🔍 Checking cross-encoder...")
ce_name = "models--cross-encoder--ms-marco-MiniLM-L-6-v2"
ce_path = os.path.join(cache_dir, ce_name)

if os.path.exists(ce_path):
    print(f"✅ Cross-encoder found: {ce_name}")
else:
    print(f"⚠️  Cross-encoder not found")
    print("   This is also needed for RAG")
