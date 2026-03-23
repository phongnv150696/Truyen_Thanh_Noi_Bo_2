# ✅ PHÁT HIỆN: Retrieval ĐÚNG, Vấn đề Ở LLM Response

## Kết Quả Kiểm Tra

### ✅ Retrieval Hoạt Động CHÍNH XÁC

Query: **"Chính trị viên đại đội 8 là ai"**

**Top Result (Position #1):**
- Distance: **0.2801** (rất tốt!)
- Content: 
```
Họ tên:** Đại úy Nguyễn Văn Phong
Chức vụ:** Chính trị viên Đại đội 8
```

→ **Chunk đúng ĐÃ Ở VỊ TRÍ 1** trong retrieval results!

---

## Vậy Vấn Đề Là Gì?

### ❌ KHÔNG PHẢI là retrieval
- ✅ ChromaDB tìm được đúng chunk
- ✅ Distance score tốt (0.28)
- ✅ Chunk chứa đầy đủ thông tin

### ⚠️ Vấn đề CÓ THỂ là:

#### 1. LLM Prompt quá strict
File `rag_ollama.py` có prompt yêu cầu "TRÍCH NGUYÊN VĂN":

```python
Căn cứ vào NGUYÊN VĂN thông tin trong context, hãy trả lời câu hỏi.
KHÔNG được bịa đặt thông tin không có trong context.
```

→ LLM có thể từ chối trả lời nếu:
- Chunk không có CHÍNH XÁC cụm từ user hỏi
- Format câu trả lời không khớp với context

#### 2. LLM Model Issue
Model `qwen2.5:3b` có thể:
- Khả năng reasoning yếu
- Không extract được info từ format Markdown
- Cần instruction rõ ràng hơn

#### 3. Context Format
Chunk được format như thế nào khi truyền vào LLM:
- Có giữ nguyên Markdown formatting không?
- Có metadata được inject vào không?
- LLM có đọc được format `**Họ tên:**` không?

---

## Giải Pháp

### Option 1: Cải thiện Prompt ⭐ (Khuyến nghị)

Sửa prompt trong `rag_ollama.py` để linh hoạt hơn:

```python
# BEFORE (quá strict):
"TRÍCH NGUYÊN VĂN thông tin trong context"

# AFTER (linh hoạt):
"Dựa vào thông tin trong context, hãy trả lời câu hỏi một cách chính xác và đầy đủ.
Nếu context chứa thông tin liên quan, hãy tổng hợp và trả lời rõ ràng."
```

### Option 2: Thêm Examples vào Prompt

Thêm few-shot examples:

```python
VÍ DỤ:
Context: "**Họ tên:** Đại úy Nguyễn Văn Phong\n**Chức vụ:** Chính trị viên Đại đội 8"
Câu hỏi: "Chính trị viên đại đội 8 là ai?"
Trả lời: "Chính trị viên đại đội 8 là Đại úy Nguyễn Văn Phong."
```

### Option 3: Dùng Model Lớn Hơn

Model `qwen2.5:3b` nhỏ → reasoning yếu

Thử:
- `qwen2.5:7b` (tốt hơn)
- `qwen2.5:14b` (tốt nhất, nhưng chậm)

### Option 4: Post-process Context

Trước khi truyền vào LLM, clean up Markdown:

```python
# Remove Markdown formatting
context = context.replace("**", "")  # Remove bold
context = context.replace("###", "")  # Remove headers
```

→ LLM đọc dễ hơn

---

## Khuyến Nghị

### Bước 1: Test với prompt mới (nhanh nhất)
Sửa prompt để linh hoạt hơn, không quá strict về "TRÍCH NGUYÊN VĂN"

### Bước 2: Nếu vẫn không được → Thử model lớn hơn
Upgrade từ `qwen2.5:3b` → `qwen2.5:7b`

### Bước 3: Add logging
Log chính xác context được gửi cho LLM để debug

---

## Files Cần Sửa

1. `core/providers/llm/rag/rag_ollama.py` - Prompt engineering
2. `config.yaml` - Model selection (nếu cần upgrade)
