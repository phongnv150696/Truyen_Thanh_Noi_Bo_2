import hashlib
import json
import os
import re
import tempfile
import threading
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from xml.etree import ElementTree as ET

import chromadb
import numpy as np
import ollama
import streamlit as st
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import CrossEncoder, SentenceTransformer
from streamlit.runtime.uploaded_file_manager import UploadedFile

from xiaozhi_backend import config, get_search_history_for_user, logger


try:
    from pyvi.ViTokenizer import tokenize as vi_tokenize
    VI_TOKENIZER_AVAILABLE = True
    logger.info("✅ pyvi đã được load")
except ImportError:
    VI_TOKENIZER_AVAILABLE = False
    vi_tokenize = None
    logger.warning("⚠️ pyvi chưa được cài đặt. Chạy: pip install pyvi")


SYSTEM_PROMPT = """
Bạn là một trợ lý AI tiếng Việt.
Mục tiêu: dùng dữ liệu trong phần "Ngữ cảnh:" để trả lời câu hỏi của người dùng đầy đủ, rõ ràng và hữu ích nhất.

Đầu vào sẽ được truyền theo định dạng:
Ngữ cảnh: <đoạn văn bản trích từ tài liệu>
Câu hỏi: <câu hỏi của người dùng>

Các nguyên tắc khi trả lời:
1. Ưu tiên tối đa thông tin trong Context và tổng hợp nhiều đoạn liên quan để trả lời đầy đủ nhất.
2. Được phép diễn giải, kết nối các ý và trình bày lại cho dễ hiểu, nhưng không được bịa thêm chi tiết trái với Context.
3. Nếu Context chỉ đủ một phần, hãy trả lời phần chắc chắn trước, rồi nói rõ phần nào chưa đủ dữ liệu.
4. Trả lời bằng tiếng Việt, mạch lạc, có cấu trúc, ưu tiên câu trả lời trọn ý thay vì quá ngắn.
5. Nếu câu hỏi mơ hồ, thiếu chủ thể hoặc Context không khớp rõ với câu hỏi, hãy yêu cầu người dùng hỏi lại rõ hơn. Không tự suy đoán để trả lời.
6. Ưu tiên giữ lại đầy đủ tên người, đơn vị, con số, mốc thời gian, định mức, quy định, điều khoản nếu chúng có trong Context.
7. Nếu câu hỏi yêu cầu "đầy đủ", "chi tiết", "toàn bộ", "tất cả" hoặc "liệt kê", hãy tổng hợp tối đa các thông tin liên quan có trong Context thay vì rút gọn.
8. Chỉ dùng tiếng Việt trong câu trả lời. Không dịch câu hỏi sang tiếng Anh và không trả lời bằng tiếng Anh, trừ khi đang trích nguyên văn một cụm từ từ tài liệu.
"""

QUESTION_STOPWORDS = {
    "ai", "gì", "nào", "là", "được", "có", "không", "bao", "nhiêu", "mấy",
    "ở", "đâu", "thế", "vậy", "thì", "và", "của", "trong", "cho", "về",
    "với", "các", "những", "một", "này", "kia", "ấy", "đó", "tôi", "mình",
    "bạn", "họ", "ta", "anh", "chị", "em", "ông", "bà", "việc"
}

DETAIL_QUERY_KEYWORDS = (
    "chi tiết",
    "đầy đủ",
    "toàn bộ",
    "tất cả",
    "liệt kê",
    "cụ thể",
)

FOLLOW_UP_QUERY_KEYWORDS = (
    "vậy còn",
    "thế còn",
    "cái đó",
    "cái này",
    "ý trên",
    "đoạn trên",
    "phần trên",
    "nội dung trên",
    "ở trên",
    "tiếp theo",
)

INTENT_LABELS = {
    "general_lookup": "Tra cứu tổng quát",
    "detailed_lookup": "Tra cứu chi tiết",
    "definition_lookup": "Giải thích khái niệm",
    "document_lookup": "Tra cứu theo tài liệu",
    "follow_up_lookup": "Tra cứu tiếp nối",
    "compare_lookup": "So sánh đối chiếu",
    "summarize_lookup": "Tóm tắt nội dung",
}

DEFINITION_QUERY_KEYWORDS = (
    "là gì",
    "nghĩa là gì",
    "định nghĩa",
    "khái niệm",
    "hiểu là gì",
)

SUMMARY_QUERY_KEYWORDS = (
    "tóm tắt",
    "tóm lược",
    "nói ngắn gọn",
    "rút gọn",
)

COMPARE_QUERY_KEYWORDS = (
    "so sánh",
    "phân biệt",
    "khác nhau",
    "giống nhau",
)

SECTION_REFERENCE_PATTERN = re.compile(
    r"\b(điều|khoản|mục|phần|chương|lời thề|bước|đoạn|phụ lục)\s*(?:số\s*)?(\d{1,4})\b",
    flags=re.IGNORECASE,
)
FILE_REFERENCE_PATTERN = re.compile(r"\b[\w\-]+\.(?:md|docx|pdf|txt)\b", flags=re.IGNORECASE)
TIME_REFERENCE_PATTERN = re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:19|20)\d{2})\b")


def normalize_search_text(text: str) -> str:
    text = re.sub(r"[^\w\s]", " ", text.lower())
    text = text.replace("_", " ")
    return re.sub(r"\s+", " ", text).strip()


def extract_search_tokens(
    text: str,
    stopwords: Optional[Set[str]] = None,
    keep_numeric: bool = True,
    max_items: Optional[int] = None,
) -> List[str]:
    tokens = []
    blocked_tokens = stopwords or set()
    for token in normalize_search_text(text).split():
        if token in blocked_tokens:
            continue
        if not keep_numeric and token.isdigit():
            continue
        if not token.isdigit() and len(token) <= 1:
            continue
        if token not in tokens:
            tokens.append(token)
        if max_items is not None and len(tokens) >= max_items:
            break
    return tokens


def extract_query_keywords(text: str) -> List[str]:
    return extract_search_tokens(text, stopwords=QUESTION_STOPWORDS, keep_numeric=False)


def wants_detailed_answer(query: str) -> bool:
    normalized_query = normalize_search_text(query)
    return any(keyword in normalized_query for keyword in DETAIL_QUERY_KEYWORDS)


def deduplicate_text_items(values: List[str]) -> List[str]:
    unique_values = []
    for value in values:
        normalized_value = " ".join(str(value or "").split()).strip()
        if not normalized_value:
            continue
        if normalized_value not in unique_values:
            unique_values.append(normalized_value)
    return unique_values


