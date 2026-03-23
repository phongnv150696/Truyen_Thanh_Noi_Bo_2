"""
OPTIMIZED ChromaDB Vector Store Manager

Major fixes:
1. Multi-collection support (CRITICAL FIX)
2. Query cache for performance
3. Support include parameter for distances
4. Metadata validation
5. Query performance logging
"""

import logging
import time
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from functools import lru_cache
import hashlib

logger = logging.getLogger(__name__)


# ============================================================================
# QUERY CACHE (Global cache for query results)
# ============================================================================
class QueryCache:
    """Cache for vector search queries"""
    
    def __init__(self, max_size: int = 500):
        self._cache = {}
        self._max_size = max_size
        self._hits = 0
        self._misses = 0
    
    def _make_key(
        self, 
        query_embedding: List[float], 
        n_results: int,
        collection_name: str
    ) -> str:
        """Create cache key from query parameters"""
        # Hash first 10 dims of embedding for speed
        emb_sample = str(query_embedding[:10])
        key_str = f"{collection_name}:{n_results}:{emb_sample}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(
        self, 
        query_embedding: List[float], 
        n_results: int,
        collection_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached query result"""
        key = self._make_key(query_embedding, n_results, collection_name)
        
        if key in self._cache:
            self._hits += 1
            return self._cache[key]
        
        self._misses += 1
        return None
    
    def put(
        self, 
        query_embedding: List[float], 
        n_results: int,
        collection_name: str,
        result: Dict[str, Any]
    ):
        """Store query result in cache"""
        key = self._make_key(query_embedding, n_results, collection_name)
        
        # Simple LRU: remove oldest if full
        if len(self._cache) >= self._max_size:
            self._cache.pop(next(iter(self._cache)))
        
        self._cache[key] = result
    
    def clear(self):
        """Clear cache"""
        self._cache.clear()
        self._hits = 0
        self._misses = 0
    
    def stats(self) -> dict:
        """Get cache statistics"""
        total = self._hits + self._misses
        hit_rate = self._hits / total if total > 0 else 0
        
        return {
            'size': len(self._cache),
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': hit_rate
        }


# Global query cache
_query_cache = QueryCache(max_size=500)


# ============================================================================
# CHROMADB MANAGER (Multi-collection support)
# ============================================================================
class ChromaDBManager:
    """
    OPTIMIZED Manager for ChromaDB with multi-collection support
    
    CRITICAL FIX: Each initialize() creates a NEW instance with its own collection
    instead of overwriting the singleton's collection
    """
    _client: Optional[any] = None
    _client_path: str = ""
    
    def __init__(self):
        """Initialize instance variables (NOT singleton anymore for collections)"""
        self._collection: Optional[any] = None
        self._chroma_path: str = ""
        self._collection_name: str = ""
        self._initialized: bool = False
    
    @classmethod
    def _get_or_create_client(cls, chroma_path: str):
        """Get or create shared ChromaDB client (singleton for client only)"""
        if cls._client is None or cls._client_path != chroma_path:
            import chromadb
            
            # Create directory if not exists
            Path(chroma_path).mkdir(parents=True, exist_ok=True)
            
            cls._client = chromadb.PersistentClient(path=chroma_path)
            cls._client_path = chroma_path
            
            logger.info(f"Created ChromaDB client at {chroma_path}")
        
        return cls._client
    
    def initialize(self, chroma_path: str, collection_name: str) -> Tuple[bool, str]:
        """
        Initialize ChromaDB collection
        
        IMPORTANT: This creates/loads a specific collection for THIS instance
        Multiple instances can have different collections
        
        Args:
            chroma_path: Path to ChromaDB storage
            collection_name: Name of the collection
        
        Returns:
            (success, message)
        """
        try:
            # Get shared client
            client = self._get_or_create_client(chroma_path)
            
            self._chroma_path = chroma_path
            self._collection_name = collection_name
            
            # Get or create THIS collection
            self._collection = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}  # Use cosine similarity
            )
            
            self._initialized = True
            
            count = self._collection.count()
            msg = f"✅ Collection '{collection_name}' ready ({count} docs)"
            logger.info(msg)
            return True, msg
            
        except Exception as e:
            error_msg = f"❌ Error initializing collection '{collection_name}': {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg
    
    def add_documents(
        self,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None,
        batch_size: int = 100
    ) -> Tuple[bool, str]:
        """
        Add documents to the collection with batching and validation
        
        Args:
            documents: List of document texts
            embeddings: List of embedding vectors
            metadatas: Optional metadata for each document
            ids: Optional IDs for documents
            batch_size: Batch size for insertion
        
        Returns:
            (success, message)
        """
        if self._collection is None:
            return False, "Collection not initialized"
        
        try:
            start_time = time.time()
            
            # Generate IDs if not provided
            if ids is None:
                ids = [self._generate_id(doc, i) for i, doc in enumerate(documents)]
            
            # Default metadata
            if metadatas is None:
                metadatas = [{"index": i} for i in range(len(documents))]
            
            # === VALIDATE METADATA ===
            validated_metadatas = self._validate_metadatas(metadatas)
            
            # Batch insertion for better performance
            total_docs = len(documents)
            for i in range(0, total_docs, batch_size):
                end_idx = min(i + batch_size, total_docs)
                
                self._collection.upsert(
                    documents=documents[i:end_idx],
                    embeddings=embeddings[i:end_idx],
                    metadatas=validated_metadatas[i:end_idx],
                    ids=ids[i:end_idx]
                )
                
                if (end_idx - i) == batch_size:
                    logger.debug(f"Inserted batch {i//batch_size + 1}/{(total_docs-1)//batch_size + 1}")
            
            # Clear query cache after adding documents
            _query_cache.clear()
            
            elapsed = time.time() - start_time
            msg = f"✅ Added {total_docs} documents in {elapsed:.2f}s"
            logger.info(msg)
            return True, msg
            
        except Exception as e:
            error_msg = f"❌ Error adding documents: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg
    
    def query(
        self,
        query_embedding: List[float],
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
        include: Optional[List[str]] = None,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Query the collection with an embedding vector
        
        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return
            where: Optional metadata filter
            include: What to include in results (e.g., ['documents', 'distances', 'metadatas'])
            use_cache: Use query cache
        
        Returns:
            Query results dict or None on error
        """
        if self._collection is None:
            logger.error("Collection not initialized")
            return None
        
        try:
            # === CHECK CACHE (only if no filter and cache enabled) ===
            if use_cache and where is None:
                cached = _query_cache.get(
                    query_embedding, 
                    n_results, 
                    self._collection_name
                )
                if cached is not None:
                    logger.debug(f"Query cache hit for '{self._collection_name}'")
                    return cached
            
            start_time = time.time()
            
            # === DEFAULT INCLUDE ===
            if include is None:
                include = ['documents', 'distances', 'metadatas']
            
            # === QUERY ===
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where,
                include=include
            )
            
            elapsed = time.time() - start_time
            
            # Log performance
            num_results = len(results.get('documents', [[]])[0])
            logger.debug(
                f"Query '{self._collection_name}' completed in {elapsed*1000:.1f}ms, "
                f"found {num_results}/{n_results} results"
            )
            
            # Log slow queries
            if elapsed > 0.5:
                logger.warning(
                    f"⚠️ Slow query detected ({elapsed:.2f}s) for '{self._collection_name}'"
                )
            
            # === STORE IN CACHE ===
            if use_cache and where is None:
                _query_cache.put(
                    query_embedding, 
                    n_results, 
                    self._collection_name,
                    results
                )
            
            return results
            
        except Exception as e:
            logger.error(f"Error querying collection '{self._collection_name}': {e}", exc_info=True)
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if self._collection is None:
            return {"initialized": False, "count": 0}
        
        try:
            count = self._collection.count()
            return {
                "initialized": True,
                "count": count,
                "path": self._chroma_path,
                "collection": self._collection_name
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"initialized": False, "count": 0, "error": str(e)}
    
    def delete_collection(self) -> Tuple[bool, str]:
        """Delete the current collection"""
        if not self._initialized:
            return False, "Collection not initialized"
        
        try:
            client = self._get_or_create_client(self._chroma_path)
            client.delete_collection(name=self._collection_name)
            self._collection = None
            self._initialized = False
            
            # Clear cache
            _query_cache.clear()
            
            msg = f"✅ Deleted collection: {self._collection_name}"
            logger.info(msg)
            return True, msg
            
        except Exception as e:
            error_msg = f"❌ Error deleting collection: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def reset_collection(self) -> Tuple[bool, str]:
        """Delete and recreate the collection"""
        # Delete existing
        success, msg = self.delete_collection()
        if not success:
            return False, msg
        
        # Recreate
        return self.initialize(self._chroma_path, self._collection_name)
    
    @staticmethod
    def _generate_id(text: str, index: int) -> str:
        """Generate unique ID for a document"""
        # Use hash of text + index for uniqueness
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        return f"doc_{index}_{text_hash}"
    
    @staticmethod
    def _validate_metadatas(metadatas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate and clean metadata for ChromaDB
        
        ChromaDB requirements:
        - Values must be: str, int, float, or bool
        - No None values
        - No arrays/lists (convert to CSV strings)
        """
        validated = []
        
        for meta in metadatas:
            clean_meta = {}
            
            for key, value in meta.items():
                # Handle None
                if value is None:
                    continue
                
                # Handle lists/arrays (convert to CSV string)
                if isinstance(value, (list, tuple)):
                    if value:
                        # Convert to comma-separated string
                        clean_meta[key] = ','.join(str(v) for v in value)
                    else:
                        clean_meta[key] = ''
                
                # Handle dicts (convert to JSON string)
                elif isinstance(value, dict):
                    import json
                    clean_meta[key] = json.dumps(value)
                
                # Handle valid types
                elif isinstance(value, (str, int, float, bool)):
                    clean_meta[key] = value
                
                # Handle other types (convert to string)
                else:
                    clean_meta[key] = str(value)
            
            validated.append(clean_meta)
        
        return validated
    
    @property
    def is_ready(self) -> bool:
        """Check if collection is initialized"""
        return self._initialized and self._collection is not None
    
    @property
    def collection(self):
        """Get collection instance"""
        if self._collection is None:
            raise RuntimeError(f"Collection '{self._collection_name}' not initialized")
        return self._collection


# ============================================================================
# FACTORY FUNCTIONS
# ============================================================================
def get_chroma_manager() -> ChromaDBManager:
    """
    Create a NEW ChromaDB manager instance
    
    NOTE: This is NOT a singleton anymore - each call creates a new instance
    This allows multiple collections to coexist
    """
    return ChromaDBManager()


def get_query_cache_stats() -> dict:
    """Get global query cache statistics"""
    return _query_cache.stats()


def clear_query_cache():
    """Clear global query cache"""
    _query_cache.clear()
    logger.info("Query cache cleared")


# ============================================================================
# TESTING
# ============================================================================
if __name__ == "__main__":
    import numpy as np
    
    print("="*60)
    print("OPTIMIZED VECTOR STORE TEST")
    print("="*60)
    
    # Test 1: Multi-collection support
    print("\n1. MULTI-COLLECTION TEST")
    print("-"*60)
    
    # Create two different collections
    manager1 = get_chroma_manager()
    success1, msg1 = manager1.initialize("./test_chroma", "collection_1")
    print(f"Collection 1: {msg1}")
    
    manager2 = get_chroma_manager()
    success2, msg2 = manager2.initialize("./test_chroma", "collection_2")
    print(f"Collection 2: {msg2}")
    
    # Verify they are different
    print(f"\nManager 1 collection: {manager1._collection_name}")
    print(f"Manager 2 collection: {manager2._collection_name}")
    print(f"Are different objects: {manager1._collection != manager2._collection}")
    
    # Test 2: Add documents with metadata validation
    print("\n2. METADATA VALIDATION TEST")
    print("-"*60)
    
    test_docs = ["Document 1", "Document 2"]
    test_embeddings = [
        np.random.rand(384).tolist(),
        np.random.rand(384).tolist()
    ]
    
    # Metadata with various types (including problematic ones)
    test_metadatas = [
        {
            'source': 'file1.txt',
            'personnel': ['Trần Văn A', 'Nguyễn Văn B'],  # List → CSV
            'has_roles': True,  # Bool OK
            'count': 5,  # Int OK
            'score': 0.95,  # Float OK
            'data': None,  # None → skip
            'nested': {'key': 'value'}  # Dict → JSON string
        },
        {
            'source': 'file2.txt',
            'personnel': [],  # Empty list → empty string
            'has_roles': False
        }
    ]
    
    success, msg = manager1.add_documents(
        documents=test_docs,
        embeddings=test_embeddings,
        metadatas=test_metadatas
    )
    print(f"Add documents: {msg}")
    
    # Test 3: Query with cache
    print("\n3. QUERY CACHE TEST")
    print("-"*60)
    
    query_emb = np.random.rand(384).tolist()
    
    # First query (cache miss)
    start = time.time()
    results1 = manager1.query(query_emb, n_results=2, include=['documents', 'distances'])
    time1 = time.time() - start
    print(f"First query: {time1*1000:.1f}ms")
    
    # Second query (cache hit)
    start = time.time()
    results2 = manager1.query(query_emb, n_results=2)
    time2 = time.time() - start
    print(f"Second query: {time2*1000:.1f}ms (cached)")
    print(f"Speedup: {time1/time2:.1f}x")
    
    # Cache stats
    stats = get_query_cache_stats()
    print(f"\nCache stats: {stats}")
    
    # Cleanup
    print("\n4. CLEANUP")
    print("-"*60)
    manager1.delete_collection()
    manager2.delete_collection()
    print("Collections deleted")