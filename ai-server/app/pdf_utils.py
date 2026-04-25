import pdfplumber
import io
import re

def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, bool]:
    """
    Extract text from PDF. Returns (text, used_ocr).
    First tries direct text extraction, falls back to OCR if needed.
    """
    text = ""
    used_ocr = False

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
    except Exception as e:
        print(f"PDF extraction error: {e}")

    # Check if text is meaningful (not just whitespace/garbage)
    clean_text = text.strip()
    if len(clean_text) < 50:
        # Try OCR fallback
        try:
            from pdf2image import convert_from_bytes
            import pytesseract
            
            images = convert_from_bytes(file_bytes)
            ocr_text = ""
            for img in images:
                ocr_text += pytesseract.image_to_string(img) + "\n"
            
            if len(ocr_text.strip()) > len(clean_text):
                text = ocr_text
                used_ocr = True
        except ImportError:
            print("OCR dependencies not available, using extracted text")
        except Exception as e:
            print(f"OCR fallback error: {e}")

    return clean_text_content(text), used_ocr


def clean_text_content(text: str) -> str:
    """Clean and normalize extracted text."""
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    # Remove non-printable characters
    text = re.sub(r'[^\x20-\x7E\n]', '', text)
    return text.strip()
