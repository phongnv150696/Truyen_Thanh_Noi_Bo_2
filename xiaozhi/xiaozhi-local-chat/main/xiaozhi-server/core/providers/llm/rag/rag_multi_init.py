    def _initialize_rag_multi_collection(self):
        """Initialize RAG with multiple ChromaDB collections"""
        
        start_time = time.time()
        
        try:
            # Initialize model manager
            embedding_config = self.rag_config.get_embedding_config()
            success, msg = self.model_manager.initialize(
                embedding_model_id=embedding_config.model_id,
                cross_encoder_id=self.rag_config.cross_encoder_model,
                requires_tokenizer=embedding_config.requires_tokenizer
            )
            
            if not success:
                raise RuntimeError(f"Model initialization failed: {msg}")
            
            logger.bind(tag=__name__).info(f"Models initialized: {msg}")
            
            # Load all 4 collections
            total_docs = 0
            
            for category, collection_name in self.collection_names.items():
                try:
                    # Initialize ChromaManager for this collection
                    from core.providers.llm.rag.vector_store import ChromaManager
                    
                    chroma = ChromaManager()
                    success, msg = chroma.initialize(
                        chroma_path=self.rag_config.chroma_path,
                        collection_name=collection_name
                    )
                    
                    if success and chroma.collection:
                        # Store collection reference
                        self.collections[category] = chroma.collection
                        
                        # Get document count
                        count = chroma.collection.count()
                        total_docs += count
                        
                        logger.bind(tag=__name__).info(
                            f"✅ Loaded collection '{category}': {count} documents"
                        )
                    else:
                        logger.bind(tag=__name__).warning(
                            f"⚠️ Collection '{category}' not found, skipping"
                        )
                        
                except Exception as e:
                    logger.bind(tag=__name__).error(
                        f"❌ Error loading collection '{category}': {e}"
                    )
            
            # Check if we loaded any collections
            if not self.collections:
                logger.bind(tag=__name__).warning(
                    "⚠️ No collections loaded! Multi-collection RAG unavailable"
                )
                self.rag_initialized = False
                return
            
            self.rag_initialized = True
            
            init_time = time.time() - start_time
            
            logger.bind(tag=__name__).success(
                f"✅ RAG initialized in {init_time:.2f}s "
                f"(collections: {len(self.collections)}, documents: {total_docs})"
            )
            
        except Exception as e:
            logger.bind(tag=__name__).error(f"❌ RAG initialization failed: {e}")
            self.rag_initialized = False
