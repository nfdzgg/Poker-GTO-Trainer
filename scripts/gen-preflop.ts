// Expands the hand-written range text in scripts/preflop-source.ts into one
// JSON file per spot (all 169 hands, frequencies summing to 1).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { HAND_LABELS } from '../src/lib/poker/hands';
import { parseRangeOrThrow, type RangeWeights } from '../src/lib/poker/range';
import { buildSkeletons } from '../src/lib/preflop/structure';
import type { HandFrequencies, PreflopAction, SpotData } from '../src/lib/preflop/types';
import { RFI, VS_3BET, VS_OPEN } from './preflop-source';

const OUT = path.resolve('src/data/preflop');
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const errors: string[] = [];
const warnings: string[] = [];

function handsFrom(spotId: string, actionRanges: [PreflopAction, RangeWeights][], reach?: RangeWeights) {
  const hands: Record<string, HandFrequencies> = {};
  for (const label of HAND_LABELS) {
    const f: HandFrequencies = {};
    let sum = 0;
    const inRange = !reach || (reach.get(label) ?? 0) > 0;
    for (const [a, rw] of actionRanges) {
      let w = rw.get(label) ?? 0;
      if (!inRange && w > 0) {
        warnings.push(`${spotId}: ${label} listed for ${a} but not in hero's opening range; ignored`);
        w = 0;
      }
      f[a] = r3(w);
      sum += r3(w);
    }
    if (sum > 1.0005) errors.push(`${spotId}: ${label} action frequencies sum to ${sum.toFixed(3)}`);
    f.fold = r3(Math.max(0, 1 - sum));
    hands[label] = f;
  }
  return hands;
}

const spots: SpotData[] = [];
for (const sk of buildSkeletons()) {
  let hands: Record<string, HandFrequencies>;
  if (sk.type === 'rfi') {
    hands = handsFrom(sk.id, [['raise', parseRangeOrThrow(RFI[sk.hero]!)]]);
  } else if (sk.type === 'vs-open') {
    const src = VS_OPEN[`${sk.hero}-vs-${sk.villain}`];
    if (!src) throw new Error(`missing VS_OPEN ${sk.hero}-vs-${sk.villain}`);
    hands = handsFrom(sk.id, [
      ['3bet', parseRangeOrThrow(src['3bet'])],
      ['call', parseRangeOrThrow(src.call)],
    ]);
  } else {
    const src = VS_3BET[`${sk.hero}-vs-${sk.villain}`];
    if (!src) throw new Error(`missing VS_3BET ${sk.hero}-vs-${sk.villain}`);
    hands = handsFrom(
      sk.id,
      [
        ['4bet', parseRangeOrThrow(src['4bet'])],
        ['call', parseRangeOrThrow(src.call)],
      ],
      parseRangeOrThrow(RFI[sk.hero]!),
    );
  }
  spots.push({ ...sk, hands });
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(path.join(OUT, f));
for (const s of spots) {
  const { hands, ...meta } = s;
  const lines = Object.entries(hands).map(([h, f]) => `    ${JSON.stringify(h)}: ${JSON.stringify(f)}`);
  const json = `${JSON.stringify(meta, null, 2).slice(0, -2)},\n  "hands": {\n${lines.join(',\n')}\n  }\n}\n`;
  writeFileSync(path.join(OUT, `${s.id}.json`), json);
}
console.log(`wrote ${spots.length} spot files to ${path.relative(process.cwd(), OUT)}`);
