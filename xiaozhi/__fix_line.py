from pathlib import Path

p = Path('RAGpdf.py')
lines = p.read_text(encoding='utf-8').splitlines()

for i, line in enumerate(lines):
    if 'st.sidebar.error(" Cần cài đặt pyvi:' in line or 'st.sidebar.error(" Cần cài đặt pyvi:' in line:
        lines[i] = '        st.sidebar.error(" Cần cài đặt pyvi:\\n```pip install pyvi```")'
        if i + 1 < len(lines) and 'pip install pyvi' in lines[i + 1]:
            lines[i + 1] = ''
        break

p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('fixed-line')
