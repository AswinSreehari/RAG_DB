import sys
import os
import json
import logging
import argparse
import io
import re
import zipfile
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
            # We initialize with 'en' - this takes a moment
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
            # paragraph=True groups text into logical blocks
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
        
        # 2. Hybrid Check:
        # If text is suspiciously low or contains images, perform OCR on the WHOLE page rendered as image.
        # This catches "image inside pdf" perfectly.
        # We also check for 'embedded images' specifically to capture them if they are small.
        
        has_images = len(page.get_images()) > 0
        is_sparse = len(text) < 200
        
        if is_sparse or has_images:
            # Render page to high-res image
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            ocr_text = perform_ocr_on_image(img)
            
            # Smart Merge:
            # If OCR found significantly more text, prefer it.
            # OR if we have both, append OCR text (it might capture text inside figures that native missed)
            if len(ocr_text.strip()) > len(text):
                text = ocr_text
            elif len(ocr_text.strip()) > 20 and ocr_text.strip() not in text:
                 # Append OCR content as a "Figure Extraction"
                text = text + "\n\n--- [Extracted from Image/Figure] ---\n" + ocr_text
                
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
        # Use more workers for faster PDF processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(num_pages, 8)) as executor:
            task_args = [(i, pdf_path) for i in range(num_pages)]
            results = list(executor.map(process_pdf_page, task_args))
            
            for page_index, text in results:
                full_text_parts[page_index] = f"--- Page {page_index + 1} ---\n{text}"
                
        return "\n\n".join(full_text_parts)
    except Exception as e:
        logging.error(f"PDF optimized processing failed: {e}")
        return ""

def extract_images_from_office_file(file_path):
    """
    Extracts images from DOCX/PPTX (which are zip files) and OCRs them.
    """
    extracted_text = []
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            # Find all media files
            media_files = [f for f in z.namelist() if f.startswith('word/media/') or f.startswith('ppt/media/')]
            
            for media in media_files:
                if media.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp')):
                    try:
                        img_data = z.read(media)
                        img = Image.open(io.BytesIO(img_data))
                        
                        # Only OCR reasonable sized images (skip icons/lines)
                        if img.width > 50 and img.height > 50:
                            text = perform_ocr_on_image(img)
                            if len(text.strip()) > 10:
                                extracted_text.append(f"\n--- [Text from Embedded Image: {os.path.basename(media)}] ---\n{text}")
                    except:
                        continue
    except Exception as e:
        logging.error(f"Office image extraction failed: {e}")
    
    return "\n".join(extracted_text)

def main():
    parser = argparse.ArgumentParser(description="Hybrid Universal Document Extractor")
    parser.add_argument("file_path", help="Path to the document")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)

    file_path = args.file_path
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        extracted_text = ""
        office_ocr_text = ""
        
        # 1. Handle Native Office Formats (DOCX, PPTX, XLSX)
        if ext in ['.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.docx', '.doc']:
            # A. Extract Text via MarkItDown
            md = MarkItDown()
            try:
                result = md.convert(file_path)
                extracted_text = result.text_content
            except Exception as e:
                logging.warning(f"MarkItDown failed: {e}")

            # B. Extract Embedded Images (Crucial for 'image inside docx')
            if ext in ['.docx', '.doc', '.pptx', '.ppt']:
                office_ocr_text = extract_images_from_office_file(file_path)
                
            # Combine
            extracted_text = extracted_text + "\n" + office_ocr_text

        # 2. Handle PDF (Hybrid Mode)
        elif ext == '.pdf':
            extracted_text = process_pdf_optimized(file_path)
            
        # 3. Handle Images
        elif ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']:
            extracted_text = perform_ocr_on_image(file_path)

        # 4. Final Fallback for "No readable textual content"
        if not extracted_text.strip():
             # Try OCR-ing the file as an image if it's not one of the complex types
             if ext not in ['.pdf', '.xlsx', '.pptx', '.docx']:
                 extracted_text = perform_ocr_on_image(file_path)

        # 5. Last Resort String Extraction
        if not extracted_text.strip():
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read()
            except:
                pass
            
            # If still absolutely nothing, try binary string extraction (extreme fallback)
            if not extracted_text.strip():
                 try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                        strings = re.findall(rb'[ -~]{4,}', content)
                        extracted_text = "\n".join(s.decode('ascii', errors='ignore') for s in strings)
                 except:
                    pass

        # Valid JSON Output
        print(json.dumps({
            "full_text": extracted_text.replace('\x00', ''),
            "success": True,
            "method": "hybrid_universal_extractor"
        }, ensure_ascii=False))

    except Exception as e:
        # Never crash, always return JSON
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(0)

if __name__ == "__main__":
    main()
