import base64
import hashlib
import hmac
import html
import json
import logging
import os
import re
import secrets
import time
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import streamlit as st


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class Config:
    EMBEDDING_MODEL_ID: str = "dangvantuan/vietnamese-embedding"
    CROSS_ENCODER_ID: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    OLLAMA_MODEL: str = "qwen2.5:1.5b"
    OLLAMA_TEMPERATURE: float = 0.1
    OLLAMA_NUM_CTX: int = 8192
    OLLAMA_NUM_PREDICT: int = 1200
    CHROMA_PATH: str = "./demo-rag-chroma"
    COLLECTION_NAME: str = "rag_app"
    CHUNK_SIZE: int = 400
    CHUNK_OVERLAP: int = 100
    N_RESULTS: int = 12
    N_RESULTS_DETAILED: int = 18
    TOP_K_RERANK: int = 5
    TOP_K_RERANK_DETAILED: int = 8
    MAX_CONTEXT_CHARS: int = 5000
    MAX_CONTEXT_CHARS_DETAILED: int = 8500
    DIRECT_LOOKUP_RESULTS: int = 1
    DIRECT_LOOKUP_RESULTS_DETAILED: int = 10
    LEXICAL_INDEX_MAX_TOKENS: int = 32
    HYBRID_CANDIDATE_POOL: int = 18
    HYBRID_CANDIDATE_POOL_DETAILED: int = 28
    HYBRID_VECTOR_RESULTS: int = 8
    HYBRID_VECTOR_RESULTS_DETAILED: int = 12
    HYBRID_VECTOR_SECTION_MATCHES: int = 3
    HYBRID_SKIP_VECTOR_SCORE: float = 11.0
    HYBRID_SEMANTIC_BOOST: float = 4.5
    HYBRID_MIN_SECTION_OVERLAP: float = 0.08
    SHOW_SOURCE_DETAILS: bool = False
    SHOW_DEBUG_INFO: bool = False
    MAX_FILE_SIZE_MB: int = 50
    MAX_PAGES: int = 1000
    MARKDOWN_OUTPUT_DIR: str = "./xiaozhi-local-chat/datahoc"
    MARKDOWN_SOURCE_DIR: str = "./xiaozhi-local-chat/datahoc"
    MARKDOWN_EXCLUDE_DIRS: Tuple[str, ...] = (".venv", ".git", "__pycache__", "demo-rag-chroma", "models")
    VECTOR_SYNC_STATE_FILE: str = "lookup_vector_sync_state.json"
    SEARCH_HISTORY_FILE: str = "lookup_search_history.json"
    MAX_SEARCH_HISTORY: int = 30
    ADMIN_CONSOLE_DATA_FILE: str = "admin_console_data.json"
    MAX_ADMIN_LOGS: int = 300
    APP_NAME: str = "Xiaozhi"
    DEFAULT_ADMIN_EMAIL: str = "admin@xiaozhi.local"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_END_USER_EMAIL: str = "guest@xiaozhi.local"
    DEFAULT_USER_PASSWORD: str = "user123"
    PASSWORD_HASH_SCHEME: str = "pbkdf2_sha256"
    PASSWORD_HASH_ITERATIONS: int = 200000
    PASSWORD_MIN_LENGTH: int = 8
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "xiaozhi.local"
    JWT_EXP_SECONDS: int = 12 * 60 * 60
    JWT_SECRET_ENV_VAR: str = "XIAOZHI_JWT_SECRET"
    JWT_SECRET_STREAMLIT_KEY: str = "jwt_secret"
    AUTH_COOKIE_NAME: str = "xiaozhi_auth_token"
    AUTH_COOKIE_MAX_AGE_SECONDS: int = 12 * 60 * 60


config = Config()


def _get_lookup_backend():
    import xiaozhi_lookup_backend as lookup_backend
    return lookup_backend


def init_session_state():
    if "models_initialized" not in st.session_state:
        st.session_state.models_initialized = False
    if "last_query" not in st.session_state:
        st.session_state.last_query = ""
    if "last_markdown_path" not in st.session_state:
        st.session_state.last_markdown_path = ""
    if "last_bulk_import_message" not in st.session_state:
        st.session_state.last_bulk_import_message = ""
    if "datahoc_synced" not in st.session_state:
        st.session_state.datahoc_synced = False
    if "search_history" not in st.session_state:
        st.session_state.search_history = load_search_history()
    if "lookup_notice" not in st.session_state:
        st.session_state.lookup_notice = None
    if "admin_console_data" not in st.session_state:
        st.session_state.admin_console_data = load_admin_console_data()
    if "authenticated_user_email" not in st.session_state:
        st.session_state.authenticated_user_email = ""
    if "auth_token" not in st.session_state:
        st.session_state.auth_token = ""
    if "authenticated_user_claims" not in st.session_state:
        st.session_state.authenticated_user_claims = {}
    if "auth_cookie_clear_requested" not in st.session_state:
        st.session_state.auth_cookie_clear_requested = False
    if "current_end_user_email" not in st.session_state:
        st.session_state.current_end_user_email = config.DEFAULT_END_USER_EMAIL
    if "active_page" not in st.session_state:
        st.session_state.active_page = "chat"
    if "account_notice" not in st.session_state:
        st.session_state.account_notice = None


