import type { ReactNode } from 'react';

/** A highlighted note inside a lesson. */
export function Callout({ title, tone = 'info', children }: { title: string; tone?: 'info' | 'key' | 'warn'; children: ReactNode }) {
  return (
    <aside className={`callout callout-${tone}`}>
      <p className="callout-title">{title}</p>
      <div className="callout-body">{children}</div>
    </aside>
  );
}
