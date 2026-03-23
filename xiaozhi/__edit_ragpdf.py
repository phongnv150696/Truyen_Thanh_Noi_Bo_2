from pathlib import Path

p = Path('RAGpdf.py')
s = p.read_text(encoding='utf-8')

s = s.replace(
    "    if \"last_bulk_import_message\" not in st.session_state:\n        st.session_state.last_bulk_import_message = \"\"\n",
    "    if \"last_bulk_import_message\" not in st.session_state:\n        st.session_state.last_bulk_import_message = \"\"\n    if \"datahoc_synced\" not in st.session_state:\n        st.session_state.datahoc_synced = False\n"
)

old_columns = """    col1, col2, col3 = st.sidebar.columns(3)
    process_btn = col1.button(\" Xử lý\", use_container_width=True)
    reset_btn = col2.button(\" Xóa DB\", use_container_width=True)
    ingest_md_btn = col3.button(\" Nạp .md\", use_container_width=True)
"""
new_columns = """    col1, col2 = st.sidebar.columns(2)
    process_btn = col1.button(\" Xử lý\", use_container_width=True)
    reset_btn = col2.button(\" Xóa DB\", use_container_width=True)
"""
s = s.replace(old_columns, new_columns)

start = s.find("\n    if ingest_md_btn:\n")
if start != -1:
    end = s.find("\n    # Reset database", start)
    if end != -1:
        s = s[:start] + "\n" + s[end:]

anchor = "    # Render UI\n"
auto_sync_block = """    # Auto sync dữ liệu từ datahoc: xóa dữ liệu cũ và nạp lại trực tiếp
    if not st.session_state.datahoc_synced:
        with st.spinner(\" Đang đồng bộ dữ liệu từ thư mục datahoc...\"):
            progress_bar = st.sidebar.progress(0)
            status_text = st.sidebar.empty()

            def update_sync_progress(pct, msg):
                progress_bar.progress(pct)
                status_text.text(msg)

            success, msg = chroma_manager.reset_collection()
            if success:
                success, msg = ingest_markdown_directory(progress_callback=update_sync_progress)

            st.session_state.last_bulk_import_message = msg
            st.session_state.datahoc_synced = success

            progress_bar.empty()
            status_text.empty()

            if not success:
                st.warning(f\" Đồng bộ datahoc chưa hoàn tất: {msg}\")
            else:
                st.success(msg)

"""
if anchor in s and auto_sync_block not in s:
    s = s.replace(anchor, auto_sync_block + anchor)

p.write_text(s, encoding='utf-8')
print('patched')
