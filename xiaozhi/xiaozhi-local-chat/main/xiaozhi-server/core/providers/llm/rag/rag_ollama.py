"""
OPTIMIZED RAG-based LLM Provider for Xiaozhi
Major improvements:
1. Similarity threshold filtering
2. Context length control
3. Improved caching strategy
4. Simplified prompt for 3B models
5. Better error handling
"""

import os
import sys
import logging
import time
from typing import Optional, Dict, Any, Generator, List, Tuple
from functools import lru_cache

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
sys.path.insert(0, project_root)

from config.logger import setup_logging
from .config import RAGConfig, EMBEDDING_MODELS
from .model_manager import get_model_manager
from .vector_store import get_chroma_manager
from .document_loader import DocumentLoader
from .metadata_filter import build_metadata_filter, post_filter_results

logger = setup_logging()

# ============================================================================
# GLOBAL CONFIGURATION
# ============================================================================
SIMILARITY_THRESHOLD = 1.8  # Cosine distance - INCREASED for multilingual embedding (Vietnamese needs higher threshold)
MAX_CONTEXT_TOKENS = 5000   # INCREASED: Max context length in tokens (was 3000) - ensure complete lists
MIN_CHUNKS_REQUIRED = 1     # Minimum relevant chunks to answer
HYBRID_SEARCH_TOP_K = 20    # INCREASED: Candidates for hybrid search (was 15)
FINAL_RERANK_TOP_K = 10     # INCREASED: Final top K after reranking (was 5) - ensure complete lists
MIN_RERANK_SCORE = 0.3      # Minimum rerank score to consider relevant (0-1)


# ============================================================================
# GLOBAL CACHED FUNCTIONS (Shared across instances)
# ============================================================================
@lru_cache(maxsize=500)
def transform_query_cached(query: str) -> str:
    """
    Global cached query transformation
    Handles Vietnamese numbers and phrase expansions
    """
    vn_numbers = {
        'mười một': '11', 'hai mươi ba': '23', 'bảy': '7',
        'ba': '3', 'năm': '5', 'sáu': '6', 'bốn': '4',
        'mười hai': '12', 'ba mươi': '30', 'năm mươi': '50'
    }
    
    # Year-specific expansions (must be processed BEFORE general expansions)
    # Include fuzzy/truncated patterns for ASR errors
    year_expansions = {
        'hai không hai lăm': '2025',
        'hai không hai năm': '2025',
        'hai không hai lă': '2025',      # ASR truncation: "lăm" → "lă"
        'hai không hai la': '2025',      # ASR error variant
        'hai không hai bốn': '2024',
        'hai không hai bô': '2024',      # ASR truncation
        'hai không hai sáu': '2026',
        'hai không hai sá': '2026',      # ASR truncation
    }
    
    expansions = {
        'năm nay': 'năm 2025',
        'năm tới': 'năm 2025',
        'chủ đề': 'chủ đề lãnh đạo',
        'phong trào': 'phong trào thi đua',
        'chính ủy trung đoàn': 'chính ủy trung đoàn tên cán bộ chủ chốt',
        'trung đoàn trưởng': 'trung đoàn trưởng tên cán bộ chủ chốt',
        'đại đội trưởng': 'đại đội trưởng tên cán bộ',
        'chính trị viên': 'chính trị viên tên cán bộ',
        # Synonym: "ngày thành lập" → "ngày truyền thống" 
        'ngày thành lập': 'ngày truyền thống ngày thành lập',
        'thành lập': 'truyền thống thành lập'
    }
    
    transformed = query.lower()
    
    # FIRST: Expand year numbers (highest priority)
    for year_vn, year_digit in year_expansions.items():
        if year_vn in transformed:
            transformed = transformed.replace(year_vn, year_digit)
            logger.bind(tag=__name__).info(f"🔄 Year expansion: '{year_vn}' → '{year_digit}'")
            break
    
    # Expand Vietnamese numbers (but skip 'năm' in year context like 'năm 2025')
    for vn_num, digit in vn_numbers.items():
        if vn_num in transformed:
            # Special case: don't convert 'năm' if followed by year digits (e.g., 'năm 2025')
            if vn_num == 'năm' and any(year in transformed for year in ['2024', '2025', '2026', 'nay', 'tới', 'sau']):
                logger.bind(tag=__name__).info(f"⏭️ Skipping 'năm' → '5' (year context detected)")
                continue  # Skip this conversion, 'năm' means 'year' not '5'
            transformed = f"{query} {digit}"
            break
    
    # Expand phrases
    for vague, specific in expansions.items():
        if vague in transformed and specific not in transformed:
            transformed = transformed.replace(vague, f"{vague} {specific}")
            break
    
    if transformed != query.lower():
        logger.bind(tag=__name__).info(f"📝 Query transformed: '{query}' → '{transformed}'")
    
    return transformed


def truncate_context(context: str, max_tokens: int = MAX_CONTEXT_TOKENS) -> str:
    """
    Truncate context to max tokens at sentence boundary
    Rough estimate: 1 token ≈ 2.5 chars in Vietnamese
    """
    max_chars = max_tokens * 2.5
    
    if len(context) <= max_chars:
        return context
    
    # Truncate at sentence boundary
    truncated = context[:int(max_chars)]
    last_period = truncated.rfind('.')
    
    if last_period > len(truncated) * 0.5:  # Only if period is in latter half
        return truncated[:last_period + 1]
    
    return truncated