def coerce_string_list(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    return deduplicate_text_items([str(item) for item in value if str(item or "").strip()])


def coerce_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def contains_query_phrase(query: str, phrases: Tuple[str, ...]) -> bool:
    normalized_query = normalize_search_text(query)
    return any(normalize_search_text(phrase) in normalized_query for phrase in phrases)


def extract_quoted_phrases(text: str) -> List[str]:
    quoted_phrases = []
    for pattern in (r'"([^"]+)"', r"“([^”]+)”", r"'([^']+)'"):
        quoted_phrases.extend(re.findall(pattern, text))
    return deduplicate_text_items(quoted_phrases)


def extract_query_entities(query: str) -> Dict[str, List[str]]:
    normalized_query = normalize_search_text(query)
    section_refs = [
        f"{match.group(1).lower()} {match.group(2)}"
        for match in SECTION_REFERENCE_PATTERN.finditer(normalized_query)
    ]
    file_refs = [match.group(0).lower() for match in FILE_REFERENCE_PATTERN.finditer(query)]
    quoted_phrases = extract_quoted_phrases(query)
    time_refs = TIME_REFERENCE_PATTERN.findall(query)
    numeric_values = re.findall(r"\b\d{1,4}\b", query)

    return {
        "keywords": extract_query_keywords(query)[:8],
        "section_refs": deduplicate_text_items(section_refs),
        "numeric_values": deduplicate_text_items(numeric_values),
        "time_refs": deduplicate_text_items(time_refs),
        "file_refs": deduplicate_text_items(file_refs),
        "quoted_phrases": quoted_phrases[:4],
    }


def normalize_lookup_analysis_data(analysis: Optional[dict]) -> dict:
    raw_analysis = analysis if isinstance(analysis, dict) else {}
    raw_intent = raw_analysis.get("intent", {})
    raw_entities = raw_analysis.get("entities", {})
    raw_context = raw_analysis.get("context", {})

    recent_turns = []
    if isinstance(raw_context, dict) and isinstance(raw_context.get("recent_turns", []), list):
        for turn in raw_context.get("recent_turns", [])[:3]:
            if not isinstance(turn, dict):
                continue
            recent_turns.append({
                "query": str(turn.get("query", "")).strip(),
                "title": str(turn.get("title", "")).strip(),
                "source": str(turn.get("source", "")).strip(),
            })

    return {
        "intent": {
            "name": str(raw_intent.get("name", "general_lookup")).strip() or "general_lookup",
            "label": str(raw_intent.get("label", "Tra cứu tổng quát")).strip() or "Tra cứu tổng quát",
            "confidence": coerce_float(raw_intent.get("confidence", 0.0), 0.0),
            "reasons": coerce_string_list(raw_intent.get("reasons", []))[:4],
        },
        "entities": {
            "keywords": coerce_string_list(raw_entities.get("keywords", []))[:8],
            "section_refs": coerce_string_list(raw_entities.get("section_refs", []))[:8],
            "numeric_values": coerce_string_list(raw_entities.get("numeric_values", []))[:8],
            "time_refs": coerce_string_list(raw_entities.get("time_refs", []))[:8],
            "file_refs": coerce_string_list(raw_entities.get("file_refs", []))[:6],
            "quoted_phrases": coerce_string_list(raw_entities.get("quoted_phrases", []))[:4],
        },
        "context": {
            "is_follow_up": bool(raw_context.get("is_follow_up", False)) if isinstance(raw_context, dict) else False,
            "resolved_query": str(raw_context.get("resolved_query", "")).strip() if isinstance(raw_context, dict) else "",
            "summary": str(raw_context.get("summary", "")).strip() if isinstance(raw_context, dict) else "",
            "previous_query": str(raw_context.get("previous_query", "")).strip() if isinstance(raw_context, dict) else "",
            "previous_title": str(raw_context.get("previous_title", "")).strip() if isinstance(raw_context, dict) else "",
            "previous_source": str(raw_context.get("previous_source", "")).strip() if isinstance(raw_context, dict) else "",
            "recent_turns": recent_turns,
        },
    }


def normalize_lookup_fulfillment_data(fulfillment: Optional[dict]) -> dict:
    raw_fulfillment = fulfillment if isinstance(fulfillment, dict) else {}
    return {
        "mode": str(raw_fulfillment.get("mode", "")).strip(),
        "strategy": str(raw_fulfillment.get("strategy", "")).strip(),
        "query_used": str(raw_fulfillment.get("query_used", "")).strip(),
        "show_related": bool(raw_fulfillment.get("show_related", False)),
        "matches_count": coerce_int(raw_fulfillment.get("matches_count", 0), 0),
        "message": str(raw_fulfillment.get("message", "")).strip(),
    }


def detect_query_intent(query: str, entities: dict, history: Optional[List[dict]] = None) -> dict:
    recent_history = history or []
    has_recent_turn = bool(recent_history)
    short_query = len(extract_query_keywords(query)) <= 3
    has_section_reference = bool(entities.get("section_refs"))
    has_file_reference = bool(entities.get("file_refs"))

    if contains_query_phrase(query, FOLLOW_UP_QUERY_KEYWORDS) and has_recent_turn:
        return {
            "name": "follow_up_lookup",
            "label": "Tra cứu tiếp nối",
            "confidence": 0.94,
            "reasons": ["Có dấu hiệu hỏi tiếp theo", "Đã có lịch sử hội thoại để kế thừa"],
        }
    if short_query and has_recent_turn and has_section_reference and len(entities.get("keywords", [])) <= 2:
        return {
            "name": "follow_up_lookup",
            "label": "Tra cứu tiếp nối",
            "confidence": 0.82,
            "reasons": ["Truy vấn ngắn", "Có thực thể tham chiếu cần kế thừa ngữ cảnh"],
        }
    if contains_query_phrase(query, COMPARE_QUERY_KEYWORDS):
        return {
            "name": "compare_lookup",
            "label": "So sánh đối chiếu",
            "confidence": 0.88,
            "reasons": ["Phát hiện từ khóa so sánh hoặc phân biệt"],
        }
    if contains_query_phrase(query, SUMMARY_QUERY_KEYWORDS):
        return {
            "name": "summarize_lookup",
            "label": "Tóm tắt nội dung",
            "confidence": 0.84,
            "reasons": ["Phát hiện yêu cầu tóm tắt hoặc rút gọn"],
        }
    if contains_query_phrase(query, DEFINITION_QUERY_KEYWORDS):
        return {
            "name": "definition_lookup",
            "label": "Giải thích khái niệm",
            "confidence": 0.86,
            "reasons": ["Phát hiện mẫu hỏi định nghĩa hoặc ý nghĩa"],
        }
    if has_file_reference:
        return {
            "name": "document_lookup",
            "label": "Tra cứu theo tài liệu",
            "confidence": 0.9,
            "reasons": ["Có tham chiếu trực tiếp tới tên file hoặc tài liệu"],
        }
    if wants_detailed_answer(query) or len(entities.get("section_refs", [])) > 1:
        return {
            "name": "detailed_lookup",
            "label": "Tra cứu chi tiết",
            "confidence": 0.83,
            "reasons": ["Có yêu cầu đầy đủ hoặc nhiều thực thể cần tổng hợp"],
        }
    return {
        "name": "general_lookup",
        "label": "Tra cứu tổng quát",
        "confidence": 0.78,
        "reasons": ["Không phát hiện mẫu intent chuyên biệt, dùng tra cứu mặc định"],
    }


def get_lookup_intent_label(intent_name: str) -> str:
    return INTENT_LABELS.get(str(intent_name or "").strip(), "Tra cứu tổng quát")


def build_query_context(query: str, user_email: str, intent: dict, entities: dict, history: Optional[List[dict]] = None) -> dict:
    recent_history = history if history is not None else get_search_history_for_user(user_email)
    recent_entries = recent_history[-2:]
    previous_entry = recent_entries[-1] if recent_entries else {}
    previous_query = str(previous_entry.get("query", "")).strip() if previous_entry else ""
    previous_match = previous_entry.get("matches", [{}])[0] if previous_entry and previous_entry.get("matches") else {}
    previous_title = str(previous_match.get("title", "")).strip()
    previous_source = str(previous_match.get("source", "")).strip()
    previous_source_stem = Path(previous_source).stem if previous_source else ""

    is_follow_up = intent.get("name") == "follow_up_lookup"
    resolved_parts = [query]
    if is_follow_up:
        resolved_parts.extend([previous_query, previous_title, previous_source_stem])
    for file_ref in entities.get("file_refs", []):
        resolved_parts.append(Path(file_ref).stem)

    resolved_query = " ".join(deduplicate_text_items(resolved_parts))
    if not resolved_query:
        resolved_query = query

    if is_follow_up and previous_query:
        summary = "Kế thừa câu hỏi trước và mục vừa tra cứu để mở rộng truy vấn."
    elif recent_entries:
        summary = f"Có {len(recent_entries)} lượt tra cứu gần nhất trong cùng phiên người dùng."
    else:
        summary = "Truy vấn độc lập, chưa cần dùng lịch sử hội thoại."

    recent_turns = []
    for entry in recent_entries:
        primary_match = entry.get("matches", [{}])[0] if entry.get("matches") else {}
        recent_turns.append({
            "query": str(entry.get("query", "")).strip(),
            "title": str(primary_match.get("title", "")).strip(),
            "source": str(primary_match.get("source", "")).strip(),
        })

    return {
        "is_follow_up": is_follow_up,
        "resolved_query": resolved_query,
        "summary": summary,
        "previous_query": previous_query,
        "previous_title": previous_title,
        "previous_source": previous_source,
        "recent_turns": recent_turns,
    }


def analyze_lookup_query(query: str, user_email: str) -> dict:
    history = get_search_history_for_user(user_email)
    entities = extract_query_entities(query)
    intent = detect_query_intent(query, entities, history)
    context = build_query_context(query, user_email, intent, entities, history)
    return normalize_lookup_analysis_data({
        "intent": intent,
        "entities": entities,
        "context": context,
    })


def build_not_found_message(analysis: Optional[dict]) -> str:
    normalized_analysis = normalize_lookup_analysis_data(analysis)
    section_refs = normalized_analysis["entities"].get("section_refs", [])
    file_refs = normalized_analysis["entities"].get("file_refs", [])
    if section_refs:
        return f"Không tìm thấy nội dung khớp với {', '.join(section_refs[:3])} trong `datahoc`. Hãy nêu rõ thêm tên tài liệu hoặc chủ đề."
    if file_refs:
        return f"Không tìm thấy nội dung phù hợp trong tài liệu {', '.join(file_refs[:2])}. Hãy kiểm tra lại tên file hoặc từ khóa."
    if normalized_analysis["context"].get("is_follow_up"):
        return "Không tìm thấy nội dung phù hợp sau khi kết hợp ngữ cảnh trước đó. Hãy nêu rõ lại tên mục hoặc tài liệu."
    return "Không tìm thấy nội dung phù hợp trong `datahoc`. Hãy đổi từ khóa hoặc hỏi cụ thể hơn."


def fulfill_lookup_query(query: str, analysis: Optional[dict] = None, force_show_related: Optional[bool] = None) -> dict:
    normalized_analysis = normalize_lookup_analysis_data(analysis)
    intent_name = normalized_analysis["intent"].get("name", "general_lookup")
    if force_show_related is None:
        show_related = intent_name in {
            "detailed_lookup",
            "compare_lookup",
            "summarize_lookup",
            "follow_up_lookup",
        }
    else:
        show_related = force_show_related

    search_query = normalized_analysis["context"].get("resolved_query") or query
    matches = search_datahoc(search_query, exhaustive_mode=show_related, analysis=normalized_analysis)
    message = "" if matches else build_not_found_message(normalized_analysis)
    strategy_map = {
        "follow_up_lookup": "lookup_with_history_context",
        "compare_lookup": "lookup_with_broader_result_set",
        "summarize_lookup": "lookup_with_broader_result_set",
        "detailed_lookup": "lookup_with_broader_result_set",
        "document_lookup": "lookup_prioritize_document_reference",
        "definition_lookup": "lookup_best_matching_section",
        "general_lookup": "lookup_best_matching_section",
    }

    fulfillment = normalize_lookup_fulfillment_data({
        "mode": "multi_result" if show_related else "single_result",
        "strategy": strategy_map.get(intent_name, "lookup_best_matching_section"),
        "query_used": search_query,
        "show_related": show_related,
        "matches_count": len(matches),
        "message": message,
    })
    return {
        "matches": matches,
        "message": message,
        "show_related": show_related,
        "analysis": normalized_analysis,
        "fulfillment": fulfillment,
    }


def strip_yaml_frontmatter(text: str) -> str:
    return re.sub(r"^---\s*\n.*?\n---\s*\n?", "", text, flags=re.DOTALL).strip()


def validate_user_query(query: str) -> Tuple[bool, str]:
    normalized_words = normalize_search_text(query).split()
    keywords = extract_query_keywords(query)

    if not normalized_words:
        return False, "Vui lòng nhập câu hỏi."

    if len(query.strip()) < 3 or not keywords:
        return False, "Câu hỏi đang quá ngắn. Hãy nhập từ khóa rõ hơn để tra cứu trong `datahoc`."

    return True, ""


def get_datahoc_markdown_files() -> List[Path]:
    base_dir = Path(config.MARKDOWN_SOURCE_DIR).resolve()
    if not base_dir.exists():
        return []

    markdown_files = [
        path for path in base_dir.rglob("*.md")
        if not any(part in config.MARKDOWN_EXCLUDE_DIRS for part in path.parts)
    ]
    return sorted(markdown_files, key=lambda path: path.name.lower())


def get_datahoc_stats() -> dict:
    datahoc_index = get_datahoc_index()
    return {"total_files": len(datahoc_index.get("documents", []))}


def get_datahoc_documents() -> List[dict]:
    datahoc_index = get_datahoc_index()
    return list(datahoc_index.get("documents", []))


def split_markdown_sections(text: str, fallback_title: str) -> List[dict]:
    sections = []
    current_title = fallback_title
    current_lines: List[str] = []

    for line in text.splitlines():
        if re.match(r"^#{1,6}\s+", line):
            if current_lines:
                content = "\n".join(current_lines).strip()
                if content:
                    sections.append({"title": current_title, "content": content})
            current_title = re.sub(r"^#{1,6}\s+", "", line).strip() or fallback_title
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            sections.append({"title": current_title, "content": content})

    return sections


def get_datahoc_file_signatures() -> Tuple[Tuple[str, int, int], ...]:
    signatures = []
    for file_path in get_datahoc_markdown_files():
        try:
            file_stat = file_path.stat()
        except OSError:
            continue
        signatures.append((str(file_path.resolve()), int(file_stat.st_mtime_ns), int(file_stat.st_size)))
    return tuple(signatures)


def build_markdown_corpus_signature(file_signatures: Tuple[Tuple[str, int, int], ...]) -> str:
    digest = hashlib.sha256()
    for path_text, modified_at_ns, file_size in file_signatures:
        digest.update(path_text.encode("utf-8"))
        digest.update(b"|")
        digest.update(str(modified_at_ns).encode("utf-8"))
        digest.update(b"|")
        digest.update(str(file_size).encode("utf-8"))
        digest.update(b"\n")
    return digest.hexdigest()


def get_vector_sync_state_path() -> Path:
    return Path(config.VECTOR_SYNC_STATE_FILE).resolve()


def load_vector_sync_state() -> dict:
    state_path = get_vector_sync_state_path()
    if not state_path.exists():
        return {}

    try:
        raw_state = json.loads(state_path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    if not isinstance(raw_state, dict):
        return {}
    return {
        "corpus_signature": str(raw_state.get("corpus_signature", "")).strip(),
    }


def save_vector_sync_state(corpus_signature: str):
    state_path = get_vector_sync_state_path()
    try:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"corpus_signature": str(corpus_signature or "").strip()}
        state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        logger.warning(f"Không thể lưu trạng thái đồng bộ vector: {e}")


def clear_vector_sync_state():
    state_path = get_vector_sync_state_path()
    try:
        if state_path.exists():
            state_path.unlink()
    except Exception as e:
        logger.warning(f"Không thể xóa trạng thái đồng bộ vector: {e}")


def mark_vector_index_stale():
    st.session_state.datahoc_synced = False
    clear_vector_sync_state()
    get_vector_ingested_paths_snapshot.clear()


@st.cache_data(show_spinner=False)
def build_cached_datahoc_index(file_signatures: Tuple[Tuple[str, int, int], ...]) -> dict:
    sections: List[dict] = []
    documents: List[dict] = []
    sections_by_source: Dict[str, List[int]] = {}
    sections_by_path: Dict[str, List[int]] = {}

    for path_text, _, _ in file_signatures:
        file_path = Path(path_text)
        try:
            content = strip_yaml_frontmatter(file_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Không thể đọc file {file_path}: {e}")
            continue

        if not content:
            continue

        raw_sections = split_markdown_sections(content, file_path.stem)
        if not raw_sections:
            raw_sections = [{"title": file_path.stem, "content": content}]

        document_title = file_path.name
        for section in raw_sections:
            candidate_title = str(section.get("title", "")).strip()
            if candidate_title:
                document_title = candidate_title
                break

        documents.append({
            "source": file_path.name,
            "title": document_title,
            "path": path_text,
        })

        for section_index, section in enumerate(raw_sections):
            title = str(section.get("title", file_path.stem)).strip() or file_path.stem
            section_content = str(section.get("content", "")).strip()
            combined_text = f"{title}\n{section_content}".strip()
            normalized_section = normalize_search_text(combined_text)
            if not normalized_section:
                continue

            token_set = tuple(
                extract_search_tokens(
                    combined_text,
                    stopwords=QUESTION_STOPWORDS,
                    keep_numeric=True,
                    max_items=config.LEXICAL_INDEX_MAX_TOKENS,
                )
            )
            indexed_section = {
                "id": f"{path_text}::{section_index}",
                "source": file_path.name,
                "title": title,
                "content": section_content,
                "path": path_text,
                "normalized_section": normalized_section,
                "normalized_title": normalize_search_text(title),
                "normalized_source": normalize_search_text(file_path.name),
                "normalized_file_stem": normalize_search_text(file_path.stem),
                "token_set": token_set,
            }
            indexed_position = len(sections)
            sections.append(indexed_section)
            sections_by_source.setdefault(file_path.name, []).append(indexed_position)
            sections_by_path.setdefault(path_text, []).append(indexed_position)

    documents.sort(key=lambda item: (item["source"].lower(), item["title"].lower()))
    return {
        "sections": sections,
        "documents": documents,
        "sections_by_source": sections_by_source,
        "sections_by_path": sections_by_path,
        "corpus_signature": build_markdown_corpus_signature(file_signatures),
    }


def get_datahoc_index() -> dict:
    return build_cached_datahoc_index(get_datahoc_file_signatures())


@st.cache_data(show_spinner=False, ttl=45)
def get_vector_ingested_paths_snapshot(chroma_path: str, collection_name: str) -> Tuple[str, ...]:
    _ = chroma_path, collection_name
    return tuple(sorted(chroma_manager.get_ingested_paths()))


def is_vector_index_current(datahoc_index: dict) -> bool:
    current_paths = set(datahoc_index.get("sections_by_path", {}).keys())
    if not current_paths:
        return False

    sync_state = load_vector_sync_state()
    current_signature = str(datahoc_index.get("corpus_signature", "")).strip()
    if not current_signature or sync_state.get("corpus_signature") != current_signature:
        return False

    ingested_paths = set(get_vector_ingested_paths_snapshot(config.CHROMA_PATH, config.COLLECTION_NAME))
    return bool(ingested_paths) and current_paths.issubset(ingested_paths)


def build_lookup_search_context(query: str, normalized_analysis: dict) -> dict:
    return {
        "keywords": extract_query_keywords(query),
        "normalized_query": normalize_search_text(query),
        "entity_file_refs": [normalize_search_text(Path(file_ref).stem) for file_ref in normalized_analysis["entities"].get("file_refs", [])],
        "entity_section_refs": [normalize_search_text(section_ref) for section_ref in normalized_analysis["entities"].get("section_refs", [])],
        "entity_time_refs": [normalize_search_text(time_ref) for time_ref in normalized_analysis["entities"].get("time_refs", [])],
        "entity_quoted_phrases": [normalize_search_text(phrase) for phrase in normalized_analysis["entities"].get("quoted_phrases", [])],
        "entity_numeric_values": [normalize_search_text(number) for number in normalized_analysis["entities"].get("numeric_values", [])],
        "previous_title": normalize_search_text(normalized_analysis["context"].get("previous_title", "")),
        "previous_source": normalize_search_text(normalized_analysis["context"].get("previous_source", "")),
    }


def score_indexed_section(section: dict, search_context: dict, normalized_analysis: dict) -> dict:
    keywords = search_context["keywords"]
    normalized_query = search_context["normalized_query"]
    normalized_section = section["normalized_section"]
    title_text = section["normalized_title"]
    source_text = section["normalized_source"]
    file_stem = section["normalized_file_stem"]

    keyword_hits = sum(1 for keyword in keywords if keyword in normalized_section)
    title_hits = sum(1 for keyword in keywords if keyword in title_text)
    exact_phrase_hit = 1 if normalized_query and normalized_query in normalized_section else 0
    file_ref_hits = sum(
        1
        for file_ref in search_context["entity_file_refs"]
        if file_ref and (file_ref in source_text or file_ref in title_text or file_ref in file_stem)
    )
    section_ref_hits = sum(
        1
        for section_ref in search_context["entity_section_refs"]
        if section_ref and (section_ref in normalized_section or section_ref in title_text)
    )
    time_ref_hits = sum(1 for time_ref in search_context["entity_time_refs"] if time_ref and time_ref in normalized_section)
    quoted_phrase_hits = sum(
        1
        for quoted_phrase in search_context["entity_quoted_phrases"]
        if quoted_phrase and quoted_phrase in normalized_section
    )
    numeric_value_hits = sum(
        1
        for number in search_context["entity_numeric_values"]
        if number and number in normalized_section
    )
    token_set = set(section.get("token_set", ()))
    query_token_overlap = (
        len(token_set.intersection(search_context["keywords"])) / max(len(search_context["keywords"]), 1)
        if search_context["keywords"]
        else 0.0
    )
    context_hits = 0
    if normalized_analysis["context"].get("is_follow_up"):
        if search_context["previous_title"] and search_context["previous_title"] in title_text:
            context_hits += 2
        if search_context["previous_source"] and search_context["previous_source"] in source_text:
            context_hits += 2

    lexical_score = (
        keyword_hits
        + title_hits * 2
        + exact_phrase_hit * 3
        + file_ref_hits * 4
        + section_ref_hits * 3
        + quoted_phrase_hits * 3
        + time_ref_hits * 2
        + numeric_value_hits
        + context_hits
        + query_token_overlap
    )
    return {
        "id": section["id"],
        "source": section["source"],
        "title": section["title"],
        "content": section["content"],
        "path": section["path"],
        "score": round(float(lexical_score), 2),
        "lexical_score": round(float(lexical_score), 2),
        "exact_phrase_hit": exact_phrase_hit,
        "file_ref_hits": file_ref_hits,
        "section_ref_hits": section_ref_hits,
        "quoted_phrase_hits": quoted_phrase_hits,
    }


def is_strong_lexical_match(match: Optional[dict]) -> bool:
    if not match:
        return False
    return bool(
        match.get("exact_phrase_hit")
        or match.get("file_ref_hits")
        or match.get("section_ref_hits")
        or match.get("quoted_phrase_hits")
        or float(match.get("lexical_score", 0.0) or 0.0) >= config.HYBRID_SKIP_VECTOR_SCORE
    )


def should_run_semantic_retrieval(normalized_analysis: dict, lexical_matches: List[dict], exhaustive_mode: bool, datahoc_index: dict) -> bool:
    if not is_vector_index_current(datahoc_index):
        return False

    intent_name = normalized_analysis["intent"].get("name", "general_lookup")
    if exhaustive_mode or intent_name in {"detailed_lookup", "compare_lookup", "summarize_lookup", "follow_up_lookup"}:
        return True

    top_match = lexical_matches[0] if lexical_matches else None
    has_structured_refs = any(
        normalized_analysis["entities"].get(key)
        for key in ("file_refs", "section_refs", "quoted_phrases", "numeric_values", "time_refs")
    )
    if top_match and has_structured_refs and is_strong_lexical_match(top_match):
        return False
    if top_match and float(top_match.get("lexical_score", 0.0) or 0.0) >= config.HYBRID_SKIP_VECTOR_SCORE:
        return False
    return True


def resolve_vector_candidate_sections(document: str, metadata: dict, datahoc_index: dict) -> List[Tuple[str, float]]:
    metadata = metadata or {}
    metadata_path = str(metadata.get("path") or metadata.get("markdown_path") or "").strip()
    if metadata_path:
        try:
            metadata_path = str(Path(metadata_path).resolve())
        except Exception:
            metadata_path = str(metadata.get("path") or metadata.get("markdown_path") or "").strip()
    metadata_source = str(metadata.get("source", "")).strip()

    candidate_indices = []
    if metadata_path:
        candidate_indices.extend(datahoc_index.get("sections_by_path", {}).get(metadata_path, []))
    if metadata_source and not candidate_indices:
        candidate_indices.extend(datahoc_index.get("sections_by_source", {}).get(metadata_source, []))
    if not candidate_indices:
        return []

    cleaned_document = strip_yaml_frontmatter(document)
    normalized_document = normalize_search_text(cleaned_document)
    chunk_tokens = set(
        extract_search_tokens(
            cleaned_document,
            stopwords=QUESTION_STOPWORDS,
            keep_numeric=True,
            max_items=config.LEXICAL_INDEX_MAX_TOKENS,
        )
    )
    candidate_scores = []
    for candidate_index in candidate_indices:
        section = datahoc_index["sections"][candidate_index]
        section_tokens = set(section.get("token_set", ()))
        token_overlap = len(chunk_tokens.intersection(section_tokens)) / max(len(chunk_tokens), 1) if chunk_tokens else 0.0
        substring_hit = 1.0 if normalized_document and normalized_document[:260] in section["normalized_section"] else 0.0
        title_hit = 0.35 if section["normalized_title"] and section["normalized_title"] in normalized_document else 0.0
        combined_score = token_overlap + substring_hit + title_hit
        if substring_hit or combined_score >= config.HYBRID_MIN_SECTION_OVERLAP:
            candidate_scores.append((section["id"], combined_score))

    candidate_scores.sort(key=lambda item: item[1], reverse=True)
    return candidate_scores[:config.HYBRID_VECTOR_SECTION_MATCHES]


def build_semantic_boosts(query: str, datahoc_index: dict, exhaustive_mode: bool = False) -> Dict[str, float]:
    n_results = config.HYBRID_VECTOR_RESULTS_DETAILED if exhaustive_mode else config.HYBRID_VECTOR_RESULTS
    vector_results = query_vector_store(query, n_results=n_results)
    if not vector_results:
        return {}

    raw_documents = vector_results.get("documents", [[]])
    documents = raw_documents[0] if raw_documents else []
    raw_metadatas = vector_results.get("metadatas", [[]])
    metadatas = raw_metadatas[0] if raw_metadatas else []
    raw_distances = vector_results.get("distances", [[]])
    distances = raw_distances[0] if raw_distances else []
    current_paths = set(datahoc_index.get("sections_by_path", {}).keys())
    boosts: Dict[str, float] = {}

    for rank, document in enumerate(documents):
        metadata = metadatas[rank] if rank < len(metadatas) and isinstance(metadatas[rank], dict) else {}
        metadata_path = str(metadata.get("path") or metadata.get("markdown_path") or "").strip()
        if metadata_path:
            try:
                metadata_path = str(Path(metadata_path).resolve())
            except Exception:
                metadata_path = str(metadata.get("path") or metadata.get("markdown_path") or "").strip()
        if metadata_path and metadata_path not in current_paths:
            continue

        distance = float(distances[rank]) if rank < len(distances) and distances[rank] is not None else 1.0
        similarity = max(0.0, 1.0 - distance)
        rank_weight = max(n_results - rank, 1) / max(n_results, 1)
        for section_id, overlap_score in resolve_vector_candidate_sections(document, metadata, datahoc_index):
            semantic_boost = round((rank_weight + similarity + overlap_score) * config.HYBRID_SEMANTIC_BOOST, 2)
            boosts[section_id] = max(boosts.get(section_id, 0.0), semantic_boost)
    return boosts


def rerank_match_candidates(matches: List[dict], query: str, exhaustive_mode: bool = False) -> List[dict]:
    if len(matches) <= 1:
        return matches

    candidate_limit = config.HYBRID_CANDIDATE_POOL_DETAILED if exhaustive_mode else config.HYBRID_CANDIDATE_POOL
    working_matches = matches[:candidate_limit]
    remaining_matches = matches[candidate_limit:]
    if len(working_matches) <= 1:
        return matches

    if not model_manager.is_cross_encoder_ready:
        model_manager.initialize_cross_encoder_async()
        return matches

    try:
        pairs = [[query, f"{match['title']}\n{match['content']}"] for match in working_matches]
        cross_scores = model_manager.cross_encoder.predict(pairs)
        ranked_indices = np.argsort(cross_scores)[::-1]
        reranked_matches = []
        for rank, idx in enumerate(ranked_indices):
            idx = int(idx)
            reranked_match = dict(working_matches[idx])
            reranked_match["cross_score"] = float(cross_scores[idx])
            reranked_match["score"] = round(
                float(reranked_match.get("score", 0.0) or 0.0)
                + max(float(cross_scores[idx]), 0.0) * 2.5
                + max(len(working_matches) - rank, 1) * 0.05,
                2,
            )
            reranked_matches.append(reranked_match)
        return reranked_matches + remaining_matches
    except Exception as e:
        logger.error(f"Lỗi khi re-rank match candidates: {e}", exc_info=True)
        return matches


def search_datahoc(query: str, exhaustive_mode: bool = False, analysis: Optional[dict] = None) -> List[dict]:
    normalized_analysis = normalize_lookup_analysis_data(analysis)
    datahoc_index = get_datahoc_index()
    indexed_sections = datahoc_index.get("sections", [])
    if not indexed_sections:
        return []

    search_context = build_lookup_search_context(query, normalized_analysis)
    lexical_candidates = [
        score_indexed_section(section, search_context, normalized_analysis)
        for section in indexed_sections
    ]
    lexical_candidates.sort(key=lambda item: (-item["lexical_score"], item["source"].lower(), item["title"].lower()))
    positive_lexical_matches = [match for match in lexical_candidates if float(match.get("lexical_score", 0.0) or 0.0) > 0]

    run_semantic = should_run_semantic_retrieval(
        normalized_analysis,
        positive_lexical_matches,
        exhaustive_mode,
        datahoc_index,
    )
    semantic_boosts = build_semantic_boosts(query, datahoc_index, exhaustive_mode=exhaustive_mode) if run_semantic else {}

    fused_matches = []
    for lexical_match in lexical_candidates:
        semantic_score = float(semantic_boosts.get(lexical_match["id"], 0.0) or 0.0)
        lexical_score = float(lexical_match.get("lexical_score", 0.0) or 0.0)
        if lexical_score <= 0 and semantic_score <= 0:
            continue

        fused_match = dict(lexical_match)
        fused_match["semantic_score"] = round(semantic_score, 2)
        fused_match["score"] = round(lexical_score + semantic_score, 2)
        fused_matches.append(fused_match)

    if not fused_matches:
        return []

    fused_matches.sort(
        key=lambda item: (-item["score"], -item.get("lexical_score", 0.0), item["source"].lower(), item["title"].lower())
    )
    should_rerank = len(fused_matches) > 1 and (
        run_semantic
        or exhaustive_mode
        or not is_strong_lexical_match(fused_matches[0])
    )
    if should_rerank:
        fused_matches = rerank_match_candidates(fused_matches, query, exhaustive_mode=exhaustive_mode)

    max_results = config.DIRECT_LOOKUP_RESULTS_DETAILED if exhaustive_mode else config.DIRECT_LOOKUP_RESULTS
    return fused_matches[:max_results]


def filter_retrieved_documents(query: str, results: dict) -> Tuple[List[str], List[dict], str]:
    raw_documents = results.get("documents", [[]])
    documents = raw_documents[0] if raw_documents else []
    raw_metadatas = results.get("metadatas", [[]])
    metadatas = raw_metadatas[0] if raw_metadatas else []

    if not documents:
        return [], [], "Không tìm thấy thông tin liên quan trong tài liệu."

    keywords = extract_query_keywords(query)
    candidates = []

    for idx, document in enumerate(documents):
        cleaned_document = strip_yaml_frontmatter(document)
        normalized_document = normalize_search_text(cleaned_document)
        keyword_hits = sum(1 for keyword in keywords if keyword in normalized_document)
        candidates.append(
            (
                keyword_hits,
                cleaned_document,
                metadatas[idx] if idx < len(metadatas) and metadatas[idx] else {}
            )
        )

    matched_candidates = [candidate for candidate in candidates if candidate[0] > 0]
    if not matched_candidates:
        return [], [], "Không tìm thấy đoạn tài liệu đủ sát với câu hỏi. Hãy hỏi rõ hơn bằng từ khóa cụ thể."

    matched_candidates.sort(key=lambda item: item[0], reverse=True)
    filtered_documents = [item[1] for item in matched_candidates]
    filtered_metadatas = [item[2] for item in matched_candidates]
    return filtered_documents, filtered_metadatas, ""


class ModelManager:
    _instance: Optional['ModelManager'] = None
    _embedding_model: Optional[SentenceTransformer] = None
    _cross_encoder: Optional[CrossEncoder] = None
    _embedding_ready: bool = False
    _cross_encoder_ready: bool = False
    _cross_encoder_loading: bool = False
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _detect_device(self) -> str:
        import torch
        if torch.cuda.is_available():
            logger.info("🚀 Sử dụng GPU (CUDA)")
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("🍎 Phát hiện MPS nhưng dùng CPU cho ổn định")
            return "cpu"
        logger.info("💻 Sử dụng CPU")
        return "cpu"

    def _initialize_embedding(self) -> Tuple[bool, str]:
        if self._embedding_ready:
            return True, "Embedding model đã sẵn sàng"

        with self._lock:
            if self._embedding_ready:
                return True, "Embedding model đã sẵn sàng"

            try:
                os.environ['TRANSFORMERS_OFFLINE'] = '0'
                device = self._detect_device()
                logger.info(f"Đang load embedding model trên {device}...")
                try:
                    self._embedding_model = SentenceTransformer(
                        config.EMBEDDING_MODEL_ID,
                        device=device,
                        trust_remote_code=True
                    )
                except Exception as e:
                    logger.warning(f"Thử phương án dự phòng load embedding: {e}")
                    self._embedding_model = SentenceTransformer(
                        config.EMBEDDING_MODEL_ID,
                        trust_remote_code=True
                    )
                    self._embedding_model = self._embedding_model.to(device)

                self._embedding_ready = True
                logger.info(f"✅ Embedding model đã sẵn sàng trên {device}")
                return True, f"Embedding model đã sẵn sàng ({device.upper()})"
            except Exception as e:
                error_msg = f"Lỗi khi load embedding model: {str(e)}"
                logger.error(error_msg, exc_info=True)
                return False, error_msg

    def _initialize_cross_encoder(self) -> Tuple[bool, str]:
        if self._cross_encoder_ready:
            return True, "Cross encoder đã sẵn sàng"

        with self._lock:
            if self._cross_encoder_ready:
                return True, "Cross encoder đã sẵn sàng"

            try:
                device = self._detect_device()
                logger.info("Đang load cross encoder...")
                try:
                    self._cross_encoder = CrossEncoder(
                        config.CROSS_ENCODER_ID,
                        device=device
                    )
                except Exception as e:
                    logger.warning(f"Thử phương án dự phòng cross encoder: {e}")
                    self._cross_encoder = CrossEncoder(config.CROSS_ENCODER_ID)

                self._cross_encoder_ready = True
                logger.info("✅ Cross encoder đã sẵn sàng")
                return True, "Cross encoder đã sẵn sàng"
            except Exception as e:
                error_msg = f"Lỗi khi load cross encoder: {str(e)}"
                logger.error(error_msg, exc_info=True)
                return False, error_msg

    def initialize(self, fast_mode: bool = True) -> Tuple[bool, str]:
        embedding_ok, embedding_msg = self._initialize_embedding()
        if not embedding_ok:
            return False, embedding_msg

        if fast_mode:
            self.initialize_cross_encoder_async()
            return True, "Khởi tạo nhanh hoàn tất (embedding ready, cross encoder đang load nền)"

        cross_ok, cross_msg = self._initialize_cross_encoder()
        if not cross_ok:
            return False, cross_msg

        return True, "Tất cả models đã sẵn sàng"

    def initialize_cross_encoder_async(self):
        if self._cross_encoder_ready or self._cross_encoder_loading:
            return

        self._cross_encoder_loading = True

        def _load():
            try:
                self._initialize_cross_encoder()
            finally:
                self._cross_encoder_loading = False

        threading.Thread(target=_load, daemon=True).start()

    @property
    def embedding_model(self) -> SentenceTransformer:
        if not self._embedding_ready:
            raise RuntimeError("Embedding model chưa được khởi tạo.")
        return self._embedding_model

    @property
    def cross_encoder(self) -> CrossEncoder:
        if not self._cross_encoder_ready:
            raise RuntimeError("Cross encoder chưa được khởi tạo.")
        return self._cross_encoder

    @property
    def is_ready(self) -> bool:
        return self._embedding_ready

    @property
    def is_cross_encoder_ready(self) -> bool:
        return self._cross_encoder_ready

    @property
    def is_cross_encoder_loading(self) -> bool:
        return self._cross_encoder_loading


model_manager = ModelManager()


def ensure_models_ready() -> Tuple[bool, str]:
    if model_manager.is_ready:
        return True, "Models đã sẵn sàng"
    return model_manager.initialize(fast_mode=True)


class ChromaDBManager:
    _instance: Optional['ChromaDBManager'] = None
    _client: Optional[chromadb.PersistentClient] = None
    _collection: Optional[chromadb.Collection] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> chromadb.PersistentClient:
        if self._client is None:
            Path(config.CHROMA_PATH).mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=config.CHROMA_PATH)
            logger.info(f"ChromaDB client khởi tạo tại {config.CHROMA_PATH}")
        return self._client

    def get_collection(self) -> chromadb.Collection:
        if self._collection is None:
            client = self.get_client()
            self._collection = client.get_or_create_collection(
                name=config.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"Collection '{config.COLLECTION_NAME}' đã sẵn sàng")
        return self._collection

    def reset_collection(self):
        try:
            client = self.get_client()
            client.delete_collection(name=config.COLLECTION_NAME)
            self._collection = None
            clear_vector_sync_state()
            get_vector_ingested_paths_snapshot.clear()
            st.session_state.datahoc_synced = False
            logger.info(f"Collection '{config.COLLECTION_NAME}' đã được reset")
            return True, "Vector store đã được xóa thành công"
        except Exception as e:
            error_msg = f"Lỗi khi reset collection: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

    def get_stats(self) -> dict:
        try:
            collection = self.get_collection()
            count = collection.count()
            return {"total_chunks": count}
        except Exception as e:
            logger.error(f"Lỗi khi lấy stats: {e}")
            return {"total_chunks": 0}

    def get_ingested_documents(self) -> List[dict]:
        try:
            collection = self.get_collection()
            count = collection.count()
            if count == 0:
                return []

            results = collection.get(include=["metadatas"])
            metadatas = results.get("metadatas", [])
            grouped = {}

            for metadata in metadatas:
                if not metadata:
                    continue

                source = metadata.get("source") or metadata.get("path") or "Không rõ nguồn"
                if source not in grouped:
                    grouped[source] = {
                        "source": source,
                        "file_type": metadata.get("file_type", "unknown"),
                        "chunks": 0,
                        "path": metadata.get("path") or metadata.get("markdown_path") or ""
                    }
                grouped[source]["chunks"] += 1

            documents = list(grouped.values())
            documents.sort(key=lambda item: (-item["chunks"], item["source"].lower()))
            return documents
        except Exception as e:
            logger.error(f"Lỗi khi lấy danh sách tài liệu đã nạp: {e}", exc_info=True)
            return []

    def get_ingested_paths(self) -> Set[str]:
        try:
            collection = self.get_collection()
            count = collection.count()
            if count == 0:
                return set()

            results = collection.get(include=["metadatas"])
            metadatas = results.get("metadatas", [])
            ingested_paths = set()

            for metadata in metadatas:
                if not metadata:
                    continue

                path = metadata.get("path") or metadata.get("markdown_path")
                if path:
                    ingested_paths.add(str(Path(path).resolve()))

            return ingested_paths
        except Exception as e:
            logger.error(f"Lỗi khi lấy đường dẫn tài liệu đã nạp: {e}", exc_info=True)
            return set()


chroma_manager = ChromaDBManager()


def validate_uploaded_file(uploaded_file: UploadedFile) -> Tuple[bool, str]:
    file_size_mb = uploaded_file.size / (1024 * 1024)
    if file_size_mb > config.MAX_FILE_SIZE_MB:
        return False, f"File quá lớn ({file_size_mb:.1f}MB). Giới hạn: {config.MAX_FILE_SIZE_MB}MB"

    return True, "OK"


def process_document(uploaded_file: UploadedFile) -> Tuple[Optional[List[Document]], str]:
    temp_path = None
    try:
        is_valid, msg = validate_uploaded_file(uploaded_file)
        if not is_valid:
            return None, msg

        with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as temp_file:
            temp_path = temp_file.name
            temp_file.write(uploaded_file.read())
            temp_file.flush()

        logger.info(f"Đang load PDF: {uploaded_file.name}")
        loader = PyMuPDFLoader(temp_path)
        docs = loader.load()

        if len(docs) > config.MAX_PAGES:
            return None, f"File có quá nhiều trang ({len(docs)}). Giới hạn: {config.MAX_PAGES}"

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ".", "?", "!", " ", ""],
        )
        chunks = text_splitter.split_documents(docs)

        logger.info(f"✅ Đã tạo {len(chunks)} chunks từ {len(docs)} trang")
        return chunks, f"Thành công: {len(chunks)} chunks từ {len(docs)} trang"

    except Exception as e:
        error_msg = f"Lỗi khi xử lý PDF: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Không thể xóa temp file: {e}")


