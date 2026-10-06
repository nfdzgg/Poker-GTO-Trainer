export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_NAMES: Record<Position, string> = {
  UTG: 'Under the Gun',
  HJ: 'Hijack',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small Blind',
  BB: 'Big Blind',
};

export const SPOT_TYPES = ['rfi', 'vs-open', 'vs-3bet'] as const;
export type SpotType = (typeof SPOT_TYPES)[number];

export const SPOT_TYPE_NAMES: Record<SpotType, string> = {
  rfi: 'Raise first in',
  'vs-open': 'Facing an open',
  'vs-3bet': 'Facing a 3-bet',
};

export type PreflopAction = 'fold' | 'call' | 'raise' | '3bet' | '4bet';

export const ACTION_LABELS: Record<PreflopAction, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  '3bet': '3-bet',
  '4bet': '4-bet',
};

/** Verb phrases used in explanations ("the chart ... 40%"). */
export const ACTION_VERBS: Record<PreflopAction, string> = {
  fold: 'folds',
  call: 'calls',
  raise: 'raises',
  '3bet': '3-bets',
  '4bet': '4-bets',
};

export const SPOT_ACTIONS: Record<SpotType, PreflopAction[]> = {
  rfi: ['raise', 'fold'],
  'vs-open': ['3bet', 'call', 'fold'],
  'vs-3bet': ['4bet', 'call', 'fold'],
};

export type HandFrequencies = Partial<Record<PreflopAction, number>>;

export interface SpotSizes {
  open: number; // the open raise size (bb)
  threeBet?: number;
  fourBet?: number;
}

export interface SpotData {
  id: string;
  type: SpotType;
  hero: Position;
  villain: Position | null;
  actions: PreflopAction[];
  heroInPosition: boolean | null; // postflop position vs villain (null for RFI)
  sizes: SpotSizes;
  pot: number; // bb in the pot when hero acts
  toCall: number; // bb hero must add to call (0 for RFI)
  heroRangeSpot: string | null; // for vs-3bet: the RFI spot hero's range comes from
  description: string;
  hands: Record<string, HandFrequencies>;
}

export function isPosition(x: string | null | undefined): x is Position {
  return !!x && (POSITIONS as readonly string[]).includes(x);
}
export function isSpotType(x: string | null | undefined): x is SpotType {
  return !!x && (SPOT_TYPES as readonly string[]).includes(x);
}

export function isRaiseFamily(a: PreflopAction): boolean {
  return a === 'raise' || a === '3bet' || a === '4bet';
}
