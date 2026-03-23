"""
List Retrieval Module
Special retrieval logic for numbered lists
"""
import logging
from typing import List, Dict
import chromadb

logger = logging.getLogger(__name__)


def retrieve_full_list(
    collection: chromadb.Collection,
    list_name: str,
    model_manager
) -> str:
    """
    Retrieve ALL chunks of a numbered list and reconstruct in order
    
    Args:
        collection: ChromaDB collection
        list_name: Name of list (e.g., '10_loi_the', '23_dau_cong_viec')
        model_manager: Model manager for embeddings
        
    Returns:
        Complete ordered list content
    """
    from core.providers.llm.rag.list_detector import get_list_config
    
    try:
        logger.info(f"📋 Retrieving full list: {list_name}")
        
        config = get_list_config(list_name)
        if not config:
            logger.warning(f"No config found for list: {list_name}")
            return ""
        
        # Search by section pattern AND keywords for better matching
        section_patterns = config.get('section_patterns', [])
        keywords = config.get('keywords', [])
        
        # Build a more specific search query
        search_query = section_patterns[0] if section_patterns else list_name
        if keywords:
            search_query += " " + " ".join(keywords[:3])  # Add top 3 keywords
        
        logger.info(f"List search query: {search_query}")
        
        # Get embeddings for search query
        if hasattr(model_manager, 'embedding_model') and model_manager.embedding_model:
            query_embedding = model_manager.embedding_model.encode([search_query]).tolist()
            
            # Query with embedding
            results = collection.query(
                query_embeddings=query_embedding,
                n_results=30,  # Get more results to capture full list
                include=['documents', 'metadatas', 'distances']
            )
        else:
            # Fallback to text query
            results = collection.query(
                query_texts=[search_query],
                n_results=30,
                include=['documents', 'metadatas', 'distances']
            )
        
        if not results['documents'] or not results['documents'][0]:
            logger.warning(f"No documents found for list: {list_name}")
            return ""
        
        # Filter and collect relevant chunks
        items = []
        total_items = config.get('total_items', 10)
        keywords = config.get('keywords', [])
        
        for doc, meta, dist in zip(
            results['documents'][0], 
            results['metadatas'][0], 
            results['distances'][0]
        ):
            doc_lower = doc.lower()
            is_list_chunk = False
            
            # Check for section pattern match (header)
            import re
            for pattern in section_patterns:
                if re.search(pattern, doc, re.IGNORECASE):
                    is_list_chunk = True
                    break
            
            # Check for numbered items (1. 2. 3. etc)
            if not is_list_chunk:
                numbered_items = re.findall(r'^\d+\.\s', doc, re.MULTILINE)
                if len(numbered_items) >= 1:
                    is_list_chunk = True
            
            # Or check for keyword match  
            if not is_list_chunk and keywords:
                keyword_matches = sum(1 for kw in keywords if kw.lower() in doc_lower)
                if keyword_matches >= 2:
                    is_list_chunk = True
            
            if is_list_chunk and dist < 1.0:  # Only accept close matches
                items.append((dist, doc, meta))
        
        if not items:
            logger.warning(f"No list items found for: {list_name}")
            return ""
        
        # Sort by distance (closest first) and deduplicate
        items.sort(key=lambda x: x[0])
        
        # Take the most relevant chunks
        seen_content = set()
        unique_items = []
        for dist, doc, meta in items:
            content_hash = doc[:100]  # Use first 100 chars as key
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                unique_items.append((dist, doc, meta))
        
        # Reconstruct full list
        content_parts = [f"=== DANH SÁCH: {list_name.upper().replace('_', ' ')} ==="]
        
        for dist, doc, meta in unique_items[:5]:  # Limit to top 5 chunks
            content_parts.append(doc)
        
        full_content = "\n\n".join(content_parts)
        
        logger.info(
            f"✅ Retrieved full list: {list_name} "
            f"({len(unique_items)} chunks, {len(full_content)} chars)"
        )
        
        return full_content
        
    except Exception as e:
        logger.error(f"Error retrieving full list {list_name}: {e}")
        import traceback
        traceback.print_exc()
        return ""



def retrieve_full_list_multi_collection(
    collections: Dict,
    list_name: str,
    model_manager
) -> str:
    """
    Retrieve full list across multiple collections
    
    Args:
        collections: Dict of collection_name -> collection
        list_name: Name of list
        model_manager: Model manager
        
    Returns:
        Complete ordered list content
    """
    # Try each collection
    for coll_name, collection in collections.items():
        result = retrieve_full_list(collection, list_name, model_manager)
        if result:
            logger.info(f"Found list '{list_name}' in collection '{coll_name}'")
            return result
    
    logger.warning(f"List '{list_name}' not found in any collection")
    return ""
