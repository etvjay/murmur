#!/usr/bin/env node
// zmesh CLI: listen | msg | pay | pubkey. Output is one JSON object per line on
// stdout; diagnostics go to stderr. main() returns the exit code so tests can
// run it in-process. Exit codes: 0 ok, 1 usage, 2 policy denied, 3 no ack
// before --wait-ms, 4 bridge failure.
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { seal } from './mesh.js';
import { loadOrCreateIdentity, startDevice } from './runner.js';
import { buildOfflineTx, broadcastTx, PolicyDenied, BridgeError } from './bridge.js';
import { encode as encodeRequest, parse as parseRequest } from './zip321.js';

const USAGE = `usage:
  zmesh request --address ADDR --amount ZAT [--memo TEXT]
  zmesh pubkey --identity FILE
  zmesh pubkey --identity FILE
  zmesh listen --port N --identity FILE [--peer HOST:PORT ...] [--ack]
               [--gateway --devtool PATH --wallet DIR [--server NAME]]
  zmesh msg    --recipient-pub HEX --peer HOST:PORT --identity FILE --text TEXT
               [--port N] [--wait-ms N]
  zmesh broadcast --tx FILE --devtool PATH --wallet DIR [--server NAME]
  zmesh pay    --to ADDRESS --amount ZAT --recipient-pub HEX --peer HOST:PORT
               --identity FILE --wallet DIR --wallet-key FILE --devtool PATH
               [--port N] [--message TEXT] [--wait-ms N] [--save-tx FILE]
               [--max-per-payment ZAT] [--max-offline-total ZAT] [--spent ZAT]
               [--account UUID]   (needed when the wallet has more than one account)
  Testnet only. --identity is the mesh key; --wallet-key is the wallet's age identity.`;

const OPTIONS = {
  port: { type: 'string' }, identity: { type: 'string' }, peer: { type: 'string', multiple: true },
  ack: { type: 'boolean' }, gateway: { type: 'boolean' }, devtool: { type: 'string' },
  wallet: { type: 'string' }, 'wallet-key': { type: 'string' }, server: { type: 'string' }, account: { type: 'string' },
  'recipient-pub': { type: 'string' }, text: { type: 'string' }, to: { type: 'string' },
  amount: { type: 'string' }, message: { type: 'string' }, 'wait-ms': { type: 'string' },
  'max-per-payment': { type: 'string' }, 'max-offline-total': { type: 'string' }, spent: { type: 'string' },
  'min-expiry': { type: 'string' }, tx: { type: 'string' }, 'save-tx': { type: 'string' },
  address: { type: 'string' }, memo: { type: 'string' },
};

const HEX64 = /^[0-9a-f]{64}$/;
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const int = (v, dflt) => (v === undefined ? dflt : Number(v));

function parsePeers(list = []) {
  return list.map((p) => {
    const i = p.lastIndexOf(':');
    const port = Number(p.slice(i + 1));
    if (i <= 0 || !Number.isInteger(port)) throw new Error(`bad --peer "${p}", expected HOST:PORT`);
    return { host: p.slice(0, i), port };
  });
}

function sealJson(recipientPubHex, obj, identity) {
  return seal(Buffer.from(recipientPubHex, 'hex'), Buffer.from(JSON.stringify(obj)), identity);
}

