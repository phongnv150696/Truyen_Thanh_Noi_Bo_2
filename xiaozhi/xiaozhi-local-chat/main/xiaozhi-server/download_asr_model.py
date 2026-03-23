import os
import urllib.request
import tarfile
import shutil
import ssl

# Fix SSL verify error
ssl._create_default_https_context = ssl._create_unverified_context

def download_file(url, filename):
    print(f"Downloading {url}...")
    with urllib.request.urlopen(url) as response, open(filename, 'wb') as out_file:
        shutil.copyfileobj(response, out_file)
    print("Download complete.")

def extract_tar_bz2(filename, output_dir):
    print(f"Extracting {filename}...")
    with tarfile.open(filename, "r:bz2") as tar:
        tar.extractall(path=output_dir)
    print("Extraction complete.")

def main():
    candidates = [
        # GitHub Release for Multilingual V2 (Verified)
        ("sherpa-onnx-zipformer-multi-zh-hans-zh-hant-en-fr-ja-ko-ru-vi-2024-04-15", "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-multi-zh-hans-zh-hant-en-fr-ja-ko-ru-vi-2024-04-15.tar.bz2"),
        # GitHub Release for VI (Try 2025 version if exists)
        ("sherpa-onnx-zipformer-vi-2025-04-20", "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-vi-2025-04-20.tar.bz2")
    ]
    
    base_dir = "models"
    os.makedirs(base_dir, exist_ok=True)

    for model_name, url in candidates:
        archive_file = f"{model_name}.tar.bz2"
        output_dir = os.path.join(base_dir, model_name)
        
        if os.path.exists(output_dir):
            print(f"Model {output_dir} already exists.")
            return

        print(f"Trying to download {model_name} from {url}...")
        try:
            download_file(url, archive_file)
            extract_tar_bz2(archive_file, base_dir)
            
            if os.path.exists(archive_file):
                os.remove(archive_file)
            
            print(f"Successfully installed {model_name}")
            return # Exit after success
            
        except Exception as e:
            print(f"Failed to download {model_name}: {e}")
            continue
            
    print("All download attempts failed.")

if __name__ == "__main__":
    main()
