"""
LlamaIndex Semantic Chunking Example
Demonstrates advanced semantic chunking with BKAI Vietnamese embeddings
"""

from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import Document
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_semantic_chunker(
    model_name: str = "bkai-foundation-models/vietnamese-bi-encoder",
    buffer_size: int = 1,
    breakpoint_percentile_threshold: int = 95
):
    """
    Create semantic chunker with Vietnamese embeddings
    
    Args:
        model_name: HuggingFace model for embeddings
        buffer_size: Number of sentences to group
        breakpoint_percentile_threshold: Percentile for semantic breaks (95 = top 5% differences)
    
    Returns:
        SemanticSplitterNodeParser instance
    """
    logger.info(f"Creating semantic chunker with model: {model_name}")
    
    # Initialize embedding model
    embed_model = HuggingFaceEmbedding(
        model_name=model_name,
        device="cuda"  # Use GPU if available
    )
    
    # Create semantic splitter
    splitter = SemanticSplitterNodeParser(
        buffer_size=buffer_size,
        breakpoint_percentile_threshold=breakpoint_percentile_threshold,
        embed_model=embed_model
    )
    
    logger.info("Semantic chunker created successfully")
    return splitter


def chunk_document_semantically(
    text: str,
    model_name: str = "bkai-foundation-models/vietnamese-bi-encoder"
):
    """
    Split document into semantic chunks
    
    Args:
        text: Document text to chunk
        model_name: Embedding model to use
    
    Returns:
        List of semantic chunks
    """
    # Create splitter
    splitter = create_semantic_chunker(model_name=model_name)
    
    # Create LlamaIndex document
    document = Document(text=text)
    
    # Split into semantic nodes
    nodes = splitter.get_nodes_from_documents([document])
    
    # Extract text from nodes
    chunks = [node.text for node in nodes]
    
    logger.info(f"Created {len(chunks)} semantic chunks")
    
    # Print chunk info
    for i, chunk in enumerate(chunks):
        logger.info(f"Chunk {i+1}: {len(chunk)} chars, starts with: {chunk[:50]}...")
    
    return chunks


def compare_chunking_methods(text: str):
    """
    Compare character-based vs semantic chunking
    
    Args:
        text: Document text
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    
    logger.info("=" * 50)
    logger.info("COMPARISON: Character vs Semantic Chunking")
    logger.info("=" * 50)
    
    # Method 1: Character-based (current)
    logger.info("\n1. Character-based chunking:")
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=150,
        separators=["\n## ", "\n### ", "\n", " "]
    )
    char_chunks = char_splitter.split_text(text)
    logger.info(f"   Created {len(char_chunks)} chunks")
    
    # Method 2: Semantic
    logger.info("\n2. Semantic chunking:")
    semantic_chunks = chunk_document_semantically(text)
    logger.info(f"   Created {len(semantic_chunks)} chunks")
    
    # Analysis
    logger.info("\n" + "=" * 50)
    logger.info("ANALYSIS:")
    logger.info(f"Character chunks: {len(char_chunks)}")
    logger.info(f"Semantic chunks: {len(semantic_chunks)}")
    logger.info(f"Avg char chunk size: {sum(len(c) for c in char_chunks) / len(char_chunks):.0f} chars")
    logger.info(f"Avg semantic chunk size: {sum(len(c) for c in semantic_chunks) / len(semantic_chunks):.0f} chars")
    
    return char_chunks, semantic_chunks


# Example usage
if __name__ == "__main__":
    # Load your document
    with open("../../document.md", "r", encoding="utf-8") as f:
        document_text = f.read()
    
    # Test semantic chunking
    logger.info("Testing semantic chunking with BKAI Vietnamese model...")
    
    # Option 1: Just semantic chunk
    chunks = chunk_document_semantically(
        document_text,
        model_name="bkai-foundation-models/vietnamese-bi-encoder"
    )
    
    # Option 2: Compare both methods
    # char_chunks, semantic_chunks = compare_chunking_methods(document_text)
    
    logger.info(f"\n✅ Done! Created {len(chunks)} semantic chunks")
    
    # Print first chunk as example
    print("\n" + "=" * 50)
    print("EXAMPLE CHUNK:")
    print("=" * 50)
    print(chunks[0][:500] + "...")
