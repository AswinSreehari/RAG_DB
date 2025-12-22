import sys
import os
import json
import logging
import argparse
import io
import re
import concurrent.futures
from markitdown import MarkItDown
from PIL import Image
import fitz  # PyMuPDF

# Configure logging
logging.basicConfig(level=logging.ERROR)

# Global reader to be initialized lazily to avoid overhead if not needed
_easyocr_reader = None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            # We initialize with 'en' - this takes a moment
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            logging.error(f"Failed to load EasyOCR: {e}")
    return _easyocr_reader

def perform_ocr_on_image(image_input):
    """
    Optimized OCR for images: preserves lines and groups paragraphs.
    """
    reader = get_easyocr_reader()
    if not reader:
        # Tesseract fallback
        try:
            import pytesseract
            return pytesseract.image_to_string(image_input, config=r'--oem 3 --psm 6')
        except:
            return ""

    try:
        # paragraph=True helps in grouping text into blocks/lines
        # detail=0 returns just the text
        if isinstance(image_input, Image.Image):
            img_byte_arr = io.BytesIO()
            image_input.save(img_byte_arr, format='PNG')
            data = img_byte_arr.getvalue()
        else:
            data = image_input
            
        result = reader.readtext(data, detail=0, paragraph=True)
        return "\n\n".join(result)
    except Exception as e:
        logging.error(f"OCR failed: {e}")
        return ""

def process_pdf_page(args):
    """
    Worker function to process a single PDF page.
    """
    page_index, pdf_path = args
    text = ""
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_index]
        
        # 1. Try to get native text first
        text = page.get_text("text").strip()
        
        # 2. If no text, OCR the page
        if len(text) < 50:
            # 300 DPI for quality
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            text = perform_ocr_on_image(img)
            
        doc.close()
    except Exception as e:
        logging.error(f"Error processing page {page_index}: {e}")
        
    return page_index, text

def process_pdf_optimized(pdf_path):
    """
    Optimized PDF processing: Parallel page extraction.
    """
    try:
        doc = fitz.open(pdf_path)
        num_pages = len(doc)
        doc.close()
        
        # Use ThreadPoolExecutor for parallel page processing
        # This speeds up multi-page scanned documents significantly
        full_text_parts = [None] * num_pages
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(num_pages, 8)) as executor:
            task_args = [(i, pdf_path) for i in range(num_pages)]
            results = list(executor.map(process_pdf_page, task_args))
            
            for page_index, text in results:
                full_text_parts[page_index] = f"--- Page {page_index + 1} ---\n{text}"
                
        return "\n\n".join(full_text_parts)
    except Exception as e:
        logging.error(f"Optimized PDF processing failed: {e}")
        return ""

def main():
    parser = argparse.ArgumentParser(description="Optimal Document Extractor for RAG")
    parser.add_argument("file_path", help="Path to the document")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)

    file_path = args.file_path
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        extracted_text = ""
        
        # A. Priority 1: MarkItDown for Office formats (Excel, CSV, PPTX, DOCX)
        # It's unbeatable for preserving structure in these formats.
        if ext in ['.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.docx', '.doc']:
            md = MarkItDown()
            try:
                result = md.convert(file_path)
                extracted_text = result.text_content
            except Exception as e:
                logging.warning(f"MarkItDown failed: {e}")

        # B. Priority 2: Optimized PDF/Image processing
        if not extracted_text.strip():
            if ext == '.pdf':
                extracted_text = process_pdf_optimized(file_path)
            elif ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']:
                extracted_text = perform_ocr_on_image(file_path)
        
        # C. Final Fallback: Treat as plain text
        if not extracted_text.strip():
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read()
            except:
                pass

        # Cleanup control characters
        extracted_text = extracted_text.replace('\x00', '')
        
        print(json.dumps({
            "full_text": extracted_text,
            "success": True,
            "method": "optimal_universal_extractor"
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)

if __name__ == "__main__":
    main()
