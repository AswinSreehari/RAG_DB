import sys
import os
import json
import logging
import argparse
import io
import re
import zipfile
import concurrent.futures
from PIL import Image, ImageOps, ImageEnhance

# Configure logging to stderr
logging.basicConfig(level=logging.ERROR, stream=sys.stderr)

# Global lazy loaders for heavy libraries
_easyocr_reader = None
_markitdown_client = None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            # Note: GPU=False for widest compatibility on CPUs
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            logging.error(f"EasyOCR load failed: {e}")
    return _easyocr_reader

def get_markitdown():
    global _markitdown_client
    if _markitdown_client is None:
        try:
            from markitdown import MarkItDown
            _markitdown_client = MarkItDown()
        except Exception as e:
            logging.error(f"MarkItDown load failed: {e}")
    return _markitdown_client

def enhance_image(img):
    try:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = ImageOps.grayscale(img)
        img = ImageEnhance.Contrast(img).enhance(2.0)
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        return img
    except:
        return img

def perform_ocr_on_image(image_input):
    text = ""
    reader = get_easyocr_reader()
    
    try:
        if isinstance(image_input, Image.Image):
            img = image_input
        else:
            img = Image.open(image_input)
        
        img = enhance_image(img)
        
        if reader:
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            # detail=0 returns just text, paragraph=True groups into blocks
            results = reader.readtext(img_byte_arr.getvalue(), detail=0, paragraph=True)
            text = "\n\n".join(results)

        # Fallback to Tesseract if EasyOCR is empty or failed
        if len(text.strip()) < 5:
            try:
                import pytesseract
                text = pytesseract.image_to_string(img, config=r'--oem 3 --psm 6')
            except:
                pass
                
    except Exception as e:
        logging.error(f"OCR failed: {e}")
        
    return text

def process_pdf_hybrid(pdf_path):
    """
    State-of-the-art PDF extraction:
    Sync text layer extraction + Parallelized OCR for images/scans.
    """
    import fitz  # PyMuPDF
    results = []
    
    try:
        doc = fitz.open(pdf_path)
        num_pages = len(doc)
        
        # Prepare page tasks
        page_tasks = []
        for i in range(num_pages):
            page = doc[i]
            native_text = page.get_text("text").strip()
            images = page.get_images()
            
            # If page is empty (scanned) or contains images, we add it to OCR queue
            if len(native_text) < 100 or len(images) > 0:
                # Render to pixmap for OCR
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # 144 DPI (balance speed/acuity)
                img_bytes = pix.tobytes("png")
                page_tasks.append({
                    "index": i,
                    "img_bytes": img_bytes,
                    "native_text": native_text
                })
            else:
                results.append((i, native_text))

        # Perform OCR in parallel using a ThreadPool
        def ocr_worker(task):
            img = Image.open(io.BytesIO(task["img_bytes"]))
            ocr_text = perform_ocr_on_image(img)
            
            # Intelligent merge
            native = task["native_text"]
            if len(ocr_text.strip()) > len(native) * 1.5:
                return task["index"], ocr_text
            elif len(ocr_text.strip()) > 10:
                # Avoid exact duplicates
                if ocr_text.strip()[:50] not in native:
                    return task["index"], native + "\n\n[OCR Data]:\n" + ocr_text
            return task["index"], native

        if page_tasks:
            # Note: We limit workers to avoid CPU thrashing on some environments
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                ocr_results = list(executor.map(ocr_worker, page_tasks))
                results.extend(ocr_results)
        
        doc.close()
        
        # Sort by page index and join
        results.sort(key=lambda x: x[0])
        return "\n\n".join([f"--- Page {i+1} ---\n{t}" for i, t in results if t.strip()])
        
    except Exception as e:
        logging.error(f"PDF deep scan failed: {e}")
        # Final fallback for PDF: MarkItDown
        try:
            md = get_markitdown()
            if md:
                return md.convert(pdf_path).text_content
        except:
            pass
        return ""

def extract_media_from_office(file_path):
    """
    Extract images from DOCX/PPTX and OCR them.
    This solves the 'images inside office files' problem.
    """
    texts = []
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            # word/media for docx, ppt/media for pptx
            media_list = [f for f in z.namelist() if 'media/' in f]
            for media in media_list:
                if media.lower().endswith(('.png', '.jpg', '.jpeg')):
                    try:
                        with z.open(media) as f:
                            img = Image.open(f)
                            if img.width > 120 and img.height > 120:
                                ocr = perform_ocr_on_image(img)
                                if len(ocr.strip()) > 20:
                                    texts.append(f"\n[Extracted from {os.path.basename(media)}]:\n{ocr}")
                    except:
                        continue
    except:
        pass
    return "\n".join(texts)

def main():
    parser = argparse.ArgumentParser(description="Professional RAG Document Extractor")
    parser.add_argument("file_path", help="Target document path")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(json.dumps({"error": "File not found", "success": False}))
        sys.exit(1)

    file_path = args.file_path
    ext = os.path.splitext(file_path)[1].lower()
    extracted_text = ""
    
    try:
        # A. PDF Logic
        if ext == '.pdf':
            extracted_text = process_pdf_hybrid(file_path)
        
        # B. Office/Table Logic
        elif ext in ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.csv']:
            md = get_markitdown()
            if md:
                try:
                    extracted_text = md.convert(file_path).text_content
                except:
                    pass
            
            # DOCX/PPTX Image Capture
            if ext in ['.docx', '.pptx']:
                media_text = extract_media_from_office(file_path)
                if media_text:
                    extracted_text += "\n" + media_text
        
        # C. Straight Image Logic
        elif ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']:
            extracted_text = perform_ocr_on_image(file_path)

        # D. Generic Text Fallback
        if not extracted_text.strip():
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read()
            except:
                pass
        
        # E. Final Binary String Scraping (The 'Never Fail' Path)
        if not extracted_text.strip():
            try:
                with open(file_path, 'rb') as f:
                    raw = f.read()
                    strings = re.findall(rb'[ -~]{6,}', raw)
                    extracted_text = "\n".join(s.decode('ascii', errors='ignore') for s in strings if len(s) > 15)
            except:
                pass

        # Cleanup control characters
        clean_text = "".join(ch for ch in extracted_text if ch.isprintable() or ch in "\n\r\t")

        # Success JSON
        print(json.dumps({
            "full_text": clean_text.strip(),
            "success": True,
            "method": "prof_hybrid_extractor_v4"
        }, ensure_ascii=False))

    except Exception as e:
        # Emergency JSON wrapper
        print(json.dumps({
            "error": str(e),
            "full_text": f"SYSTEM_ERROR: {str(e)}",
            "success": False
        }))
        sys.exit(0)

if __name__ == "__main__":
    main()
