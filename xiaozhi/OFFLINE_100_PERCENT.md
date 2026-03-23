# 🎯 DÙNG MODEL KHÁC - OFFLINE 100% NGAY TỪ ĐẦU

## ✅ CÓ! 3 Cách Chạy Offline 100%

---

## **Cách 1: Dùng Models Đã Có Trong Cache (NHANH NHẤT)** ⭐

### Nếu đã từng download models trước đó:

```powershell
# Chạy script tự động setup
cd C:\Users\Admin\Desktop\Xiaozhi
xiaozhi-local-chat\main\xiaozhi-server\venv\Scripts\python.exe setup_local_models.py
```

**Script sẽ:**
- Tìm models trong cache (`~/.cache/huggingface/`)
- Lấy đường dẫn snapshot đầy đủ
- Tự động update `config.py`
- ✅ **Offline 100% ngay lập tức!**

### Kết quả:
```
✅ Found model: paraphrase-multilingual-MiniLM-L12-v2
✅ Snapshot found: <snapshot_id>
✅ Config updated!
✅ READY FOR OFFLINE USE!
```

**Giờ chạy server KHÔNG CẦN MẠNG!**

---

## **Cách 2: Dùng Model Nhẹ Hơn (KHUYẾN NGHỊ)** 🚀

Thay vì dùng model lớn (471MB), dùng model nhẹ hơn đã có sẵn hoặc dễ download:

### Option 2a: Dùng OpenAI Embeddings (nếu có API key)
```yaml
# config.yaml
embedding_model: openai  # Không cần download, gọi API
```

### Option 2b: Dùng Model Nhẹ Khác
Sửa `config.py`:

```python
"lightweight": EmbeddingModelConfig(
    model_id="sentence-transformers/all-MiniLM-L6-v2",  # Chỉ 80MB
    dimension=384,
    size_mb=80,
    description="Ultra-light model",
    requires_tokenizer=False
),
```

Sau đó trong `config.yaml`:
```yaml
embedding_model: lightweight  # Thay vì balanced
```

**Ưu điểm:**
- Nhẹ hơn (80MB vs 471MB)
- Download nhanh hơn
- Vẫn hoạt động tốt với tiếng Việt

---

## **Cách 3: Dùng Model Local Tự Training** 🔥

Nếu bạn có model embedding riêng:

### Bước 1: Đặt model vào thư mục
```
models/
  my-embedding/
    ├── config.json
    ├── pytorch_model.bin
    ├── tokenizer.json
    └── ...
```

### Bước 2: Sửa `config.py`
```python
"custom": EmbeddingModelConfig(
    model_id="C:/Users/Admin/Desktop/Xiaozhi/models/my-embedding",
    dimension=768,  # Tùy model
    size_mb=200,
    description="Custom local model",
    requires_tokenizer=False
),
```

### Bước 3: Dùng trong `config.yaml`
```yaml
embedding_model: custom
```

---

## **Cách 4: Copy Models Từ Máy Khác** 💾

Nếu bạn có máy khác đã download models:

### Bước 1: Trên máy CÓ MẠNG
```powershell
# Download models
python download_models.py

# Sau đó copy toàn bộ cache
zip -r models_cache.zip C:\Users\Admin\.cache\huggingface\hub
```

### Bước 2: Copy sang máy OFFLINE
- Copy `models_cache.zip` sang USB/network
- Giải nén vào `C:\Users\Admin\.cache\huggingface\hub`

### Bước 3: Chạy setup script
```powershell
xiaozhi-local-chat\main\xiaozhi-server\venv\Scripts\python.exe setup_local_models.py
```

✅ **Offline 100%!**

---

## 🎯 **Khuyến Nghị Theo Tình Huống**

### ❌ Nếu **KHÔNG có mạng** và **chưa có models**:
→ **Cách 4**: Copy models từ máy khác

### ✅ Nếu **có mạng** nhưng muốn **nhanh**:
→ **Cách 2b**: Dùng model lightweight (80MB)

### ✅ Nếu **đã từng chạy** server với mạng trước đó:
→ **Cách 1**: Dùng models trong cache (đã có sẵn)

### ✅ Nếu có **model riêng**:
→ **Cách 3**: Dùng model tự training

---

## 📋 **Checklist - Offline 100% Ngay**

1. **Kiểm tra cache:**
   ```powershell
   dir C:\Users\Admin\.cache\huggingface\hub
   ```

2. **Nếu có models → Chạy setup:**
   ```powershell
   xiaozhi-local-chat\main\xiaozhi-server\venv\Scripts\python.exe setup_local_models.py
   ```

3. **Nếu chưa có → Chọn 1 trong các cách:**
   - Copy từ máy khác (Cách 4)
   - Dùng model nhẹ (Cách 2b)
   - Dùng model riêng (Cách 3)

4. **Chạy server:**
   ```powershell
   cd xiaozhi-local-chat\main\xiaozhi-server
   venv\Scripts\python.exe app.py
   ```

5. **✅ Offline 100%!**

---

## ⚡ **TL;DR - Giải Pháp Nhanh Nhất**

```powershell
# 1. Chạy script setup
xiaozhi-local-chat\main\xiaozhi-server\venv\Scripts\python.exe setup_local_models.py

# 2. Nếu thành công → Chạy server
cd xiaozhi-local-chat\main\xiaozhi-server
venv\Scripts\python.exe app.py

# 3. ✅ Offline!
```

**Nếu bước 1 thất bại:**
- Hoặc copy models từ máy khác
- Hoặc dùng model nhẹ hơn (sửa config.yaml: `embedding_model: lightweight`)

---

## 🆚 **So Sánh Models**

| Model | Kích Thước | Tốc Độ | Chất Lượng | Tiếng Việt |
|-------|------------|--------|------------|------------|
| **paraphrase-multilingual-MiniLM-L12-v2** | 471MB | Trung bình | Tốt | ⭐⭐⭐⭐⭐ |
| **all-MiniLM-L6-v2** | 80MB | Nhanh | Khá | ⭐⭐⭐⭐ |
| **vietnamese-embedding** | 400MB | Chậm | Rất tốt | ⭐⭐⭐⭐⭐ |

**Khuyến nghị:** Nếu chỉ cần offline nhanh → Dùng `all-MiniLM-L6-v2`

---

**CÓ NHIỀU CÁCH ĐỂ OFFLINE 100%! Không nhất thiết phải chạy với mạng lần đầu!** ✅
