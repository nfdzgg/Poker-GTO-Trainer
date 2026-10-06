import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Recursively list files under `dir` (relative paths with forward slashes). */
export function listFiles(dir: string, base = dir): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${n} B`;
}
