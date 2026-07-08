#!/usr/bin/env node
// Regenerate index.json from themes/. Run after validate.mjs passes.
import fs from 'node:fs';
import { validateAll, THEMES_DIR } from './lib.mjs';

const { errors, themes } = validateAll();
if (errors.length) {
  console.error('Refusing to generate index: validation failed. Run scripts/validate.mjs.');
  process.exit(1);
}

const index = {
  indexVersion: 1,
  generatedAt: new Date().toISOString(),
  themes: themes
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, manifest: m }) => ({
      id,
      name: m.name,
      author: m.author,
      version: m.version,
      ...(m.description ? { description: m.description } : {}),
      ...(m.tags?.length ? { tags: m.tags } : {}),
      variants: Object.fromEntries(
        Object.entries(m.variants).map(([key, file]) => [key, {
          theme: `${THEMES_DIR}/${id}/${file}`,
          screenshot: `${THEMES_DIR}/${id}/screenshot-${key}.png`,
        }]),
      ),
    })),
};

fs.writeFileSync('index.json', JSON.stringify(index, null, 2) + '\n');
console.log(`✓ index.json written (${index.themes.length} theme(s))`);
