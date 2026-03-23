import re

with open('core/providers/llm/rag/rag_ollama.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line with "NHIỆM VỤ QUAN TRỌNG"
for i, line in enumerate(lines):
    if 'NHIỆM VỤ QUAN TRỌNG' in line:
        # Replace the prompt section (lines 672-682) 
        new_prompt = f'''⚠️ NHIỆM VỤ: Liệt kê TỪNG {{item_label}} VỚI SỐ THỨ TỰ.

FORMAT BẮT BUỘC:
"{{item_label}} số 1: [nội dung]
{{item_label}} số 2: [nội dung]
{{item_label}} số 3: [nội dung]
..."

QUY TẮC:
1. PHẢI CÓ SỐ (ví dụ: "Công việc số 1:", "Công việc số 2:")  
2. LIỆT KÊ ĐẦY ĐỦ tất cả
3. TRÍCH NGUYÊN VĂN từ Context
4. KHÔNG TÓM TẮT

'''
        # Replace from line i to line with "VÍ DỤ ĐÚNG"
        end_idx = i
        for j in range(i, min(i+20, len(lines))):
            if 'VÍ DỤ ĐÚNG' in lines[j]:
                end_idx = j
                break
        
        lines[i] = new_prompt
        # Remove lines between
        del lines[i+1:end_idx]
        break

with open('core/providers/llm/rag/rag_ollama.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
    
print("Prompt updated successfully!")
