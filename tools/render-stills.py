"""Render shoe stills with system Chrome. Usage: python3 tools/render-stills.py [--check] [slug ...]
Needs `npx vite --port 5179` running. --check writes review PNGs to tests/e2e/shots/ instead of public/."""
import json, sys, io, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
arts = json.loads((ROOT / 'src/data/articles.json').read_text())
args = [a for a in sys.argv[1:] if not a.startswith('--')]
check = '--check' in sys.argv
slugs = args or [a['slug'] for a in arts]
(ROOT / 'public/stills').mkdir(parents=True, exist_ok=True)
(ROOT / 'public/og').mkdir(parents=True, exist_ok=True)
(ROOT / 'tests/e2e/shots').mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page()
    pg.on('console', lambda m: m.type == 'error' and print('console:', m.text))
    pg.on('pageerror', lambda e: print('pageerror:', e))
    for slug in slugs:
        jobs = [('poster', 1600, 1200, 0.62, 0.72)] if check else [('poster', 1600, 1200, 0.62, 0.72), ('og', 1200, 630, 0.5, 0.74)]
        for kind, w, h, fill, base in jobs:
            pg.set_viewport_size({'width': w, 'height': h})
            pg.goto(f'http://localhost:5179/tools/stills.html?slug={slug}&w={w}&h={h}&fill={fill}&base={base}')
            pg.wait_for_function('window.__ready === true', timeout=60000)
            img = Image.open(io.BytesIO(pg.locator('#s').screenshot())).convert('RGB')
            if check:
                img.resize((800, 600)).save(ROOT / f'tests/e2e/shots/{slug}.png'); continue
            if kind == 'poster':
                img.save(ROOT / f'public/stills/{slug}-poster.webp', 'WEBP', quality=80)
                img.resize((800, 600), Image.LANCZOS).save(ROOT / f'public/stills/{slug}.webp', 'WEBP', quality=78)
            else:
                img.save(ROOT / f'public/og/{slug}.webp', 'WEBP', quality=80)
        print('ok', slug)
    b.close()
