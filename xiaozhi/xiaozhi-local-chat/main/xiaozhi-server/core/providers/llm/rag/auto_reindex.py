"""
Auto Re-index Module
Automatically re-index documents on startup or when files change
"""
import os
import time
import hashlib
import json
from pathlib import Path
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class AutoReindexManager:
    """Manage automatic re-indexing of documents"""
    
    def __init__(self, 
                 document_dir: str,
                 cache_file: str = "./data/.reindex_cache.json"):
        self.document_dir = Path(document_dir)
        self.cache_file = Path(cache_file)
        self.file_hashes: Dict[str, str] = {}
        
        # Ensure cache dir exists
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load previous hashes
        self._load_cache()
    
    def _load_cache(self):
        """Load previous file hashes from cache"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    self.file_hashes = json.load(f)
                logger.info(f"Loaded {len(self.file_hashes)} file hashes from cache")
            except Exception as e:
                logger.warning(f"Failed to load cache: {e}")
                self.file_hashes = {}
    
    def _save_cache(self):
        """Save current file hashes to cache"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.file_hashes, f, indent=2)
            logger.info(f"Saved {len(self.file_hashes)} file hashes to cache")
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")
    
    def _compute_file_hash(self, file_path: Path) -> str:
        """Compute MD5 hash of file content"""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception as e:
            logger.error(f"Failed to hash {file_path}: {e}")
            return ""
    
    def check_files_changed(self, 
                           file_patterns: List[str] = ['*.md']) -> Dict[str, str]:
        """
        Check which files have changed
        
        Returns:
            Dict mapping file path to status ('new', 'modified', 'unchanged')
        """
        changes = {}
        
        for pattern in file_patterns:
            for file_path in self.document_dir.glob(pattern):
                if file_path.is_file():
                    rel_path = str(file_path.relative_to(self.document_dir.parent))
                    current_hash = self._compute_file_hash(file_path)
                    
                    if rel_path not in self.file_hashes:
                        changes[rel_path] = 'new'
                    elif self.file_hashes[rel_path] != current_hash:
                        changes[rel_path] = 'modified'
                    else:
                        changes[rel_path] = 'unchanged'
                    
                    # Update hash
                    self.file_hashes[rel_path] = current_hash
        
        return changes
    
    def get_files_to_reindex(self) -> List[str]:
        """Get list of files that need re-indexing"""
        changes = self.check_files_changed(['*.md'])
        
        files_to_index = [
            file_path for file_path, status in changes.items()
            if status in ('new', 'modified')
        ]
        
        return files_to_index
    
    def mark_indexed(self, file_paths: List[str]):
        """Mark files as indexed and save cache"""
        # Hashes already updated in check_files_changed
        self._save_cache()
    
    def should_reindex(self) -> bool:
        """Check if any files need re-indexing"""
        files = self.get_files_to_reindex()
        return len(files) > 0


# Singleton instance
_auto_reindex_manager: Optional[AutoReindexManager] = None

def get_auto_reindex_manager(document_dir: str = None) -> AutoReindexManager:
    """Get singleton AutoReindexManager instance"""
    global _auto_reindex_manager
    
    if _auto_reindex_manager is None:
        if document_dir is None:
            document_dir = "../../.."  # Default to project root
        _auto_reindex_manager = AutoReindexManager(document_dir)
    
    return _auto_reindex_manager


