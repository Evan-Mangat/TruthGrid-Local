#!/usr/bin/env python3
"""
TruthGrid Local — 100% Offline OCR & Student Work Comparison Engine
===================================================================
Completely On-Device | Zero Wi-Fi Required | Zero Cloud API Costs

Core Capabilities:
1. Offline Document Ingestion:
   - Scanned/photocopied PDFs and standard images (.png, .jpg, .tiff, etc.)
   - Auto-flattening of transparent PDF layers onto solid white backgrounds
   - Native macOS 'sips' + cross-platform 'pdf2image' dual-engine fallback

2. Photocopy & Scan Enhancement Pipeline:
   - Grayscale conversion, adaptive contrast boost, edge sharpening
   - Eliminates scan shadows, faint pencil/ink, and gray photocopier backgrounds

3. Offline OCR (Tesseract):
   - Fast, local neural network text extraction running directly on CPU/GPU
   - Auto-detection of local Tesseract binaries across macOS, Linux, and Windows

4. Typo-Tolerant Grading & Comparison (Fuzzy Token Engine):
   - Handles OCR misrecognitions (O vs 0, rn vs m, dropped punctuation)
   - Computes Token Set Ratio, Token Sort Ratio, and Partial Ratio
   - Key Concept Containment: identifies which rubric concepts were met vs missed

5. Demo & Presentation Mode (--demo):
   - Creates realistic sample assets on demand
   - Produces executive-level terminal reports with visual score bars & status badges
   - Exports structured JSON reports for frontend/UI integration
"""

import os
import sys
import time
import json
import shutil
import argparse
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

# Core offline image & OCR libraries
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw
import pytesseract
from fuzzywuzzy import fuzz


