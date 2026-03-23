"""
Hybrid Search Implementation (BM25 + Vector + RRF)
"""
import math
import logging
from typing import List, Dict, Any, Tuple
from collections import Counter

logger = logging.getLogger(__name__)

class SimpleBM25:
    """
    Lightweight BM25 implementation (no external dependencies)
    """
    def __init__(self, corpus: List[str]):
        self.corpus_size = len(corpus)
        self.avgdl = 0
        self.doc_freqs = []
        self.idf = {}
        self.doc_len = []
        
        self._initialize(corpus)

    def _initialize(self, corpus: List[str]):
        """Build index"""
        total_len = 0
        for doc in corpus:
            tokens = self._tokenize(doc)
            self.doc_len.append(len(tokens))
            total_len += len(tokens)
            
            freqs = Counter(tokens)
            self.doc_freqs.append(freqs)
            
            for token in freqs:
                self.idf[token] = self.idf.get(token, 0) + 1
        
        self.avgdl = total_len / self.corpus_size
        
        # Calculate IDF
        # IDF = log((N - n + 0.5) / (n + 0.5) + 1)
        for token, freq in self.idf.items():
            self.idf[token] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1)

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization: lowercase + split"""
        # Improved tokenization for Vietnamese could be added here
        # For now, simple split is effective for exact matching names/numbers
        text = text.lower().replace('.', ' ').replace(',', ' ').replace(':', ' ')
        return text.split()

    def get_scores(self, query: str) -> List[float]:
        """Get BM25 scores for query against all docs"""
        query_tokens = self._tokenize(query)
        scores = [0.0] * self.corpus_size
        
        # BM25 parameters
        k1 = 1.5
        b = 0.75
        
        for i in range(self.corpus_size):
            score = 0
            doc_len = self.doc_len[i]
            freqs = self.doc_freqs[i]
            
            for token in query_tokens:
                if token not in freqs:
                    continue
                
                freq = freqs[token]
                numerator = self.idf.get(token, 0) * freq * (k1 + 1)
                denominator = freq + k1 * (1 - b + b * doc_len / self.avgdl)
                score += numerator / denominator
            
            scores[i] = score
            
        return scores


class HybridRetriever:
    """
    Combines Vector Search (Chroma) and Keyword Search (BM25)
    """
    def __init__(self, documents: List[str], metadatas: List[Dict] = None):
        self.documents = documents
        self.metadatas = metadatas if metadatas else [{}] * len(documents)
        self.bm25 = SimpleBM25(documents)
        
    def search(self, query: str, vector_results: List[Any], k: int = 5) -> List[str]:
        """
        Perform Hybrid Search using RRF
        
        Args:
            query: User text query
            vector_results: Results from ChromaDB query (list of docs)
            k: Number of results to return
            
        Returns:
            List of top K documents
        """
        # 1. Get BM25 scores
        bm25_scores = self.bm25.get_scores(query)
        
        # Create BM25 ranked list (doc_index, score)
        bm25_ranked = sorted(
            enumerate(bm25_scores), 
            key=lambda x: x[1], 
            reverse=True
        )
        # Keep top 20 for fusion
        bm25_indices = [idx for idx, score in bm25_ranked[:20] if score > 0]
        
        # 2. Get Vector ranked list
        # We assume vector_results contains the text of documents
        # We need to map them back to indices in self.documents
        # This is tricky if vector_results doesn't have IDs. 
        # Better approach: 
        #   Let the caller handle retrieval.
        #   Actually, for simplicity, let's assume vector_results IS the list of 
        #   document texts retrieved by Chroma. We need to match them.
        
        # Alternative Logic:
        # Since we initialized HybridRetriever with ALL docs, we know their order.
        # If vector_results passed in are just strings, we find their index.
        
        vector_indices = []
        for doc in vector_results:
            try:
                idx = self.documents.index(doc)
                vector_indices.append(idx)
            except ValueError:
                continue
                
        # 3. Reciprocal Rank Fusion (RRF)
        # score = 1 / (rank + 60)
        fusion_scores = {}
        
        # Process Vector Ranks
        for rank, idx in enumerate(vector_indices):
            fusion_scores[idx] = fusion_scores.get(idx, 0) + (1 / (rank + 60))
            
        # Process BM25 Ranks
        for rank, idx in enumerate(bm25_indices):
            fusion_scores[idx] = fusion_scores.get(idx, 0) + (1 / (rank + 60))
            
        # 4. Sort by Fusion Score
        final_ranked = sorted(
            fusion_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Return top K docs
        results = []
        for idx, score in final_ranked[:k]:
            results.append(self.documents[idx])
            
        return results
