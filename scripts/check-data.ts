// P1-DATA-01..03: validates every preflop spot file under src/data/preflop.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SpotData } from '../src/lib/preflop/types';
import { RFI_BANDS, validateInvariants, validateSpotFrequencies, validateStructure } from '../src/lib/preflop/validate';
import { Reporter } from './lib/report';

const r = new Reporter('data');
const DIR = path.resolve('src/data/preflop');
const spots: SpotData[] = [];
const parseErrors: string[] = [];
let files: string[] = [];
try {
  files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
} catch (e) {
  parseErrors.push(`cannot read ${DIR}: ${(e as Error).message}`);
}
for (const f of files) {
  try {
    const s = JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) as SpotData;
    if (`${s.id}.json` !== f) parseErrors.push(`${f}: id ${s.id} does not match file name`);
    spots.push(s);
  } catch (e) {
    parseErrors.push(`${f}: ${(e as Error).message}`);
  }
}

const st = validateStructure(spots);
r.info(`Spot count: ${st.count} (rfi ${st.perType.rfi}, vs-open ${st.perType['vs-open']}, vs-3bet ${st.perType['vs-3bet']})`);
r.info(`Per-position hero counts: ${Object.entries(st.perPosition).map(([p, n]) => `${p}=${n}`).join(' ')}`);
const e1 = [...parseErrors, ...st.errors];
r.check('P1-DATA-01', e1.length === 0, e1.length ? e1.slice(0, 10).join('; ') : `${st.count} spot files parse; all 6 positions appear as hero`);

const e2 = spots.flatMap(validateSpotFrequencies);
r.check(
  'P1-DATA-02',
  e2.length === 0 && spots.length > 0,
  e2.length ? `${e2.length} problems: ${e2.slice(0, 10).join('; ')}` : `${spots.length} spots x 169 hands; all frequencies in [0,1] and sum to 1 ±0.001`,
);

const inv = validateInvariants(spots);
for (const [p, [lo, hi]] of Object.entries(RFI_BANDS)) {
  const v = inv.rfiPercents[p as keyof typeof inv.rfiPercents];
  r.info(`RFI ${p.padEnd(3)} raise ${v === undefined ? 'n/a' : `${v.toFixed(2)}%`} (band ${lo}-${hi}%)`);
}
r.check(
  'P1-DATA-03',
  inv.errors.length === 0 && spots.length > 0,
  inv.errors.length ? inv.errors.slice(0, 10).join('; ') : 'AA never folds; 72o always folds; RFI bands and ordering hold; 3-bet AA >= 22 everywhere',
);
r.finish();
