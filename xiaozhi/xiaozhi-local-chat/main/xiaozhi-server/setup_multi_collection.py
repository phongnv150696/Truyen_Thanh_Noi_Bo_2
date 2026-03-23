"""
OPTIMIZED Multi-Collection RAG Setup
Major improvements:
1. Actually use entity extractor (not just import it)
2. Larger chunk size (800) for better context
3. Better error handling
4. Metadata validation
"""

import os
import sys
import asyncio
import logging

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from core.providers.llm.rag.config import RAGConfig
from core.providers.llm.rag.model_manager import get_model_manager
from core.providers.llm.rag.vector_store import get_chroma_manager
from core.providers.llm.rag.document_loader import DocumentLoader
from core.providers.llm.rag.entity_extractor import get_entity_extractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MultiCollectionSetup:
    """Setup multiple ChromaDB collections with entity-rich metadata"""
    
    CATEGORIES = {
        'chinh_tri': {
            'file': 'c:/Users/Admin/Desktop/Xiaozhi/chinh_tri.md',
            'collection': 'xiaozhi_chinh_tri',
            'description': 'Công tác Đảng, công tác chính trị'
        },
        'quan_su': {
            'file': 'c:/Users/Admin/Desktop/Xiaozhi/quan_su.md',
            'collection': 'xiaozhi_quan_su',
            'description': 'Công tác quân sự, huấn luyện'
        },
        'to_chuc': {
            'file': 'c:/Users/Admin/Desktop/Xiaozhi/to_chuc_don_vi.md',
            'collection': 'xiaozhi_to_chuc',
            'description': 'Tổ chức đơn vị, chỉ huy các cấp'
        },
        'hau_can': {
            'file': 'c:/Users/Admin/Desktop/Xiaozhi/hau_can.md',
            'collection': 'xiaozhi_hau_can',
            'description': 'Công tác hậu cần'
        },
        'ky_thuat': {
            'file': 'c:/Users/Admin/Desktop/Xiaozhi/ky_thuat.md',
            'collection': 'xiaozhi_ky_thuat',
            'description': 'Công tác kỹ thuật'
        }
    }

    
    def __init__(self):
        """Initialize RAG components with OPTIMIZED settings"""
        
        # === OPTIMIZED: Larger chunks for better context ===
        self.rag_config = RAGConfig(
            chunk_size=800,      # INCREASED from 500
            chunk_overlap=250,   # INCREASED from 150 (~31% overlap)
            n_results=15,
            top_k_rerank=5,
            chroma_path="data/rag-chroma",
            collection_name="xiaozhi"
        )
        
        # Get managers
        self.model_manager = get_model_manager()
        self.chroma_manager = get_chroma_manager()
        
        # === OPTIMIZED: Actually USE the entity extractor ===
        self.entity_extractor = get_entity_extractor()
        
        # Document loader with optimized chunking
        self.doc_loader = DocumentLoader(
            chunk_size=self.rag_config.chunk_size,
            chunk_overlap=self.rag_config.chunk_overlap
        )
        
        self.collections = {}
    
    async def initialize_models(self):
        """Initialize embedding and cross-encoder models"""
        
        logger.info("Initializing models...")
        
        # Use reliable multilingual model
        model_id = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
        
        success, msg = self.model_manager.initialize(
            embedding_model_id=model_id,
            cross_encoder_id=self.rag_config.cross_encoder_model,
            requires_tokenizer=False
        )
        
        if not success:
            raise RuntimeError(f"Model initialization failed: {msg}")
        
        logger.info(f"✅ Models initialized: {msg}")
    
    async def create_collection(self, category: str, collection_name: str):
        """Create a ChromaDB collection"""
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Creating collection: {collection_name}")
        logger.info(f"Category: {category}")
        logger.info(f"{'='*60}")
        
        success, msg = self.chroma_manager.initialize(
            chroma_path=self.rag_config.chroma_path,
            collection_name=collection_name
        )
        
        if not success:
            raise RuntimeError(f"Collection creation failed: {msg}")
        
        self.collections[category] = self.chroma_manager.collection
        
        logger.info(f"✅ Collection created: {collection_name}")
        
        return self.chroma_manager.collection
    
    async def index_category(
        self, 
        category: str, 
        file_path: str, 
        collection, 
        config: dict
    ):
        """
        Index documents with RICH entity metadata
        === OPTIMIZED: Actually use entity extraction ===
        """
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Indexing category: {category}")
        logger.info(f"File: {file_path}")
        logger.info(f"{'='*60}")
        
        if not os.path.exists(file_path):
            logger.error(f"❌ File not found: {file_path}")
            return False
        
        # Load and split documents
        try:
            docs_and_stats = self.doc_loader.load_and_split(file_path)
            if isinstance(docs_and_stats, tuple):
                documents = docs_and_stats[0]
            else:
                documents = docs_and_stats
                
            logger.info(f"Loaded {len(documents)} chunks (size={self.rag_config.chunk_size})")
        except Exception as e:
            logger.error(f"❌ Error loading document: {e}")
            return False
        
        # === OPTIMIZED: Extract entities for REAL metadata ===
        texts = []
        metadatas = []
        
        entity_stats = {
            'total_personnel': set(),
            'total_roles': set(),
            'total_units': set()
        }
        
        for i, doc in enumerate(documents):
            text = doc.page_content if hasattr(doc, 'page_content') else str(doc)
            texts.append(text)
            
            # === Extract entities using the extractor ===
            entities = self.entity_extractor.extract_all_entities(text)
            
            # Collect stats
            entity_stats['total_personnel'].update(entities['personnel'])
            entity_stats['total_roles'].update(entities['roles'])
            entity_stats['total_units'].update(entities['units'])
            
            # === RICH METADATA with actual entities ===
            metadata = {
                'source': file_path,
                'category': category,
                'chunk_id': i,
                
                # Entity arrays (for filtering)
                'personnel': entities['personnel'],  # ["Trần Văn Tới", ...]
                'roles': entities['roles'],          # ["chinh_uy", ...]
                'units': entities['units'],          # ["trung_doan_8"]
                'ranks': entities['ranks'],          # ["trung_ta"]
                
                # Boolean flags (for quick filtering)
                'has_personnel': len(entities['personnel']) > 0,
                'has_roles': len(entities['roles']) > 0,
                'has_units': len(entities['units']) > 0,
                
                # Text length (for debugging)
                'text_length': len(text)
            }
            
            metadatas.append(metadata)
        
        # Log entity extraction stats
        logger.info(f"📊 Entity extraction stats:")
        logger.info(f"   Personnel: {len(entity_stats['total_personnel'])} unique")
        logger.info(f"   Roles: {len(entity_stats['total_roles'])} unique")
        logger.info(f"   Units: {len(entity_stats['total_units'])} unique")
        
        if entity_stats['total_personnel']:
            logger.info(f"   Sample personnel: {list(entity_stats['total_personnel'])[:5]}")
        
        # Generate embeddings
        logger.info("Generating embeddings...")
        try:
            embeddings = self.model_manager.encode(
                texts,
                normalize=True,
                batch_size=32,
                show_progress=True
            )
            logger.info(f"✅ Generated {len(embeddings)} embeddings")
        except Exception as e:
            logger.error(f"❌ Error generating embeddings: {e}")
            return False
        
        # Add to collection
        collection_name = config['collection']
        logger.info(f"Adding to collection {collection_name}...")
        
        # === VALIDATE METADATA BEFORE ADDING ===
        # ChromaDB has strict requirements for metadata
        validated_metadatas = []
        for meta in metadatas:
            validated = {
                'source': str(meta['source']),
                'category': str(meta['category']),
                'chunk_id': int(meta['chunk_id']),
                
                # ChromaDB doesn't support arrays directly, use JSON strings
                'personnel': ','.join(meta['personnel']),  # Convert to CSV string
                'roles': ','.join(meta['roles']),
                'units': ','.join(meta['units']),
                'ranks': ','.join(meta['ranks']),
                
                # Booleans are fine
                'has_personnel': bool(meta['has_personnel']),
                'has_roles': bool(meta['has_roles']),
                'has_units': bool(meta['has_units']),
                
                'text_length': int(meta['text_length'])
            }
            validated_metadatas.append(validated)
        
        logger.info(f"DEBUG: Validated {len(validated_metadatas)} metadatas")
        if validated_metadatas:
            logger.info(f"DEBUG: Sample metadata: {validated_metadatas[0]}")
        
        try:
            ids = [f"{category}_{i}" for i in range(len(texts))]
            
            collection.add(
                ids=ids,
                embeddings=embeddings.tolist(),
                documents=texts,
                metadatas=validated_metadatas
            )
            
            logger.info(f"✅ Indexed {len(texts)} chunks into {collection_name}")
            
        except Exception as e:
            logger.error(f"❌ Error adding to collection: {e}")
            return False
        
        return True
    
    async def setup_all_collections(self):
        """Setup all 4 category collections"""
        
        logger.info("\n" + "="*60)
        logger.info("OPTIMIZED MULTI-COLLECTION RAG SETUP")
        logger.info(f"Chunk size: {self.rag_config.chunk_size}")
        logger.info(f"Chunk overlap: {self.rag_config.chunk_overlap}")
        logger.info("="*60)
        
        # Initialize models first
        await self.initialize_models()
        
        # Setup each category
        results = {}
        
        for category, config in self.CATEGORIES.items():
            try:
                collection = await self.create_collection(
                    category,
                    config['collection']
                )
                
                success = await self.index_category(
                    category,
                    config['file'],
                    collection,
                    config
                )
                
                results[category] = success
                
            except Exception as e:
                logger.error(f"❌ Failed to setup {category}: {e}")
                results[category] = False
        
        # Summary
        logger.info("\n" + "="*60)
        logger.info("SETUP SUMMARY")
        logger.info("="*60)
        
        for category, success in results.items():
            status = "✅ SUCCESS" if success else "❌ FAILED"
            collection_name = self.CATEGORIES[category]['collection']
            
            if success and category in self.collections:
                count = self.collections[category].count()
                logger.info(f"{category}: {status} ({count} chunks)")
            else:
                logger.info(f"{category}: {status}")
        
        total_success = sum(results.values())
        logger.info(f"\nTotal: {total_success}/4 collections successful")
        
        return results


async def main():
    """Main setup function"""
    
    setup = MultiCollectionSetup()
    
    try:
        results = await setup.setup_all_collections()
        
        if all(results.values()):
            logger.info("\n🎉 All collections setup successfully!")
            logger.info("\n💡 Next steps:")
            logger.info("1. Test queries with: python test_rag.py")
            logger.info("2. Check metadata with: python inspect_collections.py")
            return 0
        else:
            logger.error("\n❌ Some collections failed to setup")
            return 1
            
    except Exception as e:
        logger.error(f"\n❌ Setup failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)