#!/usr/bin/env python3
"""
TribalScholar AI - Synthetic Demo Certificate Generator
Produces crisp, realistic, clearly watermarked sample documents in demo-assets/
for MoTA Scholarship and Fellowship verification testing and jury demonstrations.

Outputs generated:
1. income_certificate_deficient.png / .pdf (Annual family income ₹1,20,000 vs form entry ₹80,000)
2. income_certificate_valid.png / .pdf (Exact proposal mockup match: ₹80,000, SAMPLE-2026-01482)
3. st_caste_certificate_valid.png / .pdf (Scheduled Tribe caste certificate: Santhal community)
4. domicile_certificate_valid.png / .pdf (State of Jharkhand domicile / permanent resident certificate)
5. academic_marksheet_valid.png / .pdf (Central University of Jharkhand B.Tech transcript: 78.4%)
"""

import argparse
import math
import os
import sys
import textwrap
from pathlib import Path
from typing import List, Optional, Tuple

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is required. Please install Pillow or run with services/ai-ocr/.venv/bin/python", file=sys.stderr)
    sys.exit(1)


# Page dimensions: A4 at ~150 DPI for crisp PaddleOCR recognition
PAGE_WIDTH = 1240
PAGE_HEIGHT = 1754

# Color Palette
COLOR_NAVY_PRIMARY = "#1E3A8A"      # Deep Government Navy
COLOR_NAVY_DARK = "#0F172A"         # Slate 900 for dark text
COLOR_SLATE_HEADER = "#334155"      # Slate 700 for subheaders
COLOR_SLATE_MUTED = "#64748B"       # Slate 500 for labels
COLOR_BORDER_OUTER = "#1E3A8A"      # Outer frame
COLOR_BORDER_INNER = "#CBD5E1"      # Inner divider
COLOR_BOX_BG = "#F8FAFC"            # Table / Box fill
COLOR_STAMP_BLUE = "#1D4ED8"        # Official seal blue
COLOR_SIG_INK = "#1E40AF"           # Fountain pen ink
COLOR_GOLD_ACCENT = "#D97706"       # Amber / Gold crest accent