export async function main(argv, { stdout = process.stdout, stderr = process.stderr, signal } = {}) {
  const emit = (obj) => stdout.write(JSON.stringify(obj) + '\n');
  const fail = (code, msg) => { stderr.write(msg + '\n'); return code; };
  const [cmd, ...rest] = argv;
  if (!['pubkey', 'listen', 'msg', 'pay', 'broadcast', 'request'].includes(cmd)) return fail(1, USAGE);
  let v;
  try {
    v = parseArgs({ args: rest, options: OPTIONS, strict: true }).values;
  } catch (e) {
    return fail(1, `${e.message}\n${USAGE}`);
  }
  if (cmd === 'request') {
    // Merchant side of the flow: share a ZIP 321 payment request for the payer.
    try {
      const uri = encodeRequest({ address: v.address, amountZat: int(v.amount), memo: v.memo });
      emit({ kind: 'request', uri });
    } catch (e) {
      return fail(1, `${e.message}\n${USAGE}`);
    }
    return 0;
  }
  if (cmd === 'broadcast') {
    for (const k of ['tx', 'devtool', 'wallet']) if (!v[k]) return fail(1, `--${k} is required\n${USAGE}`);
    let tx;
    try { tx = fs.readFileSync(v.tx); } catch (e) { return fail(1, `cannot read --tx: ${e.message}`); }
    try {
      await broadcastTx({ devtool: v.devtool, walletDir: v.wallet, tx, server: v.server });
    } catch (e) {
      return fail(4, e.message);
    }
    emit({ kind: 'broadcast', ok: true, bytes: tx.length, sha256: sha256(tx) });
    return 0;
  }
  if (!v.identity) return fail(1, `--identity is required\n${USAGE}`);
  let identity;
  try { identity = loadOrCreateIdentity(v.identity); } catch (e) { return fail(1, e.message); }
  const myPub = identity.pub.toString('hex');
  if (cmd === 'pubkey') { stdout.write(myPub + '\n'); return 0; }

  let peers;
  try { peers = parsePeers(v.peer); } catch (e) { return fail(1, e.message); }
  const port = int(v.port, 0);

  if (cmd === 'listen') {
    if (v.gateway && !(v.devtool && v.wallet)) return fail(1, '--gateway needs --devtool and --wallet');
    let device;
    const onSealed = (msg) => {
      emit(msg);
      // Ack messages and receipts back to the sender, never acks (no ack loops).
      if (v.ack && (msg.kind === 'message' || msg.kind === 'receipt') && HEX64.test(msg.from ?? '')) {
        device.send({ kind: 'sealed', body: sealJson(msg.from, { kind: 'ack', of: msg.kind, from: myPub }, identity) });
      }
    };
    const onTx = (body) => {
      emit({ kind: 'tx', bytes: body.length, sha256: sha256(body) });
      if (!v.gateway) return;
      broadcastTx({ devtool: v.devtool, walletDir: v.wallet, tx: body, server: v.server })
        .then(() => emit({ kind: 'broadcast', ok: true }))
        .catch((e) => stderr.write(`broadcast failed: ${e.message}\n`));
    };
    device = startDevice({ port, peers, identity, onTx, onSealed });
    await new Promise((resolve) => {
      if (signal) signal.addEventListener('abort', resolve, { once: true });
      process.once('SIGINT', resolve);
    });
    device.close();
    return 0;
  }

  // msg and pay both send sealed packets to one recipient and wait for an ack.
  if (!HEX64.test(v['recipient-pub'] ?? '')) return fail(1, '--recipient-pub must be 64 hex chars');
  if (peers.length === 0) return fail(1, 'at least one --peer is required');
  const waitMs = int(v['wait-ms'], 3000);

  let txArtifact = null;
  if (cmd === 'pay') {
    for (const k of ['to', 'wallet', 'wallet-key', 'devtool']) {
      if (!v[k]) return fail(1, `--${k} is required\n${USAGE}`);
    }
    // --to accepts either a raw address (then --amount is required) or a
    // ZIP 321 request URI (address + amount + memo come from it).
    let to = v.to;
    let uriMemo;
    let valueZat = int(v.amount);
    if (v.to.startsWith('zcash:')) {
      try {
        const req = parseRequest(v.to);
        to = req.address;
        uriMemo = req.memo;
        if (v.amount === undefined) valueZat = req.amountZat;
      } catch (e) {
        return fail(1, `bad --to payment request: ${e.message}\n${USAGE}`);
      }
    }
    if (v.account !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.account)) return fail(1, '--account must be an account UUID (see `wallet list-accounts`)');
    if (!Number.isInteger(valueZat) || valueZat <= 0) return fail(1, '--amount must be a positive integer of zatoshis (or a zcash: URI with amount)');
    try {
      txArtifact = await buildOfflineTx({
        devtool: v.devtool, walletDir: v.wallet, identityFile: v['wallet-key'], address: to, valueZat,
        memo: uriMemo ?? undefined, accountId: v.account,
        policy: {
          maxPerPaymentZat: int(v['max-per-payment'], 1000000), maxOfflineTotalZat: int(v['max-offline-total'], 5000000),
          spentZat: 0, minExpiryHeight: int(v['min-expiry'], 0),
        },
        spentZat: int(v.spent, 0),
      });
      txArtifact.valueZat = valueZat;
    } catch (e) {
      if (e instanceof PolicyDenied) return fail(2, `payment denied: ${e.reasons.join(', ')}`);
      if (e instanceof BridgeError) return fail(4, e.message);
      return fail(1, e.message);
    }
  } else if (!v.text) {
    return fail(1, '--text is required\n' + USAGE);
  }

  let acked;
  const gotAck = new Promise((resolve) => { acked = resolve; });
  const device = startDevice({
    port, peers, identity,
    onSealed: (msg) => { emit(msg); if (msg.kind === 'ack') acked(true); },
  });
  try {
    const recipientPub = v['recipient-pub'];
    if (txArtifact) {
      device.send({ kind: 'tx', body: txArtifact.tx });
      if (v['save-tx']) fs.writeFileSync(v['save-tx'], txArtifact.tx);
      emit({ kind: 'sent', txid: txArtifact.txid, bytes: txArtifact.tx.length, sha256: sha256(txArtifact.tx) });
      device.send({ kind: 'sealed', body: sealJson(recipientPub, {
        kind: 'receipt', amountZat: txArtifact.valueZat, policyHash: txArtifact.policyHash, txid: txArtifact.txid, from: myPub,
      }, identity) });
      if (v.message) device.send({ kind: 'sealed', body: sealJson(recipientPub, { kind: 'message', text: v.message, from: myPub }, identity) });
    } else {
      device.send({ kind: 'sealed', body: sealJson(recipientPub, { kind: 'message', text: v.text, from: myPub }, identity) });
    }
    const timeout = new Promise((resolve) => setTimeout(() => resolve(false), waitMs));
    return (await Promise.race([gotAck, timeout])) ? 0 : 3;
  } finally {
    device.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
