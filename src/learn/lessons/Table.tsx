import { Callout } from '../components/Callout';
import { SeatDiagram } from '../components/SeatDiagram';

export function TableLesson() {
  return (
    <>
      <p>
        A 6-max table has six seats. Their names describe where they sit relative to the <strong>button</strong> (the dealer
        marker, drawn as the white <strong>D</strong> disc), which moves one seat clockwise every hand. So every player plays every seat in turn.
      </p>
      <SeatDiagram order="preflop" highlight={['SB', 'BB']} caption="Seats in the order they act before the flop. The two blinds (highlighted) post forced bets." />
      <h2>The blinds</h2>
      <p>
        Before the cards are dealt, the <strong>small blind (SB)</strong> posts half a big blind and the{' '}
        <strong>big blind (BB)</strong> posts one big blind. Everything in this trainer is measured in{' '}
        <strong>big blinds (bb)</strong>, and everyone starts with <strong>100bb</strong>.
      </p>
      <h2>Who acts when</h2>
      <p>
        <strong>Preflop</strong>, the first player to act is the one to the left of the big blind: <strong>UTG</strong>{' '}
        (“under the gun”), then the <strong>hijack (HJ)</strong>, <strong>cutoff (CO)</strong>, <strong>button (BTN)</strong>,
        small blind and finally the big blind.
      </p>
      <p>
        <strong>After the flop</strong>, the order changes: the small blind acts first, then the big blind, then UTG … and the
        button always acts <strong>last</strong>.
      </p>
      <SeatDiagram order="postflop" highlight={['BTN']} caption="After the flop the blinds act first and the button acts last." />
      <Callout title="Why position matters" tone="key">
        Acting last (being <strong>in position</strong>) means you see what your opponent does before you decide, on every
        street. That information is worth a lot, so players in late seats can profitably play more hands — and the blinds,
        who are out of position after the flop, need better hands or a better price.
      </Callout>
    </>
  );
}