def resolve_system_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Find a crisp sans-serif true-type font across macOS, Linux, or Windows."""
    candidate_paths = [
        # macOS paths
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "/Library/Fonts/Arial.ttf",
        # Linux (Debian / Ubuntu / Alpine) paths
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf" if bold else "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        # Windows paths
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]

    for path in candidate_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    # Fallback to default bitmap font if no TTF found
    return ImageFont.load_default()


def draw_watermark(img: Image.Image, watermark_text: str = "GOVERNMENT-ISSUED DOCUMENT · SAMPLE") -> None:
    """Draw a crisp, subtle, rotated watermark that does not occlude foreground text."""
    w, h = img.size
    wm_layer = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    wm_draw = ImageDraw.Draw(wm_layer)

    wm_font = resolve_system_font(42, bold=True)
    # Subtle light gray with low opacity (alpha 70/255)
    wm_draw.text((120, h // 2), watermark_text, fill=(210, 218, 228, 75), font=wm_font)

    # Secondary watermark near top-right
    small_wm_font = resolve_system_font(30, bold=True)
    wm_draw.text((180, (h // 2) - 400), "SAMPLE COPY ONLY · NOT FOR OFFICIAL SUBMISSION", fill=(220, 226, 234, 55), font=small_wm_font)
    wm_draw.text((180, (h // 2) + 400), "SAMPLE COPY ONLY · NOT FOR OFFICIAL SUBMISSION", fill=(220, 226, 234, 55), font=small_wm_font)

    wm_rotated = wm_layer.rotate(32, center=(w // 2, h // 2), resample=Image.Resampling.BICUBIC)
    img.paste(wm_rotated, (0, 0), wm_rotated)


def draw_double_border(draw: ImageDraw.ImageDraw, w: int, h: int) -> None:
    """Draw official certificate decorative double border with corner accents."""
    # Outer navy border
    draw.rectangle([(25, 25), (w - 25, h - 25)], outline=COLOR_NAVY_PRIMARY, width=5)
    # Inner light slate border
    draw.rectangle([(36, 36), (w - 36, h - 36)], outline=COLOR_BORDER_INNER, width=2)
    # Corner accent squares
    for cx, cy in [(30, 30), (w - 38, 30), (30, h - 38), (w - 38, h - 38)]:
        draw.rectangle([(cx, cy), (cx + 8, cy + 8)], fill=COLOR_GOLD_ACCENT)


def draw_ashoka_emblem_crest(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int = 38) -> None:
    """Draw a clean geometric national emblem crest / Ashoka Chakra placeholder."""
    # Outer decorative circle
    draw.ellipse([(cx - radius, cy - radius), (cx + radius, cy + radius)], outline=COLOR_NAVY_PRIMARY, width=3)
    # Inner circle
    inner_r = radius - 8
    draw.ellipse([(cx - inner_r, cy - inner_r), (cx + inner_r, cy + inner_r)], outline=COLOR_GOLD_ACCENT, width=2)
    # Center hub
    draw.ellipse([(cx - 5, cy - 5), (cx + 5, cy + 5)], fill=COLOR_NAVY_PRIMARY)

    # 12 spokes for clean vector representation
    for i in range(12):
        angle = (2 * math.pi / 12) * i
        x1 = cx + int((inner_r - 2) * math.cos(angle))
        y1 = cy + int((inner_r - 2) * math.sin(angle))
        draw.line([(cx, cy), (x1, y1)], fill=COLOR_NAVY_PRIMARY, width=1)

    # Motto below crest
    motto_font = resolve_system_font(12, bold=True)
    draw.text((cx, cy + radius + 10), "सत्यमेव जयते", fill=COLOR_NAVY_DARK, font=motto_font, anchor="mm")


def draw_official_stamp(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int = 65, title: str = "OFFICIAL SEAL", subtitle: str = "REVENUE AUTHORITY") -> None:
    """Draw circular ink rubber stamp with star icons and authentic official text."""
    # Outer stamp circle
    draw.ellipse([(cx - radius, cy - radius), (cx + radius, cy + radius)], outline=COLOR_STAMP_BLUE, width=3)
    # Inner dotted/solid circle
    draw.ellipse([(cx - radius + 8, cy - radius + 8), (cx + radius - 8, cy + radius - 8)], outline=COLOR_STAMP_BLUE, width=1)

    font_title = resolve_system_font(13, bold=True)
    font_sub = resolve_system_font(11, bold=True)
    font_date = resolve_system_font(10, bold=False)

    draw.text((cx, cy - 25), title, fill=COLOR_STAMP_BLUE, font=font_title, anchor="mm")
    draw.text((cx, cy - 2), "★ ★ ★", fill=COLOR_STAMP_BLUE, font=font_sub, anchor="mm")
    draw.text((cx, cy + 18), subtitle, fill=COLOR_STAMP_BLUE, font=font_sub, anchor="mm")
    draw.text((cx, cy + 36), "VERIFIED & ISSUED", fill=COLOR_STAMP_BLUE, font=font_date, anchor="mm")


def draw_qr_verification_box(draw: ImageDraw.ImageDraw, x: int, y: int, size: int = 120, ref_num: str = "") -> None:
    """Draw a mock digital certificate QR code matrix and verification legend."""
    # Background box
    draw.rectangle([(x, y), (x + size, y + size)], outline=COLOR_BORDER_INNER, fill="#FFFFFF", width=2)

    # Simulated QR Finder Patterns (3 corners)
    for fx, fy in [(x + 10, y + 10), (x + size - 36, y + 10), (x + 10, y + size - 36)]:
        draw.rectangle([(fx, fy), (fx + 26, fy + 26)], outline=COLOR_NAVY_DARK, width=4)
        draw.rectangle([(fx + 8, fy + 8), (fx + 18, fy + 18)], fill=COLOR_NAVY_DARK)

    # Center matrix dots pattern
    grid_start_x = x + 15
    grid_start_y = y + 15
    for row in range(7):
        for col in range(7):
            if (row < 3 and col < 3) or (row < 3 and col > 4) or (row > 4 and col < 3):
                continue
            if (row * 3 + col * 7) % 2 == 0:
                px = grid_start_x + col * 12
                py = grid_start_y + row * 12
                draw.rectangle([(px, py), (px + 6, py + 6)], fill=COLOR_NAVY_DARK)

    # Verification caption below QR
    legend_font = resolve_system_font(11, bold=False)
    bold_legend = resolve_system_font(11, bold=True)
    draw.text((x + size // 2, y + size + 14), "SCAN TO VERIFY", fill=COLOR_NAVY_DARK, font=bold_legend, anchor="mm")
    draw.text((x + size // 2, y + size + 30), "tribalscholar.gov.in/verify", fill=COLOR_SLATE_MUTED, font=legend_font, anchor="mm")


def draw_signature(draw: ImageDraw.ImageDraw, x: int, y: int, designation: str, dept: str) -> None:
    """Draw realistic digital signature block with ink stroke simulation."""
    # Simulated cursive signature stroke
    sig_points = [
        (x, y - 10), (x + 25, y - 30), (x + 45, y - 15),
        (x + 70, y - 40), (x + 95, y - 10), (x + 130, y - 25),
        (x + 160, y - 5), (x + 200, y - 18),
    ]
    draw.line(sig_points, fill=COLOR_SIG_INK, width=3)
    # Underline rule
    draw.line([(x - 20, y), (x + 230, y)], fill=COLOR_BORDER_INNER, width=1)

    font_bold = resolve_system_font(16, bold=True)
    font_sub = resolve_system_font(14, bold=False)

    draw.text((x + 105, y + 14), designation, fill=COLOR_NAVY_DARK, font=font_bold, anchor="mm")
    draw.text((x + 105, y + 36), dept, fill=COLOR_SLATE_HEADER, font=font_sub, anchor="mm")
    draw.text((x + 105, y + 56), "[Digitally Signed & Certified]", fill=COLOR_SLATE_MUTED, font=resolve_system_font(12, bold=False), anchor="mm")


# ==============================================================================
# Document 1 & 2: Income Certificates (Valid & Deficient)
# ==============================================================================

def generate_income_certificate(
    output_png: Path,
    output_pdf: Optional[Path],
    applicant_name: str = "Sample Applicant",
    annual_income: int = 80000,
    is_deficient: bool = False,
) -> None:
    """Generate Income Certificate PNG and PDF matching the Proposal Page 4 mockup."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), "#FFFFFF")
    draw_watermark(img)

    draw = ImageDraw.Draw(img)
    draw_double_border(draw, PAGE_WIDTH, PAGE_HEIGHT)

    # 1. Government Emblem & Header
    draw_ashoka_emblem_crest(draw, PAGE_WIDTH // 2, 100, radius=36)

    font_gov = resolve_system_font(30, bold=True)
    font_dept = resolve_system_font(22, bold=True)
    font_title = resolve_system_font(32, bold=True)

    draw.text((PAGE_WIDTH // 2, 185), "GOVERNMENT OF JHARKHAND", fill=COLOR_NAVY_DARK, font=font_gov, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 225), "OFFICE OF THE TEHSILDAR, RANCHI", fill=COLOR_SLATE_HEADER, font=font_dept, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 275), "ANNUAL INCOME CERTIFICATE", fill=COLOR_NAVY_PRIMARY, font=font_title, anchor="mm")

    # Thin accent divider
    draw.line([(100, 310), (PAGE_WIDTH - 100, 310)], fill=COLOR_GOLD_ACCENT, width=3)

    # 2. Key Attributes Box (Exact Proposal Page 4 mockup layout)
    box_x1, box_y1 = 80, 340
    box_x2, box_y2 = PAGE_WIDTH - 80, 680
    draw.rectangle([(box_x1, box_y1), (box_x2, box_y2)], fill=COLOR_BOX_BG, outline=COLOR_BORDER_INNER, width=2)

    font_label = resolve_system_font(21, bold=True)
    font_value = resolve_system_font(21, bold=True)

    # Format currency string
    income_formatted = f"₹{annual_income:,.0f} per annum"
    income_rs = f"Rs. {annual_income:,.0f} per annum"

    # Key metadata rows (Left column and Right column)
    rows = [
        ("CERT REF:", "SAMPLE-2026-01482", "DATE:", "14 FEB 2026"),
        ("NAME:", applicant_name, "CATEGORY:", "Scheduled Tribe (ST)"),
        ("INCOME:", income_formatted, "AUTHORITY:", "Competent Revenue Authority"),
        ("STATE:", "Jharkhand", "FINANCIAL YEAR:", "2025-2026"),
    ]

    y_pos = box_y1 + 45
    for row in rows:
        # Left field
        draw.text((box_x1 + 35, y_pos), row[0], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 175, y_pos), row[1], fill=COLOR_NAVY_DARK, font=font_value)
        # Right field
        draw.text((box_x1 + 610, y_pos), row[2], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 795, y_pos), row[3], fill=COLOR_NAVY_DARK, font=font_value)
        # Horizontal divider inside box
        draw.line([(box_x1 + 20, y_pos + 42), (box_x2 - 20, y_pos + 42)], fill="#E2E8F0", width=1)
        y_pos += 78

    # 3. Formal Certification Statement Prose
    prose_title_font = resolve_system_font(22, bold=True)
    draw.text((100, 725), "LEGAL DECLARATION & REVENUE CERTIFICATION", fill=COLOR_NAVY_PRIMARY, font=prose_title_font)

    prose_font = resolve_system_font(21, bold=False)
    bold_prose_font = resolve_system_font(21, bold=True)

    income_in_words = "Eighty Thousand only" if annual_income == 80000 else "One Lakh Twenty Thousand only"
    paragraphs = [
        f"This is to certify that Shri/Kumari {applicant_name}, residing at Ranchi, District Ranchi, "
        f"State of Jharkhand, belongs to the Scheduled Tribe (ST) Community.",
        f"It is further certified that the Gross Annual Family Income from all sources of the applicant's family, "
        f"including agricultural, business, and employment sources, is {income_rs} "
        f"(Rupees {income_in_words}) for the Financial Year 2025-2026.",
        "This certificate is issued upon due local inquiry and revenue verification for the specific purpose of "
        "availing Central and State Government Scholarships and Fellowships administered by the Ministry of Tribal Affairs (MoTA).",
    ]

    py = 770
    for para in paragraphs:
        wrapped = textwrap.wrap(para, width=72)
        for line in wrapped:
            draw.text((100, py), line, fill="#1E293B", font=prose_font)
            py += 36
        py += 22

    # 4. QR Verification Box & Issuing Authority Seals
    draw_qr_verification_box(draw, 110, 1260, size=130, ref_num="SAMPLE-2026-01482")
    draw_official_stamp(draw, 490, 1340, radius=72, title="GOVT OF JHARKHAND", subtitle="REVENUE AUTHORITY")
    draw_signature(draw, PAGE_WIDTH - 360, 1350, designation="Competent Revenue Authority", dept="Office of the Tehsildar, Ranchi")

    # 5. Footer Security Disclaimer
    footer_font = resolve_system_font(13, bold=False)
    draw.line([(80, 1620), (PAGE_WIDTH - 80, 1620)], fill=COLOR_BORDER_INNER, width=1)
    draw.text(
        (PAGE_WIDTH // 2, 1650),
        "Official Digitally Authenticated Certificate · Electronic Form Generated under Information Technology Act, 2000",
        fill=COLOR_SLATE_MUTED,
        font=footer_font,
        anchor="mm",
    )

    # Save PNG and PDF
    img.save(output_png, format="PNG", quality=95)
    print(f"  [+] Saved PNG: {output_png}")
    if output_pdf:
        img.save(output_pdf, format="PDF", resolution=150.0)
        print(f"  [+] Saved PDF: {output_pdf}")


# ==============================================================================
# Document 3: Scheduled Tribe (ST) Caste Certificate
# ==============================================================================

def generate_st_caste_certificate(
    output_png: Path,
    output_pdf: Optional[Path],
    applicant_name: str = "Sample Applicant",
) -> None:
    """Generate Scheduled Tribe (ST) Caste Certificate PNG and PDF."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), "#FFFFFF")
    draw_watermark(img)

    draw = ImageDraw.Draw(img)
    draw_double_border(draw, PAGE_WIDTH, PAGE_HEIGHT)

    # Government Header
    draw_ashoka_emblem_crest(draw, PAGE_WIDTH // 2, 100, radius=36)

    font_gov = resolve_system_font(30, bold=True)
    font_dept = resolve_system_font(22, bold=True)
    font_title = resolve_system_font(32, bold=True)

    draw.text((PAGE_WIDTH // 2, 185), "GOVERNMENT OF JHARKHAND", fill=COLOR_NAVY_DARK, font=font_gov, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 225), "OFFICE OF THE SUB-DIVISIONAL OFFICER, RANCHI", fill=COLOR_SLATE_HEADER, font=font_dept, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 275), "SCHEDULED TRIBE CERTIFICATE", fill=COLOR_NAVY_PRIMARY, font=font_title, anchor="mm")

    draw.line([(100, 310), (PAGE_WIDTH - 100, 310)], fill=COLOR_GOLD_ACCENT, width=3)

    # Key Details Table
    box_x1, box_y1 = 80, 340
    box_x2, box_y2 = PAGE_WIDTH - 80, 680
    draw.rectangle([(box_x1, box_y1), (box_x2, box_y2)], fill=COLOR_BOX_BG, outline=COLOR_BORDER_INNER, width=2)

    font_label = resolve_system_font(21, bold=True)
    font_value = resolve_system_font(21, bold=True)

    rows = [
        ("CERT REF:", "CERT/JH/2024/ST/09842", "DATE:", "20 JAN 2024"),
        ("NAME:", applicant_name, "CATEGORY:", "Scheduled Tribe (ST)"),
        ("COMMUNITY:", "Santhal", "AUTHORITY:", "Office of the Sub-Divisional Officer, Ranchi"),
        ("STATE:", "Jharkhand", "DISTRICT:", "Ranchi"),
    ]

    y_pos = box_y1 + 45
    for row in rows:
        draw.text((box_x1 + 35, y_pos), row[0], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 175, y_pos), row[1], fill=COLOR_NAVY_DARK, font=font_value)
        draw.text((box_x1 + 610, y_pos), row[2], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 795, y_pos), row[3], fill=COLOR_NAVY_DARK, font=font_value)
        draw.line([(box_x1 + 20, y_pos + 42), (box_x2 - 20, y_pos + 42)], fill="#E2E8F0", width=1)
        y_pos += 78

    # Certification Text
    draw.text((100, 725), "COMMUNITY & CASTE VERIFICATION ORDER", fill=COLOR_NAVY_PRIMARY, font=resolve_system_font(22, bold=True))

    prose_font = resolve_system_font(21, bold=False)
    paras = [
        f"This is to certify that Shri/Kumari {applicant_name}, son/daughter of Shri Sugana Munda, "
        f"residing at Ranchi, District Ranchi in the State of Jharkhand, belongs to the Santhal Community.",
        "The Santhal Community is recognized as a Scheduled Tribe under the Constitution (Scheduled Tribes) "
        "Order, 1950 as amended by the Scheduled Castes and Scheduled Tribes Lists (Modification) Order, 1956.",
        f"Shri/Kumari {applicant_name} and his/her family ordinarily reside in Ranchi, "
        "State of Jharkhand. Prescribed Authority: Office of the Sub-Divisional Officer, Ranchi.",
    ]

    py = 770
    for para in paras:
        wrapped = textwrap.wrap(para, width=72)
        for line in wrapped:
            draw.text((100, py), line, fill="#1E293B", font=prose_font)
            py += 36
        py += 22

    # Seals & Signature
    draw_qr_verification_box(draw, 110, 1260, size=130, ref_num="CERT/JH/2024/ST/09842")
    draw_official_stamp(draw, 490, 1340, radius=72, title="GOVT OF JHARKHAND", subtitle="SUB-DIVISIONAL MAGISTRATE")
    draw_signature(draw, PAGE_WIDTH - 360, 1350, designation="Sub-Divisional Officer", dept="Sub-Divisional Office, Ranchi")

    # Footer
    draw.line([(80, 1620), (PAGE_WIDTH - 80, 1620)], fill=COLOR_BORDER_INNER, width=1)
    draw.text(
        (PAGE_WIDTH // 2, 1650),
        "Official Scheduled Tribe Certificate · Issued under the Authority of Government of Jharkhand",
        fill=COLOR_SLATE_MUTED,
        font=resolve_system_font(13, bold=False),
        anchor="mm",
    )

    img.save(output_png, format="PNG", quality=95)
    print(f"  [+] Saved PNG: {output_png}")
    if output_pdf:
        img.save(output_pdf, format="PDF", resolution=150.0)
        print(f"  [+] Saved PDF: {output_pdf}")


# ==============================================================================
# Document 4: Domicile / Permanent Resident Certificate
# ==============================================================================

def generate_domicile_certificate(
    output_png: Path,
    output_pdf: Optional[Path],
    applicant_name: str = "Sample Applicant",
) -> None:
    """Generate Domicile / Permanent Resident Certificate PNG and PDF."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), "#FFFFFF")
    draw_watermark(img)

    draw = ImageDraw.Draw(img)
    draw_double_border(draw, PAGE_WIDTH, PAGE_HEIGHT)

    # Header
    draw_ashoka_emblem_crest(draw, PAGE_WIDTH // 2, 100, radius=36)

    font_gov = resolve_system_font(30, bold=True)
    font_dept = resolve_system_font(22, bold=True)
    font_title = resolve_system_font(32, bold=True)

    draw.text((PAGE_WIDTH // 2, 185), "GOVERNMENT OF JHARKHAND", fill=COLOR_NAVY_DARK, font=font_gov, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 225), "OFFICE OF THE DISTRICT MAGISTRATE, RANCHI", fill=COLOR_SLATE_HEADER, font=font_dept, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 275), "CERTIFICATE OF DOMICILE / PERMANENT RESIDENT", fill=COLOR_NAVY_PRIMARY, font=font_title, anchor="mm")

    draw.line([(100, 310), (PAGE_WIDTH - 100, 310)], fill=COLOR_GOLD_ACCENT, width=3)

    # Key Details Table
    box_x1, box_y1 = 80, 340
    box_x2, box_y2 = PAGE_WIDTH - 80, 680
    draw.rectangle([(box_x1, box_y1), (box_x2, box_y2)], fill=COLOR_BOX_BG, outline=COLOR_BORDER_INNER, width=2)

    font_label = resolve_system_font(21, bold=True)
    font_value = resolve_system_font(21, bold=True)

    rows = [
        ("CERT REF:", "DOM/JH/2024/09123", "DATE:", "10 FEB 2024"),
        ("NAME:", applicant_name, "STATE DOMICILE:", "Jharkhand"),
        ("AUTHORITY:", "District Magistrate, Ranchi", "DISTRICT:", "Ranchi"),
        ("RESIDENTIAL STATUS:", "Permanent Resident", "VALIDITY:", "Permanent"),
    ]

    y_pos = box_y1 + 45
    for row in rows:
        draw.text((box_x1 + 35, y_pos), row[0], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 175, y_pos), row[1], fill=COLOR_NAVY_DARK, font=font_value)
        draw.text((box_x1 + 610, y_pos), row[2], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 795, y_pos), row[3], fill=COLOR_NAVY_DARK, font=font_value)
        draw.line([(box_x1 + 20, y_pos + 42), (box_x2 - 20, y_pos + 42)], fill="#E2E8F0", width=1)
        y_pos += 78

    # Certification Text
    draw.text((100, 725), "DOMICILE & PERMANENT RESIDENCE ATTESTATION", fill=COLOR_NAVY_PRIMARY, font=resolve_system_font(22, bold=True))

    prose_font = resolve_system_font(21, bold=False)
    paras = [
        f"Certified that Shri/Kumari {applicant_name}, daughter/son of Shri Sugana Munda, "
        f"is an ordinary resident and permanent resident of Ranchi, District Ranchi, in the State of Jharkhand.",
        f"The applicant has continuous permanent residence in the State of Jharkhand and satisfies the domicile "
        f"criteria prescribed by the Revenue Department, Government of Jharkhand.",
        f"This Certificate of Domicile is issued by the District Magistrate, Ranchi, for official educational, "
        f"admission, and national fellowship verification procedures.",
    ]

    py = 770
    for para in paras:
        wrapped = textwrap.wrap(para, width=72)
        for line in wrapped:
            draw.text((100, py), line, fill="#1E293B", font=prose_font)
            py += 36
        py += 22

    # Seals & Signature
    draw_qr_verification_box(draw, 110, 1260, size=130, ref_num="DOM/JH/2024/09123")
    draw_official_stamp(draw, 490, 1340, radius=72, title="GOVT OF JHARKHAND", subtitle="DISTRICT MAGISTRATE")
    draw_signature(draw, PAGE_WIDTH - 360, 1350, designation="District Magistrate, Ranchi", dept="Office of the Deputy Commissioner")

    # Footer
    draw.line([(80, 1620), (PAGE_WIDTH - 80, 1620)], fill=COLOR_BORDER_INNER, width=1)
    draw.text(
        (PAGE_WIDTH // 2, 1650),
        "Official Domicile Certificate · Government of Jharkhand · Ministry of Personnel & Administrative Reforms",
        fill=COLOR_SLATE_MUTED,
        font=resolve_system_font(13, bold=False),
        anchor="mm",
    )

    img.save(output_png, format="PNG", quality=95)
    print(f"  [+] Saved PNG: {output_png}")
    if output_pdf:
        img.save(output_pdf, format="PDF", resolution=150.0)
        print(f"  [+] Saved PDF: {output_pdf}")


# ==============================================================================
# Document 5: Academic Marksheet & Transcript
# ==============================================================================

def generate_academic_marksheet(
    output_png: Path,
    output_pdf: Optional[Path],
    applicant_name: str = "Sample Applicant",
) -> None:
    """Generate Central University of Jharkhand Academic Marksheet PNG and PDF."""
    img = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), "#FFFFFF")
    draw_watermark(img)

    draw = ImageDraw.Draw(img)
    draw_double_border(draw, PAGE_WIDTH, PAGE_HEIGHT)

    # University Header
    draw_ashoka_emblem_crest(draw, PAGE_WIDTH // 2, 100, radius=36)

    font_univ = resolve_system_font(30, bold=True)
    font_dept = resolve_system_font(22, bold=True)
    font_title = resolve_system_font(32, bold=True)

    draw.text((PAGE_WIDTH // 2, 185), "CENTRAL UNIVERSITY OF JHARKHAND", fill=COLOR_NAVY_DARK, font=font_univ, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 225), "OFFICE OF THE CONTROLLER OF EXAMINATIONS", fill=COLOR_SLATE_HEADER, font=font_dept, anchor="mm")
    draw.text((PAGE_WIDTH // 2, 275), "STATEMENT OF MARKS / GRADE CARD", fill=COLOR_NAVY_PRIMARY, font=font_title, anchor="mm")

    draw.line([(100, 310), (PAGE_WIDTH - 100, 310)], fill=COLOR_GOLD_ACCENT, width=3)

    # Candidate Profile Box
    box_x1, box_y1 = 80, 340
    box_x2, box_y2 = PAGE_WIDTH - 80, 680
    draw.rectangle([(box_x1, box_y1), (box_x2, box_y2)], fill=COLOR_BOX_BG, outline=COLOR_BORDER_INNER, width=2)

    font_label = resolve_system_font(21, bold=True)
    font_value = resolve_system_font(21, bold=True)

    rows = [
        ("CANDIDATE NAME:", applicant_name, "ROLL NO:", "2022CS012"),
        ("PROGRAM:", "Bachelor of Technology in Computer Science", "EXAMINATION:", "Semester VI - May 2024"),
        ("AGGREGATE PERCENTAGE:", "78.4%", "CGPA:", "8.65 / 10.00"),
        ("RESULT:", "PASSED IN FIRST CLASS WITH DISTINCTION", "AUTHORITY:", "Controller of Examinations"),
    ]

    y_pos = box_y1 + 45
    for row in rows:
        draw.text((box_x1 + 35, y_pos), row[0], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 320, y_pos), row[1], fill=COLOR_NAVY_DARK, font=font_value)
        draw.text((box_x1 + 610, y_pos), row[2], fill=COLOR_SLATE_MUTED, font=font_label)
        draw.text((box_x1 + 795, y_pos), row[3], fill=COLOR_NAVY_DARK, font=font_value)
        draw.line([(box_x1 + 20, y_pos + 42), (box_x2 - 20, y_pos + 42)], fill="#E2E8F0", width=1)
        y_pos += 78

    # Marks Table Header
    table_y = 730
    draw.text((100, table_y), "SEMESTER COURSE GRADE SUMMARY", fill=COLOR_NAVY_PRIMARY, font=resolve_system_font(22, bold=True))

    ty = table_y + 40
    draw.rectangle([(100, ty), (PAGE_WIDTH - 100, ty + 42)], fill=COLOR_NAVY_PRIMARY)
    col_font = resolve_system_font(18, bold=True)
    draw.text((120, ty + 12), "Course Code", fill="#FFFFFF", font=col_font)
    draw.text((280, ty + 12), "Subject Title", fill="#FFFFFF", font=col_font)
    draw.text((700, ty + 12), "Credits", fill="#FFFFFF", font=col_font)
    draw.text((820, ty + 12), "Grade", fill="#FFFFFF", font=col_font)
    draw.text((940, ty + 12), "Marks Obtained", fill="#FFFFFF", font=col_font)

    # Course rows
    courses = [
        ("CS-601", "Advanced Algorithms & Data Structures", "4.0", "A+", "82 / 100"),
        ("CS-602", "Distributed Systems & Cloud Computing", "4.0", "A", "78 / 100"),
        ("CS-603", "Artificial Intelligence & Neural Networks", "4.0", "A+", "85 / 100"),
        ("CS-604", "Database Internals & Storage Engines", "3.0", "A", "74 / 100"),
        ("CS-605", "Major Capstone Engineering Project I", "3.0", "O", "90 / 100"),
    ]

    row_font = resolve_system_font(19, bold=False)
    bold_row_font = resolve_system_font(19, bold=True)
    cy = ty + 42
    for idx, c in enumerate(courses):
        bg = "#F8FAFC" if idx % 2 == 0 else "#FFFFFF"
        draw.rectangle([(100, cy), (PAGE_WIDTH - 100, cy + 46)], fill=bg, outline="#E2E8F0")
        draw.text((120, cy + 12), c[0], fill=COLOR_NAVY_DARK, font=bold_row_font)
        draw.text((280, cy + 12), c[1], fill=COLOR_NAVY_DARK, font=row_font)
        draw.text((720, cy + 12), c[2], fill=COLOR_NAVY_DARK, font=row_font)
        draw.text((830, cy + 12), c[3], fill=COLOR_NAVY_PRIMARY, font=bold_row_font)
        draw.text((950, cy + 12), c[4], fill=COLOR_NAVY_DARK, font=bold_row_font)
        cy += 46

    # Summary row
    draw.rectangle([(100, cy), (PAGE_WIDTH - 100, cy + 50)], fill="#EEF2F6", outline=COLOR_BORDER_INNER, width=2)
    summary_font = resolve_system_font(20, bold=True)
    draw.text((120, cy + 14), "SEMESTER TOTAL: 18.0 CREDITS", fill=COLOR_NAVY_DARK, font=summary_font)
    draw.text((680, cy + 14), "Aggregate Percentage: 78.4%", fill=COLOR_NAVY_PRIMARY, font=summary_font)
    draw.text((960, cy + 14), "CGPA: 8.65", fill=COLOR_NAVY_PRIMARY, font=summary_font)

    # University Seal & Controller Signature
    draw_qr_verification_box(draw, 110, 1260, size=130, ref_num="2022CS012")
    draw_official_stamp(draw, 490, 1340, radius=72, title="CENTRAL UNIVERSITY", subtitle="EXAMINATION BRANCH")
    draw_signature(draw, PAGE_WIDTH - 360, 1350, designation="Controller of Examinations", dept="Central University of Jharkhand")

    # Footer
    draw.line([(80, 1620), (PAGE_WIDTH - 80, 1620)], fill=COLOR_BORDER_INNER, width=1)
    draw.text(
        (PAGE_WIDTH // 2, 1650),
        "Official Academic Transcript · Central University of Jharkhand · Brambe, Ranchi - 835205",
        fill=COLOR_SLATE_MUTED,
        font=resolve_system_font(13, bold=False),
        anchor="mm",
    )

    img.save(output_png, format="PNG", quality=95)
    print(f"  [+] Saved PNG: {output_png}")
    if output_pdf:
        img.save(output_pdf, format="PDF", resolution=150.0)
        print(f"  [+] Saved PDF: {output_pdf}")


# ==============================================================================
# CLI Entrypoint
# ==============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(description="TribalScholar AI - Synthetic Demo Document Generator")
    parser.add_argument("--output-dir", default="demo-assets", help="Directory where generated certificates will be saved (default: demo-assets)")
    parser.add_argument("--applicant-name", default="Sample Applicant", help="Applicant full name (default: Sample Applicant)")
    parser.add_argument("--format", choices=["png", "pdf", "both"], default="both", help="Output format(s) (default: both)")

    args = parser.parse_args()
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    generate_png = args.format in ("png", "both")
    generate_pdf = args.format in ("pdf", "both")

    print(f"\n========================================================")
    print(f"  TribalScholar AI: Generating Synthetic Demo Documents")
    print(f"  Output Directory : {out_dir.resolve()}")
    print(f"  Applicant Name   : {args.applicant_name}")
    print(f"  Formats          : {args.format.upper()}")
    print(f"========================================================\n")

    # 1. Deficient Income Certificate (Rs. 1,20,000 per annum vs declared Rs. 80,000)
    print("[1/5] Generating income_certificate_deficient (₹1,20,000 p.a. - Mismatch)...")
    generate_income_certificate(
        output_png=out_dir / "income_certificate_deficient.png" if generate_png else None,
        output_pdf=out_dir / "income_certificate_deficient.pdf" if generate_pdf else None,
        applicant_name=args.applicant_name,
        annual_income=120000,
        is_deficient=True,
    )

    # 2. Valid Income Certificate (Proposal Page 4 mockup: Rs. 80,000 p.a.)
    print("[2/5] Generating income_certificate_valid (₹80,000 p.a. - Exact Proposal Match)...")
    generate_income_certificate(
        output_png=out_dir / "income_certificate_valid.png" if generate_png else None,
        output_pdf=out_dir / "income_certificate_valid.pdf" if generate_pdf else None,
        applicant_name=args.applicant_name,
        annual_income=80000,
        is_deficient=False,
    )

    # 3. Scheduled Tribe (ST) Caste Certificate
    print("[3/5] Generating st_caste_certificate_valid (Santhal ST Community)...")
    generate_st_caste_certificate(
        output_png=out_dir / "st_caste_certificate_valid.png" if generate_png else None,
        output_pdf=out_dir / "st_caste_certificate_valid.pdf" if generate_pdf else None,
        applicant_name=args.applicant_name,
    )

    # 4. Domicile / Permanent Resident Certificate
    print("[4/5] Generating domicile_certificate_valid (State of Jharkhand)...")
    generate_domicile_certificate(
        output_png=out_dir / "domicile_certificate_valid.png" if generate_png else None,
        output_pdf=out_dir / "domicile_certificate_valid.pdf" if generate_pdf else None,
        applicant_name=args.applicant_name,
    )

    # 5. Academic Marksheet & Transcript
    print("[5/5] Generating academic_marksheet_valid (Central University of Jharkhand - 78.4%)...")
    generate_academic_marksheet(
        output_png=out_dir / "academic_marksheet_valid.png" if generate_png else None,
        output_pdf=out_dir / "academic_marksheet_valid.pdf" if generate_pdf else None,
        applicant_name=args.applicant_name,
    )

    print("\n[✔] Successfully generated all 5 synthetic sample certificates in demo-assets/!")


if __name__ == "__main__":
    main()
