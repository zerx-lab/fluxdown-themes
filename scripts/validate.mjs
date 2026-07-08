#!/usr/bin/env node
// Validate all themes. Exit 1 on any error.
import { validateAll } from './lib.mjs';

const { errors, themes } = validateAll();
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ ${themes.length} theme(s) valid: ${themes.map((t) => t.id).join(', ') || '(none)'}`);
