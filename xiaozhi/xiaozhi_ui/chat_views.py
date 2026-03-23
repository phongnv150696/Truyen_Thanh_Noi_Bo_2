from . import admin_views


def render_sidebar_card(app, title: str, text: str, footer: str = ""):
    st = app.st
    footer_html = f'<div class="folder-path">{app.format_html_text(footer)}</div>' if footer else ""
    st.sidebar.markdown(
        f"""
        <div class="sidebar-card">
            <div class="sidebar-card-title">{app.format_html_text(title)}</div>
            <div class="sidebar-card-text">{app.format_html_text(text)}</div>
            {footer_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_lookup_hero(app, total_files: int):
    st = app.st
    st.markdown(
        f"""
        <div class="app-hero">
            <div class="app-hero-kicker">Tra cứu nội dung nội bộ</div>
            <h1>📚 Trung tâm tra cứu dữ liệu từ thư mục datahoc</h1>
            <p>
                Giao diện mới ưu tiên tốc độ đọc, khu vực tra cứu rõ ràng và phần kết quả dễ quét.
                App sẽ tìm trực tiếp trong các file Markdown của bạn và hiển thị đúng đoạn nội dung khớp nhất.
            </p>
            <div class="hero-chip-row">
                <div class="hero-chip">📄 {total_files} file Markdown</div>
                <div class="hero-chip">⚡ Tra cứu trực tiếp không qua AI</div>
                <div class="hero-chip">🧭 Hỏi theo từ khóa, điều khoản, tên file, số liệu</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_lookup_toolbar(app, total_files: int, history_count: int):
    st = app.st
    st.markdown(
        f"""
        <div class="compact-toolbar">
            📚 Đang tra cứu trong <b>{total_files}</b> file Markdown.
            Nhập câu hỏi ở ô phía dưới rồi nhấn <b>Enter</b> để tra cứu.
            Mặc định app chỉ hiển thị <b>thông tin chính</b>; khi cần xem thêm, bấm <b>Hiện nhiều thông tin liên quan</b>.
            Lịch sử hiện đang lưu <b>{history_count}</b> lượt tra cứu gần nhất.
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_primary_answer_card(app, match: dict):
    st = app.st
    preview_limit = 720
    preview_text = app.create_preview_text(match["content"], limit=preview_limit)
    st.markdown(
        f"""
        <div class="primary-answer-card">
            <div class="answer-header">
                <div>
                    <div class="answer-title">{app.format_html_text(match['title'])}</div>
                    <div class="answer-source">📄 {app.format_html_text(match['source'])}</div>
                </div>
                <div class="result-meta-badge">🎯 Điểm khớp: {match['score']}</div>
            </div>
            <div class="answer-content">{app.format_html_text(preview_text)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    compact_length = len(" ".join(match["content"].split()))
    if compact_length > preview_limit:
        with st.expander("Xem đầy đủ mục chính", expanded=False):
            st.markdown(match["content"])
    if match["path"]:
        st.caption(match["path"])


def render_result_card(app, match: dict, index: int, expand_by_default: bool = False):
    st = app.st
    preview_text = app.create_preview_text(match["content"])
    st.markdown(
        f"""
        <div class="info-card">
            <h3>{index}. {app.format_html_text(match['title'])}</h3>
            <div>
                <span class="result-meta-badge">📄 {app.format_html_text(match['source'])}</span>
                <span class="result-meta-badge">🎯 Điểm khớp: {match['score']}</span>
            </div>
            <p>{app.format_html_text(preview_text)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    with st.expander("Xem đầy đủ nội dung", expanded=expand_by_default):
        st.markdown(match["content"])
        if match["path"]:
            st.caption(match["path"])


def render_lookup_feedback(app):
    st = app.st
    notice = st.session_state.get("lookup_notice")
    if not notice:
        return

    level = notice.get("level", "info")
    message = notice.get("message", "")
    if level == "warning":
        st.warning(message)
    elif level == "success":
        st.success(message)
    elif level == "error":
        st.error(message)
    else:
        st.info(message)
    st.session_state.lookup_notice = None


def get_lookup_entity_lines(app, analysis: dict):
    entities = app.normalize_lookup_analysis_data(analysis).get("entities", {})
    entity_lines = []
    if entities.get("section_refs"):
        entity_lines.append(f"Tham chiếu mục: {', '.join(entities['section_refs'][:3])}")
    if entities.get("file_refs"):
        entity_lines.append(f"Tài liệu: {', '.join(entities['file_refs'][:2])}")
    if entities.get("time_refs"):
        entity_lines.append(f"Thời gian: {', '.join(entities['time_refs'][:3])}")
    if entities.get("quoted_phrases"):
        entity_lines.append(f"Cụm trích dẫn: {', '.join(entities['quoted_phrases'][:2])}")
    if entities.get("keywords"):
        entity_lines.append(f"Từ khóa: {', '.join(entities['keywords'][:5])}")
    return entity_lines


def render_lookup_analysis_panel(app, entry: dict):
    st = app.st
    analysis = app.normalize_lookup_analysis_data(entry.get("analysis", {}))
    fulfillment = app.normalize_lookup_fulfillment_data(entry.get("fulfillment", {}))
    badges = [
        f"🎯 Intent: {analysis['intent'].get('label', 'Tra cứu tổng quát')}",
        f"⚙️ Fulfillment: {'Mở rộng' if fulfillment.get('show_related') else 'Trọng tâm'}",
    ]
    if analysis["context"].get("is_follow_up"):
        badges.append("🧠 Có kế thừa ngữ cảnh")
    if fulfillment.get("query_used") and app.normalize_search_text(fulfillment["query_used"]) != app.normalize_search_text(entry.get("query", "")):
        badges.append("🔁 Truy vấn đã được mở rộng")

    badges_html = "".join(
        f'<span class="result-meta-badge">{app.format_html_text(badge)}</span>'
        for badge in badges
    )
    st.markdown(badges_html, unsafe_allow_html=True)

    with st.expander("Xem phân tích truy vấn", expanded=False):
        confidence_pct = int(round(analysis["intent"].get("confidence", 0.0) * 100))
        st.markdown(f"**Intent:** {analysis['intent'].get('label', 'Tra cứu tổng quát')} ({confidence_pct}%)")
        if analysis["intent"].get("reasons"):
            st.markdown(f"**Tín hiệu nhận diện:** {', '.join(analysis['intent']['reasons'])}")
        st.markdown(f"**Context:** {analysis['context'].get('summary', 'Không có ngữ cảnh mở rộng.')}")
        if fulfillment.get("query_used"):
            st.markdown(f"**Truy vấn dùng để tìm kiếm:** `{fulfillment['query_used']}`")
        entity_lines = get_lookup_entity_lines(app, analysis)
        if entity_lines:
            st.markdown("**Entity trích xuất:**")
            for entity_line in entity_lines:
                st.caption(entity_line)


def render_search_history_item(app, entry: dict):
    st = app.st
    with st.chat_message("user"):
        st.markdown(entry["query"])
        meta_bits = []
        if entry.get("timestamp"):
            meta_bits.append(entry["timestamp"])
        if meta_bits:
            st.caption(" • ".join(meta_bits))

    with st.chat_message("assistant"):
        render_lookup_analysis_panel(app, entry)
        if not entry.get("matches"):
            st.warning(entry.get("message", "Không tìm thấy nội dung phù hợp trong `datahoc`."))
            return

        matches = entry["matches"]
        primary_match = matches[0]
        fulfillment = app.normalize_lookup_fulfillment_data(entry.get("fulfillment", {}))
        st.markdown(
            f"""
            <div class="result-summary">
                🔎 Đã tìm thấy <b>{len(matches)}</b> mục phù hợp cho câu hỏi này.
                {'Đang hiển thị cả các mục liên quan mở rộng.' if entry.get('show_related') else 'Hiện đang ưu tiên mục khớp nhất để bạn đọc nhanh.'}
            </div>
            """,
            unsafe_allow_html=True,
        )
        if fulfillment.get("query_used") and app.normalize_search_text(fulfillment["query_used"]) != app.normalize_search_text(entry.get("query", "")):
            st.caption(f"Truy vấn đã được mở rộng theo ngữ cảnh: {fulfillment['query_used']}")
        render_primary_answer_card(app, primary_match)

        if entry.get("show_related"):
            if len(matches) > 1:
                st.markdown(
                    """
                    <div class="related-group-title">Các thông tin liên quan khác</div>
                    """,
                    unsafe_allow_html=True,
                )
                for index, match in enumerate(matches[1:], start=2):
                    render_result_card(app, match, index, expand_by_default=False)
            else:
                st.caption("Không có thêm mục liên quan nào khác cho câu hỏi này.")

            if st.button("Ẩn bớt thông tin", key=f"collapse_related_{entry['id']}"):
                app.refresh_search_history_entry(entry["id"], show_related=False)
                st.rerun()
        else:
            if st.button("Hiện nhiều thông tin liên quan", key=f"expand_related_{entry['id']}"):
                app.refresh_search_history_entry(entry["id"], show_related=True)
                st.rerun()


def render_account_notice(app):
    st = app.st
    notice = st.session_state.get("account_notice")
    if not notice:
        return

    level = notice.get("level", "info")
    message = notice.get("message", "")
    if level == "warning":
        st.warning(message)
    elif level == "success":
        st.success(message)
    elif level == "error":
        st.error(message)
    else:
        st.info(message)
    st.session_state.account_notice = None


def render_account_menu_content(app, current_user: dict):
    st = app.st
    st.markdown(
        f"""
        <div class="profile-card">
            <div class="profile-row">
                <div class="profile-avatar">{app.format_html_text(app.get_user_initials(current_user))}</div>
                <div>
                    <div class="profile-name">{app.format_html_text(app.get_user_profile_name(current_user))}</div>
                    <div class="profile-handle">{app.format_html_text(app.get_user_profile_handle(current_user))}</div>
                </div>
            </div>
            <div class="profile-divider"></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.button("✨ Nâng cấp gói", use_container_width=True, key="account_upgrade_btn"):
        app.set_account_notice("Phần nâng cấp gói đang ở chế độ cục bộ. Bạn có thể cấu hình thêm trong Billing & Usage.", "info")
        st.rerun()
    if st.button("🎨 Cá nhân hóa", use_container_width=True, key="account_personalize_btn"):
        app.set_account_notice("Tùy chọn cá nhân hóa sẽ được nối thêm vào hồ sơ người dùng trong bước tiếp theo.", "info")
        st.rerun()
    if st.button("⚙️ Cài đặt", use_container_width=True, key="account_settings_btn"):
        if app.user_can_access_admin(current_user):
            st.session_state.active_page = "admin"
            app.set_account_notice("Mở Admin Console để chỉnh cài đặt hệ thống.", "info")
        else:
            app.set_account_notice("Phần cài đặt tài khoản người dùng sẽ được mở rộng thêm.", "info")
        st.rerun()
    if st.button("🆘 Trợ giúp", use_container_width=True, key="account_help_btn"):
        app.set_account_notice("Bạn có thể đăng nhập để tra cứu tài liệu nội bộ, còn tài khoản admin sẽ có thêm trang quản trị.", "info")
        st.rerun()

    action_col1, action_col2 = st.columns(2)
    if action_col1.button("� User", use_container_width=True, key="account_chat_btn"):
        st.session_state.active_page = "chat"
        st.rerun()
    if app.user_can_access_admin(current_user):
        if action_col2.button("🛠️ Admin", use_container_width=True, key="account_admin_btn"):
            st.session_state.active_page = "admin"
            st.rerun()
    else:
        action_col2.empty()

    if st.button("↩️ Đăng xuất", use_container_width=True, key="account_logout_btn"):
        app.append_admin_log(f"Đăng xuất: {current_user.get('email', '')}", "info", "user")
        app.logout_authenticated_user()
        st.rerun()


def render_top_shell_bar(app, current_user: dict, current_page: str):
    st = app.st
    title = "Admin Console" if current_page == "admin" else "User Console"
    subtitle = (
        "Quản trị người dùng, hội thoại, tri thức và vận hành hệ thống."
        if current_page == "admin"
        else "Không gian người dùng để tra cứu trực tiếp dữ liệu nội bộ theo quyền tài khoản."
    )

    title_col, account_col = st.columns([6, 1.6])
    title_col.markdown(
        f"""
        <div class="top-shell-bar">
            <div>
                <div class="top-shell-title">{app.format_html_text(app.config.APP_NAME)} • {app.format_html_text(title)}</div>
                <div class="top-shell-subtitle">{app.format_html_text(subtitle)}</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    account_label = f"{app.get_user_initials(current_user)}  {app.get_user_profile_name(current_user)}"
    with account_col:
        if hasattr(st, "popover"):
            with st.popover(account_label):
                render_account_menu_content(app, current_user)
        else:
            with st.expander(account_label, expanded=False):
                render_account_menu_content(app, current_user)


def render_public_auth_page(app):
    st = app.st
    st.markdown(
        """
        <style>
        [data-testid="stSidebar"],
        [data-testid="collapsedControl"] {
            display: none !important;
        }
        .block-container {
            max-width: 520px;
            padding-top: 6.2rem;
            padding-bottom: 2rem;
        }
        .auth-minimal-card {
            padding: 1.5rem 1.5rem 1.2rem;
            border-radius: 28px;
            background:
                linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.82)),
                radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 38%);
            border: 1px solid rgba(148, 163, 184, 0.16);
            box-shadow: 0 24px 60px rgba(2, 6, 23, 0.28);
            margin-bottom: 1rem;
        }
        .auth-minimal-brand {
            color: #7dd3fc;
            font-size: 0.82rem;
            font-weight: 800;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            margin-bottom: 0.75rem;
        }
        .auth-minimal-title {
            color: #f8fafc;
            font-size: 2rem;
            font-weight: 800;
            line-height: 1.15;
            margin-bottom: 0.35rem;
        }
        .auth-minimal-subtitle {
            color: #94a3b8;
            line-height: 1.6;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        f"""
        <div class="auth-minimal-card">
            <div class="auth-minimal-brand">{app.format_html_text(app.config.APP_NAME)}</div>
            <div class="auth-minimal-title">Đăng nhập hoặc đăng ký</div>
            <div class="auth-minimal-subtitle">Hệ thống sẽ tự chuyển đúng trang theo quyền tài khoản sau khi xác thực.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    login_tab, register_tab = st.tabs(["Đăng nhập", "Đăng ký"])

    with login_tab:
        with st.form("login_form", clear_on_submit=False):
            login_email = st.text_input("Email", placeholder="ban@donvi.vn")
            login_password = st.text_input("Mật khẩu", type="password")
            login_submit = st.form_submit_button("Đăng nhập", use_container_width=True)
        if login_submit:
            success, message = app.authenticate_local_user(login_email, login_password)
            if success:
                st.success(message)
                st.rerun()
            st.error(message)

    with register_tab:
        with st.form("register_form", clear_on_submit=False):
            register_name = st.text_input("Họ và tên", key="register_name")
            register_email = st.text_input("Email", key="register_email", placeholder="ban@donvi.vn")
            register_password = st.text_input("Mật khẩu", type="password", key="register_password")
            register_password_confirm = st.text_input("Nhập lại mật khẩu", type="password", key="register_password_confirm")
            register_submit = st.form_submit_button("Tạo tài khoản", use_container_width=True)
        if register_submit:
            if register_password != register_password_confirm:
                st.error("Mật khẩu nhập lại chưa khớp.")
            else:
                success, message = app.register_local_user(register_name, register_email, register_password)
                if success:
                    st.success(message)
                    st.rerun()
                st.error(message)


def render_sidebar(app, current_user: dict):
    st = app.st
    total_files = app.get_datahoc_stats().get("total_files", 0)
    documents = app.get_datahoc_documents()
    current_user_email = current_user.get("email", app.config.DEFAULT_END_USER_EMAIL)
    current_page = st.session_state.get("active_page", "chat")
    history = app.get_search_history_for_user(current_user_email)

    st.sidebar.markdown(
        f"""
        <div class="sidebar-nav-card">
            <div class="sidebar-nav-title">{app.format_html_text(app.config.APP_NAME)}</div>
            <div class="sidebar-nav-subtitle">{app.format_html_text('Admin Console' if current_page == 'admin' else 'User Console')}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.sidebar.button("➕ Cuộc trò chuyện mới", use_container_width=True, key="new_chat_sidebar_btn"):
        app.clear_search_history_for_user(current_user_email)
        app.append_admin_log(f"Bắt đầu cuộc trò chuyện mới: {current_user_email}", "info", "conversation")
        app.set_lookup_notice("Đã làm mới cuộc trò chuyện của bạn.", "success")
        st.session_state.active_page = "chat"
        st.rerun()

    nav_col1, nav_col2 = st.sidebar.columns(2)
    if nav_col1.button("� User", use_container_width=True, key="sidebar_chat_nav_btn"):
        st.session_state.active_page = "chat"
        st.rerun()
    if app.user_can_access_admin(current_user):
        if nav_col2.button("🛠️ Admin", use_container_width=True, key="sidebar_admin_nav_btn"):
            st.session_state.active_page = "admin"
            st.rerun()
    else:
        nav_col2.empty()

    stat_col1, stat_col2 = st.sidebar.columns(2)
    stat_col1.metric("Docs", total_files)
    stat_col2.metric("History", len(history))

    st.sidebar.divider()
    st.sidebar.subheader("🕘 Gần đây")
    if history:
        for entry in reversed(history[-8:]):
            st.sidebar.markdown(
                f"""
                <div class="history-record">
                    <div>{app.format_html_text(app.create_preview_text(entry.get('query', ''), 54))}</div>
                    <div class="history-record-time">{app.format_html_text(entry.get('timestamp', ''))}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.sidebar.caption("Chưa có cuộc trò chuyện nào.")

    st.sidebar.divider()
    st.sidebar.subheader("🗂️ Kho tri thức")
    if documents:
        st.sidebar.caption(f"{len(documents)} tài liệu đang sẵn sàng")
        with st.sidebar.expander("Xem tài liệu", expanded=False):
            for document in documents[:12]:
                st.markdown(
                    f"""
                    <div class="doc-item">
                        <div class="doc-item-title">{app.format_html_text(document['title'])}</div>
                        <div class="doc-item-meta">📄 {app.format_html_text(document['source'])}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
    else:
        st.sidebar.caption("Chưa có tài liệu trong datahoc.")

    if app.user_can_access_admin(current_user):
        admin_data = app.get_admin_console_data()
        st.sidebar.divider()
        render_sidebar_card(
            app,
            "Quản trị nhanh",
            f"{len(admin_data.get('users', []))} users • {len(admin_data.get('system_logs', []))} logs • {len(admin_data.get('usage_logs', []))} usage events",
        )


def render_main(app):
    st = app.st
    current_user = app.get_authenticated_user()
    if not current_user:
        render_public_auth_page(app)
        return

    total_files = app.get_datahoc_stats().get("total_files", 0)
    history = app.get_search_history_for_user(current_user.get("email", app.config.DEFAULT_END_USER_EMAIL))

    render_top_shell_bar(app, current_user, "chat")
    render_account_notice(app)
    render_lookup_hero(app, total_files)
    render_lookup_toolbar(app, total_files, len(history))
    render_lookup_feedback(app)

    if history:
        for entry in history:
            render_search_history_item(app, entry)
    else:
        st.markdown(
            """
            <div class="empty-state">
                Câu trả lời sẽ xuất hiện ở phía trên như một cuộc trò chuyện.<br>
                Hãy nhập câu hỏi ở thanh dưới cùng và nhấn <b>Enter</b> để tra cứu ngay.<br>
                Ví dụ: <code>Điều 1 là gì</code>, <code>12 điều kỷ luật</code>, <code>bánh chưng Tết 2025</code>.
            </div>
            """,
            unsafe_allow_html=True,
        )

    user_query = st.chat_input(
        "Nhập câu hỏi cần tra cứu rồi nhấn Enter...",
        key="lookup_chat_input",
    )
    if user_query:
        with st.spinner("🔍 Đang tra cứu trong datahoc..."):
            app.submit_lookup_query(user_query)
        st.rerun()


def render_admin_console_view(app):
    st = app.st
    current_user = app.get_authenticated_user()
    if not current_user:
        render_public_auth_page(app)
        return

    render_top_shell_bar(app, current_user, "admin")
    render_account_notice(app)
    if not app.user_can_access_admin(current_user):
        st.error("Tài khoản này không có quyền truy cập Admin Console.")
        st.session_state.active_page = "chat"
        return
    admin_views.render_admin_page(app)
