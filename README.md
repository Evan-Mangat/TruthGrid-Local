# TruthGrid-Local

Local-first literary analysis writing tool for secondary classrooms.

## Install and use the PWA

The published app is a Progressive Web App, not a native `.exe` installer. Open its school-approved HTTPS URL in a supported browser while connected, then use the browser's **Install app** or **Add to Home Screen** command. Installation saves the app shell and assets on that device. When launched from its installed icon, it opens in a standalone app window, separate from the regular browser tab interface.

After the first successful install and cache, the writing app shell and local response workflow do not require internet, Wi-Fi, or mobile data. The connection is needed again to receive a hosted update. Do not clear the browser's site data if local student responses need to be retained. Responses are stored in that browser profile's IndexedDB and are not synchronized or backed up automatically.

This project does not provide an `.exe` because school-managed devices commonly require review and approval before executable software can be installed. The PWA distribution avoids asking students to install an unapproved executable; the school or district should still review and approve the hosted app and its student-data practices. This is a deployment choice, not a claim of legal compliance.

## Shared-device teacher dashboard

Before students use a shared device, the teacher should create a dashboard passcode in **Teacher Dashboard Access** on the setup screen. Students can then enter and submit work locally; opening the dashboard from setup or results requires the teacher passcode. The verifier is stored locally using a random salt and PBKDF2; the passcode itself is not stored.

This is a prototype convenience barrier, not strong authentication. A person who can inspect or modify the browser app or control the device may bypass it or access the local browser data. Do not describe it as tamper-proof security. There is no email or SMS recovery. **Forgot passcode?** requires typing `ERASE`, then permanently deletes all locally saved responses/scans and the active draft before removing the passcode. Keep a separately protected export if the school requires a recoverable record.

Publishing the static app to GitHub Pages does not by itself establish compliance with Canadian or provincial student privacy requirements. Browser-stored responses remain on the device/profile where students submit them, while the public Pages host serves the application files. The school/district privacy lead should review the data collected, device/profile access, retention, exports, hosting approval, and applicable policies before classroom use. This project makes no legal-compliance certification.

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

For PDF/image uploads, the original file is passed into the student session alongside the extracted passage. Students can open or inspect the original scan and should compare it with the OCR text because OCR can misread words and punctuation. The selected original is retained in the saved local response. Static PWA deployments do not include the development-only `/api/ocr` endpoint; scanned document upload requires a separately supported local OCR service, while TXT/MD files continue to load in the browser.

## Tests

Run unit, component, IndexedDB, and app-flow integration tests with:

```bash
npm test
```

Build the production PWA, then run the browser test that verifies the standalone manifest and reloads the cached app shell with network access disabled:

```bash
npm run build
npm run test:pwa
```

The offline check proves the cached shell can start without a network connection. It does not make hosted updates or the development-only OCR endpoint available offline in a static deployment.