def get_search_history_path() -> Path:
    return Path(config.SEARCH_HISTORY_FILE).resolve()


def load_search_history() -> List[dict]:
    lookup_backend = _get_lookup_backend()
    history_path = get_search_history_path()
    if not history_path.exists():
        return []

    try:
        raw_history = json.loads(history_path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"Không thể đọc lịch sử tra cứu: {e}")
        return []

    if not isinstance(raw_history, list):
        return []

    normalized_history = []
    for item in raw_history[-config.MAX_SEARCH_HISTORY:]:
        if not isinstance(item, dict):
            continue

        query = str(item.get("query", "")).strip()
        if not query:
            continue

        raw_matches = item.get("matches", [])
        matches = []
        if isinstance(raw_matches, list):
            for raw_match in raw_matches:
                if not isinstance(raw_match, dict):
                    continue
                matches.append({
                    "source": str(raw_match.get("source", "")),
                    "title": str(raw_match.get("title", "")),
                    "content": str(raw_match.get("content", "")),
                    "path": str(raw_match.get("path", "")),
                    "score": raw_match.get("score", 0),
                })

        normalized_history.append({
            "id": str(item.get("id", datetime.now().strftime("%Y%m%d%H%M%S%f"))),
            "query": query,
            "timestamp": str(item.get("timestamp", "")),
            "user_email": str(item.get("user_email", config.DEFAULT_END_USER_EMAIL)),
            "show_related": bool(item.get("show_related", False)),
            "matches": matches,
            "message": str(item.get("message", "")),
            "analysis": lookup_backend.normalize_lookup_analysis_data(item.get("analysis", {})),
            "fulfillment": lookup_backend.normalize_lookup_fulfillment_data(item.get("fulfillment", {})),
        })

    return normalized_history[-config.MAX_SEARCH_HISTORY:]


