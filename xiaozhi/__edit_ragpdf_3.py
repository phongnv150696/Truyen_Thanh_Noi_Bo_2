from pathlib import Path

p = Path('RAGpdf.py')
s = p.read_text(encoding='utf-8')

s = s.replace(
"""    col1, col2, col3 = st.sidebar.columns(3)
    process_btn = col1.button(" Xử lý", use_container_width=True)
    reset_btn = col2.button(" Xóa DB", use_container_width=True)
    ingest_md_btn = col3.button(" Nạp .md", use_container_width=True)
""",
"""    col1, col2 = st.sidebar.columns(2)
    process_btn = col1.button(" Xử lý", use_container_width=True)
    reset_btn = col2.button(" Đồng bộ", use_container_width=True)
"""
)

s = s.replace(
"""    if ingest_md_btn:
        with st.spinner("Đang nạp toàn bộ file Markdown..."):
            progress_bar = st.sidebar.progress(0)
            status_text = st.sidebar.empty()

            def update_md_progress(pct, msg):
                progress_bar.progress(pct)
                status_text.text(msg)

            success, msg = ingest_markdown_directory(progress_callback=update_md_progress)
            st.session_state.last_bulk_import_message = msg

            if success:
                st.sidebar.success(msg)
            else:
                st.sidebar.error(msg)

            progress_bar.empty()
            status_text.empty()
""",
"""
"""
)

p.write_text(s, encoding='utf-8')
print('patched-3')