def convert_docx_to_markdown(file_bytes: bytes) -> str:
    with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
        if "word/document.xml" not in zf.namelist():
            raise ValueError("File DOCX không hợp lệ: thiếu word/document.xml")
        xml_content = zf.read("word/document.xml")

    root = ET.fromstring(xml_content)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = []

    for paragraph in root.findall(".//w:p", ns):
        texts = [t.text for t in paragraph.findall(".//w:t", ns) if t.text]
        line = "".join(texts).strip()
        if line:
            paragraphs.append(line)

    markdown_lines = []
    for line in paragraphs:
        normalized = line.strip()
        lower = normalized.lower()

        if lower.startswith(("chương ", "phần ")):
            markdown_lines.append(f"# {normalized}")
        elif lower.startswith(("điều ", "mục ")):
            markdown_lines.append(f"## {normalized}")
        elif normalized.startswith(("• ", "- ", "* ")):
            markdown_lines.append(f"- {normalized[2:].strip()}")
        else:
            markdown_lines.append(normalized)

    return "\n\n".join(markdown_lines).strip()


def process_docx_document(uploaded_file: UploadedFile) -> Tuple[Optional[List[Document]], Optional[str], str]:
    try:
        is_valid, msg = validate_uploaded_file(uploaded_file)
        if not is_valid:
            return None, None, msg

        file_bytes = uploaded_file.read()
        markdown_text = convert_docx_to_markdown(file_bytes)
        if not markdown_text:
            return None, None, "Không trích xuất được nội dung từ file DOCX."

        output_dir = Path(config.MARKDOWN_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)

        safe_stem = Path(uploaded_file.name).stem.translate(
            str.maketrans({"-": "_", ".": "_", " ": "_"})
        )
        markdown_path = output_dir / f"{safe_stem}.md"
        markdown_path.write_text(markdown_text, encoding="utf-8")
        mark_vector_index_stale()

        doc = Document(
            page_content=markdown_text,
            metadata={
                "source": uploaded_file.name,
                "file_type": "docx",
                "markdown_path": str(markdown_path.resolve())
            }
        )

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ".", "?", "!", " ", ""],
        )
        chunks = text_splitter.split_documents([doc])

        logger.info(f"✅ Đã convert DOCX -> Markdown: {uploaded_file.name} ({len(chunks)} chunks)")
        return chunks, str(markdown_path.resolve()), f"Thành công: DOCX -> Markdown, {len(chunks)} chunks"

    except zipfile.BadZipFile:
        return None, None, "File không phải DOCX hợp lệ. Vui lòng dùng định dạng .docx."
    except Exception as e:
        error_msg = f"Lỗi khi xử lý DOCX: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, None, error_msg