def save_search_history(history: List[dict]):
    history_path = get_search_history_path()
    try:
        history_path.parent.mkdir(parents=True, exist_ok=True)
        history_path.write_text(
            json.dumps(history[-config.MAX_SEARCH_HISTORY:], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning(f"Không thể lưu lịch sử tra cứu: {e}")


def set_lookup_notice(message: str, level: str = "info"):
    st.session_state.lookup_notice = {"message": message, "level": level}


def set_account_notice(message: str, level: str = "info"):
    st.session_state.account_notice = {"message": message, "level": level}


def append_search_history(
    query: str,
    matches: List[dict],
    show_related: bool = False,
    message: str = "",
    user_email: str = config.DEFAULT_END_USER_EMAIL,
    analysis: Optional[dict] = None,
    fulfillment: Optional[dict] = None,
):
    lookup_backend = _get_lookup_backend()
    entry = {
        "id": datetime.now().strftime("%Y%m%d%H%M%S%f"),
        "query": query,
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "user_email": user_email,
        "show_related": show_related,
        "matches": matches,
        "message": message,
        "analysis": lookup_backend.normalize_lookup_analysis_data(analysis),
        "fulfillment": lookup_backend.normalize_lookup_fulfillment_data(fulfillment),
    }
    history = st.session_state.get("search_history", [])
    history.append(entry)
    st.session_state.search_history = history[-config.MAX_SEARCH_HISTORY:]
    save_search_history(st.session_state.search_history)
    return entry


def refresh_search_history_entry(entry_id: str, show_related: bool):
    lookup_backend = _get_lookup_backend()
    history = st.session_state.get("search_history", [])
    for entry in history:
        if entry.get("id") != entry_id:
            continue
        analysis = lookup_backend.normalize_lookup_analysis_data(entry.get("analysis", {}))
        search_query = analysis["context"].get("resolved_query") or entry["query"]
        matches = lookup_backend.search_datahoc(search_query, exhaustive_mode=show_related, analysis=analysis)
        entry["matches"] = matches
        entry["show_related"] = show_related
        entry["message"] = "" if matches else lookup_backend.build_not_found_message(analysis)
        entry["fulfillment"] = lookup_backend.normalize_lookup_fulfillment_data({
            **entry.get("fulfillment", {}),
            "query_used": search_query,
            "show_related": show_related,
            "matches_count": len(matches),
            "message": entry["message"],
        })
        save_search_history(history)
        return


def clear_search_history():
    st.session_state.search_history = []
    save_search_history([])


def get_search_history_for_user(user_email: str) -> List[dict]:
    normalized_email = str(user_email or "").strip().lower()
    history = st.session_state.get("search_history", [])
    return [entry for entry in history if str(entry.get("user_email", "")).strip().lower() == normalized_email]


def clear_search_history_for_user(user_email: str):
    normalized_email = str(user_email or "").strip().lower()
    history = st.session_state.get("search_history", [])
    filtered_history = [
        entry for entry in history
        if str(entry.get("user_email", "")).strip().lower() != normalized_email
    ]
    st.session_state.search_history = filtered_history
    save_search_history(filtered_history)


def get_admin_data_path() -> Path:
    return Path(config.ADMIN_CONSOLE_DATA_FILE).resolve()


@st.cache_resource
def get_jwt_secret() -> str:
    secret_value = ""
    try:
        secret_value = str(st.secrets.get(config.JWT_SECRET_STREAMLIT_KEY, "")).strip()
    except Exception:
        secret_value = ""
    if not secret_value:
        secret_value = str(os.getenv(config.JWT_SECRET_ENV_VAR, "")).strip()
    if secret_value:
        return secret_value

    generated_secret = secrets.token_urlsafe(64)
    logger.warning(
        "Chưa cấu hình JWT secret cố định. Hãy đặt `%s` hoặc `st.secrets[%r]` để giữ phiên đăng nhập ổn định sau khi app khởi động lại.",
        config.JWT_SECRET_ENV_VAR,
        config.JWT_SECRET_STREAMLIT_KEY,
    )
    return generated_secret


def _base64url_encode(raw_value: bytes) -> str:
    return base64.urlsafe_b64encode(raw_value).rstrip(b"=").decode("ascii")


def _base64url_decode(encoded_value: str) -> bytes:
    padding = "=" * (-len(encoded_value) % 4)
    return base64.urlsafe_b64decode(f"{encoded_value}{padding}".encode("ascii"))


def encode_jwt_token(payload: Dict[str, Any]) -> str:
    header = {"alg": config.JWT_ALGORITHM, "typ": "JWT"}
    header_segment = _base64url_encode(
        json.dumps(header, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    payload_segment = _base64url_encode(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header_segment}.{payload_segment}"
    signature = hmac.new(
        get_jwt_secret().encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_jwt_token(token: str) -> Tuple[bool, Dict[str, Any], str]:
    normalized_token = str(token or "").strip()
    if not normalized_token:
        return False, {}, "Thiếu token."

    parts = normalized_token.split(".")
    if len(parts) != 3:
        return False, {}, "Token không hợp lệ."

    header_segment, payload_segment, signature_segment = parts
    signing_input = f"{header_segment}.{payload_segment}"
    try:
        expected_signature = hmac.new(
            get_jwt_secret().encode("utf-8"),
            signing_input.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        provided_signature = _base64url_decode(signature_segment)
    except Exception:
        return False, {}, "Token không hợp lệ."

    if not hmac.compare_digest(provided_signature, expected_signature):
        return False, {}, "Token signature không hợp lệ."

    try:
        payload = json.loads(_base64url_decode(payload_segment).decode("utf-8"))
    except Exception:
        return False, {}, "Payload token không đọc được."

    if not isinstance(payload, dict):
        return False, {}, "Payload token không hợp lệ."
    if str(payload.get("iss", "")).strip() != config.JWT_ISSUER:
        return False, {}, "Token issuer không hợp lệ."
    if not str(payload.get("sub", "")).strip():
        return False, {}, "Token thiếu định danh người dùng."

    now = int(time.time())
    issued_at = int(payload.get("iat", 0) or 0)
    expires_at = int(payload.get("exp", 0) or 0)
    if issued_at and issued_at > now + 60:
        return False, {}, "Token có thời gian phát hành không hợp lệ."
    if expires_at and expires_at <= now:
        return False, {}, "Phiên đăng nhập đã hết hạn."

    return True, payload, ""


def is_legacy_password_hash(stored_hash: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{64}", str(stored_hash or "").strip()))


def hash_password(password: str, salt: str = "") -> str:
    normalized_password = str(password or "")
    salt_value = str(salt or "").strip() or secrets.token_hex(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        normalized_password.encode("utf-8"),
        salt_value.encode("utf-8"),
        config.PASSWORD_HASH_ITERATIONS,
    )
    return f"{config.PASSWORD_HASH_SCHEME}${config.PASSWORD_HASH_ITERATIONS}${salt_value}${derived_key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    normalized_hash = str(stored_hash or "").strip()
    if not normalized_hash:
        return False

    normalized_password = str(password or "")
    if is_legacy_password_hash(normalized_hash):
        legacy_hash = hashlib.sha256(normalized_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy_hash, normalized_hash)

    parts = normalized_hash.split("$", 3)
    if len(parts) != 4 or parts[0] != config.PASSWORD_HASH_SCHEME:
        return False

    _, iterations_text, salt_value, expected_hash = parts
    try:
        iterations = int(iterations_text)
    except ValueError:
        return False

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        normalized_password.encode("utf-8"),
        salt_value.encode("utf-8"),
        iterations,
    )
    return hmac.compare_digest(derived_key.hex(), expected_hash)


def password_hash_needs_upgrade(stored_hash: str) -> bool:
    normalized_hash = str(stored_hash or "").strip()
    if not normalized_hash or is_legacy_password_hash(normalized_hash):
        return True

    parts = normalized_hash.split("$", 3)
    if len(parts) != 4 or parts[0] != config.PASSWORD_HASH_SCHEME:
        return True

    try:
        iterations = int(parts[1])
    except ValueError:
        return True

    return iterations < config.PASSWORD_HASH_ITERATIONS


def validate_password_strength(password: str) -> Tuple[bool, str]:
    normalized_password = str(password or "")
    if len(normalized_password) < config.PASSWORD_MIN_LENGTH:
        return False, f"Mật khẩu cần tối thiểu {config.PASSWORD_MIN_LENGTH} ký tự."
    if not re.search(r"[A-Za-z]", normalized_password):
        return False, "Mật khẩu cần có ít nhất 1 chữ cái."
    if not re.search(r"\d", normalized_password):
        return False, "Mật khẩu cần có ít nhất 1 chữ số."
    return True, ""


def create_user_handle(email: str) -> str:
    local_part = (email or "").split("@")[0].strip().lower()
    local_part = re.sub(r"[^a-z0-9_]+", "", local_part)
    return f"@{local_part or 'user'}"


def normalize_user_record(raw_user: Optional[dict], fallback_index: int = 0) -> dict:
    user = raw_user if isinstance(raw_user, dict) else {}
    email = str(user.get("email", "")).strip().lower()
    if not email:
        email = f"user{fallback_index}@xiaozhi.local"

    default_password = config.DEFAULT_ADMIN_PASSWORD if email == config.DEFAULT_ADMIN_EMAIL else config.DEFAULT_USER_PASSWORD
    created_at = str(user.get("created_at", "")).strip() or datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    role = str(user.get("role", "user")).strip().lower()
    if role not in {"user", "manager", "admin"}:
        role = "user"

    status = str(user.get("status", "active")).strip().lower()
    if status not in {"active", "inactive"}:
        status = "active"

    return {
        "id": str(user.get("id", f"user_{fallback_index}_{int(time.time() * 1000)}")),
        "name": str(user.get("name", "")).strip() or email.split("@")[0],
        "email": email,
        "username": str(user.get("username", "")).strip() or create_user_handle(email),
        "password_hash": str(user.get("password_hash", "")).strip() or hash_password(default_password),
        "role": role,
        "status": status,
        "plan": str(user.get("plan", "Internal")).strip() or "Internal",
        "locked": bool(user.get("locked", False)),
        "created_at": created_at,
        "last_login_at": str(user.get("last_login_at", "")).strip(),
    }


def find_user_by_email(email: str, users: Optional[List[dict]] = None) -> Optional[dict]:
    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        return None
    target_users = users if users is not None else get_admin_console_data().get("users", [])
    for user in target_users:
        if user.get("email", "").strip().lower() == normalized_email:
            return user
    return None


def build_password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(str(password_hash or "").encode("utf-8")).hexdigest()


def create_auth_token(user: dict) -> str:
    now = int(time.time())
    payload = {
        "iss": config.JWT_ISSUER,
        "sub": str(user.get("email", "")).strip().lower(),
        "uid": str(user.get("id", "")).strip(),
        "role": str(user.get("role", "user")).strip().lower(),
        "pwd": build_password_fingerprint(user.get("password_hash", "")),
        "iat": now,
        "exp": now + config.JWT_EXP_SECONDS,
    }
    return encode_jwt_token(payload)


def get_browser_auth_token() -> str:
    try:
        cookie_value = st.context.cookies.get(config.AUTH_COOKIE_NAME, "")
    except Exception:
        cookie_value = ""
    return str(cookie_value or "").strip()


def should_use_secure_auth_cookie() -> bool:
    try:
        current_url = str(getattr(st.context, "url", "") or "").strip().lower()
    except Exception:
        current_url = ""
    return current_url.startswith("https://")


def sync_auth_token_from_browser_cookie() -> str:
    session_token = str(st.session_state.get("auth_token", "")).strip()
    if session_token:
        return session_token

    browser_token = get_browser_auth_token()
    if st.session_state.get("auth_cookie_clear_requested", False):
        if not browser_token:
            st.session_state.auth_cookie_clear_requested = False
        return ""

    if browser_token:
        st.session_state.auth_token = browser_token
        return browser_token
    return ""


def render_auth_cookie_bridge():
    browser_token = get_browser_auth_token()
    session_token = str(st.session_state.get("auth_token", "")).strip()
    clear_requested = bool(st.session_state.get("auth_cookie_clear_requested", False))
    if clear_requested and not browser_token:
        st.session_state.auth_cookie_clear_requested = False
        clear_requested = False

    if clear_requested and browser_token:
        st.html(
            f"""
            <script>
            document.cookie = "{config.AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict";
            </script>
            """,
            unsafe_allow_javascript=True,
        )
        return

    if not session_token or browser_token == session_token:
        return

    secure_attribute = "; Secure" if should_use_secure_auth_cookie() else ""
    st.html(
        f"""
        <script>
        document.cookie = "{config.AUTH_COOKIE_NAME}={session_token}; path=/; max-age={config.AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Strict{secure_attribute}";
        </script>
        """,
        unsafe_allow_javascript=True,
    )


def clear_authenticated_session(reset_active_page: bool = True, clear_browser_auth: bool = False):
    st.session_state.auth_token = ""
    st.session_state.authenticated_user_email = ""
    st.session_state.authenticated_user_claims = {}
    st.session_state.current_end_user_email = config.DEFAULT_END_USER_EMAIL
    if clear_browser_auth:
        st.session_state.auth_cookie_clear_requested = True
    if reset_active_page:
        st.session_state.active_page = "chat"


def get_allowed_pages_for_user(user: Optional[dict] = None) -> Set[str]:
    current_user = user or get_authenticated_user()
    if current_user and current_user.get("role") in {"admin", "manager"}:
        return {"chat", "admin"}
    return {"chat"}


def resolve_default_page_for_user(user: Optional[dict] = None) -> str:
    current_user = user or get_authenticated_user()
    if current_user and current_user.get("role") in {"admin", "manager"}:
        return "admin"
    return "chat"


def resolve_active_page_for_user(user: Optional[dict], requested_page: str) -> str:
    normalized_page = str(requested_page or "").strip().lower()
    allowed_pages = get_allowed_pages_for_user(user)
    if normalized_page in allowed_pages:
        return normalized_page
    return resolve_default_page_for_user(user)


def get_authenticated_user() -> Optional[dict]:
    auth_token = sync_auth_token_from_browser_cookie()
    if auth_token:
        is_valid, claims, _ = decode_jwt_token(auth_token)
        if not is_valid:
            clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
            return None

        email = str(claims.get("sub", "")).strip().lower()
        user = find_user_by_email(email)
        if not user:
            clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
            return None
        if user.get("status") != "active" or user.get("locked", False):
            clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
            return None
        if str(claims.get("role", "")).strip().lower() != str(user.get("role", "")).strip().lower():
            clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
            return None
        if str(claims.get("pwd", "")).strip() != build_password_fingerprint(user.get("password_hash", "")):
            clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
            return None

        st.session_state.authenticated_user_email = email
        st.session_state.authenticated_user_claims = claims
        st.session_state.current_end_user_email = email
        return user

    legacy_email = str(st.session_state.get("authenticated_user_email", "")).strip().lower()
    if not legacy_email:
        return None

    user = find_user_by_email(legacy_email)
    if not user:
        clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
        return None
    if user.get("status") != "active" or user.get("locked", False):
        clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
        return None

    set_authenticated_user(user)
    return user


def user_can_access_admin(user: Optional[dict] = None) -> bool:
    current_user = user or get_authenticated_user()
    return bool(current_user and current_user.get("role") in {"admin", "manager"})


def set_authenticated_user(user: dict):
    email = str(user.get("email", config.DEFAULT_END_USER_EMAIL)).strip().lower()
    auth_token = create_auth_token(user)
    is_valid, claims, _ = decode_jwt_token(auth_token)
    st.session_state.auth_token = auth_token
    st.session_state.auth_cookie_clear_requested = False
    st.session_state.authenticated_user_email = email
    st.session_state.authenticated_user_claims = claims if is_valid else {}
    st.session_state.current_end_user_email = email
    st.session_state.active_page = resolve_default_page_for_user(user)


def logout_authenticated_user():
    clear_authenticated_session(reset_active_page=True, clear_browser_auth=True)
    st.session_state.account_notice = None


def authenticate_local_user(email: str, password: str) -> Tuple[bool, str]:
    normalized_email = str(email or "").strip().lower()
    user = find_user_by_email(normalized_email)
    if not user:
        append_admin_log(f"Đăng nhập thất bại: {normalized_email or 'unknown'}", "warning", "security")
        return False, "Email hoặc mật khẩu không đúng."
    if user.get("status") != "active":
        append_admin_log(f"Tài khoản bị vô hiệu hóa đăng nhập: {normalized_email}", "warning", "security")
        return False, "Tài khoản đang bị vô hiệu hóa."
    if user.get("locked", False):
        append_admin_log(f"Tài khoản bị khóa đăng nhập: {normalized_email}", "warning", "security")
        return False, "Tài khoản đang bị khóa."
    if not verify_password(password, user.get("password_hash", "")):
        append_admin_log(f"Đăng nhập sai mật khẩu: {normalized_email}", "warning", "security")
        return False, "Email hoặc mật khẩu không đúng."

    if password_hash_needs_upgrade(user.get("password_hash", "")):
        user["password_hash"] = hash_password(password)
    user["last_login_at"] = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    admin_data = get_admin_console_data()
    save_admin_console_data(admin_data)
    set_authenticated_user(user)
    append_admin_log(f"Đăng nhập thành công: {normalized_email}", "info", "user")
    return True, "Đăng nhập thành công."


def register_local_user(name: str, email: str, password: str) -> Tuple[bool, str]:
    normalized_name = str(name or "").strip()
    normalized_email = str(email or "").strip().lower()
    if not normalized_name or not normalized_email or not password:
        return False, "Vui lòng nhập đủ họ tên, email và mật khẩu."
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized_email):
        return False, "Email không đúng định dạng."
    password_is_valid, password_message = validate_password_strength(password)
    if not password_is_valid:
        return False, password_message

    admin_data = get_admin_console_data()
    users = admin_data.get("users", [])
    if find_user_by_email(normalized_email, users):
        return False, "Email này đã tồn tại."

    new_user = normalize_user_record(
        {
            "id": datetime.now().strftime("user_%Y%m%d%H%M%S%f"),
            "name": normalized_name,
            "email": normalized_email,
            "username": create_user_handle(normalized_email),
            "password_hash": hash_password(password),
            "role": "user",
            "status": "active",
            "plan": "Free",
            "locked": False,
            "created_at": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        },
        fallback_index=len(users),
    )
    users.append(new_user)
    admin_data["users"] = users
    save_admin_console_data(admin_data)
    append_admin_log(f"Đăng ký tài khoản mới: {normalized_email}", "info", "user")
    set_authenticated_user(new_user)
    return True, "Đăng ký thành công."


def get_user_profile_name(user: Optional[dict]) -> str:
    if not user:
        return "Khách"
    return str(user.get("name", "")).strip() or user.get("email", "Khách")


def get_user_profile_handle(user: Optional[dict]) -> str:
    if not user:
        return "@guest"
    return str(user.get("username", "")).strip() or create_user_handle(user.get("email", ""))


def get_user_initials(user: Optional[dict]) -> str:
    name = get_user_profile_name(user)
    parts = [part for part in name.replace(".", " ").split() if part]
    if not parts:
        return "U"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def get_default_admin_console_data() -> dict:
    datahoc_path = str(Path(config.MARKDOWN_SOURCE_DIR).resolve())
    now_text = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    return {
        "users": [
            {
                "id": "admin_local",
                "name": "Administrator",
                "email": config.DEFAULT_ADMIN_EMAIL,
                "username": "@admin",
                "password_hash": hash_password(config.DEFAULT_ADMIN_PASSWORD),
                "role": "admin",
                "status": "active",
                "plan": "Enterprise",
                "locked": False,
                "created_at": now_text,
                "last_login_at": "",
            },
            {
                "id": "guest_local",
                "name": "Người dùng mặc định",
                "email": config.DEFAULT_END_USER_EMAIL,
                "username": "@guest",
                "password_hash": hash_password(config.DEFAULT_USER_PASSWORD),
                "role": "user",
                "status": "active",
                "plan": "Internal",
                "locked": False,
                "created_at": now_text,
                "last_login_at": "",
            },
        ],
        "models": {
            "default_model": "GPT-4o mini",
            "catalog": [
                {
                    "provider": "OpenAI",
                    "model": "GPT-4o mini",
                    "temperature": 0.2,
                    "token_limit": 4096,
                    "enabled": True,
                },
                {
                    "provider": "Google",
                    "model": "Gemini 1.5 Flash",
                    "temperature": 0.2,
                    "token_limit": 4096,
                    "enabled": True,
                },
            ],
            "providers": {
                "OpenAI API": {"status": "Chưa kết nối", "base_url": "https://api.openai.com/v1"},
                "Google Gemini": {"status": "Chưa kết nối", "base_url": "https://generativelanguage.googleapis.com"},
            },
        },
        "prompts": {
            "system_prompt": "Bạn là trợ lý AI nội bộ, ưu tiên trả lời rõ ràng và đúng ngữ cảnh.",
            "role_prompt": "Chuyên viên hỗ trợ tri thức nội bộ.",
            "personality": "Thân thiện, ngắn gọn, chính xác.",
        },
        "billing": {
            "subscription_plan": "Starter",
            "monthly_budget": 0.0,
            "api_cost_today": 0.0,
            "token_usage_today": 0,
            "usage_limit_per_user": 0,
        },
        "settings": {
            "language": "Tiếng Việt",
            "theme": "Dark",
            "email_notifications": True,
            "security_mode": "Standard",
        },
        "integrations": [
            {"name": "CRM", "type": "API", "status": "Chưa kết nối", "target": ""},
            {"name": "Website Chat Widget", "type": "Widget", "status": "Sẵn sàng", "target": ""},
            {"name": "Messenger Bot", "type": "Messaging", "status": "Chưa kết nối", "target": ""},
        ],
        "moderation": {
            "spam_threshold": 3,
            "blocked_keywords": ["spam", "độc hại"],
            "reports": [],
        },
        "analytics": {
            "manual_accuracy_rate": 0.0,
            "manual_response_seconds": 0.0,
        },
        "knowledge_registry": [
            {"name": "Thư mục datahoc", "type": "Folder", "status": "Active", "location": datahoc_path},
        ],
        "usage_logs": [],
        "system_logs": [
            {
                "timestamp": now_text,
                "level": "info",
                "category": "system",
                "message": "Khởi tạo admin console cục bộ.",
            }
        ],
    }


def normalize_admin_console_data(raw_data: Optional[dict]) -> dict:
    defaults = get_default_admin_console_data()
    if not isinstance(raw_data, dict):
        return defaults

    data = json.loads(json.dumps(defaults, ensure_ascii=False))

    for key in ("integrations", "knowledge_registry", "usage_logs", "system_logs"):
        if isinstance(raw_data.get(key), list):
            data[key] = raw_data[key]

    raw_users = raw_data.get("users")
    if isinstance(raw_users, list):
        data["users"] = [
            normalize_user_record(user, fallback_index=index)
            for index, user in enumerate(raw_users)
            if isinstance(user, dict)
        ]

    for key in ("prompts", "billing", "settings", "moderation", "analytics"):
        if isinstance(raw_data.get(key), dict):
            data[key].update(raw_data[key])

    raw_models = raw_data.get("models")
    if isinstance(raw_models, dict):
        data["models"].update({k: v for k, v in raw_models.items() if k not in {"catalog", "providers"}})
        if isinstance(raw_models.get("catalog"), list):
            data["models"]["catalog"] = raw_models["catalog"]
        if isinstance(raw_models.get("providers"), dict):
            data["models"]["providers"].update(raw_models["providers"])

    if not find_user_by_email(config.DEFAULT_ADMIN_EMAIL, data["users"]):
        data["users"].append(
            normalize_user_record(
                {
                    "id": "admin_local",
                    "name": "Administrator",
                    "email": config.DEFAULT_ADMIN_EMAIL,
                    "username": "@admin",
                    "password_hash": hash_password(config.DEFAULT_ADMIN_PASSWORD),
                    "role": "admin",
                    "status": "active",
                    "plan": "Enterprise",
                    "locked": False,
                },
                fallback_index=len(data["users"]),
            )
        )

    if not find_user_by_email(config.DEFAULT_END_USER_EMAIL, data["users"]):
        data["users"].append(
            normalize_user_record(
                {
                    "id": "guest_local",
                    "name": "Người dùng mặc định",
                    "email": config.DEFAULT_END_USER_EMAIL,
                    "username": "@guest",
                    "password_hash": hash_password(config.DEFAULT_USER_PASSWORD),
                    "role": "user",
                    "status": "active",
                    "plan": "Internal",
                    "locked": False,
                },
                fallback_index=len(data["users"]),
            )
        )

    return data


def load_admin_console_data() -> dict:
    data_path = get_admin_data_path()
    if not data_path.exists():
        return get_default_admin_console_data()

    try:
        raw_data = json.loads(data_path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"Không thể đọc admin console data: {e}")
        return get_default_admin_console_data()

    return normalize_admin_console_data(raw_data)


def save_admin_console_data(data: dict):
    normalized = normalize_admin_console_data(data)
    data_path = get_admin_data_path()
    try:
        data_path.parent.mkdir(parents=True, exist_ok=True)
        data_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
        st.session_state.admin_console_data = normalized
    except Exception as e:
        logger.warning(f"Không thể lưu admin console data: {e}")


def get_admin_console_data() -> dict:
    if "admin_console_data" not in st.session_state:
        st.session_state.admin_console_data = load_admin_console_data()
    return st.session_state.admin_console_data


def append_admin_log(message: str, level: str = "info", category: str = "system"):
    admin_data = get_admin_console_data()
    logs = admin_data.get("system_logs", [])
    logs.append({
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "level": level,
        "category": category,
        "message": message,
    })
    admin_data["system_logs"] = logs[-config.MAX_ADMIN_LOGS:]
    save_admin_console_data(admin_data)


def get_active_end_users() -> List[dict]:
    admin_data = get_admin_console_data()
    return [
        user for user in admin_data.get("users", [])
        if user.get("status") == "active" and not user.get("locked", False)
    ]


def get_current_end_user_email() -> str:
    authenticated_user = get_authenticated_user()
    if authenticated_user:
        current_email = authenticated_user.get("email", config.DEFAULT_END_USER_EMAIL)
        st.session_state.current_end_user_email = current_email
        return current_email

    current_email = st.session_state.get("current_end_user_email", config.DEFAULT_END_USER_EMAIL)
    active_users = get_active_end_users()
    active_emails = {user.get("email") for user in active_users}
    if current_email in active_emails:
        return current_email
    if active_users:
        current_email = active_users[0].get("email", config.DEFAULT_END_USER_EMAIL)
    else:
        current_email = config.DEFAULT_END_USER_EMAIL
    st.session_state.current_end_user_email = current_email
    return current_email


def get_user_label_by_email(email: str) -> str:
    admin_data = get_admin_console_data()
    for user in admin_data.get("users", []):
        if user.get("email") == email:
            return f"{user.get('name', email)} ({email})"
    return email


def record_usage_event(query: str, user_email: str, response_time_ms: int, matches_count: int, intent_name: str = ""):
    admin_data = get_admin_console_data()
    usage_logs = admin_data.get("usage_logs", [])
    usage_logs.append({
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "query": query,
        "user_email": user_email,
        "response_time_ms": response_time_ms,
        "matches_count": matches_count,
        "intent": intent_name,
    })
    admin_data["usage_logs"] = usage_logs[-config.MAX_ADMIN_LOGS:]
    save_admin_console_data(admin_data)


def parse_local_timestamp(timestamp: str) -> Optional[datetime]:
    if not timestamp:
        return None
    for fmt in ("%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(timestamp, fmt)
        except ValueError:
            continue
    return None


def get_admin_dashboard_snapshot() -> dict:
    lookup_backend = _get_lookup_backend()
    admin_data = get_admin_console_data()
    history = st.session_state.get("search_history", [])
    usage_logs = admin_data.get("usage_logs", [])
    today = datetime.now().date()

    active_users = [
        user for user in admin_data.get("users", [])
        if user.get("status") == "active" and not user.get("locked", False)
    ]

    history_today = [
        entry for entry in history
        if parse_local_timestamp(entry.get("timestamp")) and parse_local_timestamp(entry.get("timestamp")).date() == today
    ]
    usage_today = [
        log for log in usage_logs
        if parse_local_timestamp(log.get("timestamp")) and parse_local_timestamp(log.get("timestamp")).date() == today
    ]

    success_count = sum(1 for entry in history if entry.get("matches"))
    total_conversations = len(history)
    computed_accuracy = (success_count / total_conversations * 100) if total_conversations else 0.0
    manual_accuracy = float(admin_data.get("analytics", {}).get("manual_accuracy_rate", 0.0) or 0.0)
    accuracy_rate = manual_accuracy if manual_accuracy > 0 else computed_accuracy

    response_times = [int(log.get("response_time_ms", 0) or 0) for log in usage_logs if log.get("response_time_ms") is not None]
    avg_response_seconds = (sum(response_times) / len(response_times) / 1000) if response_times else 0.0
    manual_response = float(admin_data.get("analytics", {}).get("manual_response_seconds", 0.0) or 0.0)
    if manual_response > 0:
        avg_response_seconds = manual_response

    top_queries = Counter(entry.get("query", "").strip() for entry in history if entry.get("query"))
    top_query_rows = [
        {"Câu hỏi": query, "Số lần": count}
        for query, count in top_queries.most_common(8)
    ]

    recent_usage_rows = [
        {
            "Thời gian": log.get("timestamp", ""),
            "User": log.get("user_email", ""),
            "Query": create_preview_text(log.get("query", ""), 80),
            "Intent": lookup_backend.get_lookup_intent_label(log.get("intent", "")),
            "Phản hồi (ms)": log.get("response_time_ms", 0),
            "Mục khớp": log.get("matches_count", 0),
        }
        for log in reversed(usage_logs[-10:])
    ]

    return {
        "active_users": len(active_users),
        "total_users": len(admin_data.get("users", [])),
        "messages_today": len(history_today),
        "ai_usage_today": len(usage_today),
        "api_cost_today": float(admin_data.get("billing", {}).get("api_cost_today", 0.0) or 0.0),
        "token_usage_today": int(admin_data.get("billing", {}).get("token_usage_today", 0) or 0),
        "total_conversations": total_conversations,
        "accuracy_rate": accuracy_rate,
        "avg_response_seconds": avg_response_seconds,
        "top_queries": top_query_rows,
        "recent_usage_rows": recent_usage_rows,
    }


def format_html_text(text: str) -> str:
    return html.escape("" if text is None else str(text)).replace("\n", "<br>")


def create_preview_text(text: str, limit: int = 240) -> str:
    compact_text = " ".join(text.split())
    if len(compact_text) <= limit:
        return compact_text
    return compact_text[:limit].rstrip() + "..."
