export interface Band {
  key: string;
  label: string;
  freq: number; // 0..1
  color: string; // CSS color expression, e.g. 'var(--act-call)'
}

const fmt = (f: number) => `${Math.round(f * 1000) / 10}%`;

/** Proportional horizontal bar of action frequencies for one hand. */
export function FrequencyBar({ bands, title }: { bands: Band[]; title?: string }) {
  const visible = bands.filter((b) => b.freq > 0.0005);
  const summary = bands.map((b) => `${b.label} ${fmt(b.freq)}`).join(', ');
  return (
    <figure className="freq-bar" aria-label={`${title ? `${title}: ` : ''}${summary}`} data-testid="freq-bar">
      <div className="freq-bar-track">
        {visible.map((b) => (
          <div
            key={b.key}
            className="freq-bar-seg"
            data-action={b.key}
            style={{ width: `${b.freq * 100}%`, background: b.color }}
            title={`${b.label} ${fmt(b.freq)}`}
          >
            {b.freq >= 0.12 && <span>{fmt(b.freq)}</span>}
          </div>
        ))}
      </div>
      <figcaption className="freq-bar-legend">
        {bands.map((b) => (
          <span key={b.key} className="legend-item">
            <span className="legend-swatch" style={{ background: b.color }} />
            {b.label} <strong>{fmt(b.freq)}</strong>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
