// UDP device runner: glues the carrier (mesh.js) and the wire format (wire.js)
// onto real dgram sockets. The tests of this task run over loopback only;
// the acceptance proof between two devices over real (lossy) radio is Task 7.
import dgram from 'node:dgram';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { Node, newIdentity } from './mesh.js';
import { encodePacket, decodePacket, chunk, Reassembler, DEFAULT_MAX_PAYLOAD } from './wire.js';

const sha = (b) => createHash('sha256').update(b).digest();
const REASSEMBLE_TTL_MS = 10000;

// Load or create an x25519 identity at path. The file holds the private JWK and
// the raw public key, is written with mode 0600, and its contents are never
// printed. A corrupt file is an error, not a silent key rotation: peers that
// already know the old public key must not be orphaned.
export function loadOrCreateIdentity(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('identity path is required');
  }
  let existing = null;
  try {
    existing = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`cannot read identity file ${filePath}: ${err.message}`);
    }
  }
  if (existing === null) {
    const identity = newIdentity();
    const doc = JSON.stringify({
      jwk: identity.privateKey.export({ format: 'jwk' }),
      pub: identity.pub.toString('hex'),
    });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    try {
      fs.writeFileSync(filePath, doc + '\n', { mode: 0o600 });
      fs.chmodSync(filePath, 0o600); // in case the file existed already somehow
    } catch (err) {
      throw new Error(`cannot write identity file ${filePath}: ${err.message}`);
    }
    return identity;
  }
  let doc;
  try {
    doc = JSON.parse(existing);
  } catch {
    throw new Error(`identity file ${filePath} is not valid JSON`);
  }
  if (!doc || typeof doc.jwk !== 'object' || typeof doc.pub !== 'string') {
    throw new Error(`identity file ${filePath} is missing key material`);
  }
  let privateKey;
  try {
    privateKey = createPrivateKey({ key: doc.jwk, format: 'jwk' });
  } catch {
    throw new Error(`identity file ${filePath} has an unusable privateKey`);
  }
  const publicKey = createPublicKey(privateKey);
  const pub = Buffer.from(doc.pub, 'hex');
  if (pub.length !== 32) {
    throw new Error(`identity file ${filePath} has a malformed public key`);
  }
  return { publicKey, privateKey, pub };
}

// A device owns one UDP socket. Packets bigger than DEFAULT_MAX_PAYLOAD are
// chunked on send and reassembled on receive via wire.js; the 16-byte packet id
// is the reassembly key, so chunked and unchunked delivery dedupe identically
// in the carrier's seen-set.
export function startDevice({
  port,
  peers = [],
  identity,
  onTx = null,
  onSealed = null,
  retransmitRounds = 4,
  retransmitMs = 500,
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('port must be an integer 0-65535');
  }
  if (!identity || !identity.privateKey) {
    throw new Error('identity with an x25519 privateKey is required');
  }
  const peerAddrs = peers.map((p) => {
    if (!p || typeof p.host !== 'string' || p.host.length === 0 ||
        !Number.isInteger(p.port) || p.port < 0 || p.port > 65535) {
      throw new Error(`bad peer: expected {host, port}, got ${JSON.stringify(p)}`);
    }
    return { host: p.host, port: p.port };
  });
  const rounds = Number.isInteger(retransmitRounds) && retransmitRounds > 0
    ? retransmitRounds : 4;
  const roundMs = Number.isInteger(retransmitMs) && retransmitMs > 0
    ? retransmitMs : 500;

  const node = new Node('device', { identity });
  node.gateway = onTx ?? null; // carriers push tx bodies to the gateway hook
  const reassembler = new Reassembler({ ttlMs: REASSEMBLE_TTL_MS });
  // stats shape: {sent, received, dropped, deduped, rounds}; sent counts
  // datagrams (chunks count individually), rounds counts retransmit rounds.
  const stats = { sent: 0, received: 0, dropped: 0, deduped: 0, rounds: 0 };
  let inboxSeen = 0;

  const socket = dgram.createSocket('udp4');
  let bound = false;
  socket.on('error', (err) => {
    if (!bound) throw err; // bind failures (e.g. EADDRINUSE) must be loud
  });
  socket.bind(port, () => { bound = true; });

  function transmitTo(pkt, addr) {
    const encoded = encodePacket(pkt); // throws on malformed packets, never sends them
    if (encoded.length <= DEFAULT_MAX_PAYLOAD) {
      socket.send(encoded, addr.port, addr.host, () => {});
      stats.sent++;
      return;
    }
    const chunks = chunk(encoded, DEFAULT_MAX_PAYLOAD);
    for (const c of chunks) socket.send(c, addr.port, addr.host, () => {});
    stats.sent += chunks.length;
  }

  function transmitAll(pkt) {
    for (const addr of peerAddrs) transmitTo(pkt, addr);
  }

  // Carrier-side adapter: mesh.js hands us (fromNode, toStubNode, packet),
  // where the stub node is just a stand-in for a UDP peer address.
  const addrByStub = new Map();
  for (const addr of peerAddrs) {
    const stub = { peers: new Set() }; // Node.link mutates both ends
    addrByStub.set(stub, addr);
    node.link(stub);
  }
  const net = {
    send: (_from, toStub, pkt) => {
      const addr = addrByStub.get(toStub);
      if (addr) transmitTo(pkt, addr);
    },
  };

  function handlePacket(pkt) {
    if (node.seen.has(pkt.id)) { stats.deduped++; return; }
    stats.received++;
    node.receive(pkt, net);
    // mesh.js pushes successfully opened sealed messages to node.inbox
    if (onSealed) {
      while (inboxSeen < node.inbox.length) onSealed(node.inbox[inboxSeen++]);
    }
  }

  socket.on('message', (msg) => {
    try {
      const d = decodePacket(msg);
      if (!d) { stats.dropped++; return; }
      if (d.kind === 'chunk') {
        // Raw chunks must never reach the carrier: chunk kind repeats the
        // packet id, so it would poison the seen-set. They only join traffic
        // again once the full packet is reassembled.
        const buf = reassembler.add(msg);
        if (buf !== null) {
          const pkt = decodePacket(buf);
          if (pkt) handlePacket(pkt);
          else stats.dropped++;
        }
      } else {
        handlePacket(d);
      }
    } catch {
      stats.dropped++; // malformed held/forwarded state must never crash the node
    }
  });

  // Retransmit held packets for a bounded number of rounds to beat loss.
  let started = 0;
  const timer = setInterval(() => {
    node.retransmit(net);
    stats.rounds = ++started;
    if (started >= rounds) clearInterval(timer);
  }, roundMs);
  timer.unref?.();

  function send(pkt) {
    const body = pkt?.body;
    if (!Buffer.isBuffer(body)) throw new Error('pkt.body must be a Buffer');
    if (pkt.kind !== 'tx' && pkt.kind !== 'sealed') {
      throw new Error(`unknown kind: ${pkt.kind}`);
    }
    const kind = pkt.kind;
    const ttl = pkt.ttl ?? 8;
    const id = pkt.id ?? sha(Buffer.concat([Buffer.from(kind), body])).toString('hex').slice(0, 32);
    const norm = { id, kind, ttl, body };
    transmitAll(norm);
    // store-and-forward: remember our own send so retransmit rounds can repeat it
    if (!node.seen.has(id)) {
      node.seen.add(id);
      node.held.push({ ...norm });
    }
  }

  function close() {
    clearInterval(timer);
    try { socket.close(); } catch { /* already closed */ }
  }

  return { send, close, stats };
}