def save_uploaded_markdown(uploaded_file: UploadedFile) -> Tuple[Optional[str], str]:
    try:
        is_valid, msg = validate_uploaded_file(uploaded_file)
        if not is_valid:
            return None, msg

        markdown_text = uploaded_file.read().decode("utf-8")
        markdown_text = strip_yaml_frontmatter(markdown_text)
        if not markdown_text.strip():
            return None, "File Markdown rỗng hoặc chỉ chứa metadata."

        output_dir = Path(config.MARKDOWN_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)

        safe_stem = Path(uploaded_file.name).stem.translate(
            str.maketrans({"-": "_", ".": "_", " ": "_"})
        )
        markdown_path = output_dir / f"{safe_stem}.md"
        markdown_path.write_text(markdown_text, encoding="utf-8")
        mark_vector_index_stale()

        return str(markdown_path.resolve()), f"✅ Đã lưu Markdown vào datahoc: {markdown_path.name}"
    except UnicodeDecodeError:
        return None, "File Markdown không đúng mã hóa UTF-8."
    except Exception as e:
        error_msg = f"Lỗi khi lưu Markdown: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg


def process_markdown_file(file_path: Path) -> Tuple[Optional[List[Document]], str]:
    try:
        markdown_text = file_path.read_text(encoding="utf-8")
        if not markdown_text.strip():
            return None, f"File rỗng: {file_path.name}"

        markdown_text = strip_yaml_frontmatter(markdown_text)
        if not markdown_text:
            return None, f"File không còn nội dung sau khi loại bỏ metadata: {file_path.name}"

        doc = Document(
            page_content=markdown_text,
            metadata={
                "source": file_path.name,
                "file_type": "markdown",
                "path": str(file_path.resolve())
            }
        )

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ".", "?", "!", " ", ""],
        )
        chunks = text_splitter.split_documents([doc])
        return chunks, f"Đã xử lý {file_path.name}: {len(chunks)} chunks"
    except Exception as e:
        error_msg = f"Lỗi khi xử lý Markdown {file_path.name}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg


