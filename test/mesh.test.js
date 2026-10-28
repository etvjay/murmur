import test from 'node:test';
import assert from 'node:assert/strict';
import { Node, Network, newIdentity, seal, open } from '../mesh.js';

const msgBody = (obj) => Buffer.from(JSON.stringify(obj));

function seeded(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function line(n, gwIdx, onTx) {
  const nodes = Array.from({ length: n }, (_, i) => new Node('n' + i, { gateway: i === gwIdx ? onTx : null }));
  for (let i = 0; i < n - 1; i++) nodes[i].link(nodes[i + 1]);
  return nodes;
}

test('sealed message crosses 5 hops; relays cannot read it', () => {
  const nodes = line(6, -1);
  const net = new Network();
  const body = seal(nodes[5].identity.pub, msgBody({ kind: 'message', text: 'meet at the market' }), nodes[0].identity);
  net.inject(nodes[0], nodes[0].makePacket('sealed', body));
  assert.equal(nodes[5].inbox[0].text, 'meet at the market');
  assert.equal(nodes[5].inbox[0].sender, nodes[0].identity.pub.toString('hex'));
  for (let i = 0; i < 5; i++) assert.equal(nodes[i].inbox.length, 0);
});

test('payment tx reaches the gateway once and sealed receipt reaches the merchant', () => {
  const broadcasts = [];
  const nodes = line(6, 4, (tx) => broadcasts.push(tx.toString('hex')));
  const net = new Network();
  const tx = Buffer.from('deadbeef'.repeat(100), 'hex'); // stand-in for a PCZT-extracted transaction
  net.inject(nodes[0], nodes[0].makePacket('tx', tx));
  net.inject(nodes[0], nodes[0].makePacket('sealed',
    seal(nodes[5].identity.pub, msgBody({ kind: 'receipt', amountZat: 5000 }), nodes[0].identity)));
  assert.equal(broadcasts.length, 1);
  assert.equal(nodes[5].inbox[0].amountZat, 5000);
});

test('duplicates are dropped even on a ring', () => {
  const nodes = line(4, -1); nodes[3].link(nodes[0]);
  const net = new Network();
  const pkt = nodes[0].makePacket('sealed', seal(nodes[2].identity.pub, msgBody({ kind: 'message' }), nodes[0].identity));
  net.inject(nodes[0], pkt);
  assert.equal(nodes[2].inbox.length, 1);
});

test('authenticated: genuine sealed message attributes the sender public key', () => {
  const a = newIdentity(), b = newIdentity();
  const body = seal(b.pub, msgBody({ kind: 'receipt', text: 'thanks' }), a);
  const opened = open(b, body);
  assert.ok(opened, 'message should open');
  assert.equal(opened.plaintext.toString(), '{"kind":"receipt","text":"thanks"}');
  assert.equal(opened.sender.toString('hex'), a.pub.toString('hex'));
});

test('authenticated: rejects a forged sender claiming someone elses key', () => {
  const a = newIdentity(), b = newIdentity(), mallory = newIdentity();
  const sealedByA = seal(b.pub, msgBody({ kind: 'ack' }), a);
  assert.ok(open(b, sealedByA), 'control: the genuine message from a opens');
  const sealedByMallory = seal(b.pub, msgBody({ kind: 'ack' }), mallory);
  const forged = sealedByMallory; // craft: same bytes but claiming a.pub as the sender key
  const spk = a.pub;
  const epk = forged.subarray(1, 33), nonce = forged.subarray(33, 45);
  const ct = forged.subarray(45, forged.length - 16), tag = forged.subarray(forged.length - 16);
  const reheaded = Buffer.concat([Buffer.from([0x02]), spk, epk, nonce, ct, tag]);
  assert.equal(open(b, reheaded), null, 'a ciphertext not made by a must not open');
});

test('authenticated: rejects old-format (unauthenticated) sealed packets', () => {
  // A blob from before Phase 1: epk(32) | nonce(12) | ct | tag(16), single-DH key.
  const b = newIdentity();
  const eph = newIdentity();
  const old = Buffer.concat([
    eph.pub, // epk first, no version byte, no sender key
  ]);
  const quill = Buffer.concat([old, Buffer.alloc(12), Buffer.from('x'.repeat(50)), Buffer.alloc(16)]);
  assert.equal(open(b, quill), null);
});

test('ttl bounds the range', () => {
  const nodes = line(8, -1);
  const net = new Network();
  const body = seal(nodes[7].identity.pub, Buffer.from('{"kind":"message"}'), nodes[0].identity);
  net.inject(nodes[0], nodes[0].makePacket('sealed', body, { ttl: 4 }));
  assert.equal(nodes[7].inbox.length, 0);
});

test('lossy links: redundant paths still deliver most of the time', () => {
  // 3 parallel 3-hop paths from src to dst
  const rate = (rounds) => {
    let delivered = 0; const runs = 300; const rng = seeded(42);
    for (let r = 0; r < runs; r++) {
      const src = new Node('s'), dst = new Node('d'); const all = [src, dst];
      for (let p = 0; p < 3; p++) { const a = new Node('a' + p), b = new Node('b' + p); src.link(a); a.link(b); b.link(dst); all.push(a, b); }
      const net = new Network({ loss: 0.3, rng });
      net.inject(src, src.makePacket('sealed', seal(dst.identity.pub, Buffer.from('{"kind":"message"}'), src.identity)));
      net.rounds(all, rounds);
      if (dst.inbox.length) delivered++;
    }
    return delivered / runs;
  };
  const once = rate(0), retried = rate(4);
  console.log('delivery at 30% loss: single pass', once, ', with 4 retransmit rounds', retried);
  assert.ok(once < 0.8, 'sanity: single pass is lossy');
  assert.ok(retried > 0.95, 'retransmission rate ' + retried);
});

test('tampered ciphertext and wrong recipient fail to open', () => {
  const a = newIdentity(), b = newIdentity();
  const blob = seal(a.pub, Buffer.from('hi'), a);
  assert.equal(open(b, blob), null);
  blob[blob.length - 20] ^= 1;
  assert.equal(open(a, blob), null);
});
