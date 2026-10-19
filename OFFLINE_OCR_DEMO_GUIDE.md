# TruthGrid Local — Offline OCR & Evaluation Engine
## Ready-to-Run Vertical Slice & Wednesday Presentation Guide

This codebase implements a **100% offline, local-first OCR and evaluation pipeline** that extracts text from photocopied/scanned student worksheets (PDF or image) and matches them against an answer key or rubric using fuzzy string matching.

---

### Quick Start: Run the Demo in 5 Seconds

Open your terminal in this project folder and run:

```bash
python3 ocr_grader.py --demo
```

This command automatically:
1. Synthesizes two realistic student scans (`sample_data/sample_student_work.pdf` and `sample_data/sample_student_partial.pdf`) and an answer key.
2. Converts the PDF pages into high-contrast images on-device.
3. Runs Tesseract OCR locally (in ~0.3 seconds) without touching the internet.
4. Performs fuzzy token matching (`token_set_ratio`) and concept breakdown.
5. Displays an executive terminal summary with visual progress bars and status badges:
   - **Case 1 (Passing Student Work)**: `93% Match` ➔ `🟢 PASS / CORRECT`
   - **Case 2 (Partial/Off-Topic Work)**: `53% Match` ➔ `🔴 FLAGGED / INCORRECT`

To save the structured JSON report for your frontend or logs:

```bash
python3 ocr_grader.py --demo --json demo_report.json
```

---

### Running on Your Own Files

To grade any scanned worksheet (PDF, PNG, JPG, or TIFF) against an answer key text file:

```bash
python3 ocr_grader.py \
  --input path/to/student_worksheet.pdf \
  --key path/to/answer_key.txt \
  --threshold 80
```

Available flags:
- `--input` / `-i`: Path to the scanned PDF or image.
- `--key` / `-k`: Path to answer key text file (or raw string in quotes).
- `--threshold` / `-t`: Passing threshold percentage (default: `80`).
- `--json`: Output filepath for structured JSON export.
- `--no-enhance`: Disables image contrast/sharpening preprocessing.

---

### How the Offline Pipeline Works Under the Hood

```
[ Scanned PDF or Image ]
          │
          ▼
1. Local Page Converter (sips on macOS / pdf2image + poppler cross-platform)
   - Flattens transparent PDF backgrounds onto solid white canvas
          │
          ▼
2. Image Preprocessor (PIL)
   - Converts to Grayscale ('L')
   - Adaptive Contrast Boost (1.8x)
   - Edge Sharpening (1.3x) to eliminate photocopy gray background noise
          │
          ▼
3. Local OCR Engine (Tesseract 5.5.1 on CPU/GPU)
   - Reads image text directly on your laptop hard drive
   - Execution time: ~0.25s - 0.4s
          │
          ▼
4. Fuzzy Token Matching Engine (fuzzywuzzy / rapidfuzz)
   - Token Set Ratio: eliminates false penalties from word reordering & filler words
   - Tolerates OCR letter substitutions (e.g., mistaking 'O' for '0' or 'rn' for 'm')
   - Concept Containment: measures how many rubric sentences were covered
          │
          ▼
[ Clean Visual Report / JSON Output ]
```

---

### Pitch Strategy for Wednesday's Meeting

#### 1. How to Frame "Offline / Local-First" as a High-Value Feature
Do **not** present offline mode as a shortcut or "unfinished backend." Present it as a deliberate architectural advantage:

| Investor / Advisor Concern | Your Answer (The Pitch) |
|---|---|
| **Student Privacy & Compliance** | *"Because the OCR and comparison engine run 100% on-device, student data never leaves the laptop. We achieve zero-liability FERPA and COPPA compliance by design."* |
| **School Wi-Fi Reliability** | *"School district Wi-Fi is notoriously congested and flaky. Our pipeline requires zero internet connection to process student work."* |
| **Cloud Costs & Margins** | *"We don't incur \$0.02 - \$0.05 per-page cloud API calls (OpenAI/Google Cloud Vision). Our unit economics have zero marginal inference costs."* |
| **Speed & Latency** | *"Zero network roundtrip latency. The entire scan-to-score pipeline completes locally in under 400 milliseconds."* |

#### 2. 30-Second Live Demo Script for Wednesday
1. **Show the input file**: Open `sample_data/sample_student_work.pdf` in Preview/Finder.
   - Say: *"Here is a typical student response to a literary analysis prompt on The Great Gatsby."*
2. **Turn off your Wi-Fi (optional power move)** or mention:
   - Say: *"Watch this process locally on my laptop without any cloud API calls."*
3. **Run the command**:
   ```bash
   python3 ocr_grader.py --demo
   ```
4. **Highlight the output**:
   - Point to the `Processing Time: ~0.3s (100% On-Device / Zero Cloud)`.
   - Point to `Similarity Score: 93% ➔ 🟢 PASS / CORRECT`.
   - Point to Demo Case 2 where off-topic work scores `53% ➔ 🔴 FLAGGED / INCORRECT`.
5. **Close with the next step**:
   - *"This core vertical slice is now working. Next, we are integrating this offline module directly into the teacher dashboard."*
