"""
Generate Real Pipeline Diagram Images using Pillow
Draws proper ETL architecture diagrams with boxes, arrows, and labels.
Output: PNG images + updated multimodal_dataset.jsonl
"""

import json
import os
import random
from pathlib import Path
from typing import List, Tuple, Optional

from PIL import Image, ImageDraw, ImageFont

# ── Color Palette ──────────────────────────────────────────────────────
COLORS = {
    "bg": "#0F1923",
    "card_bg": "#1A2736",
    "card_border": "#2D3B4F",
    "source": "#3B82F6",      # blue
    "transform": "#8B5CF6",   # purple
    "destination": "#10B981",  # green
    "arrow": "#4B5563",
    "arrow_head": "#6B7280",
    "text_primary": "#F1F5F9",
    "text_secondary": "#94A3B8",
    "text_accent": "#60A5FA",
    "schema_drift": "#EF4444",  # red
    "data_quality": "#F59E0B",  # amber
    "glow": "rgba(59, 130, 246, 0.15)",
}

# ── Pipeline Templates ─────────────────────────────────────────────────
PIPELINE_TEMPLATES = [
    {
        "name": "Daily Sales ETL",
        "source": "PostgreSQL",
        "source_icon": "DB",
        "transforms": ["Clean", "Aggregate"],
        "destination": "Snowflake",
        "destination_icon": "SF",
        "schedule": "0 6 * * *",
        "quality_rules": ["no_null_pk", "amount_positive"],
    },
    {
        "name": "Customer Sync",
        "source": "MySQL",
        "source_icon": "MY",
        "transforms": ["Clean", "Enrich", "Validate"],
        "destination": "BigQuery",
        "destination_icon": "BQ",
        "schedule": "0 * * * *",
        "quality_rules": ["email_valid", "no_dup"],
    },
    {
        "name": "IoT Stream",
        "source": "Kafka",
        "source_icon": "KA",
        "transforms": ["Filter", "Aggregate"],
        "destination": "S3",
        "destination_icon": "S3",
        "schedule": "* * * * *",
        "quality_rules": ["no_null_ts", "device_exists"],
    },
    {
        "name": "Log Aggregator",
        "source": "Elasticsearch",
        "source_icon": "ES",
        "transforms": ["Parse", "Partition", "Compress"],
        "destination": "Athena",
        "destination_icon": "AT",
        "schedule": "0 * * * *",
        "quality_rules": ["ts_valid", "size_check"],
    },
    {
        "name": "Fraud Detection",
        "source": "Kafka",
        "source_icon": "KA",
        "transforms": ["Feature Ext.", "ML Score"],
        "destination": "Redis",
        "destination_icon": "RD",
        "schedule": "* * * * *",
        "quality_rules": ["score_range", "session_valid"],
    },
    {
        "name": "Financial Reports",
        "source": "Oracle",
        "source_icon": "OR",
        "transforms": ["Currency Conv.", "Aggregate", "Validate"],
        "destination": "Snowflake",
        "destination_icon": "SF",
        "schedule": "0 7 * * 1",
        "quality_rules": ["amount_positive", "currency_valid"],
    },
    {
        "name": "Web Analytics",
        "source": "GA4",
        "source_icon": "GA",
        "transforms": ["Flatten", "Funnel Calc", "Enrich"],
        "destination": "BigQuery",
        "destination_icon": "BQ",
        "schedule": "0 4 * * *",
        "quality_rules": ["session_valid", "event_ts_ok"],
    },
    {
        "name": "CRM Sync",
        "source": "Salesforce",
        "source_icon": "SF",
        "transforms": ["Map Fields", "Deduplicate"],
        "destination": "PostgreSQL",
        "destination_icon": "PG",
        "schedule": "0 4 * * 1",
        "quality_rules": ["no_dup", "account_exists"],
    },
    {
        "name": "Ad Spend Pipeline",
        "source": "Google Ads",
        "source_icon": "GA",
        "transforms": ["Aggr. Campaign", "Calc ROAS"],
        "destination": "BigQuery",
        "destination_icon": "BQ",
        "schedule": "0 8 * * *",
        "quality_rules": ["cost_positive", "campaign_exists"],
    },
    {
        "name": "Subscription Analytics",
        "source": "Stripe",
        "source_icon": "ST",
        "transforms": ["Calc MRR", "Compute Churn", "Segment"],
        "destination": "Snowflake",
        "destination_icon": "SF",
        "schedule": "0 4 * * *",
        "quality_rules": ["mrr_positive", "customer_exists"],
    },
]


