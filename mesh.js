// Offline multi-hop carrier for Zcash payments and private messages.
// Two packet kinds:
//   "tx"     - raw shielded transaction bytes. Public on-chain anyway, so any relay may
//              read it and a node with internet (a gateway) broadcasts it.
//   "sealed" - payload encrypted to one recipient (receipt, memo, message). Relays cannot
//              read it; recipients find theirs by trial decryption, so there is no
//              recipient tag to link.
import { createHash, randomBytes, generateKeyPairSync, diffieHellman, createPublicKey,
  createPrivateKey, createCipheriv, createDecipheriv } from 'node:crypto';

const sha = (b) => createHash('sha256').update(b).digest();
const X25519_DER = Buffer.from('302a300506032b656e032100', 'hex');
const pubFromRaw = (raw) => createPublicKey({ key: Buffer.concat([X25519_DER, raw]), format: 'der', type: 'spki' });
const rawPub = (k) => k.export({ format: 'der', type: 'spki' }).subarray(-32);

export function newIdentity() {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  return { publicKey, privateKey, pub: rawPub(publicKey) };
}

function kdf(shared, epk) { return sha(Buffer.concat([Buffer.from('zmesh-v1'), shared, epk])); }

export function seal(recipientPub, plaintext) {
  const eph = generateKeyPairSync('x25519');
  const epk = rawPub(eph.publicKey);
  const key = kdf(diffieHellman({ privateKey: eph.privateKey, publicKey: pubFromRaw(recipientPub) }), epk);
  const nonce = randomBytes(12);
  const c = createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
  const ct = Buffer.concat([c.update(plaintext), c.final()]);
  return Buffer.concat([epk, nonce, ct, c.getAuthTag()]);
}

export function open(identity, blob) {
  if (blob.length < 32 + 12 + 16) return null;
  const epk = blob.subarray(0, 32), nonce = blob.subarray(32, 44);
  const ct = blob.subarray(44, blob.length - 16), tag = blob.subarray(blob.length - 16);
  try {
    const key = kdf(diffieHellman({ privateKey: identity.privateKey, publicKey: pubFromRaw(epk) }), epk);
    const d = createDecipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
  } catch { return null; }
}

export class Node {
  constructor(name, { identity = newIdentity(), gateway = null, rng = Math.random } = {}) {
    this.name = name; this.identity = identity; this.gateway = gateway; this.rng = rng;
    this.peers = new Set(); this.seen = new Set(); this.held = []; this.inbox = []; this.broadcast = []; this.forwarded = 0;
  }
  link(other) { this.peers.add(other); other.peers.add(this); }
  // Create a new packet; kind is "tx" or "sealed".
  makePacket(kind, body, { ttl = 8 } = {}) {
    const id = sha(Buffer.concat([Buffer.from(kind), body])).toString('hex').slice(0, 32);
    return { id, kind, ttl, body };
  }
  receive(pkt, net) {
    if (this.seen.has(pkt.id)) return;
    this.seen.add(pkt.id);
    if (pkt.kind === 'sealed') {
      const pt = open(this.identity, pkt.body);
      if (pt) this.inbox.push(JSON.parse(pt.toString()));
    } else if (pkt.kind === 'tx' && this.gateway) {
      this.broadcast.push(pkt.body);
      this.gateway(pkt.body);
    }
    if (pkt.ttl > 1) {
      this.forwarded++;
      const next = { ...pkt, ttl: pkt.ttl - 1 };
      this.held.push(next);
      for (const p of this.peers) net.send(this, p, next);
    }
  }
  // Store-and-forward: resend held packets to every peer. Receivers drop duplicates.
  retransmit(net) { for (const pkt of this.held) for (const p of this.peers) net.send(this, p, pkt); }
}

// Lossy simulated radio. Delivery is queued and run to quiescence, deterministic via rng.
export class Network {
  constructor({ loss = 0, rng = Math.random } = {}) { this.loss = loss; this.rng = rng; this.queue = []; this.sent = 0; }
  send(from, to, pkt) { this.sent++; if (this.rng() >= this.loss) this.queue.push([to, pkt]); }
  inject(node, pkt) { node.receive(pkt, this); this.run(); }
  // Run n extra retransmission rounds across all given nodes.
  rounds(nodes, n) { for (let i = 0; i < n; i++) { for (const nd of nodes) nd.retransmit(this); this.run(); } }
  run() { while (this.queue.length) { const [to, pkt] = this.queue.shift(); to.receive(pkt, this); } }
}
