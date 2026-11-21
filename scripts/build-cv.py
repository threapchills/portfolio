"""Print templates/cv.html to cv/Mike-Whyle-CV-2026.pdf (A4, two pages).

Needs Playwright for Python and a Chrome or Chromium:
    python3 scripts/build-cv.py [path-to-chrome]
Fonts and images are in templates/cv-assets/, so it runs offline.
"""
import asyncio, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "cv" / "Mike-Whyle-CV-2026.pdf"

async def main():
    async with async_playwright() as p:
        args = ["--no-sandbox"]
        if os.environ.get("HTTPS_PROXY"):
            args.append("--proxy-server=" + os.environ["HTTPS_PROXY"])
        launch = {"args": args}
        if len(sys.argv) > 1:
            launch["executable_path"] = sys.argv[1]
        browser = await p.chromium.launch(**launch)
        page = await browser.new_page()
        await page.goto((ROOT / "templates" / "cv.html").as_uri(), wait_until="networkidle")
        await page.evaluate("document.fonts.ready")
        await page.pdf(path=str(OUT), format="A4", print_background=True, prefer_css_page_size=True)
        await browser.close()
    print("Wrote", OUT, OUT.stat().st_size, "bytes")

asyncio.run(main())