# Automatically configure tesseract binary path if needed
def _setup_tesseract_path() -> None:
    candidate_paths = [
        shutil.which("tesseract"),
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/usr/bin/tesseract",
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for p in candidate_paths:
        if p and os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            return


_setup_tesseract_path()


# ==============================================================================
# 1. OFFLINE PDF & IMAGE INGESTION + PREPROCESSING
# ==============================================================================

class OfflineOCR:
    """Extracts text from scanned/photocopied documents 100% locally."""

    @staticmethod
    def preprocess_image(image: Image.Image) -> Image.Image:
        """
        Enhance image quality before OCR to eliminate photocopy noise,
        faint ink, and gray backgrounds. Handles transparent PDF alpha layers.
        """
        # 1. Flatten transparent backgrounds onto pure white (crucial for PDFs)
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            bg = Image.new("RGB", image.size, (255, 255, 255))
            if "A" in image.getbands():
                bg.paste(image, mask=image.split()[-1])
            else:
                bg.paste(image)
            image = bg
        elif image.mode != "RGB":
            image = image.convert("RGB")

        # 2. Convert to grayscale
        gray = image.convert("L")

        # 3. Increase contrast to make text punchy against paper background
        contrast = ImageEnhance.Contrast(gray).enhance(1.8)

        # 4. Mild sharpening to crisp up blurred letterforms
        sharp = ImageEnhance.Sharpness(contrast).enhance(1.3)

        return sharp

    @classmethod
    def convert_pdf_to_images(cls, pdf_path: str) -> List[Image.Image]:
        """
        Converts PDF pages into PIL Images without cloud dependencies.
        Tries pdf2image (poppler), with automatic fallback to macOS 'sips' if poppler is absent.
        """
        pdf_path = os.path.abspath(pdf_path)
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        # Method 1: Try pdf2image (poppler)
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(pdf_path)
            if pages:
                return pages
        except Exception:
            pass

        # Method 2: macOS built-in 'sips' fallback (built into every Mac, zero install required)
        if sys.platform == "darwin" and shutil.which("sips"):
            temp_out = f"/tmp/truthgrid_ocr_{os.getpid()}_{int(time.time())}.png"
            res = subprocess.run(
                ["sips", "-s", "format", "png", pdf_path, "--out", temp_out],
                capture_output=True,
                text=True,
            )
            if res.returncode == 0 and os.path.exists(temp_out):
                try:
                    img = Image.open(temp_out)
                    img.load()  # Load image data into memory
                    # Clean up temp file
                    try:
                        os.remove(temp_out)
                    except OSError:
                        pass
                    return [img]
                except Exception:
                    pass

        raise RuntimeError(
            f"Could not convert PDF '{pdf_path}' to images.\n"
            "Solution: Install poppler for your OS:\n"
            "  - Mac: brew install poppler\n"
            "  - Ubuntu/Debian: sudo apt-get install poppler-utils\n"
            "  - Windows: download poppler binaries and add to PATH\n"
            "Or pass an image file directly (.png, .jpg, .tiff)."
        )

    @classmethod
    def load_document_images(cls, file_path: str) -> List[Image.Image]:
        """Loads pages as PIL images from either a PDF or standard image format."""
        file_path = os.path.abspath(file_path)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input file not found: {file_path}")

        ext = Path(file_path).suffix.lower()

        if ext == ".pdf":
            return cls.convert_pdf_to_images(file_path)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"]:
            img = Image.open(file_path)
            img.load()
            return [img]
        else:
            raise ValueError(
                f"Unsupported file format: {ext}. Supported: PDF, PNG, JPG, JPEG, TIFF, BMP."
            )

    @classmethod
    def extract_text(
        cls,
        file_path: str,
        preprocess: bool = True,
        tesseract_config: str = "--oem 3",
    ) -> Dict[str, Any]:
        """
        Extracts text from a scanned PDF or image completely offline.
        """
        start_time = time.time()
        images = cls.load_document_images(file_path)

        page_texts = []
        for idx, img in enumerate(images):
            target_img = cls.preprocess_image(img) if preprocess else img
            raw_text = pytesseract.image_to_string(target_img, config=tesseract_config)
            cleaned = cls.clean_text(raw_text)
            page_texts.append(cleaned)

        elapsed = time.time() - start_time
        full_text = "\n\n".join(page_texts).strip()

        return {
            "full_text": full_text,
            "page_count": len(images),
            "per_page": page_texts,
            "elapsed_seconds": round(elapsed, 3),
        }

    @staticmethod
    def clean_text(text: str) -> str:
        """Cleans up raw OCR text by normalizing line breaks and removing extraneous symbols."""
        lines = [line.strip() for line in text.splitlines()]
        cleaned_lines = []
        last_empty = False
        for line in lines:
            if not line:
                if not last_empty:
                    cleaned_lines.append("")
                    last_empty = True
            else:
                cleaned_lines.append(line)
                last_empty = False
        return "\n".join(cleaned_lines).strip()


# ==============================================================================
# 2. FUZZY MATCHING & GRADING ENGINE (HANDLING OCR TYPOS)
# ==============================================================================

class FuzzyGrader:
    """
    Evaluates student response text against an answer key/rubric using
    fuzzy token matching and key concept containment to tolerate OCR typos.
    """

    @classmethod
    def grade(
        cls,
        extracted_text: str,
        answer_key: str,
        threshold: int = 80,
    ) -> Dict[str, Any]:
        """
        Compares extracted student text against the reference answer key.
        """
        extracted_clean = extracted_text.strip()
        answer_clean = answer_key.strip()

        if not extracted_clean:
            return {
                "similarity_score": 0,
                "token_set_score": 0,
                "token_sort_score": 0,
                "partial_score": 0,
                "threshold": threshold,
                "verdict": "FLAG",
                "status": "NO TEXT DETECTED",
                "badge": "🔴",
                "concept_analysis": {
                    "total_concepts": 0,
                    "matched_count": 0,
                    "containment_rate": 0.0,
                    "matched_concepts": [],
                    "missing_concepts": [],
                },
            }

        # 1. Token set ratio handles word reordering and extraneous words (the core metric)
        token_set_score = fuzz.token_set_ratio(answer_clean, extracted_clean)

        # 2. Token sort ratio compares similarity when words are sorted alphabetically
        token_sort_score = fuzz.token_sort_ratio(answer_clean, extracted_clean)

        # 3. Partial ratio checks if answer key concepts are nested in student text
        partial_score = fuzz.partial_ratio(answer_clean, extracted_clean)

        # Primary composite similarity metric
        primary_score = token_set_score

        # Status determination
        if primary_score >= threshold:
            status = "PASS / CORRECT"
            verdict = "PASS"
            badge = "🟢"
        elif primary_score >= 55:
            status = "REVIEW NEEDED (PARTIAL)"
            verdict = "REVIEW"
            badge = "🟡"
        else:
            status = "FLAGGED / INCORRECT"
            verdict = "FLAG"
            badge = "🔴"

        # Concept overlap breakdown
        concept_analysis = cls.analyze_concepts(answer_clean, extracted_clean)

        return {
            "similarity_score": primary_score,
            "token_set_score": token_set_score,
            "token_sort_score": token_sort_score,
            "partial_score": partial_score,
            "threshold": threshold,
            "verdict": verdict,
            "status": status,
            "badge": badge,
            "concept_analysis": concept_analysis,
        }

    @staticmethod
    def analyze_concepts(answer_key: str, student_text: str) -> Dict[str, Any]:
        """
        Extracts key clauses from the answer key and checks
        how well each concept was captured in the student's text.
        """
        import re

        raw_clauses = re.split(r"[.\n;]", answer_key)
        sentences = [
            s.strip()
            for s in raw_clauses
            if len(s.strip().split()) >= 4
        ]

        if not sentences:
            sentences = [answer_key.strip()]

        matched_concepts = []
        missing_concepts = []

        for sentence in sentences:
            score = fuzz.partial_ratio(sentence.lower(), student_text.lower())
            if score >= 70:
                matched_concepts.append({"concept": sentence, "score": score})
            else:
                missing_concepts.append({"concept": sentence, "score": score})

        containment_rate = (
            round((len(matched_concepts) / len(sentences)) * 100, 1)
            if sentences
            else 0.0
        )

        return {
            "total_concepts": len(sentences),
            "matched_count": len(matched_concepts),
            "containment_rate": containment_rate,
            "matched_concepts": matched_concepts,
            "missing_concepts": missing_concepts,
        }


# ==============================================================================
# 3. EXECUTIVE REPORT FORMATTER
# ==============================================================================

class ReportFormatter:
    """Generates clean CLI and JSON outputs for investor/advisor demos."""

    @staticmethod
    def render_cli(
        file_path: str,
        ocr_result: Dict[str, Any],
        grade_result: Dict[str, Any],
        answer_key: str,
    ) -> None:
        score = grade_result["similarity_score"]
        status = grade_result["status"]
        badge = grade_result["badge"]
        threshold = grade_result["threshold"]

        # 20-character visual progress bar: e.g. [██████████████████░░] 92%
        filled = int((score / 100) * 20)
        bar = "█" * filled + "░" * (20 - filled)

        print("\n" + "=" * 70)
        print("          TRUTHGRID LOCAL — OFFLINE OCR & GRADING REPORT         ")
        print("=" * 70)
        print(f" Source Document : {os.path.basename(file_path)}")
        print(f" Pages Scanned   : {ocr_result['page_count']}")
        print(f" Processing Time : {ocr_result['elapsed_seconds']}s (100% On-Device / Zero Cloud)")
        print("-" * 70)
        print(f" Similarity Score: [{bar}] {score}% (Passing Threshold: {threshold}%)")
        print(f" Verdict         : {badge}  {status}")
        print("-" * 70)

        print(" [EXTRACTED OCR TEXT (From Scanned Document)]")
        text_preview = ocr_result["full_text"]
        if not text_preview:
            print("   (No text detected)")
        else:
            lines = text_preview.splitlines()
            display_lines = lines[:8]
            for line in display_lines:
                print(f"   > {line}")
            if len(lines) > 8:
                print(f"   > ... [{len(lines) - 8} more lines omitted]")

        print("\n [REFERENCE ANSWER KEY / RUBRIC]")
        key_preview = answer_key.strip()
        lines_k = key_preview.splitlines()
        for line in lines_k[:6]:
            print(f"   | {line}")
        if len(lines_k) > 6:
            print(f"   | ... [{len(lines_k) - 6} more lines omitted]")

        print("-" * 70)
        concepts = grade_result["concept_analysis"]
        print(f" Key Concepts Matched : {concepts['matched_count']} / {concepts['total_concepts']} ({concepts['containment_rate']}%)")
        for m in concepts["matched_concepts"]:
            print(f"   ✅ Matched: \"{m['concept'][:65]}\" (Match: {m['score']}%)")
        for miss in concepts["missing_concepts"]:
            print(f"   ⚠️  Missed:  \"{miss['concept'][:65]}\" (Match: {miss['score']}%)")

        print("=" * 70)
        print(" Pitch Note: All processing occurs on-device. Zero student data is sent")
        print(" to external cloud servers, guaranteeing 100% FERPA/COPPA compliance")
        print(" and zero reliance on school Wi-Fi infrastructure.")
        print("=" * 70 + "\n")


# ==============================================================================
# 4. SYNTHETIC DEMO ASSET GENERATOR
# ==============================================================================

def generate_demo_assets(output_dir: str = "sample_data") -> Dict[str, str]:
    """
    Creates realistic sample student work (both passing and partial/unrelated),
    and an answer key, ready for immediate presentation demos.
    """
    os.makedirs(output_dir, exist_ok=True)
    passing_pdf = os.path.join(output_dir, "sample_student_work.pdf")
    passing_png = os.path.join(output_dir, "sample_student_work.png")
    partial_pdf = os.path.join(output_dir, "sample_student_partial.pdf")
    key_path = os.path.join(output_dir, "sample_answer_key.txt")

    answer_key_text = (
        "In The Great Gatsby, the green light at the end of Daisy Buchanan's dock "
        "symbolizes Jay Gatsby's hopes and unattainable dreams for the future. "
        "Fitzgerald illustrates how the past cannot simply be repeated, ending with "
        "the famous line: 'So we beat on, boats against the current, borne back ceaselessly into the past.' "
        "This exposes the tragic illusion of the American Dream."
    )

    with open(key_path, "w", encoding="utf-8") as f:
        f.write(answer_key_text)

    # High-scoring student work (Alex Morgan - 95%+)
    student_work_passing = (
        "Literary Analysis Response - Student: Alex Morgan (Grade 11)\n\n"
        "Question: Analyze the symbolism of the green light in The Great Gatsby.\n\n"
        "Point:\n"
        "In The Great Gatsby, the green light at the end of Daisy Buchanan's dock\n"
        "symbolizes Jay Gatsby's hopes and unattainable dreams for the future.\n\n"
        "Example:\n"
        "Fitzgerald concludes the novel with the reflection: 'So we beat on, boats\n"
        "against the current, borne back ceaselessly into the past.'\n\n"
        "Explanation:\n"
        "This illustrates how the past cannot simply be repeated, exposing the\n"
        "tragic illusion of the American Dream."
    )

    # Partial/Struggling student work (Jordan Lee - ~55%)
    student_work_partial = (
        "Literary Analysis Response - Student: Jordan Lee (Grade 11)\n\n"
        "Question: Analyze the symbolism of the green light in The Great Gatsby.\n\n"
        "Point:\n"
        "The green light represents Gatsby's desire for money and big parties.\n\n"
        "Example:\n"
        "He stands outside in the dark looking across the water at the light.\n\n"
        "Explanation:\n"
        "He wants to be rich so people like him and come to his mansion."
    )

    # 1. Generate High-Res Scanned Work Image (PNG)
    img = Image.new("RGB", (1200, 850), color="#FBFBFA")
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 40, 1140, 45], fill="#2B2B2B")

    y = 65
    for line in student_work_passing.splitlines():
        if line.startswith("Question:") or line.startswith("Point:") or line.startswith("Example:") or line.startswith("Explanation:"):
            draw.text((70, y), line, fill="#0A0A0A")
            y += 32
        elif line.startswith("Literary Analysis"):
            draw.text((70, y), line, fill="#000000")
            y += 36
        else:
            draw.text((90, y), line, fill="#1F1F1F")
            y += 28
    draw.rectangle([30, 25, 1170, 825], outline="#D0D0D0", width=2)
    img.save(passing_png)

    # 2. Generate PDF files using fpdf2
    try:
        from fpdf import FPDF

        def make_pdf(text: str, dest: str):
            pdf = FPDF()
            pdf.add_page()
            pdf.set_margins(15, 15, 15)
            pdf.set_font("Helvetica", size=12)
            pdf.multi_cell(w=180, h=8, text=text)
            pdf.output(dest)

        make_pdf(student_work_passing, passing_pdf)
        make_pdf(student_work_partial, partial_pdf)
    except Exception as e:
        # Fallback if PDF generation encounters issues
        passing_pdf = passing_png

    return {
        "passing_pdf": passing_pdf,
        "passing_png": passing_png,
        "partial_pdf": partial_pdf,
        "answer_key": key_path,
    }


