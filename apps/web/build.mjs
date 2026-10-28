#!/usr/bin/env node
// Builds the judge page for static hosting.
//
// `index.html` is a fragment: a <title>, <style>, markup and scripts, with no <html>, <head> or <body>,
// so the same file can be published as a hosted artifact. This script wraps it in a full document
// (doctype, language, viewport, theme color, description, Open Graph tags, inline favicon) and writes
// dist/index.html. Zero dependencies.
//
//   node apps/web/build.mjs           write apps/web/dist/index.html
//   node apps/web/build.mjs --check   build in memory and validate (used by scripts/verify)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const check = process.argv.includes('--check');

const DESCRIPTION = 'Murmur carries a real shielded Zcash transaction and sealed notes between devices with no internet. Testnet evidence, stated limits and a labeled simulation.';
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%2304050E'/%3E%3Cg fill='none' stroke='%239BA6FF' stroke-width='1.8' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='3.2'/%3E%3Cpath d='M12 3v5M12 16v5M3 12h5M16 12h5'/%3E%3C/g%3E%3C/svg%3E";

export function build(source) {
  const titleMatch = source.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) throw new Error('index.html needs a <title>');
  const title = titleMatch[1].trim();
  const cut = source.indexOf('</style>');
  if (cut < 0) throw new Error('index.html needs a <style> block before the markup');
  const headRest = source
    .slice(0, cut + '</style>'.length)
    .replace(/<title>[^<]*<\/title>\s*/, '')
    .replace(/<meta name="claude:[^>]*>\s*/g, '')
    .trim();
  const body = source.slice(cut + '</style>'.length).trim();
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${title}</title>`,
    `<meta name="description" content="${DESCRIPTION}">`,
    '<meta name="theme-color" content="#04050E">',
    '<meta name="color-scheme" content="dark">',
    `<meta property="og:title" content="${title}: pay and talk when the network won't">`,
    `<meta property="og:description" content="${DESCRIPTION}">`,
    '<meta property="og:type" content="website">',
    '<meta name="twitter:card" content="summary">',
    `<link rel="icon" href="${FAVICON}">`,
    headRest,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function validate(html) {
  const problems = [];
  if (!html.startsWith('<!doctype html>')) problems.push('missing doctype');
  if ((html.match(/<title>/g) || []).length !== 1) problems.push('expected exactly one <title>');
  if (/claude:/.test(html)) problems.push('hosting-only markers (claude:) must not ship');
  for (const view of ['home', 'evidence', 'limits']) {
    if (!html.includes(`data-view="${view}"`)) problems.push(`missing view: ${view}`);
  }
  // Invariant I-17: the simulation is labeled where it is shown.
  if (!/simulation/i.test(html)) problems.push('the simulation label is missing');
  if (/lorem ipsum/i.test(html)) problems.push('placeholder text found');
  if (html.length > 400_000) problems.push(`page is larger than expected (${html.length} bytes)`);

  // Inline scripts must parse.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length === 0) problems.push('no inline scripts found');
  scripts.forEach((code, i) => {
    try { new vm.Script(code, { filename: `inline-script-${i + 1}.js` }); } catch (e) { problems.push(`inline script ${i + 1} does not parse: ${e.message}`); }
  });

  // Invariant I-16: the txids and blocks in the evidence manifest appear on the page.
  const manifestFile = path.join(repo, 'docs/submission/evidence-manifest.json');
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const run of manifest.runs ?? []) {
      const f = run.facts ?? {};
      if (f.txid && !html.includes(f.txid)) problems.push(`run ${run.id}: txid ${f.txid.slice(0, 12)}... is not on the page`);
      if (f.block && !html.includes(Number(f.block).toLocaleString('en-US'))) problems.push(`run ${run.id}: block ${f.block} is not on the page`);
    }
  }
  return problems;
}

const html = build(readFileSync(path.join(here, 'index.html'), 'utf8'));
const problems = validate(html);
if (problems.length) {
  console.error(`web build: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
if (check) {
  console.log(`web build: ok (${html.length} bytes, checked in memory)`);
} else {
  mkdirSync(path.join(here, 'dist'), { recursive: true });
  writeFileSync(path.join(here, 'dist', 'index.html'), html);
  console.log(`web build: wrote apps/web/dist/index.html (${html.length} bytes)`);
}
