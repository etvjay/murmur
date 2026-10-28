// Zcash bridge: assembles an offline payment from a local zcash-devtool
// wallet and broadcasts it through a lightwalletd server. The "tx" artifact
// that travels over the mesh is the final raw transaction, never the PCZT: a
// PCZT can carry the payer's viewing key, note plaintexts and derivation paths,
// which relays must not see. Stock `pczt extract` prints only the txid, so this
// relies on a local devtool patch: `pczt extract --raw` (raw tx bytes on
// stdout, txid on stderr) and `pczt send-without-storing --raw` (submit raw
// tx bytes as-is). Both are in repos/zcash-devtool/src/commands/pczt/.
//
// TESTNET ONLY: every path through this module expects a throwaway testnet
// wallet directory created by scripts/wallet-setup.sh.
import { spawn } from 'node:child_process';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { evaluatePolicy } from './policy.js';

export class PolicyDenied extends Error {
  constructor(reasons) {
    super(`payment denied by offline spend policy: ${reasons.join(', ')}`);
    this.name = 'PolicyDenied';
    this.reasons = reasons;
  }
}

export class BridgeError extends Error {
  constructor(step, stderr, cause) {
    super(`zcash-devtool ${step} failed: ${stderr}`);
    this.name = 'BridgeError';
    this.step = step;
    this.stderr = stderr;
    if (cause) this.cause = cause;
  }
}

// Run the devtool as a subprocess, optionally feeding stdin (extract and
// send-without-storing read the PCZT from stdin). stdout/stderr are collected
// as Buffers: the PCZT steps emit raw binary PCZTs on stdout, while the
// trace/log output the tool prints goes to stderr.
function run(devtool, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(devtool, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    child.stdout.on('data', (d) => { stdout = Buffer.concat([stdout, d]); });
    child.stderr.on('data', (d) => { stderr = Buffer.concat([stderr, d]); });
    child.on('error', (err) => reject({ code: 127, stderr: String(err), stdout: '' }));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr: stderr.toString() });
        return;
      }
      reject({ code, stderr: stderr.toString(), stdout: stdout.toString() });
    });
    if (input !== undefined) {
      child.stdin.on('error', () => { /* caller-side failure already surfaced */ });
      child.stdin.end(input);
    } else {
      child.stdin.end(); // EOF now: any stdin reader sees a clean empty input
    }
  });
}

const TXID_RE = /^[0-9a-f]{64}$/;

// Build the payable artifact offline without ever putting it on the network:
// create, prove, sign, combine, then extract (a pure correctness check that
// the PCZT finalizes into a transaction; it prints the txid). Policy is
// evaluated — and any denial thrown — before the first devtool invocation,
// which unit tests pin down by asserting the stub ran zero times.
export async function buildOfflineTx({ devtool, walletDir, identityFile, address, valueZat, memo, policy, spentZat }) {
  if (typeof devtool !== 'string' || devtool.length === 0) throw new TypeError('devtool path is required');
  if (typeof walletDir !== 'string' || walletDir.length === 0) throw new TypeError('walletDir is required');
  if (typeof identityFile !== 'string' || identityFile.length === 0) throw new TypeError('identityFile is required');
  if (typeof address !== 'string' || address.length === 0) throw new TypeError('address is required');
  if (!Number.isFinite(valueZat) || valueZat <= 0 || !Number.isInteger(valueZat)) throw new TypeError('valueZat must be a positive integer of zatoshis');
  if (!policy || typeof policy !== 'object') throw new TypeError('policy is required');

  // evaluatePolicy reads the running total from the policy envelope itself
  // (policy.js#L9); report an interface mismatch upstream rather than editing
  // it, so the bridge folds its own spentZat into a shallow copy.
  const decision = evaluatePolicy({ ...policy, spentZat }, {
    amountZat: valueZat,
    recipient: address,
  });
  if (!decision.allowed) throw new PolicyDenied(decision.reasons);

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'zmesh-bridge-'));
  const file = (name) => path.join(tmp, name);
  try {
    const createArgs = ['pczt', '-w', walletDir, 'create', '--address', address, '--value', String(valueZat), '--output', file('created.pczt')];
    if (memo !== undefined) createArgs.push('--memo', memo);
    await run(devtool, createArgs).catch(
      (e) => { throw new BridgeError('create', e.stderr, e); });
    // Not enough funds surfaces here as a `create` BridgeError carrying the
    // wallet's stderr; nothing below runs once any step exits nonzero.
    await run(devtool, ['pczt', '-w', walletDir, 'prove', '-i', identityFile, file('created.pczt'), '--output', file('proven.pczt')])
      .catch((e) => { throw new BridgeError('prove', e.stderr, e); });
    // Sign the PROVEN PCZT: `prove` writes the Sapling proof-generation key into the
    // PCZT, and `sign` fails with MissingProofGenerationKey on a Sapling spend without it.
    await run(devtool, ['pczt', '-w', walletDir, 'sign', '--identity', identityFile, file('proven.pczt'), '--output', file('signed.pczt')])
      .catch((e) => { throw new BridgeError('sign', e.stderr, e); });
    await run(devtool, ['pczt', 'combine', '-i', file('signed.pczt'), '-i', file('proven.pczt'), '--output', file('combined.pczt')])
      .catch((e) => { throw new BridgeError('combine', e.stderr, e); });
    const combined = await readFile(file('combined.pczt'));
    const { stdout: rawTx, stderr: extractErr } = await run(devtool, ['pczt', 'extract', '--raw'], { input: combined })
      .catch((e) => { throw new BridgeError('extract', e.stderr, e); });
    const txid = extractErr.split('\n').map((l) => l.trim()).filter(Boolean).pop();
    if (!txid || !TXID_RE.test(txid)) throw new BridgeError('extract', `no txid on stderr: ${extractErr}`);
    if (rawTx.length === 0) throw new BridgeError('extract', 'empty raw transaction');

    return { tx: rawTx, txid, policyHash: decision.policyHash };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// Submit a raw transaction (from buildOfflineTx) through a lightwalletd
// server. The txid is not recomputed here: pass the one buildOfflineTx
// returned; a gateway that only holds the bytes gets txid: null.
export async function broadcastTx({ devtool, walletDir, tx, txid = null, server = 'zecrocks' }) {
  if (typeof devtool !== 'string' || devtool.length === 0) throw new TypeError('devtool path is required');
  if (typeof walletDir !== 'string' || walletDir.length === 0) throw new TypeError('walletDir is required');
  if (!Buffer.isBuffer(tx) || tx.length === 0) throw new TypeError('tx must be a non-empty Buffer');
  await run(devtool, ['pczt', '-w', walletDir, 'send-without-storing', '--raw', '-s', server], { input: tx })
    .catch((e) => { throw new BridgeError('send-without-storing', e.stderr, e); });
  return { txid };
}
