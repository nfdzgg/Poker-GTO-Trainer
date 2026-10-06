import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ALL_CARDS, cardRankChar, cardSuit, cardToString, RANK_CHARS } from '../../lib/poker/cards';
import { Chip, chipsFor } from '../Chip';
import { CardFace, PlayingCard } from '../PlayingCard';
import { SUIT_PATHS } from '../SuitIcon';

describe('SVG cards and chips', () => {
  it('UI-04 renders all 52 cards (all four suits and 13 ranks) — snapshot', () => {
    expect(ALL_CARDS).toHaveLength(52);
    const markup: Record<string, string> = {};
    for (const c of ALL_CARDS) {
      const html = renderToStaticMarkup(<CardFace card={c} />);
      const rank = cardRankChar(c);
      expect(html).toContain(`>${rank === 'T' ? '10' : rank}<`);
      expect(html).toContain(SUIT_PATHS[cardSuit(c)]);
      markup[cardToString(c)] = html;
    }
    expect(new Set(Object.keys(markup).map((k) => k[1])).size).toBe(4);
    expect(new Set(Object.keys(markup).map((k) => k[0])).size).toBe(13);
    expect(RANK_CHARS).toHaveLength(13);
    expect(markup).toMatchSnapshot();
  });

  it('UI-04 four-color deck option recolors diamonds and clubs only', () => {
    const d = ALL_CARDS.find((c) => cardToString(c) === 'Ad')!;
    const cl = ALL_CARDS.find((c) => cardToString(c) === 'Ac')!;
    const h = ALL_CARDS.find((c) => cardToString(c) === 'Ah')!;
    expect(renderToStaticMarkup(<CardFace card={d} />)).toContain('var(--suit-diamond)');
    expect(renderToStaticMarkup(<CardFace card={d} fourColor />)).toContain('var(--suit4-diamond)');
    expect(renderToStaticMarkup(<CardFace card={cl} fourColor />)).toContain('var(--suit4-club)');
    expect(renderToStaticMarkup(<CardFace card={h} fourColor />)).toContain('var(--suit-heart)');
  });

  it('UI-04 card backs and chips are original SVG components', () => {
    const { container } = render(<PlayingCard card={null} />);
    expect(container.querySelector('svg pattern')).not.toBeNull();
    expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Face-down card');
    for (const color of ['white', 'red', 'green', 'black'] as const) {
      const html = renderToStaticMarkup(<Chip color={color} />);
      expect(html).toContain('<svg');
      expect(html).toContain(`data-chip="${color}"`);
    }
    expect(chipsFor(7.5)).toEqual(['green', 'red', 'red', 'white']);
  });
});