def ingest_markdown_directory(progress_callback=None, only_new: bool = False) -> Tuple[bool, str]:
    try:
        base_dir = Path(config.MARKDOWN_SOURCE_DIR).resolve()
        file_signatures = get_datahoc_file_signatures()
        corpus_signature = build_markdown_corpus_signature(file_signatures)
        markdown_files = [
            path for path in base_dir.rglob("*.md")
            if not any(part in config.MARKDOWN_EXCLUDE_DIRS for part in path.parts)
        ]

        if not markdown_files:
            return False, f"Không tìm thấy file .md trong thư mục {base_dir}"

        if only_new:
            ingested_paths = chroma_manager.get_ingested_paths()
            markdown_files = [
                path for path in markdown_files
                if str(path.resolve()) not in ingested_paths
            ]

            if not markdown_files:
                save_vector_sync_state(corpus_signature)
                get_vector_ingested_paths_snapshot.clear()
                st.session_state.datahoc_synced = True
                return True, f"Không có file Markdown mới trong thư mục {base_dir}"

        success_files = 0
        total_chunks = 0
        failed_files = []

        for index, md_file in enumerate(markdown_files, start=1):
            if progress_callback:
                progress_callback(
                    min(0.1 + (index - 1) / max(len(markdown_files), 1) * 0.8, 0.9),
                    f"Đang nạp {md_file.name} ({index}/{len(markdown_files)})..."
                )

            chunks, message = process_markdown_file(md_file)
            if not chunks:
                failed_files.append(f"{md_file.name}: {message}")
                continue

            safe_name = md_file.name.translate(
                str.maketrans({"-": "_", ".": "_", " ": "_"})
            )
            success, store_message = add_to_vector_store(chunks, safe_name)
            if success:
                success_files += 1
                total_chunks += len(chunks)
            else:
                failed_files.append(f"{md_file.name}: {store_message}")

        if progress_callback:
            progress_callback(1.0, "Hoàn tất đồng bộ Markdown")

        summary = f"Đã nạp {success_files}/{len(markdown_files)} file Markdown mới, tổng {total_chunks} chunks"
        if failed_files:
            summary += f". Lỗi: {' | '.join(failed_files[:3])}"
        if success_files == len(markdown_files) and not failed_files:
            save_vector_sync_state(corpus_signature)
            st.session_state.datahoc_synced = True
        else:
            clear_vector_sync_state()
            st.session_state.datahoc_synced = False
        get_vector_ingested_paths_snapshot.clear()
        return success_files > 0, summary
    except Exception as e:
        error_msg = f"Lỗi khi nạp thư mục Markdown: {str(e)}"
        logger.error(error_msg, exc_info=True)
        st.session_state.datahoc_synced = False
        return False, error_msg


