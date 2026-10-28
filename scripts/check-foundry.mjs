#!/usr/bin/env node
// Control-plane consistency check. Fails (exit 1) when the ledgers, the evidence manifest or the
// documents disagree with the repository:
//  - claims.jsonl / gaps.jsonl parse, have unique ids and required fields, and use known vocabularies;
//  - every evidence path named in a claim, a gap or the manifest exists;
//  - a claim's state is never weaker than its required_state;
//  - state.json's open-gap counts match gaps.jsonl;
//  - every relative link in a tracked Markdown file resolves.
// Zero dependencies. Run from anywhere: `node scripts/check-foundry.mjs`.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (msg) => problems.push(msg);

const STATE_RANK = { NOT_CLAIMED: 0, IMPLEMENTED: 1, SIMULATED: 2, TESTED: 3, LIVE_TESTNET: 4 };
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const GAP_STATUS = ['OPEN', 'CLOSURE_DEFINED', 'ACCEPTED_LIMIT', 'CLOSED'];
const CLAIM_FIELDS = ['id', 'claim', 'category', 'state', 'required_state', 'evidence', 'limitations'];
const GAP_FIELDS = ['id', 'title', 'severity', 'class', 'surface', 'status', 'expected', 'observed', 'evidence', 'closure'];

function readJsonl(rel) {
  const file = path.join(root, rel);
  if (!existsSync(file)) { fail(`${rel}: missing`); return []; }
  const rows = [];
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try { rows.push(JSON.parse(line)); } catch (e) { fail(`${rel}:${i + 1}: invalid JSON (${e.message})`); }
  });
  return rows;
}
const exists = (rel) => existsSync(path.join(root, rel));

// ---- claims
const claims = readJsonl('foundry/claims.jsonl');
const seenClaims = new Set();
for (const c of claims) {
  for (const f of CLAIM_FIELDS) if (!(f in c)) fail(`claim ${c.id ?? '?'}: missing field "${f}"`);
  if (seenClaims.has(c.id)) fail(`claim ${c.id}: duplicate id`);
  seenClaims.add(c.id);
  if (!(c.state in STATE_RANK)) fail(`claim ${c.id}: unknown state "${c.state}"`);
  if (!(c.required_state in STATE_RANK)) fail(`claim ${c.id}: unknown required_state "${c.required_state}"`);
  else if (c.state in STATE_RANK && STATE_RANK[c.state] < STATE_RANK[c.required_state]) {
    fail(`claim ${c.id}: state ${c.state} is weaker than required_state ${c.required_state}`);
  }
  if (!Array.isArray(c.evidence) || c.evidence.length === 0) fail(`claim ${c.id}: needs at least one evidence path`);
  for (const e of c.evidence ?? []) if (!exists(e)) fail(`claim ${c.id}: evidence path does not exist: ${e}`);
  if (!Array.isArray(c.limitations) || c.limitations.length === 0) fail(`claim ${c.id}: needs at least one limitation`);
}

// ---- gaps
const gaps = readJsonl('foundry/gaps.jsonl');
const seenGaps = new Set();
for (const g of gaps) {
  for (const f of GAP_FIELDS) if (!(f in g)) fail(`gap ${g.id ?? '?'}: missing field "${f}"`);
  if (seenGaps.has(g.id)) fail(`gap ${g.id}: duplicate id`);
  seenGaps.add(g.id);
  if (!SEVERITIES.includes(g.severity)) fail(`gap ${g.id}: unknown severity "${g.severity}"`);
  if (!GAP_STATUS.includes(g.status)) fail(`gap ${g.id}: unknown status "${g.status}"`);
  for (const e of g.evidence ?? []) if (!exists(e)) fail(`gap ${g.id}: evidence path does not exist: ${e}`);
}

// ---- state.json counts
const stateFile = path.join(root, 'foundry/state.json');
if (!existsSync(stateFile)) fail('foundry/state.json: missing');
else {
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  const open = gaps.filter((g) => g.status === 'OPEN' || g.status === 'CLOSURE_DEFINED');
  for (const sev of SEVERITIES) {
    const key = `${sev.toLowerCase()}_open_gaps`;
    const actual = open.filter((g) => g.severity === sev).length;
    if (key in state && state[key] !== actual) fail(`state.json ${key} is ${state[key]} but gaps.jsonl has ${actual}`);
  }
  if (!(state.evidence_ceiling in STATE_RANK)) fail(`state.json: unknown evidence_ceiling "${state.evidence_ceiling}"`);
  else {
    const top = Math.max(...claims.map((c) => STATE_RANK[c.state] ?? 0));
    if (STATE_RANK[state.evidence_ceiling] > top) fail(`state.json evidence_ceiling ${state.evidence_ceiling} is above every claim's state`);
  }
}

// ---- evidence manifest paths
const manifestPath = 'docs/submission/evidence-manifest.json';
if (!exists(manifestPath)) fail(`${manifestPath}: missing`);
else {
  const manifest = JSON.parse(readFileSync(path.join(root, manifestPath), 'utf8'));
  for (const item of [...(manifest.runs ?? []), ...(manifest.findings ?? [])]) {
    for (const f of item.files ?? []) if (!exists(f)) fail(`manifest ${item.id}: file does not exist: ${f}`);
  }
}

// ---- Markdown relative links
let mdFiles = [];
try {
  mdFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => existsSync(path.join(root, f)));
} catch { /* not a git checkout: skip link checking */ }
const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
for (const rel of mdFiles) {
  const text = readFileSync(path.join(root, rel), 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const m of text.matchAll(linkRe)) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = decodeURIComponent(target.split('#')[0]);
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(path.join(root, rel)), clean);
    if (!existsSync(resolved)) fail(`${rel}: broken link -> ${target}`);
  }
}

if (problems.length) {
  console.error(`check-foundry: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check-foundry: ok (${claims.length} claims, ${gaps.length} gaps, ${mdFiles.length} markdown files checked)`);
