# TruthGrid-Local — CLAUDE.md

## What this project is

A lightweight literary analysis writing tool for BC secondary students, built as a PWA (Progressive Web App). It guides students through a structured one-paragraph response to a reading passage using the **Point → Example → Explanation** framework, repeated three times. Terminology is configurable by the teacher before each session.

This is a spin-off of the **TruthGrid web prototype** (`C:\Users\evanm\Documents\Peer-Review-Prototype`), which was a college-level AI vs. human peer review tool. The web prototype is useful as a reference for business logic patterns but shares almost no UI or data model with this app.

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

**Stack**: React 18 + Vite 5, PWA via `vite-plugin-pwa` (Workbox), IndexedDB via `idb`, no backend.

Everything runs in the browser. No server, no API calls, no external data. Offline after first load via service worker.

```
src/
  App.jsx                     — top-level state machine: 'setup' | 'writing' | 'results'
  index.css                   — design tokens (CSS vars), shared layout utilities
  components/
    TeacherSetup/
      TeacherSetup.jsx         — teacher pastes passage, enters student info, customizes labels
    StudentFlow/
      StudentFlow.jsx          — three-point P/E/E writing form, passage stays visible
    Results/
      Results.jsx              — per-point similarity scores + full response display
  utils/
    similarity.js              — TF-IDF cosine similarity, 100% on-device
    db.js                      — IndexedDB CRUD via idb (saveResponse, getAllResponses, deleteResponse)
```

### Data flow

1. **TeacherSetup** → produces a `session` object: `{ passage, studentName, studentNumber, labels, startedAt }`
2. **StudentFlow** → receives `session`, produces a `submission` object: `{ studentName, studentNumber, passage, points: [{point, example, explanation} x3], similarityScores, submittedAt, labels }`
3. **Results** → receives `submission`, calls `saveResponse()` on mount (saves to IndexedDB), displays scores
4. "New Student Session" resets to `App` state `'setup'` — this is the group/shared-device flow

### Similarity scoring

`src/utils/similarity.js` — TF-IDF cosine similarity between the student's text and the passage. No external library, no network. Returns a float 0–1. The `exampleScore` is used for display (the example field is most directly tied to the passage text). All three field scores are stored for future use.

### Storage

`src/utils/db.js` — IndexedDB via `idb`. Database: `truthgrid`, store: `responses`. Indexed by `submittedAt` and `studentName`. All data stays on the local device. `getAllResponses()` is ready to use for the export and teacher dashboard features.

---

## Running the app

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The `.claude/launch.json` is configured for the dev server.

---

## Roadmap / what's next

These are in rough priority order. Check them off as they're completed.

- [ ] **CSV export** — teacher button to download all stored responses as a CSV file. Use `getAllResponses()` from `db.js`, serialize to CSV in the browser, trigger a download via a `<a>` blob URL. Add this to a teacher-facing screen (not visible to students during a session).
- [ ] **Printable view** — `@media print` stylesheet so teachers can print the student's response (or a blank worksheet). A blank print mode (no student data, just the passage + labeled fields) would let teachers run off paper copies.
- [ ] **Teacher dashboard** — a screen (accessible after a session, or from the setup screen) that lists all stored responses with student name, date, and overall engagement score. Should use `getAllResponses()` and allow clicking into a full response view.
- [ ] **PWA icons** — `public/icon-192.png` and `public/icon-512.png` are referenced in `vite.config.js` but not yet created. **This is a blocker for offline reliability.** Without the icons, the service worker registration may not fully activate in some browsers, meaning the app won't be cached after first load. Add these before relying on offline mode in a classroom. Once icons exist and a student has loaded the app once on wifi, all subsequent uses work fully offline.
- [ ] **Offline first-load resilience** — service worker is wired in via `vite-plugin-pwa` (autoUpdate mode). Test that the app works fully offline after one load, including the similarity scorer and IndexedDB writes.
- [ ] **Short-form mode** — single-point (one P/E/E) option in addition to the default three-point mode. Teacher toggles this in the setup screen. Already partially supported by the data model — `NUM_POINTS` in `StudentFlow.jsx` controls the count.
- [ ] **Electron wrapper** — for the Special Ed lockdown/offline mode. The same React app gets wrapped in an Electron shell with: kiosk mode, disabled keyboard shortcuts (Ctrl+T, Alt+F4, etc.), fullscreen forced, "complete" button only visible to teacher to unlock. This is a separate build target, not a separate app.

---

## Design decisions to preserve

- **Labels are always configurable** — never hardcode "Point", "Example", "Explanation" in user-facing strings. Always read from `session.labels`.
- **Similarity scores are flags, not grades** — the UI always includes the disclaimer text. Never remove or soften it.
- **No network calls** — the app must work on flaky school wifi. Nothing should phone home. The similarity scorer is written from scratch with no external NLP library — it uses TF-IDF cosine similarity entirely inline.
- **Shared-device support** — "New Student Session" must always reset fully to the setup screen, clearing all prior student data from React state (not from IndexedDB — responses are kept).

---

## Build output

Production build via `npm run build` (Vite 5):

```
dist/index.html                   0.59 kB (gzip: 0.35 kB)
dist/assets/index-*.css           1.92 kB (gzip: 0.77 kB)
dist/assets/index-*.js          155.95 kB (gzip: 50.20 kB)
dist/sw.js                        service worker (Workbox)
dist/manifest.webmanifest         PWA manifest
```

PWA precache: 5 entries (~155 kB). Build time: ~0.5s.

---

## Known issues

1. **Missing `public/` directory** — `public/icon-192.png` and `public/icon-512.png` are referenced in `vite.config.js` but neither the directory nor the files exist. This is a PWA installability blocker.
2. **Dead code** — `fullResponse` in `StudentFlow.jsx` (line 35–37) is computed but never stored in the submission object.
3. **React strict mode double-save** — `Results.jsx` saves to IndexedDB in a `useEffect` with an empty dependency array. In development mode, React 18 StrictMode mounts twice, which could cause a duplicate record. Production is fine.
4. **No input length limits** — student text fields have no `maxLength`. A student could paste enormous text that bloats IndexedDB.
5. **No error boundary** — if IndexedDB write fails, the error is caught by `.catch(console.error)` in Results.jsx but the user sees no feedback.

---

## Testing

No test framework is currently installed. No tests exist. Future testing should include:

- **Unit tests** for `scoreSimilarity()` with edge cases (empty strings, identical text, no overlap)
- **Unit tests** for `db.js` CRUD operations (can use `fake-indexeddb` for Node.js testing)
- **Component tests** for form validation in TeacherSetup and StudentFlow
- **Integration test** for the full `setup → writing → results → reset` cycle
- **PWA/offline test** after icons are added — verify the app loads from service worker cache with network disabled

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
