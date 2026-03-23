import os
import urllib.request
import tarfile
import shutil

# Official Sherpa-ONNX Piper Model (Vietnamese)
MODEL_INFO = { # Medium Quality Model - vais1000 (Better sounding)
    "url": "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-vi_VN-vais1000-medium.tar.bz2",
    "filename": "vits-piper-vi_VN-vais1000-medium.tar.bz2",
    "model_name": "vits-piper-vi_VN-vais1000-medium"
}
DOWNLOAD_FILE = MODEL_INFO["filename"]
EXTRACT_DIR = "models"

def download_and_extract():
    if not os.path.exists(EXTRACT_DIR):
        os.makedirs(EXTRACT_DIR)
    
    print(f"Downloading model from {MODEL_INFO['url']}...")
    try:
        urllib.request.urlretrieve(MODEL_INFO["url"], DOWNLOAD_FILE)
        print("Download complete.")
        
        print(f"Extracting to {EXTRACT_DIR}...")
        with tarfile.open(DOWNLOAD_FILE, "r:bz2") as tar:
            tar.extractall(EXTRACT_DIR)
        print("Extraction complete.")
        
        # Cleanup
        os.remove(DOWNLOAD_FILE)
        print(f"Done! Model is ready in {EXTRACT_DIR}/vits-piper-vi_VN-25hours_single-low")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Try downloading manually from the URL above and extracting to 'models/'")

if __name__ == "__main__":
    download_and_extract()
