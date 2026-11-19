# Soleora

A 3D shoe showroom with an editorial side. Eighteen shoes sit on a rail; pick one up and the same 3D shoe carries you into its article, which explains where the style came from, how to recognise it, what it's made of, how to wear it, how it should fit and how to care for it.

## What's inside

- **3D showroom** (home): drag, swipe, use the arrow keys or the category tabs to move along the rail. Click the shoe in front, or "Read about it", to open its article.
- **Shoe-to-article transition**: the shoe you click flies into the article's hero while the text fades in, with no page reload. Back plays it in reverse.
- **Article pages**: rotate the shoe by dragging or with the buttons. Numbered hotspot pins link to the Key features list.
- **All shoes and category pages**: search and category filters, with pre-rendered stills.
- **Works without 3D**: browsers without WebGL2, Save-Data mode, or `?no3d` in the URL get still images and normal links. Every page is plain HTML, so search engines can index it.
- Light and dark themes, reduced-motion support, keyboard and screen-reader friendly.

The 18 shoes are **generated in code** (`src/js/shoes/`) from parameter specs, so the collection shares one visual style and needs no 3D model files or licences.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # generates pages, then starts Vite on http://localhost:5179
npm run build      # generates pages and builds the site into dist/
npm run preview    # serves dist/ on http://localhost:4173
```

`dist/` is the complete static site. Upload it to any static web server (for example Nginx on EC2) to deploy.

## Project structure

```
content/articles/*.md      Article bodies (Markdown)
content/meta/*.json        Article metadata from the writers
src/data/articles.json     All article data used by the site (titles, categories, view angles, hotspots)
src/js/shoes/              Procedural shoe generator: geometry, materials, the 18 shoe specs
src/js/three/              Shared 3D stage, showroom rail, article viewer with hotspots
src/js/app3d.js            Ties the stage, rail, viewer and router together; runs the transitions
src/js/router.js           Fetch-and-swap router used when 3D is active
src/js/listing.js          Search and filters on the All shoes page
src/css/                   Design tokens, layout, components, stage styles
scripts/generate-pages.mjs Builds every HTML page, plus sitemap.xml and robots.txt
public/stills, public/og   Pre-rendered shoe images (cards, posters, share images)
tools/                     Stills renderer
tests/                     Unit tests (Vitest) and an end-to-end smoke test (Playwright)
docs/superpowers/plans/    The implementation plan this build followed
```

Generated pages (`index.html`, `articles.html`, `articles/`, `category/`, and so on) are not committed; `npm run dev` and `npm run build` create them.

## Adding or changing a shoe

1. Write the article in `content/articles/<slug>.md`. Follow `content/WRITING_BRIEF.md`; the Key features list must start with the hotspot labels.
2. Add the metadata in `content/meta/<slug>.json`, and a row in `scripts/compose-data.mjs` (category, featured, hotspot labels and anchors). Then run `node scripts/compose-data.mjs`.
3. Add a spec in `src/js/shoes/specs.js` (last shape, upper, sole, details, anchors).
4. Re-render the stills: start `npx vite --port 5179`, then run `python3 tools/render-stills.py <slug>` (needs Python Playwright and Chrome).
5. Run `npm test`.

## Tests

```bash
npm test                                         # 47 unit tests: shoes, content, page generator, router, filters
npm run build && npm run preview &
python3 tests/e2e/smoke.py http://localhost:4173 # end-to-end: transition, Back, interrupts, resize, fallback, search
```

The end-to-end test saves screenshots to `tests/e2e/shots/`.

## Before you deploy

- Replace `https://example.com` in `scripts/generate-pages.mjs` (the `SITE` constant) with your domain, and `hello@example.com` on the contact page.
- The 3D code uses no WebAssembly, so a Content-Security-Policy of `script-src 'self'` is enough.
