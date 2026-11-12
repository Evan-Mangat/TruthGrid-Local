# TruthGrid-Local

Local-first literary analysis writing tool for secondary classrooms.

## Install and use the PWA

The published app is a Progressive Web App, not a native `.exe` installer. Open its school-approved HTTPS URL in a supported browser while connected, then use the browser's **Install app** or **Add to Home Screen** command. Installation saves the app shell and assets on that device. When launched from its installed icon, it opens in a standalone app window, separate from the regular browser tab interface.

After the first successful install and cache, the writing app shell and local response workflow do not require internet, Wi-Fi, or mobile data. The connection is needed again to receive a hosted update. Do not clear the browser's site data if local student responses need to be retained. Responses are stored in that browser profile's IndexedDB and are not synchronized or backed up automatically.

This project does not provide an `.exe` because school-managed devices commonly require review and approval before executable software can be installed. The PWA distribution avoids asking students to install an unapproved executable; the school or district should still review and approve the hosted app and its student-data practices. This is a deployment choice, not a claim of legal compliance.

## Shared-device Dashboard

Before students use a shared device, the teacher can create a Dashboard passcode in **Dashboard passcode** on the setup screen. Students can enter and submit work locally whether or not a passcode is set; the code gates later Dashboard access to saved essays and draft versions. Essay and Literary Analysis writing use the same student workflow, and saved draft versions are reviewable from **Dashboard → Draft History**. Changing the code requires the current passcode and does not delete essays or drafts. The verifier is stored locally using a random salt and PBKDF2; the passcode itself is not stored.

This is a prototype convenience barrier, not strong authentication. A person who can inspect or modify the browser app or control the device may bypass it or access the local browser data. Do not describe it as tamper-proof security. There is no email or SMS recovery. **Forgot passcode?** requires typing `RESET` and removes only the Dashboard passcode; saved essays, scans, draft-history versions, and the active draft remain on the device. Until a new code is set, the Dashboard has no passcode gate. Keep a separately protected export if the school requires a recoverable record.

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

## Pull request CI gates

The `CI and GitHub Pages` workflow runs on pull requests and pushes to `main`. It runs the existing Vitest and offline PWA suites, builds the app, audits npm dependencies, checks a CycloneDX dependency SBOM against the starter license policy, and compares desktop Lighthouse results with the pull request base or previous push.

- The npm audit gate fails on newly disclosed package/advisory pairs or severity increases. `.github/npm-audit-baseline.json` records the existing 18 reported vulnerabilities, including two critical findings, as known debt so they remain visible in reports without blocking every change. This is not a security approval or claim that those issues are resolved; review and remove baseline entries as packages are fixed.
- `.github/license-policy.json` currently blocks GPL and AGPL license families and fails on missing or unrecognized dependency license metadata. This starter policy needs owner/legal review before being treated as a definitive license policy. The SBOM audits dependency metadata; it does not detect copied source-code snippets or plagiarism.
- Lighthouse runs three desktop measurements and compares their medians. A regression over 15%, adjusted by small metric-specific noise floors, fails the gate. Absolute budgets also apply when no baseline is available. These synthetic static-page checks are not a substitute for real classroom-device testing.
- No lint command is currently defined in `package.json`, so CI does not claim to run a linter. No API keys or other workflow secrets are required.

To make the checks block merges, configure a ruleset or branch protection rule for `main` that requires the `quality`, `security`, and `performance` status checks. Without that repository setting, GitHub Actions reports failures but does not prevent merging.
