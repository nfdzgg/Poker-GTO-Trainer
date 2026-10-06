import { ALL_SPOTS } from './spots';
import { bucketKey } from '../stats/aggregate';

export { POSITIONS, SPOT_TYPES, SPOT_TYPE_NAMES } from './types';

/** Position × spot-type buckets that exist (e.g. there is no BB raise-first-in). */
export const ALL_SPOT_BUCKETS: ReadonlySet<string> = new Set(ALL_SPOTS.map((s) => bucketKey(s.hero, s.type)));