def filter_by_similarity(
    documents: List[str], 
    distances: List[float], 
    threshold: float = SIMILARITY_THRESHOLD
) -> Tuple[List[str], List[float]]:
    """
    Filter documents by similarity threshold
    
    Args:
        documents: List of document texts
        distances: Cosine distances (0=identical, 2=opposite)
        threshold: Maximum distance to keep (default 0.5)
    
    Returns:
        Tuple of (filtered_docs, filtered_distances)
    """
    filtered = [
        (doc, dist) for doc, dist in zip(documents, distances)
        if dist < threshold
    ]
    
    if not filtered:
        logger.bind(tag=__name__).warning(
            f"No documents below similarity threshold {threshold}. "
            f"Min distance: {min(distances) if distances else 'N/A'}"
        )
        return [], []
    
    docs, dists = zip(*filtered)
    
    logger.bind(tag=__name__).info(
        f"Filtered {len(documents)} -> {len(docs)} docs "
        f"(threshold={threshold}, min_dist={min(dists):.3f})"
    )
    
    return list(docs), list(dists)


# ============================================================================
# OPTIMIZED RAG LLM PROVIDER
# ============================================================================
class LLMProvider:
    """
    Production-grade RAG-enabled LLM Provider
    Optimized for accuracy and performance
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize RAG LLM Provider"""
        self.config = config
        self.model_name = config.get("model_name", "qwen2.5:3b")
        self.base_url = config.get("base_url", "http://localhost:11434")
        self.temperature = config.get("temperature", 0.0)  # 0 for max accuracy
        self.max_tokens = config.get("max_tokens", 2048)
        
        # RAG settings
        self.rag_enabled = config.get("rag_enabled", True)
        self.strict_mode = config.get("strict_mode", True)
        embedding_model_type = config.get("embedding_model", "balanced")
        
        # Initialize RAG config with OPTIMIZED settings
        self.rag_config = RAGConfig(
            embedding_model=embedding_model_type,
            cross_encoder_model=config.get("cross_encoder", "cross-encoder/ms-marco-MiniLM-L-6-v2"),
            chunk_size=800,  # INCREASED from 500
            chunk_overlap=250,  # INCREASED from 150
            n_results=15,
            top_k_rerank=5,
            enable_cache=True,
            cache_size=200,  # INCREASED from 100
            chroma_path=config.get("chroma_path", "./data/rag-chroma"),
            collection_name=config.get("collection_name", "xiaozhi_docs")
        )
        
        self.embedding_config = self.rag_config.get_embedding_config()
        
        # Initialize managers
        self.model_manager = get_model_manager()
        self.chroma_manager = get_chroma_manager()
        self.document_loader = DocumentLoader(
            chunk_size=self.rag_config.chunk_size,
            chunk_overlap=self.rag_config.chunk_overlap
        )
        
        # Lazy-loaded components
        from core.providers.llm.rag.query_classifier import QueryClassifier
        self.query_classifier = QueryClassifier()
        
        self._initialized = False
        
        logger.bind(tag=__name__).info(
            f"RAG LLM Provider created (model: {self.model_name}, "
            f"embedding: {embedding_model_type}, chunk_size: {self.rag_config.chunk_size})"
        )
    
    async def initialize(self):
        """Initialize RAG components"""
        if self._initialized:
            return
        
        logger.bind(tag=__name__).info("Initializing RAG system...")
        start_time = time.time()
        
        # Initialize models
        success, msg = self.model_manager.initialize(
            embedding_model_id=self.embedding_config.model_id,
            cross_encoder_id=self.rag_config.cross_encoder_model,
            requires_tokenizer=self.embedding_config.requires_tokenizer
        )
        
        # === NEW: Log explicit device status ===
        logger.bind(tag=__name__).info(f"Model Manager Device: {self.model_manager.device}")
        
        if not success:
            raise RuntimeError(f"Model initialization failed: {msg}")
        
        # Multi-collection setup
        logger.bind(tag=__name__).info("Loading multi-collection ChromaDB...")
        
        self.collections = {}
        collection_names = {
            'chinh_tri': 'xiaozhi_chinh_tri',
            'quan_su': 'xiaozhi_quan_su',
            'to_chuc': 'xiaozhi_to_chuc',
            'hau_can': 'xiaozhi_hau_can',
            'ky_thuat': 'xiaozhi_ky_thuat'
        }
        
        total_docs = 0
        from core.providers.llm.rag.vector_store import get_chroma_manager
        
        for category, collection_name in collection_names.items():
            try:
                chroma = get_chroma_manager()
                success, msg = chroma.initialize(
                    chroma_path=self.rag_config.chroma_path,
                    collection_name=collection_name
                )
                
                if success and chroma.collection:
                    self.collections[category] = chroma.collection
                    count = chroma.collection.count()
                    total_docs += count
                    logger.bind(tag=__name__).info(f"✅ Loaded '{category}': {count} docs")
                else:
                    logger.bind(tag=__name__).warning(f"⚠️ Collection '{category}' not found")
            except Exception as e:
                logger.bind(tag=__name__).error(f"Failed to load '{category}': {e}")
        
        # Fallback to single collection if no multi-collections
        if not self.collections:
            logger.bind(tag=__name__).warning("No multi-collections, using single collection...")
            success, msg = self.chroma_manager.initialize(
                chroma_path=self.rag_config.chroma_path,
                collection_name=self.rag_config.collection_name
            )
            if not success:
                raise RuntimeError(f"Vector store init failed: {msg}")
            stats = self.chroma_manager.get_stats()
            total_docs = stats.get('count', 0)
        
        # === AUTO RE-INDEX ON STARTUP ===
        try:
            from core.providers.llm.rag.auto_reindex import auto_reindex_on_startup
            import os
            
            # Map collections to ABSOLUTE file paths
            server_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up: rag -> llm -> providers -> core -> xiaozhi-server -> main -> xiaozhi-local-chat -> Xiaozhi
            base_dir = os.path.abspath(os.path.join(server_dir, '..', '..', '..', '..', '..', '..', '..'))
            
            document_paths = {
                'xiaozhi_chinh_tri': os.path.join(base_dir, 'chinh_tri.md'),
                'xiaozhi_quan_su': os.path.join(base_dir, 'quan_su.md'),
                'xiaozhi_to_chuc': os.path.join(base_dir, 'to_chuc_don_vi.md'),
                'xiaozhi_hau_can': os.path.join(base_dir, 'hau_can.md'),
                'xiaozhi_ky_thuat': os.path.join(base_dir, 'ky_thuat.md'),
            }
            
            logger.bind(tag=__name__).info("🔄 Checking for document updates...")
            reindex_result = auto_reindex_on_startup(self, document_paths)
            
            if reindex_result['reindexed']:
                logger.bind(tag=__name__).success(
                    f"✅ Auto re-indexed {len(reindex_result['reindexed'])} collections"
                )
                # Reload collections after re-index
                for collection_name in reindex_result['reindexed']:
                    category = collection_name.replace('xiaozhi_', '')
                    try:
                        chroma = get_chroma_manager()
                        chroma.initialize(self.rag_config.chroma_path, collection_name)
                        if chroma.collection:
                            self.collections[category] = chroma.collection
                            total_docs += chroma.collection.count()
                            logger.bind(tag=__name__).info(
                                f"♻️  Reloaded '{category}': {chroma.collection.count()} docs"
                            )
                    except Exception as e:
                        logger.bind(tag=__name__).error(f"Failed to reload {category}: {e}")
        except Exception as e:
            logger.bind(tag=__name__).warning(f"Auto re-index skipped: {e}")
        
        self._initialized = True
        elapsed = time.time() - start_time
        
        logger.bind(tag=__name__).success(
            f"✅ RAG initialized in {elapsed:.2f}s "
            f"(collections: {len(self.collections) or 1}, documents: {total_docs})"
        )
    
    def _retrieve_context_by_category(
        self, 
        query: str, 
        category: Optional[str] = None
    ) -> str:
        """
        OPTIMIZED: Retrieve context with similarity filtering
        """
        # Transform query using global cache
        transformed_query = transform_query_cached(query)
        
        if not hasattr(self, 'collections') or not self.collections:
            logger.bind(tag=__name__).error("Multi-collection not available!")
            return ""
        
        # Category-specific search
        if category and category in self.collections:
            logger.bind(tag=__name__).info(f"Searching category: {category}")
            collection = self.collections[category]
            
            query_embedding = self.model_manager.encode([transformed_query], normalize=True)[0]
            
            # === FIX: Get ALL documents properly ===
            count = collection.count()
            all_docs_result = collection.get(
                limit=count,  # CRITICAL: Get all docs
                include=['documents']
            )
            all_texts = all_docs_result['documents']
            
            if not all_texts:
                return ""
            
            # === OPTIMIZED: Metadata Filtering ===
            # 1. Build ChromaDB filter
            chroma_filter = build_metadata_filter(query, category)
            
            # Remove redundant category filter (we are already in the category collection)
            if chroma_filter and 'category' in chroma_filter:
                del chroma_filter['category']
                if not chroma_filter:
                    chroma_filter = None
            
            if chroma_filter:
                logger.bind(tag=__name__).info(f"Applying metadata filter: {chroma_filter}")

            try:
                # Vector search with MORE results for filtering
                vector_results = collection.query(
                    query_embeddings=[query_embedding.tolist()],
                    n_results=min(20, count),
                    where=chroma_filter,
                    include=['documents', 'distances', 'metadatas']
                )
            except Exception as e:
                logger.bind(tag=__name__).warning(f"Metadata filter failed ({e}), falling back to vector search")
                # Fallback: search without filter
                vector_results = collection.query(
                    query_embeddings=[query_embedding.tolist()],
                    n_results=min(20, count),
                    include=['documents', 'distances', 'metadatas']
                )
            
            # 2. Post-filter (Fuzzy match for personnel)
            # This handles cases where "Tran Van Toi" needs to match "Trần Văn Tới"
            try:
                vector_results = post_filter_results(vector_results, query)
            except Exception as e:
                logger.bind(tag=__name__).warning(f"Post-filter failed: {e}")
                # Continue with original results if post-filter fails
            
            # === NEW: Filter by similarity threshold ===
            
            # === NEW: Filter by similarity threshold ===
            top_vector_docs = vector_results['documents'][0] if vector_results['documents'] else []
            distances = vector_results['distances'][0] if vector_results['distances'] else []
            
            # Filter before hybrid search
            filtered_docs, filtered_dists = filter_by_similarity(
                top_vector_docs, 
                distances,
                SIMILARITY_THRESHOLD
            )
            
            if not filtered_docs:
                logger.bind(tag=__name__).warning(
                    f"No relevant documents found for query in '{category}' "
                    f"(threshold={SIMILARITY_THRESHOLD})"
                )
                return ""
            
            # Hybrid search on filtered docs
            from core.providers.llm.rag.hybrid_search import HybridRetriever
            hybrid = HybridRetriever(all_texts)
            
            hybrid_docs = hybrid.search(
                query, 
                filtered_docs,  # Use filtered docs
                k=HYBRID_SEARCH_TOP_K
            )
            
            logger.bind(tag=__name__).info(
                f"Hybrid Search: {len(filtered_docs)} filtered -> {len(hybrid_docs)} candidates"
            )
            
            # Cross-encoder reranking
            if hybrid_docs:
                ranked_docs, _, scores = self.model_manager.rerank(
                    query=query,
                    documents=hybrid_docs,
                    top_k=min(FINAL_RERANK_TOP_K, len(hybrid_docs))
                )
                
                logger.bind(tag=__name__).info(
                    f"Final reranked: {len(ranked_docs)} docs "
                    f"(scores: {scores[:3] if len(scores) >= 3 else scores})"
                )
                
                # === NEW: Check if top score is above threshold ===
                if scores and scores[0] < MIN_RERANK_SCORE:
                    logger.bind(tag=__name__).warning(
                        f"❌ No relevant information found "
                        f"(top rerank score {scores[0]:.3f} < {MIN_RERANK_SCORE})"
                    )
                    return ""  # Return empty to trigger "không tìm thấy thông tin"
                
                context = "\n\n".join(ranked_docs)
                
                # === NEW: Truncate context ===
                context = truncate_context(context, MAX_CONTEXT_TOKENS)
                
                logger.bind(tag=__name__).info(
                    f"Context: {len(context)} chars (~{len(context)//2.5:.0f} tokens)"
                )
                
                return context
            
            return ""
        
        # === Global search across all collections ===
        logger.bind(tag=__name__).info("Searching all collections...")
        
        # Get all documents from all collections
        all_global_texts = []
        for coll in self.collections.values():
            try:
                count = coll.count()
                res = coll.get(limit=count, include=['documents'])
                if res and res['documents']:
                    all_global_texts.extend(res['documents'])
            except Exception as e:
                logger.bind(tag=__name__).warning(f"Error getting docs: {e}")
                continue
        
        if not all_global_texts:
            return ""
        
        # Global vector search
        global_vector_docs = []
        global_distances = []
        query_embedding = self.model_manager.encode([transformed_query], normalize=True)[0]
        
        for coll in self.collections.values():
            try:
                res = coll.query(
                    query_embeddings=[query_embedding.tolist()],
                    n_results=5,
                    include=['documents', 'distances']
                )
                if res and res['documents'] and res['documents'][0]:
                    global_vector_docs.extend(res['documents'][0])
                    if res.get('distances') and res['distances'][0]:
                        global_distances.extend(res['distances'][0])
            except Exception:
                continue
        
        # Filter by similarity
        if global_distances:
            filtered_docs, _ = filter_by_similarity(
                global_vector_docs,
                global_distances,
                SIMILARITY_THRESHOLD
            )
        else:
            filtered_docs = global_vector_docs  # No filtering if no distances
        
        if not filtered_docs:
            logger.bind(tag=__name__).warning("No relevant documents in global search")
            return ""
        
        # Hybrid search
        from core.providers.llm.rag.hybrid_search import HybridRetriever
        hybrid = HybridRetriever(all_global_texts)
        
        hybrid_docs = hybrid.search(query, filtered_docs, k=HYBRID_SEARCH_TOP_K)
        
        logger.bind(tag=__name__).info(f"Global hybrid: {len(hybrid_docs)} candidates")
        
        # Rerank
        if hybrid_docs:
            ranked, _, _ = self.model_manager.rerank(
                query, 
                hybrid_docs, 
                FINAL_RERANK_TOP_K
            )
            context = "\n\n".join(ranked)
            context = truncate_context(context, MAX_CONTEXT_TOKENS)
            return context
        
        return ""
    
    def _retrieve_context(self, query: str) -> str:
        """Main context retrieval with routing"""
        if not self._initialized:
            logger.bind(tag=__name__).warning("RAG not initialized")
            return ""
        
        try:
            # === Check if this is a list query (for prompt selection only) ===
            try:
                from core.providers.llm.rag.list_detector import is_list_query
                
                list_name = is_list_query(query)
                if list_name:
                    logger.bind(tag=__name__).info(
                        f"🔍 Detected list query: {list_name} (will use special prompt)"
                    )
                    # Don't retrieve here - let normal retrieval handle it
                    # The list_name will be used to select special prompt in chat_stream()
            except Exception as e:
                logger.bind(tag=__name__).debug(f"List detection skipped: {e}")
            
            # === NORMAL RETRIEVAL (existing code) ===
            # Multi-collection routing
            if hasattr(self, 'query_classifier') and hasattr(self, 'collections') and self.collections:
                classification = self.query_classifier.classify_full(query)
                category = classification.get('category')
                
                logger.bind(tag=__name__).info(
                    f"Routing - Category: {category}, Intent: {classification.get('intent')}"
                )
                
                return self._retrieve_context_by_category(query, category)
            
            # Fallback to single collection
            logger.bind(tag=__name__).warning("Using fallback single-collection search")
            
            transformed_query = transform_query_cached(query)
            query_embedding = self.model_manager.encode([transformed_query], normalize=True)[0]
            
            results = self.chroma_manager.query(
                query_embedding=query_embedding.tolist(),
                n_results=self.rag_config.n_results
            )
            
            if not results or not results.get("documents", [[]])[0]:
                return ""
            
            documents = results["documents"][0]
            distances = results.get("distances", [[]])[0]
            
            # Filter by similarity
            if distances:
                filtered_docs, _ = filter_by_similarity(documents, distances, SIMILARITY_THRESHOLD)
            else:
                filtered_docs = documents
            
            if not filtered_docs:
                return ""
            
            # Rerank
            ranked_docs, _, _ = self.model_manager.rerank(
                query=query,
                documents=filtered_docs,
                top_k=self.rag_config.top_k_rerank
            )
            
            context = "\n\n".join(ranked_docs)
            context = truncate_context(context, MAX_CONTEXT_TOKENS)
            
            return context
            
        except Exception as e:
            logger.bind(tag=__name__).error(f"Error retrieving context: {e}", exc_info=True)
            return ""
    
    async def chat_stream(self, user_message: str, system_prompt: str = ""):
        """
        Chat with streaming response using RAG
        OPTIMIZED: Simplified prompt for 3B models
        """
        try:
            import ollama
            
            if not self._initialized:
                await self.initialize()
            
            # === NEW: Check if input is a question ===
            from core.providers.llm.rag.question_detector import is_question
            
            if not is_question(user_message):
                # SUGGESTION MODE: User provided keyword/statement, not a question
                logger.bind(tag=__name__).info(f"💡 SUGGESTION MODE: '{user_message}' is not a question")
                
                # === Random intro phrases for natural conversation ===
                import random
                intro_phrases = [
                    "Bạn muốn tìm hiểu thông tin gì? Một vài gợi ý:",
                    "Bạn muốn biết điều gì? Tôi có thể giúp:",
                    "Tôi có thể trợ giúp gì cho bạn? Một vài gợi ý:",
                    "Bạn quan tâm đến thông tin nào? Gợi ý:",
                ]
                random_intro = random.choice(intro_phrases)
                
                # === SPECIAL CASES: Known topics with static content ===
                # Instead of RAG, suggest predefined questions for common topics
                lower_msg = user_message.lower()
                static_suggestions = None
                
                # Đại hội 14
                if any(x in lower_msg for x in ["đại hội 14", "đại hội mười bốn", "đại hội xiv"]):
                    static_suggestions = f"""{random_intro}
- Chủ đề Đại hội 14 của Đảng là gì?
- Phương châm Đại hội 14 là gì?"""
                
                # Trung đoàn 8
                elif any(x in lower_msg for x in ["trung đoàn 8", "trung đoàn tám"]):
                    static_suggestions = f"""{random_intro}
- Bạn muốn tìm hiểu lịch sử Trung đoàn 8?
- Tên thủ trưởng trung đoàn hiện nay?
- Ngày truyền thống Trung đoàn 8 là khi nào?
- Truyền thống Trung đoàn 8 là gì?"""
                
                # Sư đoàn 395
                elif any(x in lower_msg for x in ["sư đoàn 395", "sư đoàn ba chín lăm"]):
                    static_suggestions = f"""{random_intro}
- Bạn muốn tìm hiểu lịch sử Sư đoàn 395?
- Tên thủ trưởng sư đoàn hiện nay?
- Ngày truyền thống Sư đoàn 395 là ngày nào?
- Truyền thống Sư đoàn 395 là gì?"""
                
                # 10 lời thề
                elif any(x in lower_msg for x in ["10 lời thề", "mười lời thề", "lời thề"]):
                    static_suggestions = f"""{random_intro}
- 10 lời thề danh dự của quân nhân là gì?
- Lời thề số 1 là gì?"""
                
                # If static suggestion found, use it directly
                if static_suggestions:
                    logger.bind(tag=__name__).info("Using static suggestions for known topic")
                    yield static_suggestions
                    return
                
                # === GENERAL CASE: Use RAG context ===
                # Get topic/category from classifier
                category = "general"
                try:
                    classification = self.query_classifier.classify_full(user_message)
                    category = classification.get('category', 'general')
                    logger.bind(tag=__name__).info(f"Detected topic: {category}")
                except:
                    pass
                
                # === NEW: Retrieve context to show what's available ===
                context = ""
                if self.rag_enabled and self._initialized:
                    try:
                        context = self._retrieve_context(user_message)
                        logger.bind(tag=__name__).info(f"Retrieved context for suggestions: {len(context)} chars")
                    except Exception as e:
                        logger.bind(tag=__name__).warning(f"Failed to retrieve context: {e}")
                
                # Build suggestion prompt with context
                if context:
                    suggestion_prompt = f"""Bạn là Xiaozhi - Trợ lý AI của Trung đoàn 8.

User đã đưa ra chủ đề: "{user_message}"
(Category: {category})

Đây là thông tin có sẵn trong tài liệu về chủ đề này:
\"\"\"
{context[:1500]}...
\"\"\"

NHIỆM VỤ: Dựa vào thông tin THỰC TẾ ở trên, gợi ý 3-5 câu hỏi CỤ THỂ mà user có thể hỏi.

FORMAT:
"Một vài gợi ý cho bạn:
- [Câu hỏi 1]?
- [Câu hỏi 2]?
- [Câu hỏi 3]?"

QUY TẮC QUAN TRỌNG:
- CHỈ gợi ý câu hỏi về thông tin CÓ TRONG tài liệu ở trên
- KHÔNG tự bịa câu hỏi về thông tin không có
- Câu hỏi phải CỤ THỂ (tên người, ngày tháng, chức vụ, v.v.)
- Ngắn gọn, dễ hiểu"""
                else:
                    # Fallback if no context
                    suggestion_prompt = f"""Bạn là Xiaozhi - Trợ lý AI của Trung đoàn 8.

User đã đưa ra chủ đề: "{user_message}"

Gợi ý 2-3 câu hỏi phổ biến về chủ đề này (tổ chức, chính trị, quân sự):
- [Câu hỏi 1]?
- [Câu hỏi 2]?"""
                
                # Stream suggestion response
                messages = [
                    {'role': 'user', 'content': suggestion_prompt}
                ]
                
                # Use sync client (ollama returns sync iterator, not async)
                response = ollama.chat(
                    model=self.model_name,
                    messages=messages,
                    stream=True,
                    options={
                        'temperature': 0.7,  # More creative for suggestions
                        'num_ctx': 2048,
                    }
                )
                
                for chunk in response:
                    if not chunk.get("done", False):
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
                    else:
                        break
                
                return  # Exit early, don't do RAG
            
            # === NORMAL RAG MODE (existing code) ===
            # Retrieve context
            context = ""
            is_list_context = False
            list_name = None
            
            if self.rag_enabled and self._initialized:
                # === NEW: Check if list query for special prompt ===
                try:
                    from core.providers.llm.rag.list_detector import is_list_query as detect_list_query
                    list_name = detect_list_query(user_message)
                    if list_name:
                        is_list_context = True
                except:
                    pass
                
                context = self._retrieve_context(user_message)
                
                # === NEW: Reject if no context in strict mode ===
                if self.strict_mode and not context:
                    yield "Tôi không tìm thấy thông tin liên quan trong tài liệu để trả lời câu hỏi này."
                    return
            
            # === SPECIAL PROMPT FOR LIST QUERIES ===
            if is_list_context and context:
                # Determine label based on list name
                item_label = "Mục"
                if list_name:
                    if "loi_the" in list_name:
                        item_label = "Lời thề"
                    elif "dieu_cam" in list_name:
                        item_label = "Điều cấm"
                    elif "phuong_phap" in list_name:
                        item_label = "Phương pháp"
                    elif "hinh_thuc" in list_name:
                        item_label = "Hình thức"
                    elif "dau_cong_viec" in list_name:
                        item_label = "Công việc"
                    elif "chi_huy" in list_name:
                        item_label = "Cán bộ"
                
                # Special handling for commander lists
                if list_name and "chi_huy" in list_name:
                    rag_system_instruction = """Bạn là Xiaozhi - Trợ lý AI của Trung đoàn 8.

⚠️ NHIỆM VỤ: LIỆT KÊ ĐÚNG ĐỊNH DẠNG CHO DANH SÁCH CÁN BỘ/CHỈHUY.

FORMAT BẮT BUỘC (dấu gạch đầu dòng):
"Danh sách gồm:
- [CHỨC VỤ]: [CẤP BẬC] [HỌ TÊN]
- [CHỨC VỤ]: [CẤP BẬC] [HỌ TÊN]
..."

VÍ DỤ ĐÚNG:
"Chỉ huy Sư đoàn 395 gồm:
- Sư đoàn trưởng: Đại tá Nguyễn Huy Toàn
- Chính ủy Sư đoàn: Đại tá Lê Hồng Thắng
- Phó Sư đoàn trưởng: Đại tá Nguyễn Văn Tiệp"

VÍ DỤ SAI (TUYỆT ĐỐI KHÔNG LÀM):
"Gồm có Đại tá Nguyễn Huy Toàn, Đại tá Lê Hồng Thắng..." ← Thiếu chức vụ, viết liền!

QUY TẮC:
1. BẮT BUỘC xuống dòng từng người (dấu gạch đầu dòng -)
2. PHẢI có đủ: CHỨC VỤ + CẤP BẬC + HỌ TÊN
3. KHÔNG viết liền thành một câu
4. TRÍCH NGUYÊN VĂN từ Context"""
                else:
                    # Generic numbered list prompt
                    rag_system_instruction = f"""Bạn là Xiaozhi - Trợ lý AI của Trung đoàn 8.

⚠️ NHIỆM VỤ: Liệt kê TỪNG {item_label} VỚI SỐ THỨ TỰ.

FORMAT BẮT BUỘC:
"{item_label} số 1: [nội dung]
{item_label} số 2: [nội dung]
{item_label} số 3: [nội dung]
..."

QUY TẮC:
1. PHẢI CÓ SỐ (ví dụ: "Công việc số 1:", "Công việc số 2:")  
2. LIỆT KÊ ĐẦY ĐỦ tất cả
3. TRÍCH NGUYÊN VĂN từ Context
4. KHÔNG TÓM TẮT

VÍ DỤ ĐÚNG:
"Theo tài liệu, danh sách gồm:

{item_label} số 1: [nội dung đầy đủ]
{item_label} số 2: [nội dung đầy đủ]
...
{item_label} số X: [nội dung đầy đủ]"

VÍ DỤ SAI (TUYỆT ĐỐI KHÔNG LÀM):
"Danh sách gồm các nội dung về..." ← Quá chung chung!"""
            else:
                # === NORMAL PROMPT ===
                rag_system_instruction = """Bạn là Xiaozhi - Trợ lý AI của Trung đoàn 8.

QUY TẮC QUAN TRỌNG:
1. TRẢ LỜI CHÍNH XÁC: Dựa vào thông tin từ Context được cung cấp bên dưới để trả lời câu hỏi một cách chính xác và đầy đủ.

2. KHÔNG CÓ THÔNG TIN:
   ⚠️ CỰC KỲ QUAN TRỌNG: Nếu Context RỖNG hoặc KHÔNG có thông tin liên quan đến câu hỏi:
   → BẮT BUỘC trả lời: "Tôi không tìm thấy thông tin về [nội dung câu hỏi] trong tài liệu."
   → TUYỆT ĐỐI KHÔNG được tự bịa đặt thông tin
   → TUYỆT ĐỐI KHÔNG được trả lời dựa trên kiến thức chung
   
   VÍ DỤ:
   Context: (empty)
   Câu hỏi: "Chỉ huy trung đoàn 9 là ai?"
   ✅ ĐÚNG: "Tôi không tìm thấy thông tin về chỉ huy trung đoàn 9 trong tài liệu."
   ❌ SAI: "Chỉ huy trung đoàn 9 là..." (BỊA ĐẶT!)

3. SỬ DỤNG THÔNG TIN TỪ CONTEXT:
   - Đọc kỹ Context để tìm thông tin liên quan
   - Có thể tổng hợp từ nhiều đoạn trong Context
   - Trả lời rõ ràng, đầy đủ ngay cả khi Context dùng format đặc biệt (bold **, headers ###, etc.)
   
   **ĐẶC BIỆT CHÚ Ý:**
   - TÊN NGƯỜI, chức vụ, số liệu phải ghi CHÍNH XÁC như trong Context
   - VD: "Đại úy Nguyễn Văn Phong" KHÔNG được nhầm thành "Nguyễn Văn Phóng"
   - VD: "Trần Văn Tới" KHÔNG được viết thành "Trần Văn Toại"
   
   Ví dụ:
   Context: "**Họ tên:** Đại úy Nguyễn Văn Phong\\n**Chức vụ:** Chính trị viên Đại đội 8"
   Câu hỏi: "Chính trị viên đại đội 8 là ai?"
   ✅ ĐÚNG: "Chính trị viên Đại đội 8 là Đại úy Nguyễn Văn Phong."

4. PHÂN BIỆT NĂM VÀ SỐ:
   ⚠️ CỰC KỲ QUAN TRỌNG: Phân biệt rõ ràng giữa:
   - "Năm 2025" = NĂM (year), liên quan đến chủ đề lãnh đạo, phong trào thi đua
   - "5 không" hoặc "Năm không" = CHIẾN DỊCH slogan, bao gồm: không bỏ ngũ, không mất an toàn...
   - "3 thực chất" = ba khía cạnh: sẵn sàng chiến đấu, huấn luyện, kỷ luật
   
   📌 KHI ĐƯỢC HỎI VỀ "Chủ đề lãnh đạo năm 2025":
   → Trả lời: "Dân chủ, kỷ cương - Sẵn sàng chiến đấu cao - An toàn mọi mặt"
   → KHÔNG được nhầm với "5 không 2 lần"

5. CHỈ TRẢ LỜI ĐÚNG CÂU HỎI:
   ⚠️ CỰC KỲ QUAN TRỌNG: CHỈ trả lời CHÍNH XÁC câu hỏi được hỏi.
   - KHÔNG được thêm thông tin không liên quan từ Context
   - KHÔNG được nói về các chủ đề khác ngay cả khi có trong Context
   
   VÍ DỤ:
   Câu hỏi: "Chính trị viên đại đội 8 là ai?"
   Context có: [Thông tin về Nguyễn Văn Phong] + [Chủ đề lãnh đạo 2025] + [Phong trào thi đua]
   ✅ ĐÚNG: "Chính trị viên Đại đội 8 là Đại úy Nguyễn Văn Phong."
   ❌ SAI: "Chính trị viên Đại đội 8 là Đại úy Nguyễn Văn Phong. Dân chủ, kỷ cương..."

6. PHONG CÁCH: Tự nhiên, thân thiện, trả lời trực tiếp vào trọng tâm câu hỏi.

7. ĐỘ DÀI CÂU TRẢ LỜI:
   ⚠️ QUAN TRỌNG: Giữ câu trả lời ngắn gọn, súc tích.
   - Câu hỏi đơn giản (ai, gì, bao nhiêu): 1-2 câu
   - Câu hỏi phức tạp (giải thích, liệt kê): Tối đa 3-4 câu
   
   VÍ DỤ:
   VÍ DỤ:
   Câu hỏi: "Chính ủy trung đoàn là ai?"
   ✅ ĐÚNG: "Chính ủy Trung đoàn 8 là Trung tá Trần Văn Tới, sinh năm 1978."
   ❌ SAI: "Chính ủy Trung đoàn 8 là Trung tá Trần Văn Tới, sinh năm 1978. Ông phụ trách công tác..."

   VÍ DỤ LIỆT KÊ:
   Câu hỏi: "Chỉ huy sư đoàn gồm những ai?"
   ✅ ĐÚNG: "Chỉ huy Sư đoàn 395 gồm:
   1. Sư đoàn trưởng: Đại tá Nguyễn Huy Toàn
   2. Chính ủy Sư đoàn: Đại tá Lê Hồng Thắng
   3. Phó Sư đoàn trưởng: Đại tá Nguyễn Văn Tiệp..."
   ❌ SAI: "Gồm có Đại tá Nguyễn Huy Toàn, Đại tá Lê Hồng Thắng..." (Thiếu chức vụ)

7. NGÀY THÀNH LẬP VÀ NGÀY TRUYỀN THỐNG:
   ⚠️ QUAN TRỌNG:
   - Nếu câu hỏi về "Ngày thành lập" mà Context chỉ có "Ngày truyền thống", hãy coi hai khái niệm này là một.
   - Trả lời bằng thông tin "Ngày truyền thống" trong Context.
   - Ví dụ:
     Context: "**Ngày truyền thống:** 12/02/1971"
     Câu hỏi: "Ngày thành lập của đơn vị là ngày nào?"
     ✅ ĐÚNG: "Ngày thành lập (Ngày truyền thống) của đơn vị là ngày 12/02/1971."

8. QUY TẮC LIỆT KÊ CÁN BỘ (BẮT BUỘC):
   ⚠️ KHI TRẢ LỜI VỀ NHÂN SỰ/CHỈ HUY (Đặc biệt là cấp Quân khu, Sư đoàn):
   - BẮT BUỘC dùng định dạng danh sách (xuống dòng gạch đầu dòng).
   - PHẢI ghi rõ: **[CHỨC VỤ] + [CẤP BẬC] + [HỌ TÊN]**
   - KHÔNG được viết liền một câu. KHÔNG được bỏ sót chức vụ.
   
   Ví dụ 1 (ĐÚNG):
   "Thủ trưởng Bộ tư lệnh Quân khu 3 gồm:
   - Tư lệnh Quân khu: Trung tướng Lương Văn Kiểm
   - Chính ủy Quân khu: Trung tướng Nguyễn Đức Hưng
   - Phó Tư lệnh: Thiếu tướng Lê Văn Long..."
   
   Ví dụ 2 (SAI - Cấm kỵ):
   "Thủ trưởng gồm Trung tướng Lương Văn Kiểm, Nguyễn Đức Hưng..." (Viết liền, thiếu chức vụ)

9. CẤU TRÚC:
   - Trả lời ngắn gọn, đúng trọng tâm câu hỏi
   - KHÔNG thêm chi tiết không được hỏi
   - Kết thúc: Gợi ý 1-2 câu hỏi liên quan (phong cách tự nhiên, thân thiện)


8. NGÔN NGỮ & PHONG CÁCH GỢI Ý:
   ⚠️ CỰC KỲ QUAN TRỌNG: Chỉ được dùng TIẾNG VIỆT.
   - KHÔNG được lẫn tiếng Trung (感兴趣, 相关, etc.)
   - KHÔNG được lẫn tiếng Anh (except technical terms)
   
   **GỢI Ý CÂU HỎI - PHONG CÁCH TỰ NHIÊN:**
   ✅ ĐÚNG (thân thiện): 
   - "Bạn có thể muốn biết thêm về nhiệm vụ của ông ấy?"
   - "Nếu bạn quan tâm, tôi có thể cho biết về phong cách làm việc của ông ấy."
   - "Bạn muốn tìm hiểu về chức trách của ông ấy không?"
   
   ❌ SAI (cứng nhắc):
   - "Câu hỏi có thể thêm:"
   - "Chức vụ của Trung tá Trần Văn Tới là gì?"
   - "Ông Trần Văn Tới được giao nhiệm vụ chính nào trong đơn vị?"

9. NẾU KHÔNG CÓ THÔNG TIN:
   - Nói rõ: "Xin lỗi, tài liệu hiện tại chưa có thông tin về vấn đề này."
   - Gợi ý chủ đề gần nhất có trong tài liệu."""
            
            if system_prompt:
                combined = f"{rag_system_instruction}\n\n{system_prompt}"
                messages = [{"role": "system", "content": combined}]
            else:
                messages = [{"role": "system", "content": rag_system_instruction}]
            
            # Format user message
            if context:
                user_content = f"""Context từ tài liệu:
\"\"\"
{context}
\"\"\"

Câu hỏi: {user_message}

Trả lời dựa trên Context:"""
            else:
                user_content = user_message
            
            # === OPTIMIZED: Append instruction to user message (Recency Bias for 3B models) ===
            # Small models tend to forget system prompt instructions.
            # Reminding them at the very end is much more effective.
            user_content += """

(⚠️ QUAN TRỌNG: 
- TÊN NGƯỜI phải COPY CHÍNH XÁC từ Context, KHÔNG được đổi chữ nào!
- Ví dụ: "Nguyễn Văn Phong" KHÔNG được viết thành "Nguyễn Văn Phước"
- Trả lời NGẮN GỌN 1-2 câu. Gợi ý câu hỏi tự nhiên.)"""
            
            messages.append({"role": "user", "content": user_content})
            
            logger.bind(tag=__name__).info(
                f"Generating (context: {len(context)} chars, model: {self.model_name})"
            )
            
            # Stream response
            # === INCREASE max_tokens for list queries ===
            max_predict = self.max_tokens
            if is_list_context:
                max_predict = 4096  # Allow longer output for full list enumeration
                logger.bind(tag=__name__).info(f"List query detected, increasing max_tokens to {max_predict}")
            
            response = ollama.chat(
                model=self.model_name,
                stream=True,
                messages=messages,
                options={
                    "temperature": self.temperature,
                    "num_predict": max_predict,
                    "num_ctx": 2048,  # Context window (prompt + response) - reduced for speed
                    "top_p": 0.85  # Reduce randomness
                }
            )
            
            for chunk in response:
                if not chunk.get("done", False):
                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        yield content
                else:
                    break
                    
        except Exception as e:
            error_msg = f"❌ Lỗi: {str(e)}"
            logger.bind(tag=__name__).error(error_msg, exc_info=True)
            yield error_msg
    
    def response(self, session_id: str, dialogue: list, **kwargs):
        """Standard response method for WebSocket compatibility"""
        try:
            user_message = ""
            system_prompt = ""
            
            for msg in dialogue:
                if msg.get("role") == "system":
                    system_prompt = msg.get("content", "")
                elif msg.get("role") == "user":
                    user_message = msg.get("content", "")
            
            if not user_message:
                yield "Không có câu hỏi"
                return
            
            import asyncio
            
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    raise RuntimeError("Event loop is closed")
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            async def collect_chunks():
                chunks = []
                async for chunk in self.chat_stream(user_message, system_prompt):
                    chunks.append(chunk)
                return chunks
            
            chunks = loop.run_until_complete(collect_chunks())
            
            for chunk in chunks:
                yield chunk
                    
        except Exception as e:
            error_msg = f"❌ Lỗi: {str(e)}"
            logger.bind(tag=__name__).error(error_msg, exc_info=True)
            yield error_msg
    
    def response_with_functions(self, session_id: str, dialogue: list, functions=None):
        """Response with function calling (not implemented)"""
        for chunk in self.response(session_id, dialogue):
            yield (chunk, None)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        stats = {
            "initialized": self._initialized,
            "rag_enabled": self.rag_enabled,
            "strict_mode": self.strict_mode,
            "embedding_model": self.embedding_config.model_id,
            "model_name": self.model_name,
            "chunk_size": self.rag_config.chunk_size,
            "chunk_overlap": self.rag_config.chunk_overlap,
            "similarity_threshold": SIMILARITY_THRESHOLD,
            "max_context_tokens": MAX_CONTEXT_TOKENS
        }
        
        if hasattr(self, 'collections') and self.collections:
            stats["collections"] = {
                name: coll.count() 
                for name, coll in self.collections.items()
            }
        else:
            stats["vector_store"] = self.chroma_manager.get_stats()
        
        return stats