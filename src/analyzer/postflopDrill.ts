// Postflop drill: deal a random decision node of a solved tree and a hero hand from the
// acting player's range there, then grade the answer against the solver's frequencies.
import { pickWeighted, type Rng } from '../lib/rng';
import { gradeFrequencies, type Grade } from '../lib/preflop/grading';
import type { ActionNode, HandRow, NodeView } from '../solver/types';

export interface NodeSource {
  view(history: number[]): Promise<NodeView>;
}

export interface DrillStep {
  label: string; // e.g. "BB Check", "Turn 4♣"
}

export interface PostflopDeal {
  history: number[];
  steps: DrillStep[];
  node: ActionNode;
  hand: HandRow;
}

const SUIT: Record<string, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
const R = '23456789TJQKA';

/**
 * Random walk from the root: at each decision node stop with probability `stopProb`
 * (always stop at `maxDepth` actions), otherwise follow an action sampled by the
 * range-wide frequencies; deal chance cards uniformly. Terminal lines restart.
 * Then deal a combo weighted by the acting player's range weight at that node.
 */
export async function dealPostflop(
  rng: Rng,
  source: NodeSource,
  seats: { oop: string; ip: string },
  opts: { stopProb?: number; maxDepth?: number; maxTries?: number } = {},
): Promise<PostflopDeal | null> {
  const stopProb = opts.stopProb ?? 0.45;
  const maxDepth = opts.maxDepth ?? 4;
  for (let attempt = 0; attempt < (opts.maxTries ?? 12); attempt++) {
    const history: number[] = [];
    const steps: DrillStep[] = [];
    let depth = 0;
    for (let guard = 0; guard < 40; guard++) {
      const v = await source.view(history);
      if (v.type === 'terminal') break;
      if (v.type === 'chance') {
        const card = v.possibleCards[Math.floor(rng() * v.possibleCards.length)];
        if (card === undefined) break;
        history.push(card);
        steps.push({ label: `${v.street === 'turn' ? 'Turn' : 'River'} ${R[card >> 2]}${SUIT['cdhs'[card & 3]!]}` });
        continue;
      }
      const live = v.hands.filter((h) => h.weight > 0.001);
      const canStop = live.length > 0 && v.actions.length > 1;
      if (canStop && (depth >= maxDepth || rng() < stopProb)) {
        const hand = pickWeighted(rng, live, (h) => h.weight);
        if (hand) return { history: [...history], steps, node: v, hand };
      }
      if (depth >= maxDepth) break;
      const idx = pickWeighted(rng, v.actions.map((a) => a.index), (i) => v.rangeFreqs[i] ?? 0) ?? 0;
      const a = v.actions[idx]!;
      steps.push({ label: `${v.player === 'oop' ? seats.oop : seats.ip} ${a.label}` });
      history.push(idx);
      depth++;
    }
  }
  return null;
}

export interface PostflopAnswer {
  grade: Grade;
  evLoss: number; // bb, >= 0
  bestIndex: number[];
  chosenFreq: number;
}

/** Grade with the preflop rule (best = highest frequency, acceptable >= 20%) and compute EV loss. */
export function gradePostflop(hand: HandRow, chosen: number): PostflopAnswer {
  const freqs = hand.strategy;
  const grade = gradeFrequencies(freqs, chosen);
  const max = Math.max(...freqs);
  const bestIndex = freqs.map((f, i) => (Math.abs(f - max) < 1e-9 ? i : -1)).filter((i) => i >= 0);
  const evs = hand.actionEv ?? [];
  const bestEv = evs.length ? Math.max(...evs) : 0;
  const evLoss = evs.length ? Math.max(0, bestEv - (evs[chosen] ?? bestEv)) : 0;
  return { grade, evLoss, bestIndex, chosenFreq: freqs[chosen] ?? 0 };
}
