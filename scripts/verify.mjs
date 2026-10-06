#!/usr/bin/env node
// Runs every verification step in order and prints one [PASS]/[FAIL]/[SKIP]
// line per requirement ID, followed by the summary and overall result.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_PATTERN, REQUIREMENTS } from './requirements.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts', 'verify');
const config = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'verify.config.json'), 'utf8'));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const STEPS = [
  { name: 'lint', cmd: ['npm', 'run', 'lint'] },
  { name: 'typecheck', cmd: ['npm', 'run', 'typecheck'] },
  {
    name: 'test',
    cmd: ['npm', 'run', 'test', '--', '--reporter=dot', '--reporter=json', `--outputFile.json=${path.join(OUT, 'vitest.json')}`],
  },
  { name: 'check:data', cmd: ['npm', 'run', 'check:data'] },
  { name: 'check:assets', cmd: ['npm', 'run', 'check:assets'] },
  { name: 'check:solver', cmd: ['npm', 'run', 'check:solver'] },
  { name: 'build', cmd: ['npm', 'run', 'build'] },
  { name: 'check:dist', cmd: ['npm', 'run', 'check:dist'] },
  { name: 'e2e', cmd: ['npm', 'run', 'e2e'] },
];

const stepStatus = {};
let e2eSkipReason = null;

