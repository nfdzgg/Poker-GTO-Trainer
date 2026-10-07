// Repository hygiene checks: design tokens (UI-01), motion CSS (UI-02),
// third-party assets (UI-05), README (DOC-01), NOTES.md (DOC-02) and the
// GitHub Pages workflow (DEPLOY-01).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { listFiles } from './lib/fsutil';
import { Reporter } from './lib/report';

const r = new Reporter('assets');
const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

// ---------------------------------------------------------------- UI-01
{
  const TOKEN_FILE = 'src/styles/tokens.css';
  const tokens = read(TOKEN_FILE);
  const categories: Record<string, RegExp> = {
    colors: /--[\w-]+:\s*#[0-9a-fA-F]{3,8}\s*;/,
    spacing: /--space-\d+:/,
    radii: /--radius-[\w-]+:/,
    durations: /--dur-[\w-]+:\s*[\d.]+m?s/,
    easing: /--ease-[\w-]+:\s*cubic-bezier/,
  };
  const missing = Object.entries(categories)
    .filter(([, re]) => !re.test(tokens))
    .map(([k]) => k);
  const hexRe = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
  const offenders: string[] = [];
  const files = listFiles('src').filter(
    (f) => /\.(css|ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.startsWith('solver/wasm/') && !f.startsWith('test/'),
  );
  for (const f of files) {
    const full = path.join('src', f);
    if (full === path.normalize(TOKEN_FILE)) continue;
    const lines = read(full).split('\n');
    lines.forEach((line, i) => {
      // Ignore URL fragments like '#/drill' and element ids like '#main-content'.
      for (const m of line.matchAll(hexRe)) {
        const before = line.slice(Math.max(0, m.index! - 1), m.index!);
        if (before === '&') continue; // HTML entity
        offenders.push(`${full}:${i + 1} ${m[0]}`);
      }
    });
  }
  const tokenCount = (tokens.match(/^\s*--[\w-]+:/gm) ?? []).length;
  const cssFiles = files.filter((f) => f.endsWith('.css') && `src/${f}` !== TOKEN_FILE);
  const usesVars = cssFiles.every((f) => /var\(--/.test(read(path.join('src', f))));
  r.check(
    'UI-01',
    missing.length === 0 && offenders.length === 0 && tokenCount >= 40 && usesVars,
    `${tokenCount} tokens in ${TOKEN_FILE}; ${files.length} source files scanned; ` +
      (missing.length ? `missing token categories: ${missing.join(', ')}; ` : '') +
      (offenders.length ? `hard-coded hex colors: ${offenders.slice(0, 10).join(', ')}` : 'no hard-coded hex colors') +
      (usesVars ? '' : '; a stylesheet does not use tokens'),
  );
}

// ---------------------------------------------------------------- UI-02
{
  const cssFiles = listFiles('src').filter((f) => f.endsWith('.css'));
  const css = cssFiles.map((f) => read(path.join('src', f))).join('\n');
  const bad: string[] = [];
  // transition declarations: every transitioned property must be transform or opacity
  for (const m of css.matchAll(/(?:^|[;{\s])transition(-property)?\s*:\s*([^;}]+)/g)) {
    const value = m[2]!.trim();
    const parts = value.split(/,(?![^(]*\))/).map((p) => p.trim().split(/\s+/)[0]!);
    for (const p of parts) if (!['transform', 'opacity', 'none'].includes(p)) bad.push(`transition ${p}`);
  }
  // keyframes bodies: only transform / opacity declarations
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    for (const d of m[2]!.matchAll(/([\w-]+)\s*:/g)) {
      if (!['transform', 'opacity'].includes(d[1]!)) bad.push(`@keyframes ${m[1]} ${d[1]}`);
    }
  }
  const required = [
    ["card dealing", /data-anim='dealing'/],
    ['card flip', /data-anim='flipping'/],
    ['chip movement', /data-anim='moving'/],
    ['grade feedback', /data-anim='grade-enter'/],
    ['screen transition', /data-anim='entering'/],
  ] as const;
  const missingAnims = required.filter(([, re]) => !re.test(css)).map(([n]) => n);
  const keyframes = (css.match(/@keyframes/g) ?? []).length;
  r.check(
    'UI-02',
    bad.length === 0 && missingAnims.length === 0,
    `${cssFiles.length} stylesheets, ${keyframes} @keyframes; ` +
      (bad.length ? `non transform/opacity animation: ${bad.slice(0, 8).join(', ')}` : 'all animations use only transform/opacity') +
      (missingAnims.length ? `; missing animation styles for: ${missingAnims.join(', ')}` : '; deal/flip/chip/grade/screen styles present'),
  );
}

// ---------------------------------------------------------------- UI-05
{
  const assets = listFiles('public/assets');
  const manifest = read('ASSETS.md');
  const allowed = /\b(public domain|cc0|mit)\b/i;
  const problems: string[] = [];
  if (!manifest) problems.push('ASSETS.md missing');
  const rows = manifest.split('\n').filter((l) => l.trim().startsWith('|'));
  for (const a of assets) {
    const row = rows.find((l) => l.includes(`public/assets/${a}`));
    if (!row) {
      problems.push(`${a}: not listed`);
      continue;
    }
    const cells = row.split('|').map((c) => c.trim());
    if (!cells.some((c) => /https?:\/\/|original work/i.test(c))) problems.push(`${a}: no source`);
    if (!cells.some((c) => allowed.test(c))) problems.push(`${a}: license not public domain/CC0/MIT`);
    if (cells.some((c) => /\b(cc[- ]by|gpl|proprietary|all rights reserved)\b/i.test(c) && !allowed.test(c)))
      problems.push(`${a}: disallowed license`);
  }
  // Every listed asset must exist.
  for (const row of rows) {
    const m = /public\/assets\/([\w./-]+)/.exec(row);
    if (m && !assets.includes(m[1]!)) problems.push(`${m[1]} listed but missing`);
  }
  r.check(
    'UI-05',
    problems.length === 0 && !!manifest,
    `asset count: ${assets.length} (${assets.join(', ') || 'none'}); ` + (problems.length ? problems.join('; ') : 'all listed with allowed licenses'),
  );
}

// ---------------------------------------------------------------- DOC-01
{
  const readme = read('README.md');
  const headings = [
    '## Study tool only',
    '## Preflop ranges are approximations',
    '## Local development',
    '## Rebuilding the solver WASM',
    '## Credits',
    '## Assets',
    '## Deploying to GitHub Pages',
    '## License',
  ];
  const missing = headings.filter((h) => !readme.split('\n').some((l) => l.trim().toLowerCase() === h.toLowerCase()));
  const keywords = ['postflop-solver', 'wasm-postflop', 'AGPL', 'npm run dev', 'npm run verify', 'wasm-pack', 'not solver output', 'no real-time assistance'];
  const missingKw = keywords.filter((k) => !readme.toLowerCase().includes(k.toLowerCase()));
  r.check(
    'DOC-01',
    missing.length === 0 && missingKw.length === 0,
    missing.length || missingKw.length
      ? `README missing headings: [${missing.join(', ')}] keywords: [${missingKw.join(', ')}]`
      : `README has all ${headings.length} required sections`,
  );
}

// ---------------------------------------------------------------- DOC-02
{
  const notes = read('NOTES.md');
  const sections = ['Assumptions', 'Decisions', 'Test changes', 'Known limitations', 'Milestone log'];
  const missing = sections.filter((s) => !new RegExp(`^##\\s+${s}\\s*$`, 'mi').test(notes));
  const logPart = notes.split(/^##\s+Milestone log\s*$/im)[1] ?? '';
  const entries = [...logPart.matchAll(/^###\s+(M\d+)\b[^\n]*?(\d{4}-\d{2}-\d{2})[^\n]*\n([\s\S]*?)(?=^###\s|^##\s|$(?![\s\S]))/gm)];
  const problems: string[] = [];
  for (const e of entries) {
    if (!/VERIFY SUMMARY: required \d+\/\d+, stretch \d+\/\d+, skipped \d+/.test(e[3]!)) problems.push(`${e[1]} entry lacks a verify summary line`);
  }
  let committed: string[] = [];
  try {
    const log = execSync('git log --format=%s', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    committed = [...new Set([...log.matchAll(/^milestone\((M\d+)\)/gm)].map((m) => m[1]!))];
  } catch {
    // not a git checkout
  }
  const logged = new Set(entries.map((e) => e[1]!));
  for (const m of committed) if (!logged.has(m)) problems.push(`${m} committed but has no milestone log entry`);
  r.check(
    'DOC-02',
    missing.length === 0 && problems.length === 0 && notes.length > 0,
    (missing.length ? `missing sections: ${missing.join(', ')}; ` : `all ${sections.length} sections present; `) +
      `${entries.length} milestone log entries (${[...logged].join(', ') || 'none'}); committed milestones: ${committed.join(', ') || 'none'}` +
      (problems.length ? `; ${problems.join('; ')}` : ''),
  );
}

// ---------------------------------------------------------------- DEPLOY-01
{
  const file = '.github/workflows/deploy.yml';
  const text = read(file);
  const problems: string[] = [];
  let doc: unknown = null;
  try {
    doc = parseYaml(text);
  } catch (e) {
    problems.push(`YAML parse error: ${(e as Error).message}`);
  }
  if (!text) problems.push(`${file} missing`);
  type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
  const d = (doc ?? {}) as { on?: { push?: { branches?: string[] } }; permissions?: Record<string, string>; jobs?: Record<string, { steps?: Step[]; permissions?: Record<string, string> }> };
  const branches = d.on?.push?.branches ?? [];
  if (!branches.includes('main')) problems.push('not triggered on push to main');
  const steps = Object.values(d.jobs ?? {}).flatMap((j) => j.steps ?? []);
  const uses = steps.map((s) => s.uses ?? '');
  const runs = steps.map((s) => s.run ?? '').join('\n');
  const need: [string, boolean][] = [
    ['actions/checkout', uses.some((u) => u.startsWith('actions/checkout@'))],
    ['actions/setup-node', uses.some((u) => u.startsWith('actions/setup-node@'))],
    ['npm ci', /npm ci\b/.test(runs)],
    ['lint', /npm run lint\b/.test(runs)],
    ['typecheck', /npm run typecheck\b/.test(runs)],
    ['unit tests', /npm (run )?test\b/.test(runs)],
    ['build', /npm run build\b/.test(runs)],
    ['actions/upload-pages-artifact (dist)', steps.some((s) => (s.uses ?? '').startsWith('actions/upload-pages-artifact@') && String(s.with?.path ?? '').replace(/^\.\//, '').startsWith('dist'))],
    ['actions/deploy-pages', uses.some((u) => u.startsWith('actions/deploy-pages@'))],
  ];
  for (const [n, ok] of need) if (!ok) problems.push(`missing ${n}`);
  if (/\b(cargo|rustup|wasm-pack)\b|rust-toolchain/.test(text)) problems.push('workflow must not use Rust');
  const perms: Record<string, string> = { ...(d.permissions ?? {}) };
  for (const j of Object.values(d.jobs ?? {})) Object.assign(perms, j.permissions ?? {});
  if (perms['pages'] !== 'write' || perms['id-token'] !== 'write') problems.push('needs pages: write and id-token: write permissions');
  r.check('DEPLOY-01', problems.length === 0, problems.length ? problems.join('; ') : `${file} parses; ${steps.length} steps incl. lint, typecheck, test, build, upload-pages-artifact, deploy-pages; Node only`);
}

r.finish();
