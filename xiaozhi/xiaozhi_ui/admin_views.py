import json
from collections import Counter
from datetime import datetime
from pathlib import Path


def render_admin_dashboard(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    snapshot = app.get_admin_dashboard_snapshot()
    total_documents = len(app.get_datahoc_documents())

    st.markdown(
        """
        <div class="app-hero">
            <div class="app-hero-kicker">Admin Console</div>
            <h1>🛠️ Trung tâm quản trị chatbot & tri thức</h1>
            <p>
                Theo dõi toàn bộ hoạt động hệ thống, quản lý người dùng, cuộc trò chuyện,
                dữ liệu tri thức và các cấu hình vận hành trong cùng một nơi.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    metric_cols = st.columns(6)
    metric_cols[0].metric("Active users", snapshot["active_users"])
    metric_cols[1].metric("Messages today", snapshot["messages_today"])
    metric_cols[2].metric("AI usage", snapshot["ai_usage_today"])
    metric_cols[3].metric("API cost", f"${snapshot['api_cost_today']:.2f}")
    metric_cols[4].metric("Hiệu suất bot", f"{snapshot['accuracy_rate']:.1f}%")
    metric_cols[5].metric("KB documents", total_documents)

    info_col1, info_col2 = st.columns([1.3, 1])
    with info_col1:
        st.markdown("### Hoạt động gần đây")
        if snapshot["recent_usage_rows"]:
            st.dataframe(snapshot["recent_usage_rows"], use_container_width=True, hide_index=True)
        else:
            st.info("Chưa có log sử dụng nào.")
    with info_col2:
        st.markdown("### Câu hỏi phổ biến")
        if snapshot["top_queries"]:
            st.dataframe(snapshot["top_queries"], use_container_width=True, hide_index=True)
        else:
            st.info("Chưa có câu hỏi nào được ghi nhận.")

    lower_col1, lower_col2, lower_col3 = st.columns(3)
    lower_col1.metric("Tổng user", snapshot["total_users"])
    lower_col2.metric("Tổng conversation", snapshot["total_conversations"])
    lower_col3.metric("Avg response", f"{snapshot['avg_response_seconds']:.2f}s")

    st.markdown("### Trạng thái cấu hình")
    cfg_col1, cfg_col2, cfg_col3 = st.columns(3)
    cfg_col1.markdown(
        f"""
        <div class="info-card">
            <h4>Model mặc định</h4>
            <p>{app.format_html_text(admin_data.get('models', {}).get('default_model', 'Chưa chọn'))}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    cfg_col2.markdown(
        f"""
        <div class="info-card">
            <h4>Gói hiện tại</h4>
            <p>{app.format_html_text(admin_data.get('billing', {}).get('subscription_plan', 'Starter'))}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    cfg_col3.markdown(
        f"""
        <div class="info-card">
            <h4>Theme</h4>
            <p>{app.format_html_text(admin_data.get('settings', {}).get('theme', 'Dark'))}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_admin_user_management(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    history = st.session_state.get("search_history", [])
    users = admin_data.get("users", [])

    user_rows = []
    for user in users:
        chat_count = sum(1 for entry in history if entry.get("user_email") == user.get("email"))
        user_rows.append({
            "Tên": user.get("name", ""),
            "Email": user.get("email", ""),
            "Username": user.get("username", ""),
            "Vai trò": user.get("role", ""),
            "Trạng thái": user.get("status", ""),
            "Khóa": "Có" if user.get("locked") else "Không",
            "Gói": user.get("plan", ""),
            "Lịch sử chat": chat_count,
            "Đăng nhập gần nhất": user.get("last_login_at", ""),
        })

    st.subheader("👥 Quản lý người dùng")
    st.dataframe(user_rows, use_container_width=True, hide_index=True)

    with st.form("create_user_form"):
        st.markdown("### Tạo user mới")
        col1, col2 = st.columns(2)
        name = col1.text_input("Tên người dùng")
        email = col2.text_input("Email")
        col3, col4 = st.columns(2)
        role = col3.selectbox("Vai trò", ["user", "manager", "admin"])
        plan = col4.selectbox("Gói dịch vụ", ["Free", "Starter", "Pro", "Enterprise", "Internal"])
        password = st.text_input("Mật khẩu ban đầu", type="password")
        if st.form_submit_button("Tạo user", use_container_width=True):
            normalized_email = email.strip().lower()
            password_is_valid, password_message = app.validate_password_strength(password)
            if not name.strip() or not normalized_email or not password:
                st.warning("Vui lòng nhập đủ tên, email và mật khẩu.")
            elif not password_is_valid:
                st.warning(password_message)
            elif any(user.get("email", "").lower() == normalized_email for user in users):
                st.warning("Email này đã tồn tại.")
            else:
                users.append(app.normalize_user_record({
                    "id": datetime.now().strftime("user_%Y%m%d%H%M%S%f"),
                    "name": name.strip(),
                    "email": normalized_email,
                    "username": app.create_user_handle(normalized_email),
                    "password_hash": app.hash_password(password),
                    "role": role,
                    "status": "active",
                    "plan": plan,
                    "locked": False,
                    "created_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                }, fallback_index=len(users)))
                admin_data["users"] = users
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Tạo user mới: {normalized_email}", "info", "user")
                st.rerun()

    if users:
        st.markdown("### Cập nhật / khóa / xóa user")
        user_options = {f"{user.get('name')} ({user.get('email')})": user for user in users}
        selected_label = st.selectbox("Chọn user", list(user_options.keys()), key="admin_manage_user")
        selected_user = user_options[selected_label]

        with st.form("update_user_form"):
            display_email = st.text_input("Email", value=selected_user.get("email", ""), disabled=True)
            col1, col2 = st.columns(2)
            edit_name = col1.text_input("Tên", value=selected_user.get("name", ""))
            edit_username = col2.text_input("Username", value=selected_user.get("username", app.create_user_handle(selected_user.get("email", ""))))
            col_role, col_status = st.columns(2)
            edit_role = col_role.selectbox(
                "Vai trò",
                ["user", "manager", "admin"],
                index=["user", "manager", "admin"].index(selected_user.get("role", "user")),
            )
            edit_status = col_status.selectbox(
                "Trạng thái",
                ["active", "inactive"],
                index=["active", "inactive"].index(selected_user.get("status", "active")),
            )
            col3, col4, col5 = st.columns(3)
            edit_plan = col4.selectbox(
                "Gói",
                ["Free", "Starter", "Pro", "Enterprise", "Internal"],
                index=["Free", "Starter", "Pro", "Enterprise", "Internal"].index(selected_user.get("plan", "Internal"))
                if selected_user.get("plan", "Internal") in ["Free", "Starter", "Pro", "Enterprise", "Internal"] else 4,
            )
            edit_locked = col5.checkbox("Khóa tài khoản", value=bool(selected_user.get("locked", False)))
            reset_password = st.text_input("Đặt lại mật khẩu", type="password", help="Để trống nếu không muốn thay đổi")
            if st.form_submit_button("Lưu thay đổi", use_container_width=True):
                if reset_password.strip():
                    password_is_valid, password_message = app.validate_password_strength(reset_password.strip())
                    if not password_is_valid:
                        st.warning(password_message)
                        return
                selected_user["name"] = edit_name.strip() or selected_user.get("name", "")
                selected_user["username"] = edit_username.strip() or app.create_user_handle(display_email)
                selected_user["role"] = edit_role
                selected_user["status"] = edit_status
                selected_user["plan"] = edit_plan
                selected_user["locked"] = edit_locked
                if reset_password.strip():
                    selected_user["password_hash"] = app.hash_password(reset_password.strip())
                admin_data["users"] = users
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Cập nhật user: {display_email}", "info", "user")
                st.rerun()

        can_delete = selected_user.get("email") not in {app.config.DEFAULT_ADMIN_EMAIL, app.config.DEFAULT_END_USER_EMAIL}
        if st.button("Xóa user đã chọn", key="delete_user_btn", disabled=not can_delete, use_container_width=True):
            admin_data["users"] = [user for user in users if user.get("email") != selected_user.get("email")]
            app.save_admin_console_data(admin_data)
            app.append_admin_log(f"Xóa user: {selected_user.get('email')}", "warning", "user")
            st.rerun()


def render_admin_conversations(app):
    st = app.st
    history = st.session_state.get("search_history", [])
    admin_data = app.get_admin_console_data()
    users = admin_data.get("users", [])

    st.subheader("💬 Quản lý cuộc trò chuyện")
    filter_col1, filter_col2, filter_col3 = st.columns([1, 1.5, 1])
    user_options = ["Tất cả"] + [user.get("email", "") for user in users]
    selected_user = filter_col1.selectbox("Lọc theo user", user_options, key="conversation_user_filter")
    query_filter = filter_col2.text_input("Tìm kiếm conversation", placeholder="Nhập từ khóa cần tìm...")
    failed_only = filter_col3.checkbox("Chỉ conversation không có kết quả", value=False)

    filtered_history = []
    for entry in history:
        if selected_user != "Tất cả" and entry.get("user_email") != selected_user:
            continue
        if query_filter.strip() and query_filter.lower() not in entry.get("query", "").lower():
            continue
        if failed_only and entry.get("matches"):
            continue
        filtered_history.append(entry)

    export_payload = json.dumps(filtered_history, ensure_ascii=False, indent=2)
    st.download_button(
        "Xuất dữ liệu conversation",
        data=export_payload,
        file_name="conversation_export.json",
        mime="application/json",
        use_container_width=False,
    )

    if not filtered_history:
        st.info("Không có conversation phù hợp với bộ lọc.")
        return

    st.caption(f"Tìm thấy {len(filtered_history)} conversation.")
    for index, entry in enumerate(reversed(filtered_history), start=1):
        expander_title = f"{index}. {app.create_preview_text(entry.get('query', ''), 90)}"
        with st.expander(expander_title, expanded=index == 1):
            st.markdown(f"**User:** `{entry.get('user_email', '')}`")
            st.markdown(f"**Thời gian:** {entry.get('timestamp', '')}")
            st.markdown(f"**Câu hỏi:** {entry.get('query', '')}")
            if entry.get("matches"):
                st.markdown("**Kết quả:**")
                for match in entry.get("matches", []):
                    st.markdown(
                        f"- **{match.get('title', '')}** (`{match.get('source', '')}`) - điểm {match.get('score', 0)}"
                    )
            else:
                st.warning(entry.get("message", "Không có kết quả cho conversation này."))


def render_admin_models(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    models_cfg = admin_data.get("models", {})
    model_catalog = models_cfg.get("catalog", [])

    st.subheader("🤖 Quản lý AI Model")
    model_names = [model.get("model", "") for model in model_catalog] or ["GPT-4o mini"]
    default_model = models_cfg.get("default_model", model_names[0])
    selected_default = st.selectbox(
        "Model mặc định",
        model_names,
        index=model_names.index(default_model) if default_model in model_names else 0,
        key="admin_default_model",
    )
    if st.button("Lưu model mặc định", key="save_default_model"):
        admin_data["models"]["default_model"] = selected_default
        app.save_admin_console_data(admin_data)
        app.append_admin_log(f"Đổi model mặc định thành {selected_default}", "info", "model")
        st.rerun()

    for index, model in enumerate(model_catalog):
        with st.expander(f"{model.get('provider', '')} - {model.get('model', '')}", expanded=index == 0):
            col1, col2 = st.columns(2)
            provider = col1.text_input("Provider", value=model.get("provider", ""), key=f"provider_{index}")
            model_name = col2.text_input("Model", value=model.get("model", ""), key=f"model_name_{index}")
            col3, col4, col5 = st.columns(3)
            temperature = col3.slider("Temperature", 0.0, 1.0, float(model.get("temperature", 0.2)), 0.05, key=f"temp_{index}")
            token_limit = col4.number_input("Token limit", min_value=256, max_value=32768, value=int(model.get("token_limit", 4096)), step=256, key=f"token_{index}")
            enabled = col5.checkbox("Enabled", value=bool(model.get("enabled", True)), key=f"enabled_{index}")
            save_key = f"save_model_{index}"
            delete_key = f"delete_model_{index}"
            save_col, delete_col = st.columns(2)
            if save_col.button("Lưu model", key=save_key, use_container_width=True):
                model["provider"] = provider.strip() or model.get("provider", "")
                model["model"] = model_name.strip() or model.get("model", "")
                model["temperature"] = float(temperature)
                model["token_limit"] = int(token_limit)
                model["enabled"] = bool(enabled)
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Cập nhật model {model['model']}", "info", "model")
                st.rerun()
            if delete_col.button("Xóa model", key=delete_key, use_container_width=True, disabled=len(model_catalog) <= 1):
                admin_data["models"]["catalog"] = [item for item in model_catalog if item is not model]
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Xóa model {model.get('model', '')}", "warning", "model")
                st.rerun()

    with st.form("add_model_form"):
        st.markdown("### Thêm model mới")
        col1, col2 = st.columns(2)
        provider = col1.text_input("Provider mới")
        model_name = col2.text_input("Tên model mới")
        col3, col4 = st.columns(2)
        temperature = col3.slider("Temperature mới", 0.0, 1.0, 0.2, 0.05)
        token_limit = col4.number_input("Token limit mới", min_value=256, max_value=32768, value=4096, step=256)
        enabled = st.checkbox("Kích hoạt ngay", value=True)
        if st.form_submit_button("Thêm model", use_container_width=True):
            if not provider.strip() or not model_name.strip():
                st.warning("Vui lòng nhập provider và tên model.")
            else:
                admin_data["models"]["catalog"].append({
                    "provider": provider.strip(),
                    "model": model_name.strip(),
                    "temperature": float(temperature),
                    "token_limit": int(token_limit),
                    "enabled": bool(enabled),
                })
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Thêm model {model_name.strip()}", "info", "model")
                st.rerun()

    st.markdown("### Provider configuration")
    for provider_name, provider_cfg in models_cfg.get("providers", {}).items():
        col1, col2, col3 = st.columns([1.2, 1.8, 1])
        status = col1.text_input("Trạng thái", value=provider_cfg.get("status", ""), key=f"provider_status_{provider_name}")
        base_url = col2.text_input("Base URL", value=provider_cfg.get("base_url", ""), key=f"provider_url_{provider_name}")
        if col3.button("Lưu", key=f"provider_save_{provider_name}", use_container_width=True):
            admin_data["models"]["providers"][provider_name] = {"status": status.strip(), "base_url": base_url.strip()}
            app.save_admin_console_data(admin_data)
            app.append_admin_log(f"Cập nhật provider {provider_name}", "info", "model")
            st.rerun()


def render_admin_knowledge_base(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    documents = app.get_datahoc_documents()
    markdown_files = app.get_datahoc_markdown_files()

    st.subheader("📚 Quản lý dữ liệu")
    top_col1, top_col2 = st.columns(2)
    top_col1.metric("Tài liệu trong datahoc", len(documents))
    top_col2.metric("Nguồn tri thức đã đăng ký", len(admin_data.get("knowledge_registry", [])))
    if st.button("Đồng bộ lại vector index", key="kb_rebuild_vector_btn", use_container_width=True):
        with st.spinner("Đang dựng lại vector index..."):
            sync_success, sync_message = app.rebuild_vector_index()
        if sync_success:
            st.success(sync_message)
        else:
            st.error(sync_message)
        st.rerun()

    uploaded_file = st.file_uploader(
        "Upload tài liệu mới",
        type=["md", "docx", "pdf", "txt"],
        accept_multiple_files=False,
        key="kb_admin_uploader",
    )
    if st.button("Nhập vào Knowledge Base", key="kb_admin_upload_btn", use_container_width=True):
        if not uploaded_file:
            st.warning("Vui lòng chọn file trước khi upload.")
        else:
            ext = Path(uploaded_file.name).suffix.lower()
            markdown_path = None
            message = ""
            if ext == ".md":
                markdown_path, message = app.save_uploaded_markdown(uploaded_file)
            elif ext == ".docx":
                _, markdown_path, message = app.process_docx_document(uploaded_file)
            elif ext == ".pdf":
                markdown_path, message = app.save_uploaded_pdf_as_markdown(uploaded_file)
            elif ext == ".txt":
                markdown_path, message = app.save_uploaded_text_as_markdown(uploaded_file)
            else:
                message = "Định dạng chưa được hỗ trợ."

            if markdown_path:
                registry = admin_data.get("knowledge_registry", [])
                if not any(item.get("location") == markdown_path for item in registry):
                    registry.append({
                        "name": Path(markdown_path).name,
                        "type": "Document",
                        "status": "Active",
                        "location": markdown_path,
                    })
                    admin_data["knowledge_registry"] = registry
                    app.save_admin_console_data(admin_data)
                with st.spinner("Đang đồng bộ vector index..."):
                    sync_success, sync_message = app.ingest_markdown_directory(only_new=True)
                app.append_admin_log(f"Upload knowledge file: {Path(markdown_path).name}", "info", "knowledge")
                if sync_success:
                    st.success(f"{message}\n{sync_message}")
                else:
                    st.warning(f"{message}\n{sync_message}")
                st.rerun()
            else:
                st.error(message)

    if markdown_files:
        selected_file = st.selectbox(
            "Chọn tài liệu để chỉnh sửa / xóa",
            [file_path.name for file_path in markdown_files],
            key="kb_file_selector",
        )
        selected_path = Path(app.config.MARKDOWN_SOURCE_DIR).resolve() / selected_file
        file_content = selected_path.read_text(encoding="utf-8") if selected_path.exists() else ""
        edited_content = st.text_area(
            "Nội dung Markdown",
            value=file_content,
            height=320,
            key=f"kb_editor_{selected_file}",
        )
        action_col1, action_col2 = st.columns(2)
        if action_col1.button("Lưu nội dung", key="save_kb_content", use_container_width=True):
            success, message = app.save_markdown_text_content(selected_file, edited_content)
            if success:
                with st.spinner("Đang dựng lại vector index..."):
                    sync_success, sync_message = app.rebuild_vector_index()
                app.append_admin_log(f"Cập nhật knowledge file: {selected_file}", "info", "knowledge")
                if sync_success:
                    st.success(f"{message}\n{sync_message}")
                else:
                    st.warning(f"{message}\n{sync_message}")
                st.rerun()
            else:
                st.error(message)
        if action_col2.button("Xóa tài liệu", key="delete_kb_content", use_container_width=True):
            success, message = app.delete_markdown_document(selected_file)
            if success:
                admin_data["knowledge_registry"] = [
                    item for item in admin_data.get("knowledge_registry", [])
                    if Path(item.get("location", "")).name != selected_file
                ]
                app.save_admin_console_data(admin_data)
                with st.spinner("Đang dựng lại vector index..."):
                    sync_success, sync_message = app.rebuild_vector_index()
                app.append_admin_log(f"Xóa knowledge file: {selected_file}", "warning", "knowledge")
                if sync_success:
                    st.success(f"{message}\n{sync_message}")
                else:
                    st.warning(f"{message}\n{sync_message}")
                st.rerun()
            else:
                st.error(message)
    else:
        st.info("Chưa có tài liệu nào trong datahoc.")

    registry = admin_data.get("knowledge_registry", [])
    st.markdown("### Registry nguồn tri thức")
    if registry:
        st.dataframe(registry, use_container_width=True, hide_index=True)
    with st.form("kb_registry_form"):
        col1, col2 = st.columns(2)
        name = col1.text_input("Tên nguồn")
        source_type = col2.selectbox("Loại nguồn", ["Website", "Database", "Folder", "PDF", "Text", "Document"])
        col3, col4 = st.columns(2)
        status = col3.selectbox("Trạng thái", ["Active", "Draft", "Archived"])
        location = col4.text_input("Địa chỉ / mô tả nguồn")
        if st.form_submit_button("Thêm nguồn tri thức", use_container_width=True):
            if not name.strip():
                st.warning("Vui lòng nhập tên nguồn.")
            else:
                registry.append({
                    "name": name.strip(),
                    "type": source_type,
                    "status": status,
                    "location": location.strip(),
                })
                admin_data["knowledge_registry"] = registry
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Thêm nguồn tri thức: {name.strip()}", "info", "knowledge")
                st.rerun()


def render_admin_prompts(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    prompts = admin_data.get("prompts", {})
    st.subheader("🧠 Prompt Management")
    with st.form("prompt_management_form"):
        system_prompt = st.text_area("System prompt", value=prompts.get("system_prompt", ""), height=180)
        role_prompt = st.text_area("Role prompt", value=prompts.get("role_prompt", ""), height=120)
        personality = st.text_area("Chatbot personality", value=prompts.get("personality", ""), height=120)
        if st.form_submit_button("Lưu prompt", use_container_width=True):
            admin_data["prompts"] = {
                "system_prompt": system_prompt,
                "role_prompt": role_prompt,
                "personality": personality,
            }
            app.save_admin_console_data(admin_data)
            app.append_admin_log("Cập nhật prompt management", "info", "prompt")
            st.rerun()


def render_admin_analytics(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    snapshot = app.get_admin_dashboard_snapshot()
    history = st.session_state.get("search_history", [])
    no_result_count = sum(1 for entry in history if not entry.get("matches"))
    unique_users = len({entry.get("user_email") for entry in history if entry.get("user_email")})

    st.subheader("📈 Analytics & Reports")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Số lượng message", len(history))
    col2.metric("Tỉ lệ trả lời đúng", f"{snapshot['accuracy_rate']:.1f}%")
    col3.metric("Thời gian phản hồi", f"{snapshot['avg_response_seconds']:.2f}s")
    col4.metric("User có hoạt động", unique_users)

    report_col1, report_col2 = st.columns(2)
    with report_col1:
        st.markdown("### Câu hỏi phổ biến")
        if snapshot["top_queries"]:
            st.dataframe(snapshot["top_queries"], use_container_width=True, hide_index=True)
        else:
            st.info("Chưa có dữ liệu.")
    with report_col2:
        st.markdown("### Tóm tắt chất lượng")
        st.markdown(
            f"""
            <div class="info-card">
                <p>- Conversation có kết quả: <b>{len(history) - no_result_count}</b></p>
                <p>- Conversation chưa có kết quả: <b>{no_result_count}</b></p>
                <p>- Yêu cầu hôm nay: <b>{snapshot['messages_today']}</b></p>
                <p>- Request AI hôm nay: <b>{snapshot['ai_usage_today']}</b></p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with st.form("analytics_manual_form"):
        manual_accuracy = st.number_input(
            "Ghi đè tỉ lệ chính xác (%)",
            min_value=0.0,
            max_value=100.0,
            value=float(admin_data.get("analytics", {}).get("manual_accuracy_rate", 0.0) or 0.0),
            step=1.0,
        )
        manual_response = st.number_input(
            "Ghi đè thời gian phản hồi (giây)",
            min_value=0.0,
            max_value=120.0,
            value=float(admin_data.get("analytics", {}).get("manual_response_seconds", 0.0) or 0.0),
            step=0.1,
        )
        if st.form_submit_button("Lưu cấu hình analytics", use_container_width=True):
            admin_data["analytics"]["manual_accuracy_rate"] = float(manual_accuracy)
            admin_data["analytics"]["manual_response_seconds"] = float(manual_response)
            app.save_admin_console_data(admin_data)
            app.append_admin_log("Cập nhật analytics", "info", "analytics")
            st.rerun()


def render_admin_billing(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    history = st.session_state.get("search_history", [])
    st.subheader("💰 Billing & Usage")

    with st.form("billing_form"):
        col1, col2 = st.columns(2)
        subscription_plan = col1.selectbox(
            "Subscription plan",
            ["Free", "Starter", "Pro", "Enterprise"],
            index=["Free", "Starter", "Pro", "Enterprise"].index(admin_data.get("billing", {}).get("subscription_plan", "Starter"))
            if admin_data.get("billing", {}).get("subscription_plan", "Starter") in ["Free", "Starter", "Pro", "Enterprise"] else 1,
        )
        monthly_budget = col2.number_input(
            "Ngân sách tháng ($)",
            min_value=0.0,
            value=float(admin_data.get("billing", {}).get("monthly_budget", 0.0) or 0.0),
            step=1.0,
        )
        col3, col4 = st.columns(2)
        api_cost_today = col3.number_input(
            "Chi phí API hôm nay ($)",
            min_value=0.0,
            value=float(admin_data.get("billing", {}).get("api_cost_today", 0.0) or 0.0),
            step=0.1,
        )
        token_usage_today = col4.number_input(
            "Token usage hôm nay",
            min_value=0,
            value=int(admin_data.get("billing", {}).get("token_usage_today", 0) or 0),
            step=100,
        )
        usage_limit_per_user = st.number_input(
            "Giới hạn sử dụng mỗi user",
            min_value=0,
            value=int(admin_data.get("billing", {}).get("usage_limit_per_user", 0) or 0),
            step=1,
        )
        if st.form_submit_button("Lưu billing", use_container_width=True):
            admin_data["billing"] = {
                "subscription_plan": subscription_plan,
                "monthly_budget": float(monthly_budget),
                "api_cost_today": float(api_cost_today),
                "token_usage_today": int(token_usage_today),
                "usage_limit_per_user": int(usage_limit_per_user),
            }
            app.save_admin_console_data(admin_data)
            app.append_admin_log("Cập nhật billing", "info", "billing")
            st.rerun()

    usage_counter = Counter(entry.get("user_email", "") for entry in history if entry.get("user_email"))
    usage_rows = [{"User": email, "Số conversation": count} for email, count in usage_counter.most_common()]
    if usage_rows:
        st.markdown("### Chi phí / usage theo user")
        st.dataframe(usage_rows, use_container_width=True, hide_index=True)
    else:
        st.info("Chưa có usage theo user.")


def render_admin_integrations(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    integrations = admin_data.get("integrations", [])
    st.subheader("🔌 Plugin / Integration")
    if integrations:
        st.dataframe(integrations, use_container_width=True, hide_index=True)

    if integrations:
        names = [item.get("name", "") for item in integrations]
        selected_name = st.selectbox("Chọn integration", names, key="integration_selector")
        integration = next(item for item in integrations if item.get("name") == selected_name)
        col1, col2, col3 = st.columns(3)
        integration_type = col1.text_input("Loại", value=integration.get("type", ""), key=f"integration_type_{selected_name}")
        integration_status = col2.selectbox(
            "Trạng thái",
            ["Sẵn sàng", "Chưa kết nối", "Lỗi", "Bảo trì"],
            index=["Sẵn sàng", "Chưa kết nối", "Lỗi", "Bảo trì"].index(integration.get("status", "Chưa kết nối"))
            if integration.get("status", "Chưa kết nối") in ["Sẵn sàng", "Chưa kết nối", "Lỗi", "Bảo trì"] else 1,
            key=f"integration_status_{selected_name}",
        )
        integration_target = col3.text_input("Đích tích hợp", value=integration.get("target", ""), key=f"integration_target_{selected_name}")
        save_col, delete_col = st.columns(2)
        if save_col.button("Lưu integration", key="save_integration_btn", use_container_width=True):
            integration["type"] = integration_type.strip()
            integration["status"] = integration_status
            integration["target"] = integration_target.strip()
            app.save_admin_console_data(admin_data)
            app.append_admin_log(f"Cập nhật integration {selected_name}", "info", "integration")
            st.rerun()
        if delete_col.button("Xóa integration", key="delete_integration_btn", use_container_width=True):
            admin_data["integrations"] = [item for item in integrations if item.get("name") != selected_name]
            app.save_admin_console_data(admin_data)
            app.append_admin_log(f"Xóa integration {selected_name}", "warning", "integration")
            st.rerun()

    with st.form("add_integration_form"):
        st.markdown("### Thêm integration")
        col1, col2 = st.columns(2)
        name = col1.text_input("Tên integration")
        integration_type = col2.text_input("Loại integration")
        col3, col4 = st.columns(2)
        status = col3.selectbox("Trạng thái mới", ["Sẵn sàng", "Chưa kết nối", "Lỗi", "Bảo trì"])
        target = col4.text_input("Đích / URL / mô tả")
        if st.form_submit_button("Thêm integration", use_container_width=True):
            if not name.strip():
                st.warning("Vui lòng nhập tên integration.")
            else:
                integrations.append({
                    "name": name.strip(),
                    "type": integration_type.strip(),
                    "status": status,
                    "target": target.strip(),
                })
                admin_data["integrations"] = integrations
                app.save_admin_console_data(admin_data)
                app.append_admin_log(f"Thêm integration {name.strip()}", "info", "integration")
                st.rerun()


def render_admin_settings(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    settings = admin_data.get("settings", {})
    st.subheader("⚙️ Settings")
    with st.form("settings_form"):
        col1, col2 = st.columns(2)
        language = col1.selectbox("Ngôn ngữ chatbot", ["Tiếng Việt", "English"], index=["Tiếng Việt", "English"].index(settings.get("language", "Tiếng Việt")) if settings.get("language", "Tiếng Việt") in ["Tiếng Việt", "English"] else 0)
        theme = col2.selectbox("Theme giao diện", ["Dark", "Light", "System"], index=["Dark", "Light", "System"].index(settings.get("theme", "Dark")) if settings.get("theme", "Dark") in ["Dark", "Light", "System"] else 0)
        email_notifications = st.checkbox("Email notification", value=bool(settings.get("email_notifications", True)))
        security_mode = st.selectbox("Bảo mật", ["Standard", "Strict", "Enterprise"], index=["Standard", "Strict", "Enterprise"].index(settings.get("security_mode", "Standard")) if settings.get("security_mode", "Standard") in ["Standard", "Strict", "Enterprise"] else 0)
        if st.form_submit_button("Lưu settings", use_container_width=True):
            admin_data["settings"] = {
                "language": language,
                "theme": theme,
                "email_notifications": email_notifications,
                "security_mode": security_mode,
            }
            app.save_admin_console_data(admin_data)
            app.append_admin_log("Cập nhật settings", "info", "settings")
            st.rerun()


def render_admin_moderation(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    history = st.session_state.get("search_history", [])
    moderation = admin_data.get("moderation", {})
    blocked_keywords = moderation.get("blocked_keywords", [])

    st.subheader("🛡️ Moderation / Content Filter")
    with st.form("moderation_form"):
        spam_threshold = st.number_input(
            "Ngưỡng spam",
            min_value=1,
            value=int(moderation.get("spam_threshold", 3) or 3),
            step=1,
        )
        blocked_text = st.text_area(
            "Từ khóa chặn (mỗi từ cách nhau bởi dấu phẩy)",
            value=", ".join(blocked_keywords),
            height=120,
        )
        if st.form_submit_button("Lưu bộ lọc", use_container_width=True):
            admin_data["moderation"]["spam_threshold"] = int(spam_threshold)
            admin_data["moderation"]["blocked_keywords"] = [
                item.strip() for item in blocked_text.split(",") if item.strip()
            ]
            app.save_admin_console_data(admin_data)
            app.append_admin_log("Cập nhật moderation filter", "info", "moderation")
            st.rerun()

    normalized_keywords = [app.normalize_search_text(keyword) for keyword in blocked_keywords if keyword.strip()]
    flagged_rows = []
    for entry in history:
        normalized_query = app.normalize_search_text(entry.get("query", ""))
        matched_keywords = [keyword for keyword in normalized_keywords if keyword and keyword in normalized_query]
        if matched_keywords:
            flagged_rows.append({
                "Thời gian": entry.get("timestamp", ""),
                "User": entry.get("user_email", ""),
                "Query": entry.get("query", ""),
                "Keyword vi phạm": ", ".join(matched_keywords),
            })

    if flagged_rows:
        st.markdown("### Báo cáo vi phạm / nội dung cần chú ý")
        st.dataframe(flagged_rows, use_container_width=True, hide_index=True)
    else:
        st.info("Chưa phát hiện nội dung bị gắn cờ theo bộ lọc hiện tại.")


def render_admin_logs(app):
    st = app.st
    admin_data = app.get_admin_console_data()
    system_logs = admin_data.get("system_logs", [])
    usage_logs = admin_data.get("usage_logs", [])

    st.subheader("🔍 Logs & Monitoring")
    level_filter = st.selectbox("Lọc log level", ["Tất cả", "info", "warning", "error"], key="log_level_filter")
    category_filter = st.selectbox("Lọc category", ["Tất cả", "system", "request", "conversation", "user", "model", "knowledge", "prompt", "analytics", "billing", "integration", "settings", "moderation"], key="log_category_filter")

    filtered_logs = []
    for log in reversed(system_logs):
        if level_filter != "Tất cả" and log.get("level") != level_filter:
            continue
        if category_filter != "Tất cả" and log.get("category") != category_filter:
            continue
        filtered_logs.append(log)

    if filtered_logs:
        st.markdown("### System logs")
        st.dataframe(filtered_logs, use_container_width=True, hide_index=True)
    else:
        st.info("Không có system log phù hợp.")

    if usage_logs:
        request_rows = [
            {
                "Thời gian": log.get("timestamp", ""),
                "User": log.get("user_email", ""),
                "Query": app.create_preview_text(log.get("query", ""), 80),
                "Intent": app.get_lookup_intent_label(log.get("intent", "")),
                "Response (ms)": log.get("response_time_ms", 0),
                "Matches": log.get("matches_count", 0),
            }
            for log in reversed(usage_logs[-40:])
        ]
        st.markdown("### Request logs")
        st.dataframe(request_rows, use_container_width=True, hide_index=True)
    else:
        st.info("Chưa có request log.")


def render_admin_page(app):
    st = app.st
    tab_labels = [
        "Tổng quan",
        "Người dùng",
        "Hội thoại",
        "Kho tri thức",
        "Phân tích",
        "Thanh toán",
        "Tích hợp",
        "Cài đặt",
        "Kiểm duyệt",
        "Nhật ký",
    ]
    (
        dashboard_tab,
        users_tab,
        conversations_tab,
        knowledge_tab,
        analytics_tab,
        billing_tab,
        integration_tab,
        settings_tab,
        moderation_tab,
        logs_tab,
    ) = st.tabs(tab_labels)

    with dashboard_tab:
        render_admin_dashboard(app)
    with users_tab:
        render_admin_user_management(app)
    with conversations_tab:
        render_admin_conversations(app)
    with knowledge_tab:
        render_admin_knowledge_base(app)
    with analytics_tab:
        render_admin_analytics(app)
    with billing_tab:
        render_admin_billing(app)
    with integration_tab:
        render_admin_integrations(app)
    with settings_tab:
        render_admin_settings(app)
    with moderation_tab:
        render_admin_moderation(app)
    with logs_tab:
        render_admin_logs(app)
