import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function pages() {
  const input = {};
  const add = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.html') && !f.startsWith('_')) input[path.join(dir, f).replace(/\.html$/, '').replace(/^\.\//, '')] = path.resolve(dir, f);
  };
  add('.'); add('articles'); add('category');
  return input;
}

export default defineConfig({
  appType: 'mpa',
  build: { rollupOptions: { input: pages() }, chunkSizeWarningLimit: 900 },
  server: { port: 5179 },
});
