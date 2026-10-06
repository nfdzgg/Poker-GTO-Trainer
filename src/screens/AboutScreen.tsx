import { SOURCE_URL } from '../lib/constants';

export function AboutScreen() {
  return (
    <section className="about prose" aria-labelledby="about-title">
      <h1 id="about-title">About</h1>
      <div className="panel">
        <h2>Study tool only</h2>
        <p>
          This app is for studying away from the table. It has no real-time assistance features: no screen reading, no
          HUD, no live hand-history import and no overlay mode. Do not use it while playing.
        </p>
      </div>
      <div className="panel">
        <h2>Where the preflop ranges come from</h2>
        <p>
          The preflop ranges are <strong>approximations of published solver charts, written by hand</strong>. They are
          not solver output. They model a 6-max cash game with 100bb effective stacks and no ante: opens of 2.5bb (3bb
          from the small blind, which plays raise-or-fold), 3-bets of about 3× in position and 4× out of position, and
          4-bets of about 2.3×.
        </p>
      </div>
      <div className="panel">
        <h2>Postflop solver</h2>
        <p>
          Postflop spots are solved in your browser by{' '}
          <a href="https://github.com/b-inary/postflop-solver" rel="noopener noreferrer" target="_blank">
            postflop-solver
          </a>{' '}
          by Wataru Inariba (AGPL-3.0), compiled to single-threaded WebAssembly, with{' '}
          <a href="https://github.com/b-inary/wasm-postflop" rel="noopener noreferrer" target="_blank">
            wasm-postflop
          </a>{' '}
          used as a reference for the wrapper. Nothing is sent to a server.
        </p>
      </div>
      <div className="panel">
        <h2>License</h2>
        <p>
          This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero
          General Public License, version 3 or later. The source code is available at{' '}
          <a href={SOURCE_URL} rel="noopener noreferrer" target="_blank">
            {SOURCE_URL}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
