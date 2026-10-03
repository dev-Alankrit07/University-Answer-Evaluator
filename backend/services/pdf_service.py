import os

import fitz


def extract_text_from_pdf(pdf_path):
    if not pdf_path or not os.path.exists(pdf_path):
        return []

    document = None
    pages = []

    try:
        document = fitz.open(pdf_path)
        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            text = page.get_text("text").strip()
            pages.append({"page": page_index + 1, "text": text})
        return pages
    except Exception as exc:
        raise ValueError(f"Unable to extract text from PDF: {str(exc)}") from exc
    finally:
        if document is not None:
            document.close()


def get_full_text(pdf_path):
    pages = extract_text_from_pdf(pdf_path)
    return "\n".join(page.get("text", "") for page in pages).strip()