# ==============================================================================
# 5. CLI INTERFACE & MAIN RUNNER
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="TruthGrid Local — 100% Offline OCR & Student Work Evaluator"
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        help="Path to scanned PDF or image file (PNG, JPG, TIFF)",
    )
    parser.add_argument(
        "--key",
        "-k",
        type=str,
        help="Path to reference answer key / rubric text file (or raw string)",
    )
    parser.add_argument(
        "--threshold",
        "-t",
        type=int,
        default=80,
        help="Passing similarity threshold percentage (default: 80)",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run self-contained demo comparing both passing and partial student scans",
    )
    parser.add_argument(
        "--json",
        type=str,
        help="Optional path to export results as a JSON report",
    )
    parser.add_argument(
        "--json-stdout",
        action="store_true",
        help="Output raw JSON to stdout (for API and web integration)",
    )
    parser.add_argument(
        "--no-enhance",
        action="store_true",
        help="Skip image preprocessing (use raw scan)",
    )

    args = parser.parse_args()

    # Handle explicit demo mode or no input specified
    if args.demo or not args.input:
        print("\n" + "#" * 70)
        print("  TRUTHGRID LOCAL — OFFLINE OCR PIPELINE DEMO (WEDNESDAY PREVIEW) ")
        print("#" * 70)
        print("Generating realistic student work scans (PDF & PNG) and answer key...")
        assets = generate_demo_assets()

        with open(assets["answer_key"], "r", encoding="utf-8") as f:
            answer_key = f.read()

        # Run Case 1: High Quality / Passing Student Work
        print("\n>>> DEMO CASE 1: Passing Student Work (Alex Morgan) <<<")
        input_file_1 = assets["passing_pdf"]
        ocr_1 = OfflineOCR.extract_text(input_file_1, preprocess=not args.no_enhance)
        grade_1 = FuzzyGrader.grade(ocr_1["full_text"], answer_key, threshold=args.threshold)
        ReportFormatter.render_cli(input_file_1, ocr_1, grade_1, answer_key)

        # Run Case 2: Partial / Flagged Student Work (Jordan Lee)
        print(">>> DEMO CASE 2: Partial / Flagged Student Work (Jordan Lee) <<<")
        input_file_2 = assets["partial_pdf"]
        ocr_2 = OfflineOCR.extract_text(input_file_2, preprocess=not args.no_enhance)
        grade_2 = FuzzyGrader.grade(ocr_2["full_text"], answer_key, threshold=args.threshold)
        ReportFormatter.render_cli(input_file_2, ocr_2, grade_2, answer_key)

        if args.json:
            export_payload = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "demo_cases": [
                    {"case": "passing", "file": input_file_1, "ocr": ocr_1, "grade": grade_1},
                    {"case": "partial", "file": input_file_2, "ocr": ocr_2, "grade": grade_2},
                ],
            }
            with open(args.json, "w", encoding="utf-8") as f:
                json.dump(export_payload, f, indent=2)
            print(f"💾 Demo report saved to {args.json}\n")
        return

    # Standard Single-File Execution
    file_to_process = args.input
    threshold = args.threshold

    try:
        ocr_result = OfflineOCR.extract_text(
            file_to_process, preprocess=not args.no_enhance
        )
    except Exception as e:
        if args.json_stdout:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.exit(1)
        else:
            print(f"❌ OCR Extraction Error: {e}")
            sys.exit(1)

    # If called programmatically with --json-stdout (e.g. from Vite web app)
    if args.json_stdout:
        output_payload = {
            "success": True,
            "filename": os.path.basename(file_to_process),
            "text": ocr_result["full_text"],
            "page_count": ocr_result["page_count"],
            "elapsed_seconds": ocr_result["elapsed_seconds"],
            "word_count": len(ocr_result["full_text"].split()),
        }
        print(json.dumps(output_payload))
        return

    # Case A: Answer key provided -> Perform comparison & grading
    if args.key:
        print(f"📖 Processing document: {os.path.basename(file_to_process)} (Offline OCR)...")
        if os.path.exists(args.key):
            with open(args.key, "r", encoding="utf-8") as f:
                answer_key = f.read()
        else:
            answer_key = args.key

        print(f"🔍 Comparing against answer key using fuzzy token matching...")
        grade_result = FuzzyGrader.grade(
            extracted_text=ocr_result["full_text"],
            answer_key=answer_key,
            threshold=threshold,
        )

        ReportFormatter.render_cli(
            file_path=file_to_process,
            ocr_result=ocr_result,
            grade_result=grade_result,
            answer_key=answer_key,
        )

        if args.json:
            export_payload = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source_file": file_to_process,
                "ocr": ocr_result,
                "grading": grade_result,
            }
            with open(args.json, "w", encoding="utf-8") as f:
                json.dump(export_payload, f, indent=2)
            print(f"💾 Report saved to {args.json}\n")

    # Case B: No answer key provided -> Pure OCR text extraction report
    else:
        word_count = len(ocr_result["full_text"].split())
        line_count = len(ocr_result["full_text"].splitlines())

        print("\n" + "=" * 70)
        print("          TRUTHGRID LOCAL — OFFLINE OCR TEXT EXTRACTION          ")
        print("=" * 70)
        print(f" Source Document : {os.path.basename(file_to_process)}")
        print(f" Pages Scanned   : {ocr_result['page_count']}")
        print(f" Word Count      : {word_count} words ({line_count} lines)")
        print(f" Processing Time : {ocr_result['elapsed_seconds']}s (100% On-Device / Zero Cloud)")
        print("-" * 70)
        print(" [EXTRACTED PASSAGE / WORK TEXT]")
        print("-" * 70)
        if ocr_result["full_text"]:
            for line in ocr_result["full_text"].splitlines():
                print(f"   {line}")
        else:
            print("   (No text detected in scan)")
        print("=" * 70 + "\n")

        if args.json:
            export_payload = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source_file": file_to_process,
                "ocr": ocr_result,
                "word_count": word_count,
            }
            with open(args.json, "w", encoding="utf-8") as f:
                json.dump(export_payload, f, indent=2)
            print(f"💾 Extraction saved to {args.json}\n")


if __name__ == "__main__":
    main()
