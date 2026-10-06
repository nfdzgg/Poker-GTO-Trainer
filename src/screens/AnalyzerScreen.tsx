export default function AnalyzerScreen() {
  return (
    <section aria-labelledby="analyzer-title">
      <h1 id="analyzer-title">Postflop Analyzer</h1>
      <div className="panel">
        <p>
          Build a heads-up postflop spot (ranges, board, stacks and bet sizes) and solve it in your browser with a
          single-threaded WebAssembly build of postflop-solver.
        </p>
        <p className="muted">The analyzer is under construction in this build.</p>
      </div>
    </section>
  );
}
