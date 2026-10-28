const VERSION = 1;
const KIND_TX = 1;
const KIND_SEALED = 2;
const KIND_CHUNK = 3;
const PACKET_HEADER_LEN = 1 + 1 + 1 + 16; // version, kind, ttl, 16-byte id
const CHUNK_HEADER_LEN = 4; // index (u16be) + total (u16be)
const CHUNK_OVERHEAD = PACKET_HEADER_LEN + CHUNK_HEADER_LEN;
const MAX_TOTAL = 64;
export const DEFAULT_MAX_PAYLOAD = 1200;

const KIND_CODES = { tx: KIND_TX, sealed: KIND_SEALED };
const KIND_NAMES = { [KIND_TX]: 'tx', [KIND_SEALED]: 'sealed', [KIND_CHUNK]: 'chunk' };

const ID_RE = /^[0-9a-f]{32}$/i;

function assertId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new Error('id must be a 32-char hex string (16 bytes)');
  }
  return Buffer.from(id, 'hex');
}

export function encodePacket(pkt) {
  const kindCode = KIND_CODES[pkt.kind];
  if (kindCode === undefined) throw new Error(`unknown kind: ${pkt.kind}`);
  if (!Number.isInteger(pkt.ttl) || pkt.ttl < 0 || pkt.ttl > 255) {
    throw new Error('ttl must be an integer 0-255');
  }
  if (!Buffer.isBuffer(pkt.body)) throw new Error('body must be a Buffer');
  return Buffer.concat([Buffer.from([VERSION, kindCode, pkt.ttl]), assertId(pkt.id), pkt.body]);
}

export function decodePacket(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < PACKET_HEADER_LEN) return null;
  if (buf[0] !== VERSION) return null;
  const kind = buf[1];
  if (KIND_NAMES[kind] === undefined) return null;
  const idBytes = buf.subarray(3, 3 + 16);
  if (idBytes.toString('hex').length !== 32) return null; // impossible, kept for clarity
  const id = idBytes.toString('hex');
  if (!ID_RE.test(id)) return null;
  const ttl = buf[2];
  const rest = buf.subarray(PACKET_HEADER_LEN);
  if (kind === KIND_CHUNK) {
    if (buf.length < PACKET_HEADER_LEN + CHUNK_HEADER_LEN) return null;
    const index = rest.readUInt16BE(0);
    const total = rest.readUInt16BE(2);
    if (total < 1 || total > MAX_TOTAL || index >= total) return null;
    return { id, kind: 'chunk', ttl, index, total, body: rest.subarray(CHUNK_HEADER_LEN) };
  }
  return { id, kind: KIND_NAMES[kind], ttl, body: rest };
}

export function chunk(packetBytes, maxPayload = DEFAULT_MAX_PAYLOAD) {
  if (!Buffer.isBuffer(packetBytes)) throw new Error('packetBytes must be a Buffer');
  if (!Number.isInteger(maxPayload) || maxPayload < CHUNK_OVERHEAD + 1) {
    throw new Error(`maxPayload must be an integer >= ${CHUNK_OVERHEAD + 1}`);
  }
  if (packetBytes.length < PACKET_HEADER_LEN) {
    throw new Error('packetBytes is too short to carry a packet header');
  }
  const perChunk = maxPayload - CHUNK_OVERHEAD;
  const total = Math.ceil(packetBytes.length / perChunk);
  if (total > MAX_TOTAL) {
    throw new Error(`payload needs ${total} chunks, above the limit of ${MAX_TOTAL}`);
  }
  const msgId = packetBytes.subarray(3, 3 + 16);
  const chunks = new Array(total);
  for (let index = 0; index < total; index++) {
    const start = index * perChunk;
    const payload = packetBytes.subarray(start, start + perChunk);
    const header = Buffer.alloc(CHUNK_OVERHEAD);
    header[0] = VERSION;
    header[1] = KIND_CHUNK;
    header[2] = 0;
    msgId.copy(header, 3);
    header.writeUInt16BE(index, PACKET_HEADER_LEN);
    header.writeUInt16BE(total, PACKET_HEADER_LEN + 2);
    chunks[index] = Buffer.concat([header, payload]);
  }
  return chunks;
}

function parseChunk(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < CHUNK_OVERHEAD) return null;
  if (buf[0] !== VERSION || buf[1] !== KIND_CHUNK) return null;
  const msgId = buf.subarray(3, 3 + 16);
  const index = buf.readUInt16BE(PACKET_HEADER_LEN);
  const total = buf.readUInt16BE(PACKET_HEADER_LEN + 2);
  if (total < 1 || total > MAX_TOTAL || index >= total) return null;
  const payload = buf.subarray(CHUNK_OVERHEAD);
  if (payload.length === 0) return null;
  return { msgId, index, total, payload };
}

export class Reassembler {
  constructor({ ttlMs = 10000 } = {}) {
    if (!Number.isInteger(ttlMs) || ttlMs < 0) throw new Error('ttlMs must be a non-negative integer');
    this.ttlMs = ttlMs;
    this.messages = new Map();
  }

  #prune(now) {
    for (const [key, entry] of this.messages) {
      if (now - entry.lastSeen > this.ttlMs) this.messages.delete(key);
    }
  }

  add(chunkBuf, now = Date.now()) {
    if (!Number.isFinite(now)) throw new Error('now must be a finite number');
    this.#prune(now);
    const parsed = parseChunk(chunkBuf);
    if (!parsed) return null;
    const key = parsed.msgId.toString('hex');
    let entry = this.messages.get(key);
    if (entry === undefined) {
      entry = { total: parsed.total, have: new Map(), lastSeen: now };
      this.messages.set(key, entry);
    }
    if (entry.total !== parsed.total) return null;
    entry.lastSeen = Math.max(entry.lastSeen, now);
    if (!entry.have.has(parsed.index)) {
      entry.have.set(parsed.index, parsed.payload);
    }
    if (entry.have.size < entry.total) return null;
    const parts = new Array(entry.total);
    for (let i = 0; i < entry.total; i++) parts[i] = entry.have.get(i);
    this.messages.delete(key);
    return Buffer.concat(parts);
  }
}
