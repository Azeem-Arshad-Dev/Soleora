# Performance pass: progress (2026-11-21)

Goal: same site, faster. No visual, copy or transition changes.

## How it was measured
- `npm run build`, served `dist/` with the repo's `docker/nginx.conf` on a local nginx 1.24, with the root and port rewritten.
  Docker Hub is blocked from this environment, so the `nginx:1.27-alpine` image could not be pulled.
- Headless system Chrome (SwiftShader) via Playwright plus CDP. Network: "fast" = 20 Mbit/s, 40 ms RTT; "Slow 4G" = 1.6 Mbit/s, 150 ms RTT. Cache disabled, median of 5 runs, 1440x900.
- Bytes are encoded (on-the-wire) sizes. "ready" is when the 3D stage shows (`window.__soleora.ready`).
  This time is dominated by SwiftShader running WebGL on the CPU, so it will be much lower on real GPUs.
- The measurement scripts lived in /home/claude/perf (outside the repo): measure.py, shots.py, diff.py.

## Before / after
| | Before | After |
|---|---|---|
| Home transfer (5 GLBs) | 4.13 MB | 2.29 MB |
| Article (brogues) transfer | 3.52 MB (5 GLBs) | 1.47 MB (3 GLBs) |
| Home `?no3d` transfer | 371 KB | 303 KB |
| GLB bytes, home / article | 3.57 MB / 2.97 MB | 1.83 MB / 1.01 MB |
| All 17 GLBs, raw | 12.46 MB | 6.35 MB |
| Fonts per page | 254 KB | 187 KB |
| app3d.js (gzip) | 217 KB | 225 KB (+ meshopt decoder) |
| FCP/LCP home, fast | 176 / 176 ms | 164 / 164 ms |
| FCP/LCP article, fast | 180 / 184 ms | 180 / 192 ms |
| 3D ready home / article, fast | 6.6 s / 3.8 s | 3.6 s / 3.2 s |
| 3D ready home / article, Slow 4G | 10.0 s / 9.5 s | 9.5 s / 5.7 s |
| Lighthouse desktop simulated LCP, home / article | 832 / 797 ms | 845 / 839 ms (same, within noise) |

Image bytes on home vary from 45 to 120 KB in both builds. Lazy stills in the hidden fallback grid sometimes load before main.js adds `has-3d`; this predates these changes.

## Done (on main)
- 345af5d: models get EXT_meshopt_compression plus 512 px aux maps (tools/lib/web-optimise.mjs, tools/compress-models.mjs; import-model applies the same pass). MeshoptDecoder is wired into the loader. Budget is 768 KB per file.
- f5592fc: the first model is preloaded after app3d.js arrives; rail neighbours load nearest-first, one at a time, after the front shoe; article pages preload only ±1 after the hero; no pin raycasts while pins are hidden.
- 2ea07d3: subset self-hosted fonts (tools/subset-fonts.py, src/fonts/subset.json) and tests/fonts.test.js.
- f8243ed: nginx gzip_static with build-time .gz files (scripts/precompress.mjs), gzip_vary, cache headers. Tested with `nginx -t` and curl on nginx 1.24.

Verification: `npm run build` OK; `npx vitest run` 89/89 (65 original + 24 new font-coverage tests); e2e smoke 22/22 against nginx and against `vite preview`. Screenshot diffs of home, the 18 article heroes, `?no3d` and the article page are pixel-identical (largest change: one hotspot pin moved about 2 px on the hiking boot). The rail and mid-transition shots differ only by capture timing; the rail shot was rechecked with a long settle and was identical.

## Tried and dropped
- Preloading fonts with `<link rel=preload>`: CLS went from 0.008 to 0, but FCP/LCP got 30-95 ms later. Removed.
- Preloading the first GLB at page load (low or normal priority): helped home but slowed the article by 0.8 s on Slow 4G, because it competed with app3d.js. Moved to after the import instead.
- Full Latin-1 font subset: only 3% smaller, so a tighter set is used.

## Not done / next steps
1. Validate docker/nginx.conf on the real image once Docker Hub is reachable:
   `docker run --rm -v $PWD/docker/nginx.conf:/etc/nginx/conf.d/default.conf nginx:1.27-alpine nginx -t`
   (dockerd had to be started by hand: `dockerd &`).
2. Optional: set `has-3d` from an inline head script so the hidden fallback grid never loads stills (saves up to about 75 KB on home). Check the layout before/after.
3. Optional: srcset (800w/1600w) for the article hero poster on small screens.
4. Re-measure on a real GPU device; SwiftShader inflates "ready" and Lighthouse TBT.
5. Never edit models-source/ (gitignored). To re-optimise new imports: `node tools/import-model.mjs ...` already applies the web pass, and `node tools/compress-models.mjs` is idempotent.
