// CLI tests run main() in-process over real UDP sockets on loopback. Payment
// tests use a stub devtool shell script (named "stub" in the test names); the
// real devtool is exercised only by the gated test in bridge.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main } from '../bin/murmur.js';

const settle = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'murmur-cli-'));

function grabPorts(n) {
  const socks = Array.from({ length: n }, () => dgram.createSocket('udp4'));
  return Promise.all(socks.map((s) => new Promise((res, rej) => {
    s.once('error', rej); s.bind(0, '127.0.0.1', () => res(s.address().port));
  }))).then((ports) => { socks.forEach((s) => s.close()); return ports; });
}

function capture() {
  const out = []; const err = [];
  return { out, err, stdout: { write: (s) => out.push(String(s)) }, stderr: { write: (s) => err.push(String(s)) } };
}
const lines = (c) => c.out.join('').split('\n').filter(Boolean);
const json = (c) => lines(c).map((l) => JSON.parse(l));

function stubDevtool(dir) {
  const log = path.join(dir, 'devtool.log');
  const script = '#!/bin/sh\necho "$@" >> "' + log + '"\n'
    + 'step=""\nfor a in "$@"; do case "$a" in create|prove|sign|combine|extract|send-without-storing) if [ -z "$step" ]; then step="$a"; fi;; esac; done\n'
    + 'out=""; prev=""; for a in "$@"; do if [ "$prev" = "--output" ]; then out="$a"; fi; prev="$a"; done\n'
    + 'case "$step" in\n'
    + '  create|prove|sign|combine) printf stub-pczt > "$out";;\n'
    + '  extract) cat > /dev/null; echo ' + 'cd'.repeat(32) + ' >&2; head -c 5000 /dev/zero;;\n'
    + '  send-without-storing) cat > /dev/null; echo "Sending transaction...";;\n'
    + '  *) exit 64;;\nesac\n';
  const file = path.join(dir, 'stub-devtool');
  fs.writeFileSync(file, script, { mode: 0o755 });
  return { file, log };
}

test('pubkey prints 64 hex chars and is stable across calls', async () => {
  const dir = tmp(); const id = path.join(dir, 'id.json');
  const a = capture(); const b = capture();
  assert.equal(await main(['pubkey', '--identity', id], a), 0);
  assert.equal(await main(['pubkey', '--identity', id], b), 0);
  assert.match(a.out.join('').trim(), /^[0-9a-f]{64}$/);
  assert.equal(a.out.join(''), b.out.join(''));
});

test('unknown command exits 1 with usage on stderr', async () => {
  const c = capture();
  assert.equal(await main(['bogus'], c), 1);
  assert.match(c.err.join(''), /usage/i);
});

test('stub: pay exits 2 and names the reasons when policy denies, without running devtool', async () => {
  const dir = tmp(); const { file, log } = stubDevtool(dir);
  const c = capture();
  const code = await main([
    'pay', '--to', 'ztestsapling1abc', '--amount', '500000', '--recipient-pub', 'ab'.repeat(32),
    '--peer', '127.0.0.1:9', '--identity', path.join(dir, 'id.json'), '--wallet', dir,
    '--wallet-key', path.join(dir, 'k'), '--devtool', file, '--max-per-payment', '100000',
  ], c);
  assert.equal(code, 2);
  assert.match(c.err.join(''), /over-per-payment-limit/);
  assert.equal(fs.existsSync(log), false, 'devtool must not run after a denial');
});

test('msg reaches a listener, which prints it and acks; sender prints the ack', async () => {
  const dir = tmp(); const [pl, ps] = await grabPorts(2);
  const listenId = path.join(dir, 'l.json'); const sendId = path.join(dir, 's.json');
  const pub = capture(); await main(['pubkey', '--identity', listenId], pub);
  const ac = new AbortController(); const lc = capture();
  const listening = main(['listen', '--port', String(pl), '--identity', listenId, '--peer', `127.0.0.1:${ps}`, '--ack'], { ...lc, signal: ac.signal });
  await settle(100);
  const sc = capture();
  const code = await main([
    'msg', '--port', String(ps), '--recipient-pub', pub.out.join('').trim(), '--peer', `127.0.0.1:${pl}`,
    '--identity', sendId, '--text', 'meet at the market', '--wait-ms', '1500',
  ], sc);
  ac.abort(); await listening;
  assert.equal(code, 0);
  assert.equal(json(lc).find((m) => m.kind === 'message').text, 'meet at the market');
  assert.ok(json(sc).find((m) => m.kind === 'ack'), 'sender must print the ack');
});

