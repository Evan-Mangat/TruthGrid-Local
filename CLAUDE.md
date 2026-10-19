# TruthGrid-Local — CLAUDE.md

## What this project is

A lightweight literary analysis writing tool for BC secondary students, built as a PWA (Progressive Web App). It guides students through a structured one-paragraph response to a reading passage using the **Point → Example → Explanation** framework, repeated three times. Terminology is configurable by the teacher before each session.

This is a spin-off of the **TruthGrid web prototype** (the original Peer-Review-Prototype repository), which was a college-level AI vs. human peer review tool. The web prototype is useful as a reference for business logic patterns but shares almost no UI or data model with this app.

### Client context

- **Client**: Vancouver School Board (VSB) secondary English teacher
- **Target users**: High school students (BC curriculum, Literary Studies 10/11/12)
- **Curriculum alignment**: Point–Example–Explanation maps to BC ELA outcomes for literary analysis. VSB's formal literacy initiative is the *Responsive Literacy Framework* (K–7 focused), but the PEE structure is the department-level convention this teacher uses. Labels are configurable so the app matches whatever terminology the teacher's department uses.
- **Device reality**: Old school laptops, flaky wifi. The app must work offline after first load, and must not be heavy to load.
- **Key constraint**: Similarity scores are **flags for teacher review only**, never grades or verdicts. This must always be framed clearly in the UI.

### What is explicitly out of scope

- Any AI-generated feedback or marking
- Cloud-only architecture — local-first is the default
- Automatic verdicts based on similarity scores
- Full lockdown/offline Electron mode and the standard PWA at the same time (build one first)

---

## Architecture

**Stack**: React 18 + Vite 5, PWA via `vite-plugin-pwa` (Workbox), IndexedDB via `idb`, no production backend. A development-only Vite middleware runs `ocr_grader.py` for PDF/image OCR uploads.

The writing workflow and response storage run in the browser. No hosted API or external data service is used by the static PWA. The development OCR endpoint is available only while running the local Vite server; static deployments support browser-loaded TXT/MD but need a separate local OCR service for scanned PDFs/images. The cached app shell works offline after installation; hosted updates require connectivity.

```
src/
  App.jsx                     — top-level state machine: 'setup' | 'writing' | 'results'
  index.css                   — design tokens (CSS vars), shared layout utilities
  components/
    TeacherSetup/
      TeacherSetup.jsx         — teacher enters passage/student info, uploads scans, customizes labels
    StudentFlow/
      StudentFlow.jsx          — three-point P/E/E writing form, passage stays visible
    Results/
      Results.jsx              — per-point similarity scores + full response display
    utils/
      similarity.js              — asymmetric lexical containment score, 100% on-device
      db.js                      — IndexedDB CRUD via idb (saveResponse, getAllResponses, deleteResponse)
```

### Data flow

1. **TeacherSetup** → produces a `session` object with passage, optional original scan bytes, student info, labels, and start time.
2. **StudentFlow** → receives `session`, produces a `submission` object including the passage, original scan bytes when uploaded, structured points, similarity scores, and timestamps.
3. **Results** → receives `submission`, calls `saveResponse()` on mount (saves to IndexedDB), displays scores
4. "New Student Session" resets to `App` state `'setup'` — this is the group/shared-device flow

### Similarity scoring

`src/utils/similarity.js` — asymmetric lexical containment between the student's text and the passage. No external library, no network. Returns a float 0–1, or `null` when there is no reference passage. The `exampleScore` is used for display (the example field is most directly tied to the passage text). All three field scores are stored for future use.

### Storage

`src/utils/db.js` — IndexedDB via `idb`. Database: `truthgrid`, store: `responses`. Indexed by `submittedAt` and `studentName`. Responses use unique generated IDs; source scan bytes, when present, are stored with the response. All data stays on the local device.

---

## Running the app

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The `.claude/launch.json` is configured for the dev server.

### Deployment & Distribution: PWA vs. Desktop App

- **How students and teachers access the app (PWA Model - Recommended for Classrooms)**:
  - The built static bundle (`dist/`) is deployed to a web server or static host (e.g. GitHub Pages, Cloudflare Pages, school intranet).
  - Devices connect to Wi-Fi **once** to navigate to the URL in Chrome, Edge, or Safari.
  - The user clicks **Install TruthGrid** (or "Add to Home Screen"). The browser's Service Worker automatically downloads and precaches 100% of the app assets (`dist/` via Workbox).
  - From that point onward, the app opens in a standalone window (no browser address bar/tabs) and works **completely offline with zero internet access**.
  - **Why PWA is preferred over a native `.exe`**: Vancouver School Board (VSB) and most public school districts lock down student Chromebooks and Windows laptops with administrative policies that prohibit running or installing unauthorized `.exe` files. PWAs bypass IT installation restrictions, run on ChromeOS/Windows/Mac/iOS, and auto-update when Wi-Fi is available.

- **Standalone Desktop App (Electron Wrapper)**:
  - Listed on the roadmap for specialized lockdown / Special Ed use cases.
  - Wraps the same React code in an Electron shell with kiosk mode (forcing fullscreen, blocking `Ctrl+T`, `Alt+F4`, and dev tools).
  - Only required when strict offline lockdown or direct filesystem writes (e.g., auto-exporting to a teacher USB key) are needed.