def rebuild_vector_index(progress_callback=None) -> Tuple[bool, str]:
    reset_success, reset_message = chroma_manager.reset_collection()
    if not reset_success:
        return False, reset_message

    if not get_datahoc_markdown_files():
        clear_vector_sync_state()
        st.session_state.datahoc_synced = False
        return True, "Vector store đã được làm sạch vì datahoc hiện không còn tài liệu."

    return ingest_markdown_directory(progress_callback=progress_callback, only_new=False)


def tokenize_vietnamese(texts: List[str]) -> List[str]:
    if not VI_TOKENIZER_AVAILABLE:
        logger.warning("⚠️ pyvi không có - trả về text gốc (kết quả sẽ kém)")
        return texts

    try:
        return [vi_tokenize(text) for text in texts]
    except Exception as e:
        logger.error(f"Lỗi khi tokenize: {e}")
        return texts


@st.cache_data(show_spinner=False)
def create_embeddings(texts: Tuple[str, ...]) -> np.ndarray:
    ready, message = ensure_models_ready()
    if not ready:
        raise RuntimeError(message)

    tokenized_texts = tokenize_vietnamese(list(texts))

    embeddings = model_manager.embedding_model.encode(
        tokenized_texts,
        convert_to_numpy=True,
        show_progress_bar=False
    )

    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / norms

    return embeddings.astype(np.float32)


