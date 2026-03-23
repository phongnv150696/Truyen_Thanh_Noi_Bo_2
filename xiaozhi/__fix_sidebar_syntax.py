from pathlib import Path
import re

p = Path('RAGpdf.py')
s = p.read_text(encoding='utf-8')

s = re.sub(
    r'st\.sidebar\.error\("\s*Cần cài đặt pyvi:\s*\n```pip install pyvi```"\)',
    'st.sidebar.error(" Cần cài đặt pyvi:\\n```pip install pyvi```")',
    s,
    count=1,
)

s = s.replace('Vui lòng upload PDF, Word (.docx) hoặc bấm `Nạp .md` trước.',
              'Vui lòng upload PDF/Word hoặc đồng bộ dữ liệu từ `datahoc`.')

p.write_text(s, encoding='utf-8')
print('fixed-syntax-msg')
