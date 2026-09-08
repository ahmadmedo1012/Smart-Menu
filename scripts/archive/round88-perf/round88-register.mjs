import { register } from 'node:module';

// Registers the TS resolver hook (path aliases + extensionless TS imports)
// so plain `node` can import src/lib/db.ts without a bundler.
// Usage: node --experimental-strip-types --import ./scripts/round88-perf/round88-register.mjs <script.mjs>
register('./round88-ts-resolve.mjs', import.meta.url);
