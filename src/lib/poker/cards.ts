// Card encoding follows postflop-solver: id = 4 * rank + suit,
// rank 0..12 = 2..A, suit 0..3 = clubs, diamonds, hearts, spades.

export const RANK_CHARS = '23456789TJQKA';
export const SUIT_CHARS = 'cdhs';
export type Suit = 'c' | 'd' | 'h' | 's';
export const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];
export const SUIT_NAMES: Record<Suit, string> = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };
export const SUIT_SYMBOLS: Record<Suit, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };
export const RANK_NAMES: Record<string, string> = {
  A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven',
  '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two',
};

export type CardId = number;

export function cardId(rank: number, suit: number): CardId {
  return rank * 4 + suit;
}
export function rankOf(card: CardId): number {
  return card >> 2;
}
export function suitOf(card: CardId): number {
  return card & 3;
}

/** Parse 'As', 'td', 'Th' into a card id, or null. */
export function parseCard(text: string): CardId | null {
  const t = text.trim();
  if (t.length !== 2) return null;
  const r = RANK_CHARS.indexOf(t[0]!.toUpperCase());
  const s = SUIT_CHARS.indexOf(t[1]!.toLowerCase());
  if (r < 0 || s < 0) return null;
  return cardId(r, s);
}

export function cardToString(card: CardId): string {
  return `${RANK_CHARS[rankOf(card)]}${SUIT_CHARS[suitOf(card)]}`;
}

export function cardRankChar(card: CardId): string {
  return RANK_CHARS[rankOf(card)]!;
}
export function cardSuit(card: CardId): Suit {
  return SUIT_CHARS[suitOf(card)] as Suit;
}

export function cardName(card: CardId): string {
  return `${RANK_NAMES[cardRankChar(card)]} of ${SUIT_NAMES[cardSuit(card)]}`;
}

/** All 52 cards, ordered A..2 then by suit s,h,d,c (display order). */
export const ALL_CARDS: readonly CardId[] = (() => {
  const out: CardId[] = [];
  for (let r = 12; r >= 0; r--) for (const s of [3, 2, 1, 0]) out.push(cardId(r, s));
  return out;
})();

/** Parse a board string like 'Qs7h2d' or 'Qs 7h 2d'. Returns null on bad syntax. */
export function parseBoard(text: string): CardId[] | null {
  const t = text.replace(/[\s,]+/g, '');
  if (t.length % 2 !== 0) return null;
  const out: CardId[] = [];
  for (let i = 0; i < t.length; i += 2) {
    const c = parseCard(t.slice(i, i + 2));
    if (c === null) return null;
    out.push(c);
  }
  return out;
}
