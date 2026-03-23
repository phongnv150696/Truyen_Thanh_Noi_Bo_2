import os
import urllib.request
import tarfile
import sys

# Configuration
MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-vi-int8-2025-04-20.tar.bz2"
ARCHIVE_NAME = "sherpa-onnx-zipformer-vi-int8-2025-04-20.tar.bz2"
MODELS_DIR = "models"
TARGET_DIR_NAME = "sherpa-onnx-zipformer-vi-int8-2025-04-20"

def download_file(url, dest_path):
    print(f"Downloading {url}...")
    try:
        def reporthook(blocknum, blocksize, totalsize):
            readsofar = blocknum * blocksize
            if totalsize > 0:
                percent = readsofar * 1e2 / totalsize
                s = "\r%5.1f%% %*d / %d" % (
                    percent, len(str(totalsize)), readsofar, totalsize)
                sys.stderr.write(s)
                if readsofar >= totalsize:
                    sys.stderr.write("\n")
            else:
                sys.stderr.write("read %d\n" % (readsofar,))
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            total_size = int(response.info().get('Content-Length', -1))
            block_size = 8192
            read_so_far = 0
            while True:
                buffer = response.read(block_size)
                if not buffer:
                    break
                read_so_far += len(buffer)
                out_file.write(buffer)
                reporthook(1, read_so_far, total_size)
                
        print(f"\n✅ Saved archive to {dest_path}")
        return True
    except Exception as e:
        print(f"\n❌ Failed to download: {e}")
        return False

def extract_tar_bz2(archive_path, extract_to):
    print(f"Extracting {archive_path} to {extract_to}...")
    try:
        with tarfile.open(archive_path, "r:bz2") as tar:
            tar.extractall(path=extract_to)
        print("✅ Extraction complete!")
        return True
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return False

def main():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        
    archive_path = os.path.join(MODELS_DIR, ARCHIVE_NAME)
    
    # Check if already extracted
    extracted_path = os.path.join(MODELS_DIR, TARGET_DIR_NAME)
    if os.path.exists(extracted_path):
        print(f"⚠️ Directory {extracted_path} already exists.")
        choice = input("Redownload and overwrite? (y/n): ")
        if choice.lower() != 'y':
            print("Skipping.")
            return

    # Download
    if download_file(MODEL_URL, archive_path):
        # Extract
        if extract_tar_bz2(archive_path, MODELS_DIR):
            print(f"\n🎉 Model ready at: {os.path.abspath(extracted_path)}")
            
            # Clean up archive
            try:
                os.remove(archive_path)
                print("Deleted temporary archive file.")
            except:
                pass
                
            print("\n👉 Please Restart Server now.")
    else:
        print("\n❌ Process failed.")

if __name__ == "__main__":
    main()
