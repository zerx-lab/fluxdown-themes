// Shared validation logic for fluxdown-themes.
// Zero-dependency: plain Node >= 18.
import fs from 'node:fs';
import path from 'node:path';

export const THEMES_DIR = 'themes';
export const RESERVED_IDS = new Set([
  'default', 'default-dark', 'default-light', 'midnight-blue', 'nord', 'warm-light',
]);
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const HEX_RE = /^#?(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const VARIANT_KEYS = ['dark', 'light'];
const MAX_SCREENSHOT_BYTES = 500 * 1024;
const MIN_WIDTH = 1200;
const MAX_WIDTH = 4000;
const ASPECT = 16 / 10;
const ASPECT_TOLERANCE = 0.02;

/** Parse PNG width/height from the IHDR chunk. Returns null if not a PNG. */
export function pngSize(buf) {
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(SIG)) return null;
  // First chunk must be IHDR at offset 8: length(4) type(4) width(4) height(4)
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${e.message}`);
    return null;
  }
}

function checkColors(obj, file, errors, path0 = 'colors') {
  const colors = obj?.colors;
  if (colors == null || typeof colors !== 'object') return; // optional; app falls back
  const walk = (node, p) => {
    if (typeof node === 'string') {
      if (!HEX_RE.test(node)) errors.push(`${file}: ${p} = "${node}" is not a valid hex color`);
    } else if (Array.isArray(node)) {
      if (p.endsWith('segmentPalette') && node.length > 32) {
        errors.push(`${file}: segmentPalette has ${node.length} entries (max 32)`);
      }
      node.forEach((v, i) => walk(v, `${p}[${i}]`));
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, `${p}.${k}`);
    } else {
      errors.push(`${file}: ${p} has unexpected type ${typeof node}`);
    }
  };
  walk(colors, path0);
}

/** Validate a single theme directory. Returns { errors, manifest }. */
export function validateThemeDir(dir) {
  const errors = [];
  const id = path.basename(dir);
  const manifestPath = path.join(dir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return { errors: [`${dir}: missing manifest.json`], manifest: null };
  }
  const m = readJson(manifestPath, errors);
  if (!m) return { errors, manifest: null };

  if (m.manifestVersion !== 1) errors.push(`${manifestPath}: manifestVersion must be 1`);
  if (m.id !== id) errors.push(`${manifestPath}: id "${m.id}" must equal directory name "${id}"`);
  if (typeof m.id !== 'string' || !ID_RE.test(m.id) || m.id.length < 3 || m.id.length > 40) {
    errors.push(`${manifestPath}: id must match ${ID_RE} and be 3-40 chars`);
  }
  if (RESERVED_IDS.has(m.id)) errors.push(`${manifestPath}: id "${m.id}" is reserved (built-in theme)`);
  if (typeof m.name !== 'string' || !m.name.trim() || m.name.length > 60) {
    errors.push(`${manifestPath}: name is required (1-60 chars)`);
  }
  if (typeof m.author !== 'string' || !m.author.trim() || m.author.length > 60) {
    errors.push(`${manifestPath}: author is required (1-60 chars)`);
  }
  if (typeof m.version !== 'string' || !SEMVER_RE.test(m.version)) {
    errors.push(`${manifestPath}: version must be semver x.y.z`);
  }
  if (m.description != null && (typeof m.description !== 'string' || m.description.length > 200)) {
    errors.push(`${manifestPath}: description must be a string <= 200 chars`);
  }
  if (m.tags != null) {
    if (!Array.isArray(m.tags) || m.tags.length > 8 || m.tags.some((t) => typeof t !== 'string' || t.length > 20)) {
      errors.push(`${manifestPath}: tags must be <= 8 strings of <= 20 chars`);
    }
  }

  // Variants
  const variants = m.variants;
  if (variants == null || typeof variants !== 'object' || Object.keys(variants).length === 0) {
    errors.push(`${manifestPath}: variants must contain at least one of ${VARIANT_KEYS.join('/')}`);
  } else {
    for (const [key, file] of Object.entries(variants)) {
      if (!VARIANT_KEYS.includes(key)) {
        errors.push(`${manifestPath}: unknown variant "${key}" (allowed: ${VARIANT_KEYS.join(', ')})`);
        continue;
      }
      if (typeof file !== 'string' || file.includes('/') || file.includes('\\')) {
        errors.push(`${manifestPath}: variant "${key}" file must be a bare filename inside the theme dir`);
        continue;
      }
      const themePath = path.join(dir, file);
      if (!fs.existsSync(themePath)) {
        errors.push(`${dir}: variant "${key}" references missing file ${file}`);
        continue;
      }
      const t = readJson(themePath, errors);
      if (t) {
        if (t.appearance !== key) {
          errors.push(`${themePath}: appearance "${t.appearance}" must equal variant key "${key}"`);
        }
        if (t.schemaVersion != null && typeof t.schemaVersion !== 'number') {
          errors.push(`${themePath}: schemaVersion must be a number`);
        }
        checkColors(t, themePath, errors);
      }

      // Screenshot paired with variant
      const shot = path.join(dir, `screenshot-${key}.png`);
      if (!fs.existsSync(shot)) {
        errors.push(`${dir}: missing screenshot-${key}.png (required for variant "${key}")`);
      } else {
        const buf = fs.readFileSync(shot);
        if (buf.length > MAX_SCREENSHOT_BYTES) {
          errors.push(`${shot}: ${(buf.length / 1024).toFixed(0)} KB exceeds 500 KB limit`);
        }
        const size = pngSize(buf);
        if (!size) {
          errors.push(`${shot}: not a valid PNG`);
        } else {
          if (size.width < MIN_WIDTH || size.width > MAX_WIDTH) {
            errors.push(`${shot}: width ${size.width}px out of range ${MIN_WIDTH}-${MAX_WIDTH}px`);
          }
          const ratio = size.width / size.height;
          if (Math.abs(ratio - ASPECT) > ASPECT_TOLERANCE) {
            errors.push(`${shot}: aspect ratio ${ratio.toFixed(3)} must be 16:10 (±${ASPECT_TOLERANCE})`);
          }
        }
      }
    }
  }

  // No stray files outside the allowlist
  const allowed = new Set([
    'manifest.json', 'README.md',
    ...Object.values(variants ?? {}).filter((v) => typeof v === 'string'),
    ...VARIANT_KEYS.map((k) => `screenshot-${k}.png`),
  ]);
  for (const entry of fs.readdirSync(dir)) {
    if (!allowed.has(entry)) errors.push(`${dir}: unexpected file "${entry}"`);
  }

  return { errors, manifest: m };
}

/** Validate the whole repo. Returns { errors, themes: [{ id, dir, manifest }] }. */
export function validateAll(root = '.') {
  const errors = [];
  const themes = [];
  const themesRoot = path.join(root, THEMES_DIR);
  if (!fs.existsSync(themesRoot)) return { errors, themes };
  for (const entry of fs.readdirSync(themesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      errors.push(`${THEMES_DIR}/${entry.name}: only theme directories are allowed under ${THEMES_DIR}/`);
      continue;
    }
    const dir = path.join(themesRoot, entry.name);
    const { errors: e, manifest } = validateThemeDir(dir);
    errors.push(...e);
    if (manifest) themes.push({ id: entry.name, dir, manifest });
  }
  return { errors, themes };
}
