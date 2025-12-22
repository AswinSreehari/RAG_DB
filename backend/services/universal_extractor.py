import sys
import os
import json
import logging
import argparse
import io
import re
import concurrent.futures
from markitdown import MarkItDown
from PIL import Image, ImageOps, ImageEnhance
import fitz  # PyMuPDF

# Configure logging
logging.basicConfig(level=logging.ERROR)

_easyocr_reader = None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            logging.error(f"Failed to load EasyOCR: {e}")
    return _easyocr_reader

def enhance_image(img):
    """
    Enhance image for OCR: grayscale, contrast, and sharpening.
    """
    try:
        img = ImageOps.grayscale(img)
        img = ImageEnhance.Contrast(img).enhance(2.0)
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        return img
    except:
        return img

def perform_ocr_on_image(image_input):
    """
    Highly aggressive OCR: tries EasyOCR, then Tesseract if needed.
    """
    text = ""
    reader = get_easyocr_reader()
    
    try:
        if isinstance(image_input, Image.Image):
            img = image_input
        else:
            img = Image.open(image_input)
        
        # Pre-process
        img = enhance_image(img)
        
        # Try EasyOCR first
        if reader:
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            text = "\n\n".join(reader.readtext(img_byte_arr.getvalue(), detail=0, paragraph=True))

        # Fallback to Tesseract if EasyOCR missed it
        if len(text.strip()) < 10:
            import pytesseract
            # Try different PSM modes for dense text
            text = pytesseract.image_to_string(img, config=r'--oem 3 --psm 6')
            if len(text.strip()) < 10:
                text = pytesseract.image_to_string(img, config=r'--oem 3 --psm 3')
                
    except Exception as e:
        logging.error(f"OCR failed: {e}")
        
    return text

def process_pdf_page(args):
    """
    Processes a PDF page with fallback to OCR if native text is sparse.
    """
    page_index, pdf_path = args
    text = ""
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_index]
        
        # 1. Native text extraction
        text = page.get_text("text").strip()
        
        # 2. Aggressive fallback for images/scans
        # Even if there is some text, it might be just a stamp or footer
        # If text is low or page has images, try OCR
        if len(text) < 100 or page.get_images():
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            ocr_text = perform_ocr_on_image(img)
            
            # If OCR found more/different text, combine or prefer OCR
            if len(ocr_text.strip()) > len(text):
                text = ocr_text
            elif len(ocr_text.strip()) > 10:
                text = text + "\n\n" + ocr_text
                
        doc.close()
    except Exception as e:
        logging.error(f"Page {page_index} error: {e}")
        
    return page_index, text

def process_pdf_optimized(pdf_path):
    """
    Parallel PDF page processing.
    """
    try:
        doc = fitz.open(pdf_path)
        num_pages = len(doc)
        doc.close()
        
        full_text_parts = [None] * num_pages
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(num_pages, 8)) as executor:
            task_args = [(i, pdf_path) for i in range(num_pages)]
            results = list(executor.map(process_pdf_page, task_args))
            
            for page_index, text in results:
                full_text_parts[page_index] = f"--- Page {page_index + 1} ---\n{text}"
                
        return "\n\n".join(full_text_parts)
    except Exception as e:
        logging.error(f"PDF optimized processing failed: {e}")
        return ""

def main():
    parser = argparse.ArgumentParser(description="Mega-Optimal Document Extractor for RAG")
    parser.add_argument("file_path", help="Path to the document")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)

    file_path = args.file_path
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        extracted_text = ""
        
        # 1. Handle Native Office Formats
        if ext in ['.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.docx', '.doc']:
            md = MarkItDown()
            try:
                result = md.convert(file_path)
                extracted_text = result.text_content
            except Exception as e:
                logging.warning(f"MarkItDown failed: {e}")

        # 2. Handle PDF and Images (Aggressive mode)
        if ext == '.pdf':
            extracted_text = process_pdf_optimized(file_path)
        elif ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']:
            extracted_text = perform_ocr_on_image(file_path)

        # 3. Final Search & Destroy for missing text
        # If we still have almost nothing, force an OCR attempt by treating it as an image if possible
        if len(extracted_text.strip()) < 20:
            if ext not in ['.pdf', '.xlsx', '.xls', '.csv']:
                # Maybe it's a mislabeled image?
                extracted_text = perform_ocr_on_image(file_path)

        # 4. Plain Text Fallback
        if not extracted_text.strip():
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read()
            except:
                pass

        # 5. Last Resort: Extraction of any printable strings using regex
        if not extracted_text.strip():
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                    # Find sequences of 4 or more printable characters
                    strings = re.findall(rb'[ -~]{4,}', content)
                    extracted_text = "\n".join(s.decode('ascii', errors='ignore') for s in strings)
            except:
                pass

        # Cleanup
        extracted_text = extracted_text.replace('\x00', '')
        
        print(json.dumps({
            "full_text": extracted_text,
            "success": True,
            "method": "mega_optimal_universal_extractor"
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)

if __name__ == "__main__":
    main()