def add_to_vector_store(
    chunks: List[Document],
    file_name: str,
    progress_callback=None
) -> Tuple[bool, str]:
    try:
        ready, message = ensure_models_ready()
        if not ready:
            return False, message

        collection = chroma_manager.get_collection()

        documents = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]
        ids = [f"{file_name}_{idx}" for idx in range(len(chunks))]

        if progress_callback:
            progress_callback(0.3, "Đang tạo embeddings...")

        embeddings = create_embeddings(tuple(documents))
        if len(embeddings) != len(documents):
            raise RuntimeError(
                f"Số embeddings ({len(embeddings)}) không khớp số documents ({len(documents)})"
            )

        if progress_callback:
            progress_callback(0.7, "Đang lưu vào vector store...")

        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
            embeddings=embeddings.tolist(),
        )
        get_vector_ingested_paths_snapshot.clear()

        del embeddings

        if progress_callback:
            progress_callback(1.0, "Hoàn tất!")

        success_msg = f"✅ Đã thêm {len(chunks)} chunks vào vector store"
        logger.info(success_msg)
        return True, success_msg

    except Exception as e:
        error_msg = f"Lỗi khi thêm vào vector store: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


def query_vector_store(query: str, n_results: int = None) -> Optional[dict]:
    try:
        ready, _ = ensure_models_ready()
        if not ready:
            return None

        if n_results is None:
            n_results = config.N_RESULTS

        collection = chroma_manager.get_collection()
        query_embedding = create_embeddings((query,))

        results = collection.query(
            query_embeddings=[query_embedding[0].tolist()],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )

        del query_embedding

        return results

    except Exception as e:
        logger.error(f"Lỗi khi query vector store: {e}", exc_info=True)
        return None


