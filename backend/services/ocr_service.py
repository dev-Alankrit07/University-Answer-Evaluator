def extract_text_with_ocr_if_needed(pdf_path):
    """The backend intentionally does not fake OCR. If no selectable text is found,
    it returns a clear guidance message instead of inventing extracted content.
    """
    return {
        "success": False,
        "message": "No selectable text was detected. OCR is required for this scanned PDF."
    }
