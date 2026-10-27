import test from 'node:test';
import assert from 'node:assert/strict';
import { Node, Network, newIdentity, seal, open } from '../mesh.js';

function seeded(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function line(n, gwIdx, onTx) {
  const nodes = Array.from({ length: n }, (_, i) => new Node('n' + i, { gateway: i === gwIdx ? onTx : null }));
  for (let i = 0; i < n - 1; i++) nodes[i].link(nodes[i + 1]);
  return nodes;
}

test('sealed message crosses 5 hops; relays cannot read it', () => {
  const nodes = line(6, -1);
  const net = new Network();
  const body = seal(nodes[5].identity.pub, Buffer.from(JSON.stringify({ kind: 'message', text: 'meet at the market' })));
  net.inject(nodes[0], nodes[0].makePacket('sealed', body));
  assert.equal(nodes[5].inbox[0].text, 'meet at the market');
  for (let i = 0; i < 5; i++) assert.equal(nodes[i].inbox.length, 0);
});

test('payment tx reaches the gateway once and sealed receipt reaches the merchant', () => {
  const broadcasts = [];
  const nodes = line(6, 4, (tx) => broadcasts.push(tx.toString('hex')));
  const net = new Network();
  const tx = Buffer.from('deadbeef'.repeat(100), 'hex'); // stand-in for a PCZT-extracted transaction
  net.inject(nodes[0], nodes[0].makePacket('tx', tx));
  net.inject(nodes[0], nodes[0].makePacket('sealed',
    seal(nodes[5].identity.pub, Buffer.from(JSON.stringify({ kind: 'receipt', amountZat: 5000 })))));
  assert.equal(broadcasts.length, 1);
  assert.equal(nodes[5].inbox[0].amountZat, 5000);
});

test('duplicates are dropped even on a ring', () => {
  const nodes = line(4, -1); nodes[3].link(nodes[0]);
  const net = new Network();
  const pkt = nodes[0].makePacket('sealed', seal(nodes[2].identity.pub, Buffer.from('{"kind":"message"}')));
  net.inject(nodes[0], pkt);
  assert.equal(nodes[2].inbox.length, 1);
});

test('ttl bounds the range', () => {
  const nodes = line(8, -1);
  const net = new Network();
  const body = seal(nodes[7].identity.pub, Buffer.from('{"kind":"message"}'));
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
      net.inject(src, src.makePacket('sealed', seal(dst.identity.pub, Buffer.from('{"kind":"message"}'))));
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
  const blob = seal(a.pub, Buffer.from('hi'));
  assert.equal(open(b, blob), null);
  blob[blob.length - 20] ^= 1;
  assert.equal(open(a, blob), null);
});
