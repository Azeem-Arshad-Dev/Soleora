# Soleora Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Soleora, a static editorial website where 18 interactive 3D shoes live in a showroom, and clicking a shoe flies that same 3D object into its article.

**Architecture:** Vite multi-page static site. A Node prebuild script generates one real HTML page per article and category from `src/data/articles.json` + Markdown bodies, so every page is indexable and works without JS. One persistent three.js stage (single WebGL context) renders procedurally built shoes; a small router swaps `<main>` with fetched article HTML while a GSAP timeline carries the shoe into the article's hero slot. Devices without WebGL2 (or with `?no3d`) get pre-rendered stills and ordinary links.

**Tech Stack:** Vite 8, three.js 0.187, GSAP 3.15, marked 18 (build time only), Vitest 5 + happy-dom (unit), Python Playwright + system Chrome (e2e smoke, stills rendering), @fontsource-variable Bricolage Grotesque + Source Serif 4.

**Spec:** "Soleora — Full Build & Deployment Plan" doc (claude.ai artifact DxfJsP1qAqVzAqayq4HovF), sections Overview through Testing. Deployment section is out of scope for this build.

## Deviation from the spec (decided)

- **3D shoes are procedural, not downloaded GLBs.** The build environment cannot reach model marketplaces, and a code-built collection is guaranteed to share one visual language with no licence risk. `src/js/shoes/` builds each shoe from a parameter spec (footprint, upper profile, topline, sole/heel, details). Result: no `models/` folder, no gltf-transform pipeline, no Meshopt (CSP no longer needs `wasm-unsafe-eval`). The GLB pipeline stays documented in the README as the upgrade path.
- **Lighting uses three's `RoomEnvironment`** (no HDRI download).
- **Articles are generated** from Markdown by `scripts/generate-pages.mjs` (the spec's "copy the template" flow becomes "add a JSON entry + a .md file").

## Global Constraints

- Palette (light / dark): Chalk #EEF0EF / #171B20 page; Studio #D5D9DC / #20262D stage; Ink #1C2430 / #E8EBEC text; Welt #6F7880 / #9AA3AB secondary; Oxblood #6E1F2A / #C9606E sole accent; Gum #C8955A / #D9A86C pips & tags only, never text.
- Stage tints: athletic #C8D3CF, casual #D6D1E0, formal #CBC6C2, boots #D3C9BC, womens #E0CDCB (dark mode: same hues mixed 80% toward #20262D).
- Type: Bricolage Grotesque (headlines width 75, sentence case, tight tracking) for UI/headings; Source Serif 4 19px/1.65, 66ch for article body. Scale 14/16/19/25/34/45/60/80px.
- Copy rules: no all-caps labels, no dot-separated meta strings, no arrow glyphs on buttons, sentence case, active verbs. Meta reads "6 minute read, published 20 November 2026."
- No card boxes/drop shadows/hover-lift on listing grids; stills sit on their stage tint.
- Only unprompted motion: featured shoe settles onto the stage once on first load (~900 ms). No auto-rotating carousel, no scroll fade-ins.
- One WebGL context per page; render on demand; pixel ratio cap 2 (1.5 light tier).
- Shoe coordinate convention: length 1 unit, toe +x, heel −x, sole bottom at y = 0, centred on z.
- Every shoe is also a real `<a href="/articles/<slug>.html">`; everything works without JS.
- `prefers-reduced-motion`: fly-in becomes 200 ms crossfade; settle animation skipped.
- 18 articles, 600–900 words, sections: intro, A brief history, Key features (ordered list; first items = hotspot labels in order), Materials, When and how to wear it, Finding the right fit, Care and maintenance. No prices, no brand endorsements.
- Showroom JS ≤ ~200 KB gzip; listing pages never load three.js.

## Design review (independent agent): APPROVED WITH CHANGES — all adopted

These override the Global Constraints above where they conflict.

1. Stage tints raised for visible shift: athletic #B7CCC3, casual #CBC2DE, formal #C6B8AD, boots #CFB894, heels-and-flats #BFC9D8. Studio #D5D9DC stays the neutral home state.
2. Category label "Heels and flats" (slug `womens` kept); no pink.
3. Welt (light) = #5A626A. Secondary text never sits directly on a tint (use Ink there).
4. Formality pips: 10px, 6px gap; filled #C8955A + 1px #8A6233 ring; empty = ring only.
5. Stage is a cyclorama: curved floor-to-wall sweep (radius 1.2) in the tint; wall top lightened 6% toward white.
6. Rail: neighbours in pure side profile (yaw 90°), scale 0.55 (±1) / 0.38 (±2), spacing 1.3, colour 30% toward the tint; focused shoe eases to its 3/4 view (default yaw −35°, pitch 12°) over 600 ms power3.out.
7. Hide seams: 0.012 welt/midsole lip over the upper–sole joint; ≥128×64 upper segments on high quality; bevelled outsole edge.
8. Big index numeral of the focused shoe: 80px Bricolage width 75 in Oxblood, bottom-left of stage, "of 18" at 19px in Welt; crossfade on change.
9. Materials (MeshPhysicalMaterial): smooth calf r 0.38–0.48 cc 0.25 ccr 0.35; polished r 0.3 cc 0.6 ccr 0.18; suede r 0.92 sheen 0.7 sheenRoughness 0.8; knit r 0.85 sheen 0.35; rubber r 0.7 (gum #B9773E, crepe #D9C29A); metal m 1 r 0.35 #B8B4AA. Stitch tubes r 0.0025, 15% lighter than upper.
10. Lighting: RoomEnvironment 0.55, key DirectionalLight 2.2 (upper-left-front, 45°), rim 0.8 (back-right), AgX exposure 1.0, contact shadow opacity 0.35. Camera FOV 24°. Rail: focused shoe ≈42% viewport width, sole line at 62% of stage height. Hero: shoe ≈78% of slot width, 8% bottom margin.
11. Hero copy: "Pick one up. We'll tell you where it's been."
12. Colourways per shoe as listed in `src/js/shoes/specs.js` (from the review).

## Review Focus

1. Rapid double-click / Esc / Back mid-transition must not leave two shoes, a blank stage or a wrong URL — test `transition-interrupt` in e2e (Task 9).
2. Direct load or refresh on `/articles/<slug>.html` (and the clean URL) must render the hero shoe in its slot — e2e `direct-article` (Task 9).
3. Window resize/orientation change during and after the transition must keep the stage aligned to `#hero-slot` — e2e resize check (Task 9).
4. WebGL unavailable or `?no3d` must show stills and plain links with zero console errors — e2e `no3d` (Task 9).
5. A JSON entry whose hotspot names an anchor the shoe lacks must fail the build, not render a pin at the origin — unit test `hotspots reference real anchors` (Task 2).

---

### Task 1: Project scaffold, tokens, layout shell

**Files:** Create `package.json`, `vite.config.js`, `.gitignore`, `index.html` (temporary shell), `src/css/base.css`, `src/css/layout.css`, `src/css/components.css`, `src/css/stage.css`, `src/js/main.js`, `public/theme-init.js`, `public/favicon.svg`, `public/robots.txt`, `README.md`.

**Interfaces:**
- Produces: CSS custom properties `--chalk --studio --ink --welt --accent --gum --stage-tint` with `[data-theme="dark"]` overrides; `initChrome()` in `main.js` (menu, theme toggle, back-to-top); `public/theme-init.js` sets `document.documentElement.dataset.theme` before paint from `localStorage['soleora-theme']` or `prefers-color-scheme`.
- Scripts: `npm run dev` (generate + vite), `npm run build` (generate + vite build), `npm test` (vitest run).

- [ ] Step 1: `npm init`, install deps, write `vite.config.js` whose `build.rollupOptions.input` globs every `*.html` at root, `articles/`, `category/`.
- [ ] Step 2: Write tokens + header/footer + theme toggle; verify `npm run build` succeeds and `dist/index.html` exists.
- [ ] Step 3: Commit `chore: scaffold Vite project, design tokens, layout shell`.

### Task 2: Procedural shoe generator

**Files:** Create `src/js/shoes/geometry.js`, `src/js/shoes/materials.js`, `src/js/shoes/specs.js`, `src/js/shoes/build.js`; Test `tests/shoes.test.js`.

**Interfaces:**
- Produces: `SHOE_SPECS: Record<slug, ShoeSpec>` (18 slugs from the content plan); `buildShoe(slug: string, opts?: {quality?: 'high'|'low'}) -> { group: THREE.Group, anchors: Record<string, THREE.Vector3> }`; anchors are in shoe-local space.
- Consumes: nothing.

- [ ] Step 1: Write failing tests:
  - `every content-plan slug has a spec` (18 slugs).
  - `buildShoe normalises size`: bounding box x-extent within 0.95–1.05, min.y within ±0.005 of 0, |center.z| < 0.02.
  - `hotspots reference real anchors`: for every entry in `articles.json`, each `hotspot.anchor` exists in `buildShoe(slug).anchors`.
- [ ] Step 2: Run `npx vitest run tests/shoes.test.js` → FAIL.
- [ ] Step 3: Implement. Upper = parametric surface over u∈[0,1] (toe→heel) and θ∈[0,π] (medial→lateral) with half-width from `footprint(u)`, arch height `height(u)`, clipped at `topline(u)`; sole = extruded footprint deformed by `lift(u)` for heels; details per spec (laces, eyelets, toe-cap seam, brogue perforations as instanced dots, monk buckle, Chelsea elastic panel, pull tab, studs, lugs, sandal straps, thong, espadrille jute band). Lining = inset BackSide shell in a darker tone.
- [ ] Step 4: Tests PASS.
- [ ] Step 5: Commit `feat: procedural 3D shoe generator for 18 styles`.

### Task 3: Content data + 18 articles

**Files:** Create `src/data/articles.json`, `content/articles/<slug>.md` ×18; Test `tests/content.test.js`.

**Interfaces:**
- Produces: entry `{slug,title,standfirst,category,excerpt,author,date,readTime,tags,featured,formality,stageTint,view:{yaw,pitch,distance},hotspots:[{n,label,anchor}],facts:{origin,bestFor,materials}}`; categories `athletic|casual|formal|boots|womens`.
- [ ] Step 1: Failing test `content.test.js`: 18 entries, unique slugs, each `.md` exists, word count 600–900, contains the six H2s, Key features list's first `hotspots.length` items start with the hotspot labels in order, `formality` 1–5, no "$" prices.
- [ ] Step 2: Write articles (parallel subagents, 6 each), run tests → PASS.
- [ ] Step 3: Commit `content: 18 shoe articles and metadata`.

### Task 4: Page generator (articles, categories, listing, static pages, sitemap)

**Files:** Create `scripts/generate-pages.mjs`, `templates/layout.html`, `templates/article.html`; generated (gitignored) `articles/*.html`, `category/*.html`; committed `articles.html`, `about.html`, `contact.html`, `404.html`, generated `public/sitemap.xml`; Test `tests/generate.test.js`.

**Interfaces:**
- Produces: article page DOM contract — `<main id="main" data-page="article" data-slug>`, `<div id="hero-slot">` (aspect 4:3 desktop, 55svh mobile) containing `<img class="hero-still">`, `<aside class="shoebox-label">`, `<ol class="features">` items with `data-hotspot="n"`, `<a class="next-shoe" data-slug>`; head contains title "Title | Soleora", meta description, canonical `https://example.com/...`, OG tags, JSON-LD Article + BreadcrumbList.
- [ ] Step 1: Failing test: generating to a temp dir produces 18 article files, each with exactly one `<h1>`, a `#hero-slot`, canonical tag and parseable JSON-LD.
- [ ] Step 2: Implement with `marked`; PASS.
- [ ] Step 3: Commit `feat: static page generator`.

### Task 5: Stage (shared renderer)

**Files:** Create `src/js/three/stage.js`, `src/js/capability.js`.

**Interfaces:**
- Produces: `detectTier() -> 'full'|'light'|'stills'` (stills when no WebGL2, `navigator.connection.saveData`, or `?no3d`); `createStage(el: HTMLElement) -> Stage` with `stage.setShoe(slug)`, `stage.addShoe(slug) -> THREE.Group`, `stage.camera`, `stage.requestRender()`, `stage.resize()`, `stage.onFrame(cb)`, `stage.project(vec3) -> {x,y,visible}`; contact shadow per shoe; `window.__soleora = {ready:boolean, tier}` for tests.
- [ ] Step 1: Implement; manual check via a dev page renders one shoe.
- [ ] Step 2: Commit `feat: shared three.js stage with on-demand rendering`.

### Task 6: Stills renderer

**Files:** Create `tools/stills.html`, `tools/render-stills.py`; output `public/stills/<slug>.webp` (800×600), `public/stills/<slug>-poster.webp` (1600×1200), `public/og/<slug>.webp` (1200×630).
- [ ] Step 1: Python Playwright (system Chrome, `--use-angle=swiftshader`) loads `tools/stills.html?slug=` from `vite preview`, reads canvas PNG, Pillow converts to WebP q80.
- [ ] Step 2: Verify 18×3 files exist, still ≤ 60 KB. Commit `feat: rendered stills and share images`.

### Task 7: Showroom (home)

**Files:** Modify `index.html`; create `src/js/three/rail.js`, `src/js/showroom.js`.

**Interfaces:**
- Consumes: `createStage`, `buildShoe`, `articles.json`.
- Produces: `createRail(stage, entries) -> { focus(i), focusedIndex, slugAt(i), dispose() }`; DOM: `<ol class="rail-list">` of real links mirroring the rail, `aria-live` status "Chelsea Boots, 13 of 18."; category tabs; "Read about it" link.
- [ ] Step 1: Implement rail (drag/swipe, wheel, arrow keys, tabs, click neighbour = focus, click focused = open), lazy shoe building (focus ±2), settle animation, rotate buttons.
- [ ] Step 2: Commit `feat: 3D showroom rail`.

### Task 8: Article viewer, hotspots, router, transition

**Files:** Create `src/js/three/viewer.js`, `src/js/three/hotspots.js`, `src/js/router.js`, `src/js/transition.js`, `src/js/article.js`; Test `tests/router.test.js`.

**Interfaces:**
- Produces: `extractPage(html: string) -> {title, description, canonical, mainHTML, pageType, slug}` (pure, happy-dom); `navigate(url, {via:'push'|'pop'})`; `flyToArticle(stage, slug, slotEl) -> Promise`, `flyToShowroom(stage, slug) -> Promise`; transition guard `isTransitioning()`; Esc or second click calls `timeline.timeScale(4)`.
- [ ] Step 1: Failing test: `extractPage` returns title "Chelsea Boots: A Wardrobe Essential | Soleora" and pageType "article" from a generated page; non-article HTML returns pageType "showroom".
- [ ] Step 2: Implement; PASS. Any fetch/parse error → `location.href = url`.
- [ ] Step 3: Commit `feat: shoe-to-article transition and router`.

### Task 9: Listing, polish, e2e verification

**Files:** Create `src/js/listing.js`, `tests/e2e/smoke.py`; Test `tests/listing.test.js`.
- [ ] Step 1: Failing unit test `filterEntries(entries, {q:'boot', cat:null})` returns the 4 boot-related slugs; `{q:'', cat:'formal'}` returns 4.
- [ ] Step 2: Implement listing + URL sync; PASS.
- [ ] Step 3: e2e `smoke.py` against `vite preview`: home ready; click focused shoe → URL `/articles/`, `h1` visible, stage rect within 4 px of `#hero-slot`; Back → home with same focus; rapid double click + Esc → consistent state (`transition-interrupt`); direct article load (`direct-article`); resize 1280→390 keeps alignment; `?no3d` shows stills, zero console errors on all pages. Save screenshots to `tests/e2e/shots/`.
- [ ] Step 4: Commit `test: e2e smoke and polish`; push `main`.