---

## Roadmap / what's next

These are in rough priority order. Check them off as they're completed.

- [x] **CSV export** — teacher button to download all stored responses as a CSV file. Implemented via `exportResponsesToCSV()` in `src/utils/export.js`, accessible from the Teacher Dashboard.
- [x] **Printable view** — `@media print` stylesheet for student responses and blank worksheet printable component (`PrintWorksheet.jsx`) for running off classroom paper copies.
- [x] **Teacher dashboard** — screen (`TeacherDashboard.jsx`) listing all stored IndexedDB responses with student name, date, search filtering, per-point detail expansion, CSV export, and print.
- [x] **PWA icons** — created `public/icon-192.png`, `public/icon-512.png`, and `public/icon.svg`. Precaching verified in Vite PWA bundle.
- [x] **Offline first-load resilience** — service worker configured with autoUpdate, precaches all 10 bundle assets including icons, manifest, and scripts for 100% offline usage.
- [x] **Short-form mode** — single-point (one P/E/E) option in addition to default three-point mode, configurable in TeacherSetup.
- [ ] **Electron wrapper** — deferred until strict kiosk lockdown or local filesystem access is explicitly required.

---

## Design decisions to preserve

- **Labels are always configurable** — never hardcode "Point", "Example", "Explanation" in user-facing strings. Always read from `session.labels`.
- **Similarity scores are flags, not grades** — the UI always includes the disclaimer text. Never remove or soften it.
- **No network calls** — the app must work on flaky school wifi. Nothing should phone home. The similarity scorer is written from scratch with no external NLP library — it uses asymmetric containment overlap entirely inline.
- **Shared-device support** — "Next Student Session" resets active screen for the next student while preserving teacher passage, custom labels, and format mode.

---

## Build output

Production build via `npm run build` (Vite 5):

```
dist/index.html                   0.69 kB (gzip: 0.39 kB)
dist/assets/index-*.css           2.48 kB (gzip: 0.93 kB)
dist/assets/index-*.js          177.28 kB (gzip: 55.34 kB)
dist/sw.js                        service worker (Workbox)
dist/manifest.webmanifest         0.38 kB
dist/icon-192.png, icon-512.png, icon.svg
```

PWA precache: 10 entries (~182 kB). Build time: ~0.4s.

---

## Resolved issues

1. **Similarity metric length distortion (Resolved)** — Replaced symmetric cosine similarity with asymmetric containment overlap in `similarity.js`. Verbatim quotes from the passage now correctly evaluate to ~100% text engagement.
2. **Refresh & navigation data loss (Resolved)** — Added draft autosaving to `sessionStorage`/`localStorage` in `StudentFlow.jsx` plus a `beforeunload` warning modal if student has unsaved writing.
3. **Silent IndexedDB failure (Resolved)** — `Results.jsx` displays a visible warning banner with a "Retry Save" button and "Copy Work to Clipboard" button if storage fails.
4. **Shared-device reset wipes teacher passage & labels (Resolved)** — Teacher configuration (passage, labels, mode) is persisted across student sessions in `App.jsx` and `TeacherSetup.jsx`, while clearing previous student personal info and writing.
5. **Hardcoded "Point" violates configurable labels invariant (Resolved)** — Replaced all instances of hardcoded "Point" with `labels.point` across `StudentFlow.jsx`, `Results.jsx`, `PrintWorksheet.jsx`, and `TeacherDashboard.jsx`.
6. **Missing `public/` directory & PWA icons (Resolved)** — Created `public/icon-192.png`, `public/icon-512.png`, and `public/icon.svg`.
7. **`Math.max(...spread)` call stack overflow risk (Resolved)** — Token frequencies are summed/bounded without spreading unbounded arrays into function arguments.
8. **React StrictMode double-save (Resolved)** — Added `hasSavedRef` guard in `Results.jsx` to prevent duplicate rows in development mode.
9. **Dead code (Resolved)** — `fullResponse` is now included in the submission payload.
10. **`startedAt` dropped from submission (Resolved)** — `startedAt` is preserved throughout the pipeline.

---

## Testing

Run the test suites with `npm test` and `npm run build && npm run test:pwa`. Vitest covers scoring, CSV safety, teacher setup, student scan preview, dashboard statistics/errors, IndexedDB persistence, and the app workflow. Playwright checks the production PWA manifest and cached shell after going offline. Install the browser once with `npx playwright install chromium` if Playwright reports that its browser is missing.

The offline browser test verifies the cached shell and standalone manifest; it does not test deployment-specific OCR availability or guarantee recovery from browser site-data deletion. OCR is available through development middleware only; static deployments need a separate OCR service for scans. The student writing view includes the extracted text and a local preview/open link for the original uploaded PDF/image, with a reminder to verify OCR against the scan.

---

## Agent files

GitHub agent configurations live in `.github/agents/`:

| Agent | Purpose |
|-------|---------|
| `truthgrid-local.agent.md` | General development and maintenance |
| `truthgrid-dashboard.agent.md` | Teacher dashboard and export features |
| `truthgrid-pwa-reliability.agent.md` | Offline behavior, service worker, icons |
| `truthgrid-security-review.agent.md` | Security audit, input validation, data leaks |
| `truthgrid-senior-critic.agent.md` | Brutal code review — bugs, edge cases, quality |
