import sys
import os
import json
import logging
import argparse
import fitz  # PyMuPDF
import io
import pytesseract
from PIL import Image
import concurrent.futures

# Configure logging
logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')

def perform_ocr(image, lang='eng'):
    """
    Perform OCR on a single image.
    """
    try:
        # Use tesseract to get structured data (HOCR or dict) if needed, 
        # but for now we need raw text with some layout preservation.
        # preserve_interword_spaces=1 helps with simple tables.
        config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
        text = pytesseract.image_to_string(image, lang=lang, config=config)
        return text
    except Exception as e:
        logging.error(f"OCR failed: {e}")
        return ""

def process_pdf(pdf_path, output_path=None):
    """
    Convert PDF pages to images and perform OCR on each page in parallel.
    Returns structured JSON with page-wise content.
    """
    try:
        # 1. Convert PDF to images using PyMuPDF (fitz)
        images = []
        try:
            doc = fitz.open(pdf_path)
            for page in doc:
                # 300 DPI = 300 / 72 ~= 4.166 zoom
                zoom = 300 / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                images.append(image)
            doc.close()
        except Exception as e:
            print(json.dumps({"error": f"Failed to convert PDF to images: {str(e)}"}))
            return

        extracted_data = {
            "page_count": len(images),
            "pages": [],
            "full_text": ""
        }

        # 2. Parallel OCR
        # Adjust max_workers based on CPU cores.
        results = [None] * len(images)
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_index = {executor.submit(perform_ocr, img): i for i, img in enumerate(images)}
            for future in concurrent.futures.as_completed(future_to_index):
                index = future_to_index[future]
                try:
                    text = future.result()
                    results[index] = text
                except Exception as exc:
                    logging.error(f"Page {index+1} generated an exception: {exc}")
                    results[index] = ""

        # 3. Aggregate results
        full_text_parts = []
        for i, text in enumerate(results):
            cid = i + 1
            cleaned_text = text.strip()
            page_data = {
                "page_number": cid,
                "content": cleaned_text
            }
            extracted_data["pages"].append(page_data)
            full_text_parts.append(f"--- Page {cid} ---\n{cleaned_text}")
        
        extracted_data["full_text"] = "\n\n".join(full_text_parts)
        
        # 4. JSON Output
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(extracted_data, f, indent=2, ensure_ascii=False)
        
        # Print JSON to stdout for Node.js capture
        print(json.dumps(extracted_data, ensure_ascii=False))
        
    except Exception as e:
        logging.error(f"Critical error processing PDF: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text from PDF using OCR.")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--output", help="Optional path to save JSON output", default=None)
    
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)
        
    process_pdf(args.pdf_path, args.output)
