from pathlib import Path

p = Path('RAGpdf.py')
s = p.read_text(encoding='utf-8')

start = s.find('def render_sidebar():')
end = s.find('\ndef render_main():')
if start == -1 or end == -1:
    raise SystemExit('render_sidebar block not found')

new_block = '''def render_sidebar():
    """Render sidebar với upload và stats"""
    st.sidebar.title(" Quản lý tài liệu")

    if not VI_TOKENIZER_AVAILABLE:
        st.sidebar.error(" Cần cài đặt pyvi:\n```pip install pyvi```")

    stats = chroma_manager.get_stats()
    st.sidebar.metric("Tổng số chunks", stats.get("total_chunks", 0))
    ingested_documents = chroma_manager.get_ingested_documents()

    uploaded_file = st.sidebar.file_uploader(
        " Chọn file PDF hoặc Word (.docx)",
        type=["pdf", "docx"],
        accept_multiple_files=False,
        help=f"Giới hạn: {config.MAX_FILE_SIZE_MB}MB. PDF tối đa {config.MAX_PAGES} trang"
    )

    col1, col2 = st.sidebar.columns(2)
    process_btn = col1.button(" Xử lý", use_container_width=True)
    sync_btn = col2.button(" Đồng bộ", use_container_width=True)

    if uploaded_file and process_btn:
        with st.spinner("Đang xử lý file..."):
            progress_bar = st.sidebar.progress(0)
            status_text = st.sidebar.empty()

            def update_progress(pct, msg):
                progress_bar.progress(pct)
                status_text.text(msg)

            ext = Path(uploaded_file.name).suffix.lower()
            markdown_path = None

            if ext == ".pdf":
                update_progress(0.1, "Đang đọc PDF...")
                chunks, msg = process_document(uploaded_file)
            elif ext == ".docx":
                update_progress(0.1, "Đang chuyển Word -> Markdown...")
                chunks, markdown_path, msg = process_docx_document(uploaded_file)
            else:
                chunks, msg = None, "Định dạng chưa hỗ trợ. Vui lòng dùng PDF hoặc DOCX."

            if chunks:
                safe_name = uploaded_file.name.translate(
                    str.maketrans({"-": "_", ".": "_", " ": "_"})
                )
                success, msg = add_to_vector_store(
                    chunks,
                    safe_name,
                    progress_callback=update_progress
                )
                if success:
                    st.sidebar.success(msg)
                    if markdown_path:
                        st.session_state.last_markdown_path = markdown_path
                        st.sidebar.caption(f" Đã lưu Markdown: `{markdown_path}`")
                else:
                    st.sidebar.error(msg)
            else:
                st.sidebar.error(msg)

            progress_bar.empty()
            status_text.empty()

    if sync_btn:
        with st.spinner("Đang đồng bộ lại dữ liệu từ datahoc..."):
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

            if success:
                st.sidebar.success(msg)
            else:
                st.sidebar.error(msg)

    st.sidebar.divider()
    st.sidebar.subheader(" Trạng thái hệ thống")
    if model_manager.is_ready:
        st.sidebar.success(" Embedding model đã sẵn sàng")
        if model_manager.is_cross_encoder_ready:
            st.sidebar.success(" Re-ranker đã sẵn sàng")
        elif model_manager.is_cross_encoder_loading:
            st.sidebar.info(" Re-ranker đang load nền (bạn vẫn hỏi ngay được)")
        else:
            st.sidebar.warning(" Re-ranker chưa sẵn sàng, sẽ dùng chế độ fallback")
    else:
        st.sidebar.warning(" Embedding model chưa được load")

    if st.session_state.last_markdown_path:
        st.sidebar.divider()
        st.sidebar.subheader(" Markdown đã convert")
        st.sidebar.code(st.session_state.last_markdown_path)
        md_path = Path(st.session_state.last_markdown_path)
        if md_path.exists():
            md_content = md_path.read_text(encoding="utf-8")
            st.sidebar.download_button(
                " Tải file .md",
                data=md_content,
                file_name=md_path.name,
                mime="text/markdown",
                use_container_width=True
            )

    if st.session_state.last_bulk_import_message:
        st.sidebar.divider()
        st.sidebar.subheader(" Trạng thái đồng bộ datahoc")
        st.sidebar.caption(st.session_state.last_bulk_import_message)

    st.sidebar.divider()
    st.sidebar.subheader(" Danh sách tài liệu đã nạp")
    if ingested_documents:
        st.sidebar.caption(f"Tổng số tài liệu: {len(ingested_documents)}")
        with st.sidebar.expander("Xem danh sách", expanded=False):
            for document in ingested_documents:
                st.markdown(
                    f"**{document['source']}**\\n\\n"
                    f"- Loại: `{document['file_type']}`\\n"
                    f"- Chunks: `{document['chunks']}`"
                )
                if document["path"]:
                    st.caption(document["path"])
                st.divider()
    else:
        st.sidebar.caption("Chưa có tài liệu nào được nạp vào hệ thống.")
'''

s = s[:start] + new_block + s[end+1:]
p.write_text(s, encoding='utf-8')
print('sidebar-replaced')