test('msg without an ack times out with exit 3 but still delivers', async () => {
  const dir = tmp(); const [pl, ps] = await grabPorts(2);
  const listenId = path.join(dir, 'l.json');
  const pub = capture(); await main(['pubkey', '--identity', listenId], pub);
  const ac = new AbortController(); const lc = capture();
  const listening = main(['listen', '--port', String(pl), '--identity', listenId], { ...lc, signal: ac.signal });
  await settle(100);
  const code = await main([
    'msg', '--port', String(ps), '--recipient-pub', pub.out.join('').trim(), '--peer', `127.0.0.1:${pl}`,
    '--identity', path.join(dir, 's.json'), '--text', 'hello', '--wait-ms', '400',
  ], capture());
  await settle(100); ac.abort(); await listening;
  assert.equal(code, 3);
  assert.ok(json(lc).some((m) => m.text === 'hello'));
});

test('stub: pay sends tx + sealed receipt; gateway listener broadcasts once; merchant reads receipt', async () => {
  const dir = tmp(); const { file, log } = stubDevtool(dir); const [pm, pp] = await grabPorts(2);
  const mId = path.join(dir, 'm.json');
  const pub = capture(); await main(['pubkey', '--identity', mId], pub);
  const ac = new AbortController(); const lc = capture();
  const listening = main(['listen', '--port', String(pm), '--identity', mId, '--peer', `127.0.0.1:${pp}`, '--gateway', '--devtool', file, '--wallet', dir, '--ack'], { ...lc, signal: ac.signal });
  await settle(100);
  const code = await main([
    'pay', '--to', 'ztestsapling1abc', '--amount', '5000', '--recipient-pub', pub.out.join('').trim(),
    '--port', String(pp), '--peer', `127.0.0.1:${pm}`, '--identity', path.join(dir, 'p.json'),
    '--wallet', dir, '--wallet-key', path.join(dir, 'k'), '--devtool', file, '--wait-ms', '1500',
  ], capture());
  await settle(100); ac.abort(); await listening;
  assert.equal(code, 0);
  const out = json(lc);
  assert.equal(out.filter((m) => m.kind === 'tx').length, 1, 'one tx packet printed');
  assert.equal(out.find((m) => m.kind === 'tx').bytes, 5000);
  assert.equal(out.find((m) => m.kind === 'receipt').amountZat, 5000);
  const broadcasts = fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('send-without-storing'));
  assert.equal(broadcasts.length, 1, 'gateway broadcasts exactly once');
  assert.match(broadcasts[0], /--raw/);
});

test('stub: pay --save-tx writes the raw tx; broadcast submits it once with --raw', async () => {
  const dir = tmp(); const { file, log } = stubDevtool(dir); const [pm, pp] = await grabPorts(2);
  const pub = capture(); await main(['pubkey', '--identity', path.join(dir, 'm.json')], pub);
  const ac = new AbortController(); const lc = capture();
  const listening = main(['listen', '--port', String(pm), '--identity', path.join(dir, 'm.json'), '--peer', `127.0.0.1:${pp}`, '--ack'], { ...lc, signal: ac.signal });
  await settle(100);
  const saved = path.join(dir, 'out.tx'); const pc = capture();
  const code = await main([
    'pay', '--to', 'ztestsapling1abc', '--amount', '5000', '--recipient-pub', pub.out.join('').trim(),
    '--port', String(pp), '--peer', `127.0.0.1:${pm}`, '--identity', path.join(dir, 'p.json'),
    '--wallet', dir, '--wallet-key', path.join(dir, 'k'), '--devtool', file, '--wait-ms', '1500', '--save-tx', saved,
  ], pc);
  await settle(100); ac.abort(); await listening;
  assert.equal(code, 0);
  assert.equal(fs.statSync(saved).size, 5000);
  // Same hash printed by the sender and the receiver: evidence that the bytes crossed unchanged.
  const sentHash = json(pc).find((m) => m.kind === 'sent').sha256;
  assert.match(sentHash, /^[0-9a-f]{64}$/);
  assert.equal(json(lc).find((m) => m.kind === 'tx').sha256, sentHash);
  const bc = capture();
  assert.equal(await main(['broadcast', '--tx', saved, '--devtool', file, '--wallet', dir], bc), 0);
  const calls = fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('send-without-storing'));
  assert.equal(calls.length, 1);
  assert.match(calls[0], /--raw/);
});

