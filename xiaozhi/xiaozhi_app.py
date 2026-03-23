import sys
import time

import streamlit as st

from xiaozhi_backend import *
from xiaozhi_lookup_backend import *
from xiaozhi_ui import admin_views, chat_views


def render_app_styles():
    st.markdown(
        """
        <style>
        .stApp {
            background:
                radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
                radial-gradient(circle at top right, rgba(129, 140, 248, 0.18), transparent 24%),
                linear-gradient(180deg, #020617 0%, #0f172a 100%);
        }
        .block-container {
            padding-top: 4.2rem;
            padding-bottom: 8rem;
            max-width: 1240px;
        }
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.97) 0%, rgba(2, 6, 23, 0.98) 100%);
            border-right: 1px solid rgba(148, 163, 184, 0.14);
        }
        [data-testid="stSidebar"] .block-container {
            padding-top: 1.6rem;
        }
        [data-testid="metric-container"] {
            background: rgba(15, 23, 42, 0.78);
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 18px;
            padding: 0.85rem 1rem;
            box-shadow: 0 18px 40px rgba(2, 6, 23, 0.24);
        }
        .stTextArea textarea {
            min-height: 150px;
            border-radius: 18px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            background: rgba(15, 23, 42, 0.78);
            color: #e2e8f0;
            box-shadow: 0 18px 40px rgba(2, 6, 23, 0.18);
        }
        .stButton > button {
            height: 3rem;
            border-radius: 14px;
            font-weight: 700;
            border: 1px solid rgba(148, 163, 184, 0.2);
            background: rgba(15, 23, 42, 0.82);
        }
        .stFileUploader {
            background: rgba(15, 23, 42, 0.72);
            border: 1px dashed rgba(96, 165, 250, 0.35);
            border-radius: 18px;
            padding: 0.35rem;
        }
        [data-testid="stExpander"] {
            background: rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 18px;
            box-shadow: 0 18px 40px rgba(2, 6, 23, 0.16);
        }
        [data-testid="stExpander"] details summary p {
            font-size: 1rem;
            font-weight: 700;
        }
        .app-hero {
            padding: 1.6rem 1.8rem;
            margin-bottom: 1.25rem;
            border-radius: 26px;
            background:
                linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.82)),
                radial-gradient(circle at top right, rgba(59, 130, 246, 0.22), transparent 38%);
            border: 1px solid rgba(148, 163, 184, 0.16);
            box-shadow: 0 24px 60px rgba(2, 6, 23, 0.24);
        }
        .app-hero-kicker {
            color: #7dd3fc;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            margin-bottom: 0.75rem;
        }
        .app-hero h1 {
            margin: 0;
            color: #f8fafc;
            font-size: 2.1rem;
            line-height: 1.15;
        }
        .app-hero p {
            margin: 0.85rem 0 0;
            color: #cbd5e1;
            font-size: 1rem;
            line-height: 1.65;
            max-width: 760px;
        }
        .hero-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 1rem;
        }
        .hero-chip {
            padding: 0.52rem 0.9rem;
            border-radius: 999px;
            background: rgba(30, 41, 59, 0.88);
            border: 1px solid rgba(125, 211, 252, 0.18);
            color: #e2e8f0;
            font-size: 0.92rem;
        }
        .info-card {
            padding: 1.15rem 1.25rem;
            margin-bottom: 1rem;
            border-radius: 22px;
            background: rgba(15, 23, 42, 0.74);
            border: 1px solid rgba(148, 163, 184, 0.16);
            box-shadow: 0 20px 40px rgba(2, 6, 23, 0.18);
        }
        .info-card h3,
        .info-card h4 {
            margin: 0 0 0.75rem 0;
            color: #f8fafc;
        }
        .info-card p,
        .info-card li {
            color: #cbd5e1;
            line-height: 1.65;
        }
        .info-card ul {
            margin: 0;
            padding-left: 1.1rem;
        }
        .sidebar-card {
            padding: 1rem 1rem 0.95rem;
            margin: 0.6rem 0 1rem;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .sidebar-card-title {
            color: #f8fafc;
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 0.45rem;
        }
        .sidebar-card-text {
            color: #cbd5e1;
            font-size: 0.9rem;
            line-height: 1.55;
        }
        .folder-path {
            margin-top: 0.5rem;
            padding: 0.55rem 0.7rem;
            border-radius: 12px;
            background: rgba(2, 6, 23, 0.58);
            color: #bfdbfe;
            font-family: Consolas, monospace;
            font-size: 0.78rem;
            word-break: break-word;
        }
        .doc-item {
            padding: 0.82rem 0.92rem;
            margin-bottom: 0.7rem;
            border-radius: 16px;
            background: rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(148, 163, 184, 0.14);
        }
        .doc-item-title {
            color: #f8fafc;
            font-size: 0.98rem;
            font-weight: 700;
            margin-bottom: 0.3rem;
        }
        .doc-item-meta {
            color: #93c5fd;
            font-size: 0.84rem;
        }
        .result-summary {
            padding: 0.95rem 1rem;
            margin: 0.9rem 0 1rem;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.68);
            border: 1px solid rgba(148, 163, 184, 0.14);
            color: #e2e8f0;
        }
        .result-meta-badge {
            display: inline-block;
            padding: 0.35rem 0.7rem;
            margin-right: 0.5rem;
            margin-bottom: 0.4rem;
            border-radius: 999px;
            background: rgba(30, 41, 59, 0.88);
            color: #bfdbfe;
            font-size: 0.82rem;
            border: 1px solid rgba(96, 165, 250, 0.18);
        }
        .empty-state {
            padding: 1.35rem 1.3rem;
            border-radius: 22px;
            background: rgba(15, 23, 42, 0.7);
            border: 1px dashed rgba(148, 163, 184, 0.2);
            color: #cbd5e1;
            line-height: 1.7;
        }
        .compact-toolbar {
            padding: 0.9rem 1rem;
            margin: 0.4rem 0 1rem;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(148, 163, 184, 0.14);
            color: #cbd5e1;
        }
        .primary-answer-card {
            padding: 1.1rem 1.15rem;
            border-radius: 22px;
            background: rgba(15, 23, 42, 0.76);
            border: 1px solid rgba(148, 163, 184, 0.15);
            box-shadow: 0 20px 40px rgba(2, 6, 23, 0.18);
            margin-bottom: 0.75rem;
        }
        .answer-header {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 0.75rem;
            margin-bottom: 0.8rem;
        }
        .answer-title {
            color: #f8fafc;
            font-size: 1.05rem;
            font-weight: 800;
            margin-bottom: 0.35rem;
        }
        .answer-source {
            color: #93c5fd;
            font-size: 0.85rem;
        }
        .answer-content {
            color: #e2e8f0;
            line-height: 1.7;
        }
        .related-group-title {
            margin: 0.6rem 0 0.75rem;
            color: #cbd5e1;
            font-size: 0.95rem;
            font-weight: 700;
        }
        .history-record {
            padding: 0.72rem 0.84rem;
            margin-bottom: 0.65rem;
            border-radius: 14px;
            background: rgba(15, 23, 42, 0.64);
            border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .history-record-time {
            margin-top: 0.3rem;
            color: #93c5fd;
            font-size: 0.78rem;
        }
        [data-testid="stChatInput"] {
            background: rgba(15, 23, 42, 0.94);
            border: 1px solid rgba(148, 163, 184, 0.16);
            border-radius: 22px;
            box-shadow: 0 20px 40px rgba(2, 6, 23, 0.26);
            bottom: 1rem;
        }
        [data-testid="stChatInput"] textarea {
            color: #f8fafc !important;
            background: transparent !important;
        }
        [data-testid="stChatInput"] button {
            border-radius: 999px;
            background: linear-gradient(135deg, #2563eb, #60a5fa);
            border: none;
        }
        [data-testid="stChatMessageContent"] {
            width: 100%;
        }
        .top-shell-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem 1.2rem;
            margin-bottom: 1rem;
            border-radius: 22px;
            background: rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(148, 163, 184, 0.16);
            box-shadow: 0 20px 40px rgba(2, 6, 23, 0.16);
        }
        .top-shell-title {
            color: #f8fafc;
            font-size: 1.05rem;
            font-weight: 800;
            margin-bottom: 0.18rem;
        }
        .top-shell-subtitle {
            color: #94a3b8;
            font-size: 0.88rem;
        }
        .profile-card {
            padding: 1rem 1rem 0.9rem;
            border-radius: 22px;
            background: rgba(51, 65, 85, 0.62);
            border: 1px solid rgba(148, 163, 184, 0.18);
            margin-bottom: 0.8rem;
        }
        .profile-row {
            display: flex;
            align-items: center;
            gap: 0.85rem;
        }
        .profile-avatar {
            width: 42px;
            height: 42px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(96, 165, 250, 0.2);
            color: #e0f2fe;
            font-weight: 800;
            font-size: 0.95rem;
            border: 1px solid rgba(96, 165, 250, 0.25);
        }
        .profile-name {
            color: #f8fafc;
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 0.15rem;
        }
        .profile-handle {
            color: #94a3b8;
            font-size: 0.85rem;
        }
        .profile-divider {
            height: 1px;
            background: rgba(148, 163, 184, 0.16);
            margin: 0.85rem 0 0.75rem;
        }
        .sidebar-nav-card {
            padding: 0.9rem 0.95rem;
            margin-bottom: 0.7rem;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.66);
            border: 1px solid rgba(148, 163, 184, 0.14);
        }
        .sidebar-nav-title {
            color: #f8fafc;
            font-size: 0.92rem;
            font-weight: 700;
        }
        .sidebar-nav-subtitle {
            color: #94a3b8;
            font-size: 0.8rem;
            margin-top: 0.22rem;
        }
        .auth-shell {
            padding: 1.4rem 1.5rem;
            border-radius: 28px;
            background:
                linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.82)),
                radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 36%);
            border: 1px solid rgba(148, 163, 184, 0.16);
            box-shadow: 0 24px 60px rgba(2, 6, 23, 0.24);
            margin-bottom: 1rem;
        }
        .auth-title {
            color: #f8fafc;
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 0.6rem;
        }
        .auth-subtitle {
            color: #cbd5e1;
            line-height: 1.7;
            margin-bottom: 1rem;
        }
        .mini-stat-card {
            padding: 0.9rem 1rem;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.68);
            border: 1px solid rgba(148, 163, 184, 0.14);
            color: #e2e8f0;
            margin-bottom: 0.7rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def submit_lookup_query(query: str):
    query = query.strip()
    st.session_state.last_query = query
    user_email = get_current_end_user_email()

    is_valid_query, query_message = validate_user_query(query)
    if not is_valid_query:
        set_lookup_notice(query_message, "warning")
        return

    stats = get_datahoc_stats()
    if stats.get("total_files", 0) == 0:
        set_lookup_notice("⚠️ Chưa có tài liệu Markdown nào trong `datahoc`.", "warning")
        return

    analysis = analyze_lookup_query(query, user_email)
    started_at = time.perf_counter()
    fulfillment_result = fulfill_lookup_query(query, analysis=analysis)
    matches = fulfillment_result["matches"]
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    record_usage_event(
        query=query,
        user_email=user_email,
        response_time_ms=elapsed_ms,
        matches_count=len(matches),
        intent_name=analysis["intent"].get("name", ""),
    )
    append_admin_log(
        f"Tra cứu bởi {user_email}: {create_preview_text(query, 120)}",
        level="info",
        category="request",
    )

    if not matches:
        append_search_history(
            query=query,
            matches=[],
            show_related=fulfillment_result["show_related"],
            message=fulfillment_result["message"],
            user_email=user_email,
            analysis=analysis,
            fulfillment=fulfillment_result["fulfillment"],
        )
        return

    append_search_history(
        query=query,
        matches=matches,
        show_related=fulfillment_result["show_related"],
        message=fulfillment_result["message"],
        user_email=user_email,
        analysis=analysis,
        fulfillment=fulfillment_result["fulfillment"],
    )


def render_sidebar_card(title: str, text: str, footer: str = ""):
    chat_views.render_sidebar_card(sys.modules[__name__], title, text, footer)


def render_lookup_hero(total_files: int):
    chat_views.render_lookup_hero(sys.modules[__name__], total_files)


def render_lookup_toolbar(total_files: int, history_count: int):
    chat_views.render_lookup_toolbar(sys.modules[__name__], total_files, history_count)


def render_primary_answer_card(match: dict):
    chat_views.render_primary_answer_card(sys.modules[__name__], match)


def render_result_card(match: dict, index: int, expand_by_default: bool = False):
    chat_views.render_result_card(sys.modules[__name__], match, index, expand_by_default)


def render_lookup_feedback():
    chat_views.render_lookup_feedback(sys.modules[__name__])


def get_lookup_entity_lines(analysis: dict):
    return chat_views.get_lookup_entity_lines(sys.modules[__name__], analysis)


def render_lookup_analysis_panel(entry: dict):
    chat_views.render_lookup_analysis_panel(sys.modules[__name__], entry)


def render_search_history_item(entry: dict):
    chat_views.render_search_history_item(sys.modules[__name__], entry)


def render_admin_dashboard():
    admin_views.render_admin_dashboard(sys.modules[__name__])


def render_admin_user_management():
    admin_views.render_admin_user_management(sys.modules[__name__])


def render_admin_conversations():
    admin_views.render_admin_conversations(sys.modules[__name__])


def render_admin_models():
    admin_views.render_admin_models(sys.modules[__name__])


def render_admin_knowledge_base():
    admin_views.render_admin_knowledge_base(sys.modules[__name__])


def render_admin_prompts():
    admin_views.render_admin_prompts(sys.modules[__name__])


def render_admin_analytics():
    admin_views.render_admin_analytics(sys.modules[__name__])


def render_admin_billing():
    admin_views.render_admin_billing(sys.modules[__name__])


def render_admin_integrations():
    admin_views.render_admin_integrations(sys.modules[__name__])


def render_admin_settings():
    admin_views.render_admin_settings(sys.modules[__name__])


def render_admin_moderation():
    admin_views.render_admin_moderation(sys.modules[__name__])


def render_admin_logs():
    admin_views.render_admin_logs(sys.modules[__name__])


def render_admin_page():
    admin_views.render_admin_page(sys.modules[__name__])


def render_account_notice():
    chat_views.render_account_notice(sys.modules[__name__])


def render_account_menu_content(current_user: dict):
    chat_views.render_account_menu_content(sys.modules[__name__], current_user)


def render_top_shell_bar(current_user: dict, current_page: str):
    chat_views.render_top_shell_bar(sys.modules[__name__], current_user, current_page)


def render_public_auth_page():
    chat_views.render_public_auth_page(sys.modules[__name__])


def render_sidebar(current_user: dict):
    chat_views.render_sidebar(sys.modules[__name__], current_user)


def render_main():
    chat_views.render_main(sys.modules[__name__])


def render_admin_console_view():
    chat_views.render_admin_console_view(sys.modules[__name__])


def main():
    st.set_page_config(
        page_title="Xiaozhi Console",
        page_icon="🤖",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    init_session_state()
    render_app_styles()

    current_user = get_authenticated_user()
    render_auth_cookie_bridge()
    if not current_user:
        render_public_auth_page()
        return

    render_sidebar(current_user)
    current_page = resolve_active_page_for_user(
        current_user,
        st.session_state.get("active_page", resolve_default_page_for_user(current_user)),
    )
    st.session_state.active_page = current_page

    if current_page == "admin":
        render_admin_console_view()
        st.divider()
        st.caption("🛠️ Admin console quản trị chatbot, dữ liệu và vận hành hệ thống")
    else:
        render_main()
        st.divider()
        st.caption("� User console để tra cứu trực tiếp dữ liệu nội bộ theo quyền tài khoản")
