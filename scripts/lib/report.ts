import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type CheckStatus = 'PASS' | 'FAIL';
export interface CheckResult {
  id: string;
  status: CheckStatus;
  detail: string;
}

/** Collects per-requirement check results, prints them and writes them for `verify`. */
export class Reporter {
  private results: CheckResult[] = [];
  constructor(private readonly name: string) {}

  pass(id: string, detail: string): void {
    this.results.push({ id, status: 'PASS', detail });
    console.log(`CHECK ${id} PASS ${detail}`);
  }

  fail(id: string, detail: string): void {
    this.results.push({ id, status: 'FAIL', detail });
    console.log(`CHECK ${id} FAIL ${detail}`);
  }

  check(id: string, ok: boolean, detail: string): boolean {
    if (ok) this.pass(id, detail);
    else this.fail(id, detail);
    return ok;
  }

  info(msg: string): void {
    console.log(msg);
  }

  finish(): never {
    const dir = path.resolve('artifacts', 'verify');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `check-${this.name}.json`), JSON.stringify({ results: this.results }, null, 2));
    const failed = this.results.filter((r) => r.status === 'FAIL').length;
    console.log(`check:${this.name}: ${this.results.length - failed} passed, ${failed} failed`);
    process.exit(failed > 0 || this.results.length === 0 ? 1 : 0);
  }
}