class PipelineDiagramRenderer:
    """Draws realistic ETL pipeline diagrams using Pillow."""

    def __init__(self, output_dir: str = "backend/data/training"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Canvas
        self.width = 800
        self.height = 500

        # Layout positions
        self.source_x = 80
        self.transform_x = 330
        self.destination_x = 580
        self.center_y = 260

        # Dimensions
        self.box_w = 160
        self.box_h = 70

        # Try to load a monospace font, fall back to default
        self.font_large = None
        self.font_med = None
        self.font_small = None
        self._load_fonts()

    def _load_fonts(self):
        """Load fonts with fallbacks."""
        font_paths = [
            # Windows
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/consola.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
            # macOS
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Menlo.ttc",
        ]
        for path in font_paths:
            if os.path.exists(path):
                try:
                    self.font_large = ImageFont.truetype(path, 18)
                    self.font_med = ImageFont.truetype(path, 13)
                    self.font_small = ImageFont.truetype(path, 10)
                    return
                except (IOError, OSError):
                    continue
        # Fallback to default
        self.font_large = ImageFont.load_default()
        self.font_med = ImageFont.load_default()
        self.font_small = ImageFont.load_default()

    def _text_width(self, draw: ImageDraw, text: str, font) -> int:
        """Get the pixel width of text using textbbox (Pillow 8+)."""
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            return bbox[2] - bbox[0]
        except AttributeError:
            # Fallback for older Pillow
            return len(text) * round(font.size * 0.55) if font.size else len(text) * 8

    def _draw_rounded_rect(
        self, draw: ImageDraw, x: int, y: int, w: int, h: int, color: str, radius: int = 8
    ):
        """Draw a rounded rectangle."""
        draw.rounded_rectangle(
            [x, y, x + w, y + h],
            radius=radius,
            fill=color,
            outline=COLORS["card_border"],
            width=2,
        )

    def _draw_arrow(
        self,
        draw: ImageDraw,
        x1: int, y1: int,
        x2: int, y2: int,
        color: str = COLORS["arrow"],
    ):
        """Draw an arrow between two points with a V-shaped arrowhead."""
        draw.line([(x1, y1), (x2, y2)], fill=color, width=3)

        # Arrow head — V-shaped triangle pointing along the line direction
        arrow_size = 10
        dx = x2 - x1
        dy = y2 - y1
        length = (dx * dx + dy * dy) ** 0.5
        if length == 0:
            return

        ux = dx / length
        uy = dy / length

        # V-shape: two points behind the tip, spread at ~90 degrees
        p1 = (
            x2 - int(arrow_size * (ux * 0.7 + uy * 0.7)),
            y2 - int(arrow_size * (uy * 0.7 - ux * 0.7)),
        )
        p2 = (
            x2 - int(arrow_size * (ux * 0.7 - uy * 0.7)),
            y2 - int(arrow_size * (uy * 0.7 + ux * 0.7)),
        )

        draw.polygon([(x2, y2), p1, p2], fill=color)

    def _draw_data_box(
        self,
        draw: ImageDraw,
        x: int,
        label_top: str,
        label_bottom: str,
        icon_text: str,
        color: str,
    ):
        """Draw a source or destination data box with custom labels and icon."""
        y = self.center_y - self.box_h // 2
        self._draw_rounded_rect(draw, x, y, self.box_w, self.box_h, color)

        # Icon circle
        cx, cy = x + 30, y + self.box_h // 2
        draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=COLORS["card_bg"])

        # Center icon text
        icon_w = self._text_width(draw, icon_text, self.font_small)
        draw.text(
            (cx - icon_w // 2, cy - 7),
            icon_text,
            fill=COLORS["text_accent"],
            font=self.font_small,
        )

        # Top label (e.g. "SOURCE" / "DESTINATION")
        draw.text((x + 55, y + 12), label_top, fill=COLORS["text_secondary"], font=self.font_small)

        # Bottom label (e.g. "PostgreSQL" / "Snowflake") with background chip
        label_w = self._text_width(draw, label_bottom, self.font_small) + 12
        chip_x = x + 52
        chip_y = y + 30
        draw.rounded_rectangle(
            [chip_x, chip_y - 1, chip_x + label_w, chip_y + 15],
            radius=4,
            fill=color + "30",
        )
        draw.text(
            (chip_x + 6, chip_y),
            label_bottom,
            fill=COLORS["text_primary"],
            font=self.font_small,
        )

    def _draw_transform_boxes(self, draw: ImageDraw, transforms: List[str]):
        """Draw transformation boxes stacked vertically."""
        n = len(transforms)
        box_h = 40
        total_h = n * box_h + (n - 1) * 10
        start_y = self.center_y - total_h // 2

        for i, t in enumerate(transforms):
            x = self.transform_x
            y = start_y + i * (box_h + 10)
            self._draw_rounded_rect(draw, x, y, self.box_w, box_h, COLORS["transform"], radius=6)
            draw.text((x + 12, y + 12), f"  {t}", fill=COLORS["text_primary"], font=self.font_med)

    def _draw_pipeline_label(self, draw: ImageDraw, template: dict):
        """Draw the pipeline name and schedule at the top."""
        # Pipeline name — center using actual text width
        name = template["name"]
        name_w = self._text_width(draw, name, self.font_large)
        draw.text(
            (self.width // 2 - name_w // 2, 20),
            name,
            fill=COLORS["text_primary"],
            font=self.font_large,
        )

        # Schedule badge
        schedule = template["schedule"]
        schedule_w = self._text_width(draw, f"  {schedule}", self.font_small) + 16
        badge_x = self.width // 2 - schedule_w // 2
        badge_y = 50
        draw.rounded_rectangle(
            [badge_x, badge_y, badge_x + schedule_w, badge_y + 22],
            radius=11,
            fill="#1E293B",
            outline=COLORS["card_border"],
        )
        draw.text(
            (badge_x + 8, badge_y + 4),
            f"  {schedule}",
            fill=COLORS["text_secondary"],
            font=self.font_small,
        )

        # Quality rule badges
        rules = template.get("quality_rules", [])[:3]
        rule_colors = [COLORS["data_quality"], COLORS["schema_drift"], COLORS["source"]]
        total_rules_w = sum(
            self._text_width(draw, r.replace("_", " ").title(), self.font_small) + 20
            for r in rules
        )
        total_rules_w += (len(rules) - 1) * 10  # gaps
        rules_start_x = self.width // 2 - total_rules_w // 2
        ry = 80

        for i, rule in enumerate(rules):
            color = rule_colors[i % len(rule_colors)]
            label = rule.replace("_", " ").title()
            rw = self._text_width(draw, label, self.font_small) + 20
            rx = rules_start_x + i * (rw + 10)
            draw.rounded_rectangle(
                [rx, ry, rx + rw, ry + 20],
                radius=10,
                fill=color + "20",
                outline=color + "40",
            )
            draw.text(
                (rx + 6, ry + 3),
                label,
                fill=COLORS["text_secondary"],
                font=self.font_small,
            )

    def _draw_status_bar(self, draw: ImageDraw):
        """Draw a minimal status bar at the bottom."""
        bar_y = self.height - 40
        draw.rounded_rectangle(
            [20, bar_y, self.width - 20, bar_y + 28],
            radius=14,
            fill="#0A1520",
            outline=COLORS["card_border"],
        )

        # Status dot
        draw.ellipse([40, bar_y + 8, 52, bar_y + 20], fill=COLORS["destination"])
        draw.text((62, bar_y + 6), "Pipeline Status: Active", fill=COLORS["text_secondary"], font=self.font_small)

        # Stats
        stats = [
            ("Runs", "1,247"),
            ("Success", "99.2%"),
            ("Latency", "1.2s"),
        ]
        for i, (label, value) in enumerate(stats):
            sx = self.width - 180 + i * 55
            draw.text((sx, bar_y + 6), f"{label}: {value}", fill=COLORS["text_secondary"], font=self.font_small)

    def _draw_arrows(self, draw: ImageDraw):
        """Draw arrows connecting source -> transforms -> destination."""
        arrow_y = self.center_y
        self._draw_arrow(
            draw,
            self.source_x + self.box_w, arrow_y,
            self.transform_x, arrow_y,
        )
        self._draw_arrow(
            draw,
            self.transform_x + self.box_w, arrow_y,
            self.destination_x, arrow_y,
        )

    def render(self, template: dict) -> Image.Image:
        """Render a full pipeline diagram."""
        img = Image.new("RGB", (self.width, self.height), COLORS["bg"])
        draw = ImageDraw.Draw(img)

        # Draw components — box methods now accept parameters for labels
        self._draw_pipeline_label(draw, template)
        self._draw_data_box(draw, self.source_x, "SOURCE", template["source"], template.get("source_icon", "DB"), COLORS["source"])
        self._draw_transform_boxes(draw, template["transforms"])
        self._draw_data_box(draw, self.destination_x, "DESTINATION", template["destination"], template.get("destination_icon", "SF"), COLORS["destination"])
        self._draw_arrows(draw)
        self._draw_status_bar(draw)

        return img

    def generate_all(self, templates: Optional[List[dict]] = None):
        """Generate diagrams for all templates and return image paths + dataset entries."""
        if templates is None:
            templates = PIPELINE_TEMPLATES

        image_paths = []
        dataset = []

        for idx, template in enumerate(templates):
            img = self.render(template)

            # Save image
            filename = f"diagram_{idx:04d}.png"
            filepath = self.output_dir / filename
            img.save(filepath, "PNG", optimize=True)
            image_paths.append(str(filepath))

            # Build multimodal dataset entry
            prompt = f"Explain this {template['source']} to {template['destination']} pipeline that runs {template['schedule']}."
            completion = (
                f"This is a pipeline that extracts data from {template['source']}, "
                f"applies {', '.join(template['transforms'])} transformations, "
                f"and loads it into {template['destination']} on a {template['schedule']} schedule."
            )

            entry = {
                "image": filename,
                "prompt": prompt,
                "completion": completion,
                "metadata": {
                    "name": template["name"],
                    "source": template["source"],
                    "destination": template["destination"],
                    "transformations": template["transforms"],
                    "schedule": template["schedule"],
                    "quality_rules": template.get("quality_rules", []),
                },
            }
            dataset.append(entry)

            # Print progress
            print(f"  [{idx+1}/{len(templates)}] {template['name']:25s} {template['source']:15s} -> {template['destination']:12s} ({filename})")

        # Save dataset JSONL
        dataset_path = self.output_dir / "multimodal_dataset.jsonl"
        with open(dataset_path, "w") as f:
            for entry in dataset:
                f.write(json.dumps(entry) + "\n")

        print(f"\nGenerated {len(image_paths)} diagrams to: {self.output_dir}")
        print(f"Dataset saved to: {dataset_path}")
        return image_paths, dataset


def main():
    print("=" * 60)
    print("  AIDEN — Pipeline Diagram Generator")
    print("=" * 60)
    print()

    renderer = PipelineDiagramRenderer(output_dir="backend/data/training")
    paths, dataset = renderer.generate_all()

    print(f"\nSample entry:")
    print(json.dumps(dataset[0], indent=2))

    # Verify image sizes
    from PIL import Image as ImgCheck
    print(f"\nImage verification:")
    for p in paths[:3]:
        img = ImgCheck.open(p)
        size_kb = os.path.getsize(p) / 1024
        print(f"  {Path(p).name}: {img.size[0]}x{img.size[1]}px, {size_kb:.1f} KB, mode={img.mode}")

    print(f"\nTo upload a diagram:")
    print(f"  curl -X POST http://localhost:8000/api/v1/multimodal/upload \\")
    print(f"    -H 'Authorization: Bearer $TOKEN' \\")
    print(f"    -F 'file=@{paths[0]}' \\")
    print(f"    -F 'prompt=Describe this pipeline architecture diagram'")


if __name__ == "__main__":
    main()