def rerank_documents(
    documents: List[str],
    query: str,
    top_k: int = None,
    max_context_chars: int = None
) -> Tuple[str, List[int], List[float]]:
    if top_k is None:
        top_k = config.TOP_K_RERANK
    if max_context_chars is None:
        max_context_chars = config.MAX_CONTEXT_CHARS

    if not documents:
        return "", [], []

    try:
        if not model_manager.is_cross_encoder_ready:
            model_manager.initialize_cross_encoder_async()
            fallback_indices = list(range(min(top_k, len(documents))))
            selected_indices = []
            fallback_texts = []
            current_length = 0

            for idx in fallback_indices:
                text = documents[idx]
                if fallback_texts and current_length + len(text) > max_context_chars:
                    break
                fallback_texts.append(text)
                selected_indices.append(idx)
                current_length += len(text)

            if not fallback_texts:
                fallback_texts = [documents[0][:max_context_chars]]
                selected_indices = [0]

            fallback_scores = [0.0] * len(selected_indices)
            logger.info("Cross encoder chưa sẵn sàng, dùng fallback top-k theo retrieval")
            return "\n\n".join(fallback_texts), selected_indices, fallback_scores

        pairs = [[query, doc] for doc in documents]
        scores = model_manager.cross_encoder.predict(pairs)
        ranked_indices = np.argsort(scores)[::-1][:top_k]

        selected_indices = []
        relevant_texts = []
        top_scores = []
        current_length = 0

        for idx in ranked_indices:
            idx = int(idx)
            text = documents[idx]
            if relevant_texts and current_length + len(text) > max_context_chars:
                break
            relevant_texts.append(text)
            selected_indices.append(idx)
            top_scores.append(float(scores[idx]))
            current_length += len(text)

        if not relevant_texts:
            first_idx = int(ranked_indices[0])
            relevant_texts = [documents[first_idx][:max_context_chars]]
            selected_indices = [first_idx]
            top_scores = [float(scores[first_idx])]

        concatenated = "\n\n".join(relevant_texts)

        logger.info(f"Re-ranked top {top_k} documents, scores: {top_scores}")
        return concatenated, selected_indices, top_scores

    except Exception as e:
        logger.error(f"Lỗi khi re-rank: {e}", exc_info=True)
        return "", [], []


def call_llm(context: str, query: str, detailed_mode: bool = True, exhaustive_mode: bool = False):
    try:
        answer_request = "Hãy trả lời đầy đủ, rõ ràng, ưu tiên giữ lại các chi tiết quan trọng trong Context."
        if exhaustive_mode:
            answer_request = "Hãy tổng hợp tối đa các thông tin liên quan trong Context và trình bày càng đầy đủ càng tốt. Nếu có nhiều ý, hãy liệt kê theo từng mục rõ ràng."
        elif detailed_mode:
            answer_request = "Hãy trả lời chi tiết, giữ lại các tên riêng, con số, mốc thời gian, đơn vị, điều khoản và ý quan trọng nếu Context có nêu."

        response = ollama.chat(
            model=config.OLLAMA_MODEL,
            stream=True,
            options={
                "temperature": config.OLLAMA_TEMPERATURE,
                "num_ctx": config.OLLAMA_NUM_CTX,
                "num_predict": config.OLLAMA_NUM_PREDICT
            },
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{answer_request}\n\nNgữ cảnh:\n{context}\n\nCâu hỏi:\n{query}\n\nHãy trả lời hoàn toàn bằng tiếng Việt."},
            ],
        )

        for chunk in response:
            if not chunk.get("done", False):
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content
            else:
                break

    except Exception as e:
        error_msg = f"❌ Lỗi khi gọi LLM: {str(e)}"
        logger.error(error_msg, exc_info=True)
        yield error_msg


def save_uploaded_text_as_markdown(uploaded_file: UploadedFile) -> Tuple[Optional[str], str]:
    try:
        is_valid, msg = validate_uploaded_file(uploaded_file)
        if not is_valid:
            return None, msg

        text_content = uploaded_file.read().decode("utf-8")
        if not text_content.strip():
            return None, "File text rỗng."

        output_dir = Path(config.MARKDOWN_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        safe_stem = Path(uploaded_file.name).stem.translate(
            str.maketrans({"-": "_", ".": "_", " ": "_"})
        )
        markdown_path = output_dir / f"{safe_stem}.md"
        markdown_path.write_text(text_content.strip(), encoding="utf-8")
        mark_vector_index_stale()
        return str(markdown_path.resolve()), f"✅ Đã chuyển file text thành Markdown: {markdown_path.name}"
    except UnicodeDecodeError:
        return None, "File text không đúng mã hóa UTF-8."
    except Exception as e:
        logger.error(f"Lỗi khi lưu text thành Markdown: {e}", exc_info=True)
        return None, f"Lỗi khi lưu file text: {str(e)}"


def save_uploaded_pdf_as_markdown(uploaded_file: UploadedFile) -> Tuple[Optional[str], str]:
    temp_path = None
    try:
        is_valid, msg = validate_uploaded_file(uploaded_file)
        if not is_valid:
            return None, msg

        file_bytes = uploaded_file.read()
        with tempfile.NamedTemporaryFile(mode="wb", suffix=".pdf", delete=False) as temp_file:
            temp_path = temp_file.name
            temp_file.write(file_bytes)
            temp_file.flush()

        loader = PyMuPDFLoader(temp_path)
        docs = loader.load()
        if len(docs) > config.MAX_PAGES:
            return None, f"File có quá nhiều trang ({len(docs)}). Giới hạn: {config.MAX_PAGES}"

        markdown_text = "\n\n".join(doc.page_content.strip() for doc in docs if doc.page_content.strip())
        if not markdown_text:
            return None, "Không trích xuất được nội dung từ file PDF."

        output_dir = Path(config.MARKDOWN_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        safe_stem = Path(uploaded_file.name).stem.translate(
            str.maketrans({"-": "_", ".": "_", " ": "_"})
        )
        markdown_path = output_dir / f"{safe_stem}.md"
        markdown_path.write_text(markdown_text, encoding="utf-8")
        mark_vector_index_stale()
        return str(markdown_path.resolve()), f"✅ Đã chuyển PDF thành Markdown: {markdown_path.name}"
    except Exception as e:
        logger.error(f"Lỗi khi chuyển PDF thành Markdown: {e}", exc_info=True)
        return None, f"Lỗi khi xử lý PDF: {str(e)}"
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass


def save_markdown_text_content(file_name: str, content: str) -> Tuple[bool, str]:
    file_path = Path(config.MARKDOWN_SOURCE_DIR).resolve() / file_name
    try:
        file_path.write_text(content, encoding="utf-8")
        mark_vector_index_stale()
        return True, f"✅ Đã lưu thay đổi cho {file_name}"
    except Exception as e:
        logger.error(f"Lỗi khi lưu Markdown {file_name}: {e}", exc_info=True)
        return False, f"Lỗi khi lưu file: {str(e)}"


def delete_markdown_document(file_name: str) -> Tuple[bool, str]:
    file_path = Path(config.MARKDOWN_SOURCE_DIR).resolve() / file_name
    if not file_path.exists():
        return False, "File không tồn tại."
    try:
        file_path.unlink()
        mark_vector_index_stale()
        return True, f"✅ Đã xóa {file_name}"
    except Exception as e:
        logger.error(f"Lỗi khi xóa Markdown {file_name}: {e}", exc_info=True)
        return False, f"Lỗi khi xóa file: {str(e)}"
