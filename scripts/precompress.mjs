// Writes a .gz next to every compressible file in dist/ so nginx can serve it with gzip_static
// (no per-request compression, and level 9 instead of nginx's default level 1).
// Usage: node scripts/precompress.mjs [dir=dist]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = process.argv[2] || 'dist';
const EXT = /\.(html|js|mjs|css|svg|json|xml|txt|glb)$/;
let n = 0, raw = 0, gz = 0;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!EXT.test(e.name)) continue;
    const buf = fs.readFileSync(p);
    const out = zlib.gzipSync(buf, { level: 9 });
    // Only keep it when it saves something worthwhile (e.g. not for texture-heavy models).
    if (out.length > buf.length * 0.95) { fs.rmSync(`${p}.gz`, { force: true }); continue; }
    fs.writeFileSync(`${p}.gz`, out);
    n++; raw += buf.length; gz += out.length;
  }
}
walk(dir);
console.log(`precompress: ${n} files, ${Math.round(raw / 1024)} KB -> ${Math.round(gz / 1024)} KB gzip`);