function chromiumPreflight() {
  const probe = spawnSync(
    process.execPath,
    [
      '-e',
      "require('@playwright/test').chromium.launch().then(b=>b.close()).then(()=>process.exit(0),e=>{console.error(String(e&&e.message||e));process.exit(1)})",
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (probe.status === 0) return null;
  return (probe.stderr || probe.stdout || 'unknown error').trim();
}

for (const step of STEPS) {
  console.log(`\n===== STEP ${step.name} =====`);
  if (step.name === 'e2e') {
    const err = chromiumPreflight();
    if (err) {
      console.log('Chromium could not be launched; E2E IDs will be skipped. Install error:');
      console.log(err);
      e2eSkipReason = `Chromium unavailable: ${err.split('\n')[0]}`;
      stepStatus[step.name] = 'skipped';
      continue;
    }
  }
  const started = Date.now();
  const res = spawnSync(step.cmd[0], step.cmd.slice(1), { cwd: ROOT, stdio: 'inherit', env: process.env });
  const ok = res.status === 0;
  stepStatus[step.name] = ok ? 'ok' : 'failed';
  console.log(`----- STEP ${step.name}: ${ok ? 'OK' : `FAILED (exit ${res.status})`} in ${((Date.now() - started) / 1000).toFixed(1)}s -----`);
}

// ---- Collect evidence -------------------------------------------------------
/** evidence[id][source] = array of { ok: boolean, name: string } */
const evidence = {};
function add(id, source, ok, name) {
  evidence[id] ??= {};
  evidence[id][source] ??= [];
  evidence[id][source].push({ ok, name });
}
function idsIn(text) {
  return [...new Set(String(text).match(ID_PATTERN) ?? [])];
}

// Vitest JSON
const vitestFile = path.join(OUT, 'vitest.json');
if (existsSync(vitestFile)) {
  const data = JSON.parse(readFileSync(vitestFile, 'utf8'));
  for (const file of data.testResults ?? []) {
    for (const t of file.assertionResults ?? []) {
      const name = t.fullName ?? [...(t.ancestorTitles ?? []), t.title].join(' ');
      for (const id of idsIn(name)) add(id, 'vitest', t.status === 'passed', name);
    }
    if ((file.assertionResults ?? []).length === 0 && file.status === 'failed') {
      for (const id of idsIn(file.message ?? '')) add(id, 'vitest', false, file.name);
    }
  }
}

// Playwright JSON
const e2eFile = path.join(OUT, 'e2e.json');
if (existsSync(e2eFile) && !e2eSkipReason) {
  const data = JSON.parse(readFileSync(e2eFile, 'utf8'));
  const walk = (suite, titles) => {
    const here = suite.title ? [...titles, suite.title] : titles;
    for (const spec of suite.specs ?? []) {
      const name = [...here, spec.title].join(' › ');
      const ok = spec.ok === true && (spec.tests ?? []).every((t) => (t.results ?? []).some((r) => r.status === 'passed'));
      for (const id of idsIn(name)) add(id, 'e2e', ok, name);
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const s of data.suites ?? []) walk(s, []);
  for (const err of data.errors ?? []) console.log(`Playwright error: ${err.message ?? JSON.stringify(err)}`);
}

// Check scripts
for (const check of ['data', 'assets', 'solver', 'dist']) {
  const f = path.join(OUT, `check-${check}.json`);
  if (!existsSync(f)) continue;
  const data = JSON.parse(readFileSync(f, 'utf8'));
  for (const r of data.results ?? []) add(r.id, `check:${check}`, r.status === 'PASS', r.detail ?? '');
}

// ---- Evaluate ---------------------------------------------------------------
console.log('\n===== REQUIREMENTS =====');
let reqPass = 0;
let reqTotal = 0;
let strPass = 0;
let strTotal = 0;
let skipped = 0;
const failures = [];

for (const req of REQUIREMENTS) {
  if (req.stretch) strTotal++;
  else reqTotal++;
  const ev = evidence[req.id] ?? {};
  let status = 'PASS';
  let reason = '';

  if (req.stretch && config.stretchDeferred) {
    status = 'SKIP';
    reason = 'deferred: turn budget';
  } else if (req.e2e && e2eSkipReason) {
    // Allowed skip only when an equivalent jsdom test exists and passes.
    const jsdom = ev.vitest ?? [];
    if (jsdom.length > 0 && jsdom.every((e) => e.ok)) {
      status = 'SKIP';
      reason = `${e2eSkipReason} (equivalent jsdom test passes)`;
    } else {
      status = 'FAIL';
      reason = `${e2eSkipReason} and no passing equivalent jsdom test`;
    }
  } else {
    for (const src of req.sources) {
      if (src.startsWith('step:')) {
        const s = src.slice(5);
        if (stepStatus[s] !== 'ok') {
          status = 'FAIL';
          reason ||= `step ${s} ${stepStatus[s] ?? 'did not run'}`;
        }
        continue;
      }
      if (src === 'e2e' && e2eSkipReason) continue;
      const items = ev[src] ?? [];
      if (items.length === 0) {
        status = 'FAIL';
        reason ||= `no ${src} evidence`;
      }
    }
    for (const [src, items] of Object.entries(ev)) {
      if (src === 'e2e' && e2eSkipReason) continue;
      const bad = items.filter((e) => !e.ok);
      if (bad.length > 0) {
        status = 'FAIL';
        reason ||= `${src} failed: ${bad[0].name}`;
      }
    }
  }

  const desc = req.stretch ? `${req.desc} (stretch)` : req.desc;
  if (status === 'PASS') {
    if (req.stretch) strPass++;
    else reqPass++;
    const n = Object.values(ev).reduce((a, b) => a + b.length, 0);
    console.log(`[PASS] ${req.id} ${desc}${n ? ` (${n} check${n === 1 ? '' : 's'})` : ''}`);
  } else if (status === 'SKIP') {
    skipped++;
    console.log(`[SKIP] ${req.id} ${reason}`);
  } else {
    if (!req.stretch) failures.push(req.id);
    console.log(`[FAIL] ${req.id} ${desc} -- ${reason}`);
  }
}

console.log('');
console.log(`Steps: ${Object.entries(stepStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`);
console.log(`VERIFY SUMMARY: required ${reqPass}/${reqTotal}, stretch ${strPass}/${strTotal}, skipped ${skipped}`);
if (failures.length === 0) {
  console.log('VERIFY RESULT: ALL REQUIRED CHECKS PASSED');
  process.exit(0);
} else {
  console.log(`VERIFY RESULT: FAILED (${failures.join(', ')})`);
  process.exit(1);
}