def auto_reindex_on_startup(rag_provider, document_paths: Dict[str, str]):
    """
    Auto re-index documents on startup if they changed
    
    Args:
        rag_provider: RAG provider instance with collections
        document_paths: Dict mapping collection_name -> file_path
    
    Returns:
        Dict with reindex results
    """
    logger.info("🔍 Checking for document changes...")
    
    manager = get_auto_reindex_manager()
    files_to_index = manager.get_files_to_reindex()
    
    if not files_to_index:
        logger.info("✅ No document changes detected, skipping re-index")
        return {'reindexed': [], 'skipped': list(document_paths.values())}
    
    logger.info(f"📝 Found {len(files_to_index)} changed files:")
    for f in files_to_index:
        logger.info(f"   - {f}")
    
    # Re-index changed files
    reindexed = []
    
    from core.providers.llm.rag.document_loader import DocumentLoader
    from core.providers.llm.rag.model_manager import get_model_manager
    import chromadb
    
    # Initialize if needed
    model_mgr = get_model_manager()
    if not hasattr(model_mgr, '_initialized') or not model_mgr._initialized:
        logger.info("Initializing model manager for re-index...")
        model_mgr.initialize(
            embedding_model_id="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            cross_encoder_id="cross-encoder/ms-marco-MiniLM-L-6-v2",
            requires_tokenizer=True
        )
    
    loader = DocumentLoader(chunk_size=800, chunk_overlap=250)
    client = chromadb.PersistentClient('./data/rag-chroma')
    
    # Personnel keywords for has_roles metadata
    KEYWORDS = {
        'chinh_tri': ['chính uỷ', 'chính trị viên', 'bí thư', 'họ tên:', 'chức vụ:', 
                      'đại đội', 'tiểu đoàn', 'trung đoàn', 'cấp bậc:', 'năm sinh:',
                      'nhiệm vụ chính:', 'kinh nghiệm:'],
        'quan_su': ['trung đoàn trưởng', 'đại đội trưởng', 'phó trung đoàn', 'họ tên:', 'chức vụ:',
                    'đại đội', 'tiểu đoàn', 'cấp bậc:', 'năm sinh:',
                    'nhiệm vụ chính:', 'kinh nghiệm:'],
        'hau_can': ['họ tên:', 'chức vụ:', 'cấp bậc:', 'năm sinh:'],
        'ky_thuat': ['họ tên:', 'chức vụ:', 'cấp bậc:', 'năm sinh:'],
    }
    
    for collection_name, file_path in document_paths.items():
        try:
            rel_path = str(Path(file_path).relative_to(manager.document_dir.resolve()))
        except ValueError:
            # Fallback if path issues
             rel_path = Path(file_path).name

        if rel_path not in files_to_index and Path(file_path).name not in [Path(f).name for f in files_to_index]:
             # Double check if we should index based on filename match simple check
             # But better to trust files_to_index from manager
             pass
        
        # Simpler check: Just check if this file_path corresponds to one in files_to_index
        # Iterate files_to_index to find match
        should_process = False
        for changed_file in files_to_index:
             if Path(changed_file).name == Path(file_path).name:
                 should_process = True
                 break
        
        if not should_process:
            continue
        
        logger.info(f"\n🔄 Re-indexing {collection_name}...")
        
        try:
            # Load document
            docs, stats = loader.load_and_split(file_path)
            
            # Define category for ID generation
            category = collection_name.replace('xiaozhi_', '')
            
            # Use MetadataExtractor
            from core.providers.llm.rag.metadata_extractor import MetadataExtractor
            metadata_extractor = MetadataExtractor()
            metadata_extractor = MetadataExtractor()
            
            for doc in docs:
                # Extract rich metadata
                extracted_meta = metadata_extractor.extract_metadata(doc.page_content)
                
                # Merge into document metadata
                doc.metadata.update(extracted_meta)
                
                # Ensure has_roles is set (it is set by extract_metadata)
                # Also ensure has_personnel is set
                
                # Debug logging for valid chunks
                if doc.metadata.get('has_roles'):
                    # logger.info(f"   + Role found: {doc.page_content[:30]}...")
                    pass
            
            # Create embeddings
            texts = [doc.page_content for doc in docs]
            embeddings = model_mgr.encode(texts, normalize=True)
            
            # Delete old collection
            try:
                client.delete_collection(collection_name)
            except:
                pass
            
            # Create new
            collection = client.create_collection(collection_name)
            
            # Add documents
            ids = [f"{category}_{i}" for i in range(len(docs))]
            
            # Clean metadata
            cleaned_metas = []
            for meta in [doc.metadata for doc in docs]:
                cleaned = {}
                for k, v in meta.items():
                    if isinstance(v, list):
                        cleaned[k] = ', '.join(str(x) for x in v)
                    elif v is not None and isinstance(v, (str, int, float, bool)):
                        cleaned[k] = v
                cleaned_metas.append(cleaned)
            
            collection.add(
                ids=ids,
                documents=texts,
                embeddings=embeddings.tolist(),
                metadatas=cleaned_metas
            )
            
            logger.info(f"   ✅ {collection.count()} documents indexed")
            reindexed.append(collection_name)
            
        except Exception as e:
            logger.error(f"   ❌ Failed to re-index {collection_name}: {e}")
    
    # Mark as indexed
    manager.mark_indexed(files_to_index)
    
    logger.info(f"\n✅ Auto re-index complete: {len(reindexed)} collections updated")
    
    return {
        'reindexed': reindexed,
        'changed_files': files_to_index
    }
