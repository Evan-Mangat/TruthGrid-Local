# TruthGrid-Local

Local-first literary analysis writing tool for secondary classrooms.

## Run the app

```bash
npm install
npm run dev
```

## Offline passage OCR

Scanned PDF and image uploads are processed by `ocr_grader.py` through the local Vite development server's `/api/ocr` endpoint. This endpoint does not exist in a static production/PWA build; a local Python service would be needed to support OCR after static deployment. Plain `.txt` and `.md` passage files are read directly in the browser.

Install the Python dependencies into the project's virtual environment and install Tesseract OCR on the computer:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
brew install tesseract
```

PDF OCR may also require Poppler for multi-page PDF conversion (`brew install poppler`). The OCR endpoint accepts one PDF or image up to 20 MB at a time. Supported formats are PDF, PNG, JPG, JPEG, TIFF, and TIF.
