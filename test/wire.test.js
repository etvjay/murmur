import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encodePacket, decodePacket, chunk, Reassembler } from '../src/wire.js';

const hexId = () => randomBytes(16).toString('hex');

test('roundtrips a 9000-byte tx packet', () => {
  const body = randomBytes(9000);
  const pkt = { id: hexId(), kind: 'tx', ttl: 5, body };
  const buf = encodePacket(pkt);

  const decoded = decodePacket(buf);
  assert.equal(decoded.id, pkt.id);
  assert.equal(decoded.kind, 'tx');
  assert.equal(decoded.ttl, 5);
  assert.deepEqual(decoded.body, body);

  const chunks = chunk(buf);
  assert.ok(chunks.length >= 8);
  for (const c of chunks) assert.ok(c.length <= 1200);

  const r = new Reassembler({});
  let out = null;
  for (const c of chunks) out = r.add(c);
  assert.deepEqual(out, buf);
  const final = decodePacket(out);
  assert.equal(final.kind, 'tx');
  assert.deepEqual(final.body, body);
});

test('reassembles chunks delivered out of order', () => {
  const body = randomBytes(4000);
  const buf = encodePacket({ id: hexId(), kind: 'sealed', ttl: 3, body });
  const chunks = chunk(buf);
  assert.ok(chunks.length > 2);
  const shuffled = [...chunks];
  // deterministic reversal is enough to prove order independence
  shuffled.reverse();

  const r = new Reassembler({ ttlMs: 10000 });
  let out = null;
  for (const c of shuffled) out = r.add(c, 1000);
  assert.deepEqual(out, buf);
});

test('ignores duplicate chunks', () => {
  const body = randomBytes(3000);
  const buf = encodePacket({ id: hexId(), kind: 'tx', ttl: 1, body });
  const chunks = chunk(buf);
  const r = new Reassembler({ ttlMs: 10000 });
  let out = null;
  for (const c of chunks) {
    out = r.add(c, 500);
    r.add(c, 500); // duplicate of the one just delivered
  }
  for (const c of chunks) r.add(c, 500); // duplicates after completion
  assert.deepEqual(out, buf);
  // entry was consumed on completion; later duplicates must not resurrect it
  assert.equal(r.add(chunks[0], 500), null);
});

test('returns null until all chunks arrive', () => {
  const body = randomBytes(2500);
  const buf = encodePacket({ id: hexId(), kind: 'sealed', ttl: 2, body });
  const chunks = chunk(buf);
  assert.ok(chunks.length >= 3);
  const r = new Reassembler({ ttlMs: 10000 });
  assert.equal(r.add(chunks[0], 100), null);
  assert.equal(r.add(chunks[2], 200), null);
  assert.deepEqual(r.add(chunks[1], 300), buf);
});

test('expires an incomplete message after ttlMs and never returns partial bytes', () => {
  const body = randomBytes(2500);
  const buf = encodePacket({ id: hexId(), kind: 'tx', ttl: 1, body });
  const chunks = chunk(buf);
  assert.ok(chunks.length >= 3);
  const ttlMs = 10000;
  const r = new Reassembler({ ttlMs });
  assert.equal(r.add(chunks[0], 1000), null);
  assert.equal(r.add(chunks[1], 1000), null);
  // missing chunk arrives one tick past the ttl: expired state must be gone
  assert.equal(r.add(chunks[2], 1000 + ttlMs + 1), null);
  // re-delivery starts a fresh message; only the complete set yields bytes
  assert.equal(r.add(chunks[1], 1000 + ttlMs + 2), null);
  assert.deepEqual(r.add(chunks[0], 1000 + ttlMs + 3), buf);
});

test('decodePacket returns null for truncated and random bytes', () => {
  const valid = encodePacket({ id: hexId(), kind: 'tx', ttl: 1, body: randomBytes(64) });
  for (const cut of [0, 1, 10, 18]) {
    assert.equal(decodePacket(valid.subarray(0, cut)), null);
  }
  // random-looking bytes: keep sampling until the version byte is wrong,
  // which guarantees a deterministic reject
  for (let i = 0; i < 25; i++) {
    let garbage;
    do {
      garbage = randomBytes(20 + Math.floor(Math.random() * 120));
    } while (garbage[0] === 1);
    assert.equal(decodePacket(garbage), null);
  }
  assert.equal(decodePacket(Buffer.alloc(64, 0xff)), null);
});

test('rejects chunk totals above 64', () => {
  const buf = encodePacket({ id: hexId(), kind: 'tx', ttl: 1, body: randomBytes(9000) });
  assert.throws(() => chunk(buf, 30));
  // a forged chunk claiming total=65 must be ignored by the reassembler
  const chunks = chunk(buf);
  const forged = Buffer.concat([chunks[0].subarray(0, 21), Buffer.from([0, 65]), chunks[0].subarray(23)]);
  const r = new Reassembler({ ttlMs: 10000 });
  let out = null;
  for (const c of chunks) out = r.add(c, 1000);
  assert.equal(r.add(forged, 1000), null);
  assert.deepEqual(out, buf);
});
