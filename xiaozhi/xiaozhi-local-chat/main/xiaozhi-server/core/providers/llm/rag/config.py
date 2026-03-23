"""
RAG Configuration Module
Provides configuration options for different embedding models and RAG settings
"""

from dataclasses import dataclass
from typing import Literal

@dataclass
class EmbeddingModelConfig:
    """Configuration for embedding models"""
    model_id: str
    dimension: int
    size_mb: int
    description: str
    requires_tokenizer: bool = False

# Available embedding models
EMBEDDING_MODELS = {
    "lightweight": EmbeddingModelConfig(
        model_id="sentence-transformers/all-MiniLM-L6-v2",
        dimension=384,
        size_mb=80,
        description="Ultra-fast multilingual model, good for Vietnamese",
        requires_tokenizer=False
    ),
    "balanced": EmbeddingModelConfig(
        # OPTION 1: Dùng HuggingFace (cần mạng lần đầu)
        # model_id="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        
        # OPTION 2: Dùng đường dẫn LOCAL (offline 100%)
        # Thay đổi đường dẫn này nếu bạn đã có model local
        model_id="C:/Users/Admin/.cache/huggingface/hub/models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2/snapshots/86741b4e3f5cb7765a600d3a3d55a0f6a6cb443d",
        
        dimension=384,
        size_mb=120,
        description="Balanced speed/quality multilingual model (LOCAL)",
        requires_tokenizer=False
    ),
    "quality": EmbeddingModelConfig(
        model_id="dangvantuan/vietnamese-embedding",
        dimension=768,
        size_mb=400,
        description="Best quality for Vietnamese, requires pyvi tokenizer",
        requires_tokenizer=True
    )
}

@dataclass
class RAGConfig:
    """RAG System Configuration"""
    # Embedding model selection
    embedding_model: Literal["lightweight", "balanced", "quality"] = "lightweight"
    
    # Cross-encoder for re-ranking
    # OPTION 1: HuggingFace (requires internet first time)
    # cross_encoder_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    
    # OPTION 2: Local path (offline 100%)
    cross_encoder_model: str = "C:/Users/Admin/.cache/huggingface/hub/models--cross-encoder--ms-marco-MiniLM-L-6-v2/snapshots/c5ee24cb16019beea0893ab7796b1df96625c6b8"
    
    # Document processing
    chunk_size: int = 400
    chunk_overlap: int = 100
    
    # Retrieval settings
    n_results: int = 10  # Initial retrieval count
    top_k_rerank: int = 3  # Final results after re-ranking
    
    # Performance optimizations
    enable_cache: bool = True
    cache_size: int = 100  # Number of queries to cache
    parallel_processing: bool = True
    batch_size: int = 32  # Batch size for embedding generation
    
    # Storage
    chroma_path: str = "./data/rag-chroma"
    collection_name: str = "xiaozhi_docs"
    
    # Document limits
    max_file_size_mb: int = 50
    max_pages: int = 500
    
    def get_embedding_config(self) -> EmbeddingModelConfig:
        """Get the selected embedding model configuration"""
        return EMBEDDING_MODELS[self.embedding_model]
