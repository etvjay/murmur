// Offline multi-hop carrier for Zcash payments and private messages.
// Two packet kinds:
//   "tx"     - raw shielded transaction bytes. Public on-chain anyway, so any relay may
//              read it and a node with internet (a gateway) broadcasts it.
//   "sealed" - payload encrypted to one recipient (receipt, memo, message). Relays cannot
//              read it; recipients find theirs by trial decryption, so there is no
//              recipient tag to link. Sealed boxes are AUTHENTICATED: the sender's static
//              public key is mixed into the key derivation and travels in the blob, so a
//              ciphertext not produced by the claimed sender fails the MAC.
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

const FORMAT_V2 = 0x02;
const SPK_LEN = 32, EPK_LEN = 32, NONCE_LEN = 12, TAG_LEN = 16;
const HEADER_LEN = 1 + SPK_LEN + EPK_LEN;

function kdf(ephemeral, senderStatic, spk, epk) {
  return sha(Buffer.concat([Buffer.from('zmesh-v2') /* protocol label of blob format v2; kept for wire compatibility, not a product name */, ephemeral, senderStatic, spk, epk]));
}

// seal(recipientPub, plaintext, sender) -> blob
//   blob = [0x02] [sender pub 32B] [ephemeral pub 32B] [nonce 12B] [ct] [tag 16B]
// Key mixes DH(ephemeral, recipient) and DH(sender static, recipient): only the
// holder of the claimed sender's private key can produce an openable blob.
export function seal(recipientPub, plaintext, sender) {
  if (!sender || !sender.privateKey) throw new TypeError('seal requires the sender identity (authenticated)');
  const eph = generateKeyPairSync('x25519');
  const epk = rawPub(eph.publicKey);
  const spk = sender.pub;
  const key = kdf(
    diffieHellman({ privateKey: eph.privateKey, publicKey: pubFromRaw(recipientPub) }),
    diffieHellman({ privateKey: sender.privateKey, publicKey: pubFromRaw(recipientPub) }),
    spk, epk);
  const nonce = randomBytes(12);
  const c = createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: TAG_LEN });
  const ct = Buffer.concat([c.update(plaintext), c.final()]);
  return Buffer.concat([Buffer.from([FORMAT_V2]), spk, epk, nonce, ct, c.getAuthTag()]);
}

export function open(identity, blob) {
  if (blob.length < HEADER_LEN + TAG_LEN || blob[0] !== FORMAT_V2) return null;
  const spk = blob.subarray(1, 1 + SPK_LEN);
  const epk = blob.subarray(1 + SPK_LEN, HEADER_LEN);
  const nonce = blob.subarray(HEADER_LEN, HEADER_LEN + NONCE_LEN);
  const rest = blob.subarray(HEADER_LEN + NONCE_LEN);
  const ct = rest.subarray(0, rest.length - TAG_LEN);
  const tag = rest.subarray(rest.length - TAG_LEN);
  try {
    const key = kdf(
      diffieHellman({ privateKey: identity.privateKey, publicKey: pubFromRaw(epk) }),
      diffieHellman({ privateKey: identity.privateKey, publicKey: pubFromRaw(spk) }),
      spk, epk);
    const d = createDecipheriv('chacha20-poly1305', key, nonce, { authTagLength: TAG_LEN });
    d.setAuthTag(tag);
    return { plaintext: Buffer.concat([d.update(ct), d.final()]), sender: spk };
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
      const opened = open(this.identity, pkt.body);
      if (opened) {
        let msg;
        try { msg = JSON.parse(opened.plaintext.toString()); } catch { msg = { raw: opened.plaintext.toString('base64') }; }
        if (opened.sender) msg.sender = opened.sender.toString('hex');
        this.inbox.push(msg);
      }
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
