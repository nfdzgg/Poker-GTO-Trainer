// BUILD-02: checks the production build in dist/.
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { formatBytes, listFiles } from './lib/fsutil';
import { Reporter } from './lib/report';

const r = new Reporter('dist');
const DIST = path.resolve('dist');
const BUDGET_GZIP = 350 * 1024;
const problems: string[] = [];

const files = listFiles(DIST);
if (files.length === 0) problems.push('dist/ is empty or missing (run npm run build)');
const html = files.includes('index.html') ? readFileSync(path.join(DIST, 'index.html'), 'utf8') : '';
if (!html) problems.push('dist/index.html missing');

// Relative asset URLs only (no "/assets/...", no "http(s)://" for scripts, styles and icons).
const refs = [...html.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)].map((m) => m[1]!);
for (const u of refs) if (/^(?:\/|https?:|\/\/)/.test(u)) problems.push(`index.html references a non-relative URL: ${u}`);

const wasm = files.filter((f) => f.endsWith('.wasm'));
if (wasm.length === 0) problems.push('no .wasm file in dist/');

// No network calls to absolute URLs in source or built JS.
const net = /\b(?:fetch|new\s+WebSocket|WebSocket|new\s+EventSource|navigator\.sendBeacon)\s*\(\s*[`'"](?:https?|wss?):\/\//;
const xhr = /\.open\s*\(\s*[`'"][A-Z]+[`'"]\s*,\s*[`'"](?:https?):\/\//;
const scan = [
  ...listFiles('src').filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => path.join('src', f)),
  ...files.filter((f) => f.endsWith('.js')).map((f) => path.join('dist', f)),
];
for (const f of scan) {
  const text = readFileSync(f, 'utf8');
  if (net.test(text) || xhr.test(text)) problems.push(`${f} makes a network call to an absolute URL`);
}

// Initial JS = scripts referenced by index.html plus their static imports (modulepreload).
const entry = refs.filter((u) => u.endsWith('.js')).map((u) => u.replace(/^\.\//, ''));
const initial = new Set<string>();
const visit = (rel: string) => {
  if (initial.has(rel) || !files.includes(rel)) return;
  initial.add(rel);
  const code = readFileSync(path.join(DIST, rel), 'utf8');
  // static imports only: `import ... from "./x.js"` / `import "./x.js"` at module top level
  for (const m of code.matchAll(/(?:^|[;\n}])\s*import\s*(?:[\w$*{}\s,]+from\s*)?["'](\.\/[^"']+\.js)["']/g)) visit(path.posix.join(path.posix.dirname(rel), m[1]!));
};
entry.forEach(visit);
let initialGzip = 0;
let initialRaw = 0;
for (const f of initial) {
  const buf = readFileSync(path.join(DIST, f));
  initialRaw += buf.length;
  initialGzip += gzipSync(buf, { level: 9 }).length;
}
const total = files.reduce((s, f) => s + statSync(path.join(DIST, f)).size, 0);
const initialText = [...initial].map((f) => readFileSync(path.join(DIST, f), 'utf8')).join('\n');
const wasmInInitial = wasm.some((w) => initialText.includes(path.basename(w))) || /solver_bg/.test(html);
if (wasmInInitial) problems.push('the solver WASM is referenced from the initial bundle (it must load lazily on the analyzer screen)');
if (initialGzip > BUDGET_GZIP) problems.push(`initial JS ${formatBytes(initialGzip)} gzipped exceeds the 350 kB budget`);

console.log(`dist/ total size: ${formatBytes(total)} in ${files.length} files`);
console.log(`Initial JS bundle: ${[...initial].join(', ')} = ${formatBytes(initialRaw)} raw, ${formatBytes(initialGzip)} gzipped (budget 350 kB)`);
for (const w of wasm) console.log(`WASM: dist/${w} ${formatBytes(statSync(path.join(DIST, w)).size)} (lazy: loaded by the solver worker on the analyzer screen)`);
r.check(
  'BUILD-02',
  problems.length === 0,
  problems.length ? problems.join('; ') : `relative URLs, ${wasm.length} wasm file(s), no absolute-URL network calls, initial JS ${formatBytes(initialGzip)} gz, dist ${formatBytes(total)}`,
);
r.finish();
