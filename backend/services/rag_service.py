import logging
import os
import sys
import json
import argparse

# Suppress TensorFlow/OneDNN noise
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Initialize ChromaDB (Local Persistence)
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

# Configure logging
logging.basicConfig(level=logging.ERROR)

# Initialize ChromaDB (Local Persistence)
CHROMA_DB_DIR = os.path.join(os.path.dirname(__file__), '..', 'chroma_db')
client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# --- MODELS ---
# Embedding Model: Fast, good for retrieval
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'

# Generative Model: Google's Flan-T5 Small (fast, decent for simple QA) or LaMini
# We use LaMini-Flan-T5-248M for better instruction following on small footprint
GEN_MODEL_NAME = 'MBZUAI/LaMini-Flan-T5-248M'

_embedder = None
_generator = None

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embedder

def get_generator():
    """
    Lazy load the Generative LLM.
    """
    global _generator
    if _generator is None:
        try:
            tokenizer = AutoTokenizer.from_pretrained(GEN_MODEL_NAME)
            model = AutoModelForSeq2SeqLM.from_pretrained(GEN_MODEL_NAME)
            _generator = pipeline('text2text-generation', model=model, tokenizer=tokenizer, max_length=512)
        except Exception as e:
            logging.error(f"Failed to load LLM: {e}")
    return _generator

def ingest_document(text, doc_id, filename):
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = splitter.split_text(text)
        
        if not chunks:
            return {"success": False, "error": "No text chunks generated"}

        model = get_embedder()
        embeddings = model.encode(chunks)
        
        collection = client.get_or_create_collection(name="rag_documents")
        
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "doc_id": str(doc_id), "chunk_index": i} for i in range(len(chunks))]
        
        collection.add(
            documents=chunks,
            embeddings=embeddings.tolist(),
            metadatas=metadatas,
            ids=ids
        )
        return {"success": True, "chunks_count": len(chunks)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def query_vector_db_and_generate(query, n_results=3):
    try:
        # 1. RETRIEVE
        collection = client.get_collection(name="rag_documents")
        model = get_embedder()
        query_vec = model.encode([query]).tolist()
        
        results = collection.query(
            query_embeddings=query_vec,
            n_results=n_results
        )
        
        flattened_docs = results['documents'][0]
        flattened_meta = results['metadatas'][0]
        
        if not flattened_docs:
             return {"success": True, "answer": "I couldn't find any relevant information in your uploaded documents.", "context": []}

        # 2. CONSTRUCT CONTEXT
        context_text = "\n\n".join(flattened_docs)
        
        # 3. GENERATE ANSWER
        llm = get_generator()
        if llm:
            # Prompt Engineering
            prompt = f"Answer the following question based on the context below. If the answer is not in the context, say 'I don't know'.\n\nContext:\n{context_text}\n\nQuestion: {query}\n\nAnswer:"
            
            output = llm(prompt)
            answer = output[0]['generated_text']
        else:
            answer = "LLM not available. Here is the relevant text: " + context_text[:200] + "..."

        # Prepare response source info
        context_list = [{"text": doc, "source": meta['source']} for doc, meta in zip(flattened_docs, flattened_meta)]
        
        return {
            "success": True,
            "answer": answer,
            "context": context_list
        }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['ingest', 'query'], help="Action to perform")
    parser.add_argument('--text', help="Text content to ingest")
    parser.add_argument('--doc_id', help="Document ID")
    parser.add_argument('--filename', help="Filename")
    parser.add_argument('--query', help="Query string")
    
    args = parser.parse_args()
    
    if args.action == 'ingest':
        if not args.text:
            print(json.dumps({"success": False, "error": "Missing info"}))
            sys.exit(1)
            
        text_content = args.text
        if os.path.exists(text_content) and os.path.isfile(text_content):
             with open(text_content, 'r', encoding='utf-8', errors='ignore') as f:
                 text_content = f.read()

        print(json.dumps(ingest_document(text_content, args.doc_id, args.filename)))
        
    elif args.action == 'query':
        if not args.query:
            print(json.dumps({"success": False, "error": "Missing query"}))
            sys.exit(1)
        print(json.dumps(query_vector_db_and_generate(args.query)))
