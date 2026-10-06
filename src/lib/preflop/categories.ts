import { handClass } from '../poker/hands';

export type HandCategory =
  | 'premium'
  | 'strong-pair'
  | 'medium-pair'
  | 'small-pair'
  | 'strong-broadway'
  | 'broadway'
  | 'suited-ace-blocker'
  | 'suited-ace'
  | 'offsuit-ace'
  | 'suited-connector'
  | 'suited-gapper'
  | 'suited-high-card'
  | 'offsuit-connector'
  | 'offsuit-high-card'
  | 'trash';

export const CATEGORY_LABELS: Record<HandCategory, string> = {
  premium: 'a premium hand',
  'strong-pair': 'a strong pocket pair',
  'medium-pair': 'a medium pocket pair',
  'small-pair': 'a small pocket pair',
  'strong-broadway': 'a strong broadway hand',
  broadway: 'a broadway hand',
  'suited-ace-blocker': 'a suited wheel ace (ace blocker)',
  'suited-ace': 'a suited ace',
  'offsuit-ace': 'an offsuit ace',
  'suited-connector': 'a suited connector',
  'suited-gapper': 'a suited gapper',
  'suited-high-card': 'a suited king or queen',
  'offsuit-connector': 'an offsuit connector',
  'offsuit-high-card': 'an offsuit high-card hand',
  trash: 'a weak, disconnected hand',
};

const A = 12;
const K = 11;
const Q = 10;
const T = 8;

export function categorize(label: string): HandCategory {
  const h = handClass(label);
  const { high, low, kind } = h;
  if (kind === 'pair') {
    if (high >= Q) return 'premium';
    if (high >= T) return 'strong-pair';
    if (high >= 4) return 'medium-pair'; // 66-99
    return 'small-pair';
  }
  if (high === A && low === K) return 'premium';
  const suited = kind === 'suited';
  if (high === A) {
    if (low >= T) return 'strong-broadway';
    if (suited) return low <= 3 ? 'suited-ace-blocker' : 'suited-ace';
    return 'offsuit-ace';
  }
  if (low >= T) {
    // KQ, KJ, KT, QJ, QT, JT
    if (high === K && low === Q && suited) return 'strong-broadway';
    return 'broadway';
  }
  const gap = high - low;
  if (suited) {
    if (gap === 1 && high <= 9) return 'suited-connector';
    if (gap <= 3 && high <= 9 && low >= 1) return 'suited-gapper';
    if (high === K || high === Q) return 'suited-high-card';
    if (gap <= 2) return 'suited-gapper';
    return 'trash';
  }
  if (gap === 1 && low >= 3) return 'offsuit-connector';
  if (high >= Q && low >= 5) return 'offsuit-high-card';
  if (high === 9 && low >= 7) return 'offsuit-high-card';
  return 'trash';
}
