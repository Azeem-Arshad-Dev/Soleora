"""Render tools/model-preview.html for many models. Usage: preview-models.py out_dir 'file|rot|keep' ..."""
import sys, pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
root = pathlib.Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1200, 'height': 800})
    pg.on('pageerror', lambda e: print('ERR', e))
    for spec in sys.argv[2:]:
        f, rot, keep = (spec.split('|') + ['', ''])[:3]
        url = f'http://localhost:5179/tools/model-preview.html?file=/@fs{root}/{f}&rot={rot or "0,0,0"}' + (f'&keep={keep}' if keep else '')
        pg.goto(url); pg.wait_for_function('window.__ready === true', timeout=120000)
        name = f.split('/')[-1].replace('.glb', '') + (('_' + rot.replace(',', '_')) if rot else '')
        pg.screenshot(path=str(out / f'{name}.png')); print('ok', name)
    b.close()
