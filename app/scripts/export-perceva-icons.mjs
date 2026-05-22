#!/usr/bin/env node
/* eslint-env node */
/**
 * Rasterizes the Perceva "Topo Iris" glyph to all required app icon PNGs.
 *
 * Usage:
 *   pnpm icons
 *
 * Outputs (relative to app/):
 *   assets/images/icon.png                   1024 — main app icon (squircle)
 *   assets/images/android-icon-foreground.png 432 — adaptive foreground (glyph only)
 *   assets/images/android-icon-background.png 432 — adaptive bg solid #0E1230
 *   assets/images/android-icon-monochrome.png 432 — themed icon (white glyph)
 *   assets/images/favicon.png                   48 — web favicon (squircle)
 *   assets/images/splash-icon.png             1024 — splash screen (squircle)
 *
 * The glyph source is generated inline in `buildGlyphSvg` to keep one
 * canonical spec for both the in-app component (`<PercevaGlyph/>`) and the
 * exported assets. If you change the glyph shape, change both.
 *
 * Requires `@resvg/resvg-js` (devDependency at the repo root).
 */

import { Resolver } from 'node:dns/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

// Suppress unused warning — Resolver is here in case future versions want
// to reach a CDN; not used at runtime.
void Resolver;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_DIR = resolve(__dirname, '..');
const OUT_DIR = resolve(APP_DIR, 'assets', 'images');

// ── Gilded palette (matches PercevaGlyph 'gilded') ───────────────────
const GILDED = {
  bgA: '#1F1655',
  bgB: '#4B2FCC',
  mark: '#FFDC8F',
  markDeep: '#8A5C0F',
  accent: '#FFE3A6',
};

// Adaptive icon background — matches app.json `adaptiveIcon.backgroundColor`.
const BG_DEEP = '#0E1230';

// Same path as the in-app glyph (carved channel through the topo rings).
const PATH_D = 'M 180 720 Q 380 600 512 512 Q 644 424 844 304';

/**
 * Build a complete SVG document for one icon variant.
 *
 * Variants:
 *   'tile'        — Squircle tile (gradient) + glyph centered. App icon.
 *   'foreground'  — Glyph only, transparent bg. Android adaptive fg.
 *   'monochrome'  — White glyph paths only, transparent bg. Themed icons.
 *   'splash'      — Squircle tile + glyph, same as 'tile' (kept separate so
 *                   the splash can later have a tighter glyph if needed).
 *   'solid-bg'    — Solid color tile only, no glyph. Android adaptive bg.
 */
function buildGlyphSvg(variant) {
  if (variant === 'solid-bg') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" fill="${BG_DEEP}"/>
    </svg>`;
  }

  const isBare = variant === 'foreground' || variant === 'monochrome';
  const isMono = variant === 'monochrome';

  // Color channels — monochrome flattens to white, regular uses palette.
  const mark = isMono ? '#FFFFFF' : GILDED.mark;
  const markDeep = isMono ? '#FFFFFF' : GILDED.markDeep;
  const accent = isMono ? '#FFFFFF' : GILDED.accent;

  const defs = `
    <defs>
      ${
        !isBare
          ? `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="${GILDED.bgA}"/>
              <stop offset="1" stop-color="${GILDED.bgB}"/>
            </linearGradient>
            <radialGradient id="glow" cx="0.5" cy="0.35" r="0.7">
              <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/>
              <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
            </radialGradient>`
          : ''
      }
      <radialGradient id="pupil" cx="0.4" cy="0.4" r="0.7">
        <stop offset="0" stop-color="${mark}"/>
        <stop offset="1" stop-color="${markDeep}"/>
      </radialGradient>
      <mask id="ring-mask">
        <rect x="0" y="0" width="1024" height="1024" fill="white"/>
        <path d="${PATH_D}" fill="none" stroke="black" stroke-width="60" stroke-linecap="round"/>
      </mask>
    </defs>
  `;

  const tile = !isBare
    ? `
        <rect x="0" y="0" width="1024" height="1024" rx="${1024 * 0.225}" fill="url(#bg)"/>
        <rect x="0" y="0" width="1024" height="1024" rx="${1024 * 0.225}" fill="url(#glow)"/>
        <rect x="3" y="3" width="1018" height="1018" rx="${1024 * 0.225 - 3}"
              fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      `
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    ${defs}
    ${tile}
    <g mask="url(#ring-mask)" stroke="${accent}" fill="none" stroke-width="14">
      <circle cx="512" cy="512" r="320" opacity="0.45"/>
      <circle cx="512" cy="512" r="260" opacity="0.55"/>
      <circle cx="512" cy="512" r="200" opacity="0.7"/>
      <circle cx="512" cy="512" r="140" opacity="0.85"/>
      <circle cx="512" cy="512" r="80" opacity="1"/>
    </g>
    <path d="${PATH_D}" fill="none" stroke="${mark}" stroke-width="22" stroke-linecap="round"/>
    <circle cx="180" cy="720" r="18" fill="${mark}"/>
    <circle cx="844" cy="304" r="22" fill="${mark}"/>
    <circle cx="512" cy="512" r="38" fill="url(#pupil)"/>
  </svg>`;
}

async function rasterize(svgString, outPath, sizePx) {
  const resvg = new Resvg(svgString, {
    background: 'rgba(0,0,0,0)',
    fitTo: { mode: 'width', value: sizePx },
  });
  const pngData = resvg.render().asPng();
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, pngData);
  console.log(`  → ${outPath} (${sizePx}px)`);
}

async function main() {
  console.log('Exporting Perceva icons...');

  const tasks = [
    { variant: 'tile', file: 'icon.png', size: 1024 },
    { variant: 'tile', file: 'splash-icon.png', size: 1024 },
    { variant: 'foreground', file: 'android-icon-foreground.png', size: 432 },
    { variant: 'monochrome', file: 'android-icon-monochrome.png', size: 432 },
    { variant: 'solid-bg', file: 'android-icon-background.png', size: 432 },
    { variant: 'tile', file: 'favicon.png', size: 48 },
  ];

  for (const t of tasks) {
    const svg = buildGlyphSvg(t.variant);
    await rasterize(svg, resolve(OUT_DIR, t.file), t.size);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