test('broadcast exits 1 when the tx file is missing', async () => {
  const c = capture();
  assert.equal(await main(['broadcast', '--tx', '/nonexistent/x.tx', '--devtool', 'd', '--wallet', 'w'], c), 1);
});

test('request prints the ZIP-321 request URI for --address --amount', async () => {
  const c = capture();
  const SAP = 'ztestsapling1cvge2ycqhv40jrdgr82qd7nv8q57urzeg83nkw07e20uwzf7j4h4nm344mmrht07nhfvx5uwlnc';
  const code = await main(['request', '--address', SAP, '--amount', '25000', '--memo', 'bags at 5'], c);
  assert.equal(code, 0);
  const req = json(c).find((m) => m.kind === 'request');
  assert.equal(req.uri.startsWith(`zcash:${SAP}?amount=0.00025`), true);
  const { parse } = await import('../src/zip321.js');
  assert.equal(parse(req.uri).memo, 'bags at 5');
});

test('stub: pay accepts a zcash: URI as --to, taking the address and amount from it', async () => {
  const dir = tmp(); const { file, log } = stubDevtool(dir); const [pm, pp] = await grabPorts(2);
  const pub = capture(); await main(['pubkey', '--identity', path.join(dir, 'm.json')], pub);
  const ac = new AbortController(); const lc = capture();
  const listening = main(['listen', '--port', String(pm), '--identity', path.join(dir, 'm.json'), '--peer', `127.0.0.1:${pp}`, '--gateway', '--devtool', file, '--wallet', dir, '--ack'], { ...lc, signal: ac.signal });
  await settle(100);
  const SAP = 'ztestsapling1cvge2ycqhv40jrdgr82qd7nv8q57urzeg83nkw07e20uwzf7j4h4nm344mmrht07nhfvx5uwlnc';
  const code = await main([
    'pay', '--to', `zcash:${SAP}?amount=0.00005&memo=c3R1Yi1tZW1v`, '--recipient-pub', pub.out.join('').trim(),
    '--port', String(pp), '--peer', `127.0.0.1:${pm}`, '--identity', path.join(dir, 'p.json'),
    '--wallet', dir, '--wallet-key', path.join(dir, 'k'), '--devtool', file, '--wait-ms', '1500',
  ], capture());
  await settle(100); ac.abort(); await listening;
  assert.equal(code, 0);
  assert.equal(json(lc).find((m) => m.kind === 'receipt').amountZat, 5000, 'amount of 0.00005 ZEC parsed from the URI');
  const calls = fs.readFileSync(log, 'utf8');
  assert.match(calls, /--value 5000/, 'bridge create got the parsed zatoshis');
  assert.match(calls, /--memo /, 'URI memo reached the bridge');
});

test('pay exits 1 and explains a malformed URI', async () => {
  const dir = tmp(); const { file } = stubDevtool(dir);
  const c = capture();
  const code = await main([
    'pay', '--to', 'zcash:ztestsapling1abc?amount=1.123456789', '--amount', '5000', '--recipient-pub', 'ab'.repeat(32),
    '--peer', '127.0.0.1:9', '--identity', path.join(dir, 'id.json'), '--wallet', dir,
    '--wallet-key', path.join(dir, 'k'), '--devtool', file,
  ], c);
  assert.equal(code, 1);
  assert.match(c.err.join(''), /amount/);
});
