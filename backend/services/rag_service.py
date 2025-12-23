import os
import sys
import json
import argparse
import logging
import pickle
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv

# Suppress warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# Local Storage Paths
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "vector_db.pkl")

def simple_chunk_text(text, chunk_size=1000, overlap=200):
    """Manual text chunking to avoid heavy library imports."""
    chunks = []
    if not text:
        return chunks
    
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += (chunk_size - overlap)
        if start >= len(text):
            break
    return chunks

def get_embeddings(texts):
    """Get embeddings using raw SDK."""
    try:
        if not api_key:
            raise ValueError("GOOGLE_API_KEY missing")
        
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=texts,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        logging.error(f"Embedding error: {e}")
        return None

def ingest(text, doc_id, filename):
    try:
        chunks = simple_chunk_text(text)
        if not chunks:
            return {"success": False, "error": "No text to ingest"}

        embeddings = get_embeddings(chunks)
        if not embeddings:
            return {"success": False, "error": "Failed to generate embeddings"}

        # Load existing DB
        db = []
        if os.path.exists(DB_PATH):
            with open(DB_PATH, 'rb') as f:
                db = pickle.load(f)

        # Append new chunks
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            db.append({
                "id": f"{doc_id}_{i}",
                "text": chunk,
                "embedding": emb,
                "source": filename
            })

        # Save DB
        with open(DB_PATH, 'wb') as f:
            pickle.dump(db, f)

        return {"success": True, "chunks": len(chunks)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def query(user_query, n_results=4):
    try:
        if not os.path.exists(DB_PATH):
            return {"success": True, "answer": "No documents uploaded yet.", "sources": []}

        # 1. Embed query
        query_emb = genai.embed_content(
            model="models/text-embedding-004",
            content=user_query,
            task_type="retrieval_query"
        )['embedding']

        # 2. Load DB and compute similarity
        with open(DB_PATH, 'rb') as f:
            db = pickle.load(f)

        scores = []
        for item in db:
            score = cosine_similarity(query_emb, item['embedding'])
            scores.append((score, item))

        # 3. Sort and pick top results
        scores.sort(key=lambda x: x[0], reverse=True)
        top_items = [x[1] for x in scores[:n_results]]

        context = "\n\n".join([item['text'] for item in top_items])
        sources = list(set([item['source'] for item in top_items]))

        # 4. Generate answer
        try:
            model = genai.GenerativeModel('models/gemini-1.5-flash')
            prompt = f"Answer the question based on the context.\nContext: {context}\nQuestion: {user_query}"
            response = model.generate_content(prompt)
            answer = response.text
        except Exception:
            # Fallback to general flash latest
            model = genai.GenerativeModel('models/gemini-flash-latest')
            prompt = f"Answer the question based on the context.\nContext: {context}\nQuestion: {user_query}"
            response = model.generate_content(prompt)
            answer = response.text
        
        return {
            "success": True,
            "answer": answer,
            "sources": sources
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('action')
    parser.add_argument('--text')
    parser.add_argument('--doc_id')
    parser.add_argument('--filename')
    parser.add_argument('--query')
    args = parser.parse_args()

    if args.action == 'ingest':
        txt = args.text
        if os.path.exists(txt):
            with open(txt, 'r', encoding='utf-8', errors='ignore') as f:
                txt = f.read()
        print(json.dumps(ingest(txt, args.doc_id, args.filename)))
    elif args.action == 'query':
        print(json.dumps(query(args.query)))
