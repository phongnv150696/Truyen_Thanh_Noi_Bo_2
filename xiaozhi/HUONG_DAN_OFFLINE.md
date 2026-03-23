# 🔧 Hướng Dẫn Chạy Offline 100%

## ❓ Vấn Đề
System đang cố tải models từ HuggingFace, dù bạn muốn chạy offline 100%.

Lỗi:
```
Failed to resolve 'huggingface.co' ([Errno 11001] getaddrinfo failed)
```

## ✅ Nguyên Nhân
- File `config.yaml` (dòng 166) dùng `embedding_model: balanced`
- Model `balanced` được map sang `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (tại `config.py`)
- Khi khởi động, hệ thống cố tải model này từ HuggingFace

## 🎯 Giải Pháp (Chọn 1 trong 3)

---

### **Giải Pháp 1: Download Models Trước (KHUYẾN NGHỊ) ⭐**

#### Bước 1: Kết nối mạng và chạy script download
```powershell
cd C:\Users\Admin\Desktop\Xiaozhi
python download_models.py
```

**Script này sẽ:**
- Tải `paraphrase-multilingual-MiniLM-L12-v2` (~120MB)
- Tải `ms-marco-MiniLM-L-6-v2` (~90MB)
- Cache vào `~/.cache/huggingface/` hoặc `./models/embedding/`

#### Bước 2: Ngắt mạng và chạy server
Sau khi tải xong, ngắt mạng và chạy bình thường:
```powershell
cd xiaozhi-local-chat\main\xiaozhi-server
python app.py
```

✅ **System sẽ tự động dùng models đã cache, không cần internet!**

---

### **Giải Pháp 2: Dùng Model Nhẹ Hơn**

Nếu không muốn tải models lớn, dùng model nhẹ hơn (`all-MiniLM-L6-v2`, 80MB).

#### Sửa file `config.yaml`:
```yaml
# Dòng 166
embedding_model: lightweight  # Thay vì "balanced"
```

Sau đó chạy `download_models.py` (model này nhẹ hơn, tải nhanh hơn).

---

### **Giải Pháp 3: Dùng Model Local Có Sẵn**

Nếu bạn đã có models local (đã tải từ trước), trỏ trực tiếp đến đường dẫn.

#### Bước 1: Tìm đường dẫn models
Kiểm tra xem bạn có folder models local không:
- `C:\Models\`
- `D:\AI_Models\`
- Hoặc đường dẫn khác

#### Bước 2: Sửa file `config.py`
File: `xiaozhi-local-chat\main\xiaozhi-server\core\providers\llm\rag\config.py`

```python
# Dòng 27-32, thay đổi thành:
"balanced": EmbeddingModelConfig(
    model_id="C:/Models/paraphrase-multilingual-MiniLM-L12-v2",  # ← ĐỔI THÀNH ĐƯỜNG DẪN LOCAL
    dimension=384,
    size_mb=120,
    description="Balanced model (LOCAL)",
    requires_tokenizer=False
),
```

⚠️ **Lưu ý:**
- Đường dẫn phải có folder chứa model (có file `config.json`, `pytorch_model.bin`, v.v.)
- Dùng `/` (slash), không dùng `\` (backslash)

---

## 📝 Kiểm Tra Cache HuggingFace

Nếu bạn nghĩ rằng models đã được download trước đó, kiểm tra:

### Windows:
```powershell
dir C:\Users\Admin\.cache\huggingface\hub
```

### Nếu thấy folder `models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2`:
✅ **Model đã có trong cache!**

Nguyên nhân lỗi là server không tìm thấy cache. Thử:
```powershell
# Set biến môi trường cache
$env:TRANSFORMERS_CACHE = "C:\Users\Admin\.cache\huggingface"
$env:HF_HOME = "C:\Users\Admin\.cache\huggingface"

# Chạy server
python app.py
```

---

## 🚀 Khuyến Nghị Cuối Cùng

**Cách nhanh nhất:**
1. Kết nối mạng
2. Chạy `python download_models.py`
3. Đợi models tải xong (~210MB)
4. Ngắt mạng
5. Chạy server như bình thường

Lần sau khởi động, server sẽ dùng cache local, **100% offline!**

---

## 🛠️ Troubleshooting

### Lỗi: "No module named 'sentence_transformers'"
```powershell
pip install sentence-transformers
```

### Lỗi: "CUDA out of memory"
Models sẽ tự động fallback sang CPU, an toàn.

### Models tải chậm quá?
- Model `balanced`: 120MB, mất ~2-5 phút (tùy mạng)
- Nếu quá chậm, đổi sang `lightweight` (80MB)

---

## ✅ Kết Luận

Hệ thống của bạn **KHÔNG PHẢI** online 100%. Lỗi chỉ xảy ra vì:
- Lần đầu khởi động cần download models
- Hoặc cache chưa được tìm thấy
- Hoặc code chưa được sửa để force offline mode

Sau khi download xong, hệ thống sẽ chạy **hoàn toàn offline!**

---

## 🔧 FIX ĐÃ THỰC HIỆN

### ✅ Đã sửa file `model_manager.py`:
Thêm `local_files_only=True` vào tất cả lệnh load models:

```python
# TRƯỚC (cố kết nối HuggingFace):
self._embedding_model = SentenceTransformer(
    embedding_model_id,
    device=self._device,
    trust_remote_code=True
)

# SAU (force offline):
self._embedding_model = SentenceTransformer(
    embedding_model_id,
    device=self._device,
    trust_remote_code=True,
    local_files_only=True  # ✅ Chỉ dùng cache local
)
```

### ✅ Script khởi chạy offline:
```powershell
# Dùng script tiện ích (đã set env vars):
.\start_server_offline.ps1

# Hoặc chạy thủ công:
cd xiaozhi-local-chat\main\xiaozhi-server
python app.py
```

Giờ server sẽ **KHÔNG BAO GIỜ** cố kết nối HuggingFace nữa! 🎉

