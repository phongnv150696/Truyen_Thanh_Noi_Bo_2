"""
RAG Setup and Management Script
Provides utilities to initialize, manage, and test the RAG system
"""

import os
import sys
import argparse
import asyncio
import logging
from pathlib import Path

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from config.settings import load_config
from config.logger import setup_logging
from core.providers.llm.rag.rag_ollama import LLMProvider

logger = setup_logging()

class RAGSetup:
    """RAG System Setup and Management"""
    
    def __init__(self):
        self.config = load_config()
        self.rag_config = self.config.get("LLM", {}).get("RAG_OllamaLLM", {})
        
        if not self.rag_config:
            print("❌ RAG_OllamaLLM not found in config.yaml")
            sys.exit(1)
        
        self.provider = LLMProvider(self.rag_config)
    
    async def initialize(self):
        """Initialize RAG system"""
        print("🔄 Initializing RAG system...")
        print(f"   Embedding model: {self.rag_config.get('embedding_model', 'lightweight')}")
        print(f"   Model: {self.rag_config.get('model_name', 'qwen2.5:1.5b')}")
        
        try:
            await self.provider.initialize()
            print("✅ RAG system initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Initialization failed: {e}")
            return False
    
    def add_document(self, file_path: str):
        """Add a document to RAG"""
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return False
        
        print(f"\n📄 Adding document: {file_path}")
        
        result = self.provider.add_documents(file_path)
        
        if result.get("success"):
            stats = result.get("stats", {})
            print(f"✅ Document added successfully")
            print(f"   Format: {stats.get('format', 'unknown')}")
            print(f"   Chunks: {stats.get('chunks', 0)}")
            print(f"   Load time: {stats.get('load_time', 0):.2f}s")
            print(f"   Total time: {stats.get('total_time', 0):.2f}s")
            return True
        else:
            print(f"❌ Failed to add document: {result.get('message')}")
            return False
    
    def add_directory(self, directory: str):
        """Add all documents from a directory"""
        if not os.path.isdir(directory):
            print(f"❌ Directory not found: {directory}")
            return False
        
        print(f"\n📁 Processing directory: {directory}")
        
        # Find all supported files
        extensions = ['.pdf', '.md', '.txt']
        files = []
        for ext in extensions:
            files.extend(Path(directory).rglob(f"*{ext}"))
        
        if not files:
            print(f"⚠️ No supported files found in {directory}")
            return False
        
        print(f"Found {len(files)} files to process")
        
        success_count = 0
        for file_path in files:
            if self.add_document(str(file_path)):
                success_count += 1
        
        print(f"\n✅ Processed {success_count}/{len(files)} files successfully")
        return success_count > 0
    
    def get_stats(self):
        """Display RAG system statistics"""
        stats = self.provider.get_stats()
        
        print("\n📊 RAG System Statistics")
        print("=" * 50)
        print(f"Initialized: {stats.get('initialized')}")
        print(f"RAG Enabled: {stats.get('rag_enabled')}")
        print(f"Embedding Model: {stats.get('embedding_model')}")
        print(f"Embedding Type: {stats.get('embedding_type')}")
        print(f"LLM Model: {stats.get('model_name')}")
        
        vs_stats = stats.get('vector_store', {})
        print(f"\nVector Store:")
        print(f"  Initialized: {vs_stats.get('initialized')}")
        print(f"  Documents: {vs_stats.get('count', 0)}")
        print(f"  Path: {vs_stats.get('path', 'N/A')}")
        print(f"  Collection: {vs_stats.get('collection', 'N/A')}")
        print("=" * 50)
    
    async def test_query(self, query: str):
        """Test a query against the RAG system"""
        print(f"\n🔍 Testing query: {query}")
        print("-" * 50)
        
        full_response = ""
        async for chunk in self.provider.chat_stream(query):
            print(chunk, end="", flush=True)
            full_response += chunk
        
        print("\n" + "-" * 50)
        print(f"✅ Query completed ({len(full_response)} characters)")
        return full_response

async def main():
    parser = argparse.ArgumentParser(description="RAG System Setup and Management")
    parser.add_argument("--init", action="store_true", help="Initialize RAG system")
    parser.add_argument("--add-document", type=str, help="Add a document to RAG")
    parser.add_argument("--add-directory", type=str, help="Add all documents from directory")
    parser.add_argument("--stats", action="store_true", help="Show RAG statistics")
    parser.add_argument("--test-query", type=str, help="Test a query")
    parser.add_argument("--interactive", action="store_true", help="Interactive query mode")
    
    args = parser.parse_args()
    
    # Create RAG setup instance
    setup = RAGSetup()
    
    # Initialize if requested or needed
    if args.init or args.add_document or args.add_directory or args.test_query or args.interactive:
        if not await setup.initialize():
            return
    
    # Handle commands
    if args.add_document:
        setup.add_document(args.add_document)
    
    if args.add_directory:
        setup.add_directory(args.add_directory)
    
    if args.stats:
        setup.get_stats()
    
    if args.test_query:
        await setup.test_query(args.test_query)
    
    if args.interactive:
        print("\n💬 Interactive Query Mode (type 'quit' to exit)")
        print("-" * 50)
        
        while True:
            try:
                query = input("\n❓ Your question: ").strip()
                if query.lower() in ['quit', 'exit', 'q']:
                    break
                
                if query:
                    await setup.test_query(query)
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
        
        print("\n👋 Goodbye!")
    
    # Show stats if no specific action
    if not any([args.add_document, args.add_directory, args.test_query, args.interactive]):
        setup.get_stats()

if __name__ == "__main__":
    # Run async main
    asyncio.run(main())
