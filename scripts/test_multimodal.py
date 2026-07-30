"""
Test script for AIDEN Multimodal API
=====================================
Tests the /api/v1/multimodal endpoints with a pipeline diagram image.

Usage:
    python scripts/test_multimodal.py                        # Default: localhost:8000
    python scripts/test_multimodal.py --port 8003             # Custom port
    python scripts/test_multimodal.py --image path/to/img.png # Custom image
"""

import argparse
import base64
import sys
import requests
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Test multimodal API")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Backend port")
    parser.add_argument("--image", "-i", default=None, help="Path to PNG file")
    args = parser.parse_args()

    base = f"http://localhost:{args.port}"
    img_path = args.image or str(Path(__file__).resolve().parent.parent / "test_pipeline_diagram.png")
    b64_path = str(Path(__file__).resolve().parent.parent / "test_pipeline_b64.txt")

    # 1. Login
    print(f"1. Login to {base}...")
    r = requests.post(f"{base}/api/v1/auth/login", data={
        "username": "femifriendly",
        "password": "Femi@2005",
    }, timeout=10)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    print("   OK")

    # 2. Check model status
    print("2. Multimodal status...")
    r = requests.get(f"{base}/api/v1/multimodal/status",
        headers={"Authorization": f"Bearer {token}"}, timeout=10)
    data = r.json()
    print(f"   Available: {data.get('available')}")
    if data.get("model"):
        print(f"   Model: {data['model']}")
    if not data.get("available"):
        print("   NOTE: Model not loaded. Run: python scripts/download_models.py --model multimodal")
        print("   The upload/analyze tests below will return 503.")
    else:
        # 3. Upload and analyze
        print("3. Uploading image for analysis...")
        with open(img_path, "rb") as f:
            files = {"file": ("diagram.png", f, "image/png")}
            r = requests.post(f"{base}/api/v1/multimodal/upload",
                headers={"Authorization": f"Bearer {token}"},
                files=files,
                data={"prompt": "Describe this data pipeline architecture in detail."},
                timeout=60,
            )

        if r.status_code == 200:
            result = r.json()
            print(f"   Analysis ({result.get('tokens', '?')} tokens):")
            print(f"   {result.get('analysis', '')[:500]}")
        else:
            print(f"   Status: {r.status_code}")
            print(f"   Error: {r.json().get('detail', '')}")

        # 4. Also test base64 endpoint
        print("4. Testing base64 analyze...")
        with open(b64_path) as f:
            b64_data = f.read().strip()

        r = requests.post(f"{base}/api/v1/multimodal/analyze",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "image": f"data:image/png;base64,{b64_data}",
                "prompt": "What are the main stages shown in this pipeline?",
            },
            timeout=60,
        )

        if r.status_code == 200:
            result = r.json()
            print(f"   Analysis ({result.get('tokens', '?')} tokens):")
            print(f"   {result.get('analysis', '')[:300]}...")
        else:
            print(f"   Status: {r.status_code}")
            print(f"   Error: {r.json().get('detail', '')}")

    print()
    print("=== DONE ===")


if __name__ == "__main__":
    main()
