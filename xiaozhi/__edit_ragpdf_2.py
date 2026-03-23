from pathlib import Path
import re

p = Path('RAGpdf.py')
s = p.read_text(encoding='utf-8')

s = re.sub(
    r"\s*col1, col2, col3 = st\.sidebar\.columns\(3\)\r?\n\s*process_btn = col1\.button\(\" Xử lý\", use_container_width=True\)\r?\n\s*reset_btn = col2\.button\(\" Xóa DB\", use_container_width=True\)\r?\n\s*ingest_md_btn = col3\.button\(\" Nạp \.md\", use_container_width=True\)\r?\n",
    "\n    col1, col2 = st.sidebar.columns(2)\n    process_btn = col1.button(\" Xử lý\", use_container_width=True)\n    reset_btn = col2.button(\" Đồng bộ\", use_container_width=True)\n",
    s,
    count=1,
)

s = re.sub(
    r"\r?\n\s*if ingest_md_btn:\r?\n(?:\s+.*\r?\n)+?\s*status_text\.empty\(\)\r?\n",
    "\n",
    s,
    count=1,
)

s = s.replace(
    "    # Reset database\n    if reset_btn:\n        success, msg = chroma_manager.reset_collection()\n        if success:\n            st.sidebar.success(msg)\n            st.rerun()\n        else:\n            st.sidebar.error(msg)\n",
    "    # Đồng bộ lại datahoc theo yêu cầu: xóa dữ liệu cũ rồi nạp trực tiếp\n    if reset_btn:\n        with st.spinner(\"Đang đồng bộ lại dữ liệu từ datahoc...\"):\n            progress_bar = st.sidebar.progress(0)\n            status_text = st.sidebar.empty()\n\n            def update_sync_progress(pct, msg):\n                progress_bar.progress(pct)\n                status_text.text(msg)\n\n            success, msg = chroma_manager.reset_collection()\n            if success:\n                success, msg = ingest_markdown_directory(progress_callback=update_sync_progress)\n\n            st.session_state.last_bulk_import_message = msg\n            st.session_state.datahoc_synced = success\n\n            progress_bar.empty()\n            status_text.empty()\n\n            if success:\n                st.sidebar.success(msg)\n            else:\n                st.sidebar.error(msg)\n"
)

s = s.replace(" Nạp Markdown hàng loạt", " Trạng thái đồng bộ datahoc")

p.write_text(s, encoding='utf-8')
print('patched-2')
