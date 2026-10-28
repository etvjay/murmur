#!/usr/bin/env node
// Secret scan over every file git would commit (tracked or untracked-but-not-ignored).
// Fails (exit 1) on key material or on a path that should never be committed.
// It is a guard, not a proof: it looks for the shapes of secrets this project handles
// (age identities, PEM private keys, JWK private scalars) and for wallet and identity paths.
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(Boolean);

const CONTENT = [
  ['age identity', /AGE-SECRET-KEY-1[A-Z0-9]{20,}/],
  ['PEM private key', /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
  ['JWK private scalar', /"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/],
  ['seed phrase label with words', /(?:mnemonic|seed phrase)\s*[:=]\s*["']?(?:[a-z]{3,8}\s+){11,}[a-z]{3,8}/i],
];
const BAD_PATHS = [/(^|\/)wallets\//, /(^|\/)dev-key/, /\.identity$/, /\.key$/, /(^|\/)\.env$/];
const SELF = 'scripts/scan-secrets.mjs';

const hits = [];
for (const rel of files) {
  if (BAD_PATHS.some((re) => re.test(rel))) hits.push(`${rel}: path must not be committed`);
  if (rel === SELF) continue;
  const abs = path.join(root, rel);
  let size = 0;
  try { size = statSync(abs).size; } catch { continue; }
  if (size > 5_000_000) continue;
  let text;
  try { text = readFileSync(abs).toString('latin1'); } catch { continue; }
  for (const [label, re] of CONTENT) if (re.test(text)) hits.push(`${rel}: looks like a ${label}`);
}

if (hits.length) {
  console.error(`scan-secrets: ${hits.length} finding(s)`);
  for (const h of hits) console.error(`  - ${h}`);
  process.exit(1);
}
console.log(`scan-secrets: ok (${files.length} files scanned)`);
