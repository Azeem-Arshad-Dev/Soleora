"""End-to-end smoke test. Run against a server: python3 tests/e2e/smoke.py [base_url]
Saves screenshots to tests/e2e/shots/. Exits non-zero on failure."""
import sys, pathlib, time
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173').rstrip('/')
SHOTS = pathlib.Path(__file__).parent / 'shots'
SHOTS.mkdir(exist_ok=True)
errors, failures = [], []

def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + (f' ({detail})' if detail and not cond else ''))
    if not cond: failures.append(name)

def path(pg):
    return pg.evaluate('location.pathname')

def ready(pg):
    pg.wait_for_function('window.__soleora && window.__soleora.ready === true', timeout=60000)

def idle(pg, timeout=15000):
    pg.wait_for_function('!window.__soleora.debug || window.__soleora.debug.busy === false', timeout=timeout)

def aligned(pg):
    return pg.evaluate('''() => { const d = window.__soleora.debug; const a = d.stageRect(), b = d.slotRect();
      return b && Math.abs(a.x-b.x) < 4 && Math.abs(a.y-b.y) < 4 && Math.abs(a.w-b.w) < 4 && Math.abs(a.h-b.h) < 4; }''')

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))

    # Showroom
    pg.goto(BASE + '/')
    ready(pg); time.sleep(2.5)
    check('showroom 3D active', pg.evaluate("document.documentElement.classList.contains('has-3d')"))
    check('showroom stage aligned', aligned(pg))
    pg.screenshot(path=str(SHOTS / 'home-desktop.png'))
    start = pg.evaluate('window.__soleora.debug.focus')
    pg.keyboard.press('ArrowRight'); time.sleep(0.9)
    check('arrow key moves rail', pg.evaluate('window.__soleora.debug.focus') == start + 1)
    pg.screenshot(path=str(SHOTS / 'home-next.png'))
    pg.keyboard.press('ArrowLeft'); time.sleep(0.9)

    # Open the focused shoe
    pg.click('.showroom__focus .btn')
    time.sleep(0.45)
    pg.screenshot(path=str(SHOTS / 'transition-mid.png'))
    idle(pg); time.sleep(0.8)
    check('opened article URL', path(pg) == '/articles/chelsea-boots.html', path(pg))
    check('article h1 visible', pg.is_visible('h1'))
    check('article stage aligned', aligned(pg))
    n_pins = pg.locator('.pin:not(.is-hidden)').count()
    check('hotspot pins shown', n_pins >= 2, str(n_pins))
    pg.screenshot(path=str(SHOTS / 'article-desktop.png'))
    pg.screenshot(path=str(SHOTS / 'article-full.png'), full_page=True)

    # Back to showroom
    pg.go_back(); idle(pg); time.sleep(0.8)
    check('back returns to showroom', path(pg) == '/', path(pg))
    check('focus kept after back', pg.evaluate('window.__soleora.debug.focus') == start)
    check('showroom aligned after back', aligned(pg))

    # Interrupt: rapid double click + Esc
    pg.click('.showroom__focus .btn'); time.sleep(0.1)
    pg.keyboard.press('Escape')
    pg.click('.back-link') if pg.is_visible('.back-link') else None
    idle(pg); time.sleep(1)
    mode = pg.evaluate('window.__soleora.debug.mode')
    url_ok = (path(pg).startswith('/articles/') and mode == 'article') or (path(pg) == '/' and mode == 'showroom')
    check('transition-interrupt consistent', url_ok, f'{path(pg)} {mode}')

    # Direct article load + next shoe
    pg.goto(BASE + '/articles/brogues.html'); ready(pg); time.sleep(1.5)
    check('direct-article aligned', aligned(pg))
    pg.screenshot(path=str(SHOTS / 'direct-article.png'))
    pg.set_viewport_size({'width': 390, 'height': 844}); time.sleep(1)
    check('resize keeps alignment', aligned(pg))
    pg.screenshot(path=str(SHOTS / 'article-mobile.png'))
    pg.set_viewport_size({'width': 1440, 'height': 900}); time.sleep(0.6)
    pg.click('.next-shoe'); idle(pg); time.sleep(0.8)
    check('next shoe swaps article', path(pg) == '/articles/monk-straps.html', path(pg))
    check('next shoe aligned', aligned(pg))

    # Regression: two quick clicks on different shoes must end in one consistent article
    pg.goto(BASE + '/'); ready(pg); time.sleep(1.5)
    pg.evaluate("window.__soleora.debug.go('/articles/sneakers.html', {push:true}); setTimeout(() => window.__soleora.debug.go('/articles/loafers.html', {push:true}), 80);")
    idle(pg); time.sleep(1.5); idle(pg); time.sleep(0.8)
    slug = pg.evaluate("document.getElementById('main').dataset.slug")
    check('double-nav ends consistent', path(pg) == f'/articles/{slug}.html' and pg.locator('.pin').count() == 3, f'{path(pg)} main={slug} pins={pg.locator(".pin").count()}')

    # Regression: Back during an article-to-article swap keeps URL and content in sync
    pg.goto(BASE + '/articles/chelsea-boots.html'); ready(pg); time.sleep(1)
    pg.evaluate("window.__soleora.debug.go('/articles/chukka-boots.html', {push:true})")
    time.sleep(0.25); pg.evaluate('history.back()')
    time.sleep(0.3); idle(pg); time.sleep(1.5); idle(pg)
    slug = pg.evaluate("document.getElementById('main').dataset.slug")
    check('back mid-swap stays in sync', path(pg) == f'/articles/{slug}.html', f'{path(pg)} main={slug}')

    # Regression: the skip link still works on article pages
    pg.focus('.skip'); pg.keyboard.press('Enter'); time.sleep(0.3)
    check('skip link moves focus to main', pg.evaluate("document.activeElement && document.activeElement.id") == 'main' and path(pg).startswith('/articles/'), pg.evaluate("document.activeElement.id + ' ' + location.hash"))

    # Mid-width showroom and the stills fallback
    pg.set_viewport_size({'width': 1024, 'height': 768}); pg.goto(BASE + '/'); ready(pg); time.sleep(2)
    pg.screenshot(path=str(SHOTS / 'home-1024.png'))
    pg.set_viewport_size({'width': 1440, 'height': 900})
    pg.goto(BASE + '/?no3d'); ready(pg); time.sleep(0.5)
    pg.screenshot(path=str(SHOTS / 'home-no3d.png'))

    # Mobile showroom
    m = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    m.on('pageerror', lambda e: errors.append(str(e)))
    m.goto(BASE + '/'); ready(m); time.sleep(2.5)
    m.screenshot(path=str(SHOTS / 'home-mobile.png'))
    m.goto(BASE + '/articles/brogues.html'); ready(m); time.sleep(2)
    m.screenshot(path=str(SHOTS / 'article-mobile-brogues.png'))

    # Stills fallback and listing
    pg.goto(BASE + '/?no3d'); ready(pg); time.sleep(0.5)
    check('no3d shows stills', not pg.evaluate("document.documentElement.classList.contains('has-3d')") and pg.is_visible('.showroom-fallback'))
    pg.goto(BASE + '/articles.html'); ready(pg)
    pg.fill('#q', 'boot'); time.sleep(0.5)
    n = pg.locator('#grid > li:not([hidden])').count()
    check('search filters', 5 <= n < 18, str(n))
    pg.click('.chip[data-cat="formal"]'); time.sleep(0.2)
    check('empty state on no match', pg.is_visible('#empty'))
    pg.click('#clear'); time.sleep(0.2)
    pg.screenshot(path=str(SHOTS / 'listing.png'), full_page=False)
    pg.goto(BASE + '/category/boots.html'); ready(pg)
    pg.screenshot(path=str(SHOTS / 'category.png'))
    pg.emulate_media(color_scheme='dark')
    pg.goto(BASE + '/'); pg.evaluate("localStorage.removeItem('soleora-theme')"); pg.reload(); ready(pg); time.sleep(2.5)
    pg.screenshot(path=str(SHOTS / 'home-dark.png'))
    pg.goto(BASE + '/articles/chelsea-boots.html'); ready(pg); time.sleep(2)
    pg.screenshot(path=str(SHOTS / 'article-dark.png'))

    real = [e for e in errors if 'favicon' not in e]
    check('no console errors', not real, '; '.join(real[:5]))
    b.close()

print(f'\n{len(failures)} failed')
sys.exit(1 if failures else 0)
