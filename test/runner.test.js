// NOTE: these tests exercise the UDP runner over loopback (127.0.0.1) inside a
// single process. Proof of delivery between two devices over real (lossy)
// radio is Task 7's acceptance run, not this task.
import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { encodePacket } from '../wire.js';
import { newIdentity, seal } from '../mesh.js';
import { startDevice, loadOrCreateIdentity } from '../runner.js';

const hexId = () => randomBytes(16).toString('hex');

// Bind short-lived sockets to claim the ports we hand to each device, so the
// two devices never end up fighting over an unknown port.
function grabPorts(n) {
  const sockets = Array.from({ length: n }, () => dgram.createSocket('udp4'));
  return Promise.all(sockets.map((s) =>
    new Promise((resolve, reject) => {
      s.once('error', reject);
      s.bind(0, '127.0.0.1', () => resolve(s.address().port));
    })
  )).then((ports) => {
    for (const s of sockets) s.close();
    return ports;
  });
}

const settle = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let withTimeout = (p, ms = 5000, label = 'test timeout') => {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} after ${ms}ms`)), ms);
  });
  return Promise.race([p, guard]).finally(() => clearTimeout(timer));
};

test('delivers a 90-byte tx packet between two devices', async () => {
  const [portA, portB] = await grabPorts(2);
  const body = randomBytes(90);
  let devA, devB;
  try {
    devA = startDevice({
      port: portA,
      peers: [{ host: '127.0.0.1', port: portB }],
      identity: newIdentity(),
    });
    let deliver;
    const gotTx = new Promise((resolve) => { deliver = resolve; });
    devB = startDevice({
      port: portB,
      peers: [{ host: '127.0.0.1', port: portA }],
      identity: newIdentity(),
      onTx: (tx) => deliver(tx),
    });
    devA.send({ id: hexId(), kind: 'tx', ttl: 8, body });
    assert.deepEqual(await withTimeout(gotTx), body);
  } finally {
    devA?.close();
    devB?.close();
  }
});

test('delivers a 9000-byte tx packet between two devices', async () => {
  const [portA, portB] = await grabPorts(2);
  const body = randomBytes(9000);
  let devA, devB;
  try {
    devA = startDevice({
      port: portA,
      peers: [{ host: '127.0.0.1', port: portB }],
      identity: newIdentity(),
    });
    let deliver;
    const gotTx = new Promise((resolve) => { deliver = resolve; });
    devB = startDevice({
      port: portB,
      peers: [{ host: '127.0.0.1', port: portA }],
      identity: newIdentity(),
      onTx: (tx) => deliver(tx),
    });
    devA.send({ id: hexId(), kind: 'tx', ttl: 8, body });
    assert.deepEqual(await withTimeout(gotTx), body);
  } finally {
    devA?.close();
    devB?.close();
  }
});

test('delivers a sealed message that only the recipient opens', async () => {
  const [portA, portBob, portEve] = await grabPorts(3);
  const alice = newIdentity();
  const bob = newIdentity();
  const msg = { kind: 'message', text: 'meet at the market' };
  const bobGot = [];
  const eveGot = [];
  let devA, devBob, devEve;
  try {
    devA = startDevice({
      port: portA,
      peers: [{ host: '127.0.0.1', port: portBob }, { host: '127.0.0.1', port: portEve }],
      identity: newIdentity(),
    });
    devBob = startDevice({
      port: portBob,
      peers: [{ host: '127.0.0.1', port: portA }],
      identity: bob,
      onSealed: (m) => bobGot.push(m),
    });
    devEve = startDevice({
      port: portEve,
      peers: [{ host: '127.0.0.1', port: portA }],
      identity: newIdentity(),
      onSealed: (m) => eveGot.push(m),
    });
    devA.send({ id: hexId(), kind: 'sealed', ttl: 8, body: seal(bob.pub, Buffer.from(JSON.stringify(msg)), alice) });
    await settle();
    assert.deepEqual(bobGot, [{ ...msg, sender: alice.pub.toString('hex') }]);
    assert.deepEqual(eveGot, []);
  } finally {
    devA?.close();
    devBob?.close();
    devEve?.close();
  }
});

test('drops garbage datagrams without throwing', async () => {
  const [portA, portB] = await grabPorts(2);
  let devA, devB;
  const raw = dgram.createSocket('udp4');
  try {
    let deliver;
    const gotTx = new Promise((resolve) => { deliver = resolve; });
    devA = startDevice({
      port: portA,
      peers: [{ host: '127.0.0.1', port: portB }],
      identity: newIdentity(),
    });
    devB = startDevice({
      port: portB,
      peers: [{ host: '127.0.0.1', port: portA }],
      identity: newIdentity(),
      onTx: (tx) => deliver(tx),
    });
    const sendRaw = (buf) => new Promise((resolve, reject) =>
      raw.send(buf, portB, '127.0.0.1', (err) => (err ? reject(err) : resolve())));
    const noise = randomBytes(120);
    noise[0] = 9; // wrong version byte, deterministic reject
    const valid = encodePacket({ id: hexId(), kind: 'tx', ttl: 1, body: randomBytes(64) });
    await sendRaw(Buffer.alloc(48, 0));
    await sendRaw(noise);
    await sendRaw(valid.subarray(0, 10)); // truncated valid packet
    await settle();
    assert.equal(devB.stats.dropped, 3);
    assert.equal(devB.stats.received, 0);
    // the node must still work after being fed garbage
    const body = randomBytes(64);
    devA.send({ id: hexId(), kind: 'tx', ttl: 8, body });
    assert.deepEqual(await withTimeout(gotTx), body);
  } finally {
    devA?.close();
    devB?.close();
    raw.close();
  }
});

test('ignores a duplicate tx and calls onTx once', async () => {
  const [portA, portB] = await grabPorts(2);
  let devA, devB;
  try {
    const received = [];
    devA = startDevice({
      port: portA,
      peers: [{ host: '127.0.0.1', port: portB }],
      identity: newIdentity(),
    });
    devB = startDevice({
      port: portB,
      peers: [{ host: '127.0.0.1', port: portA }],
      identity: newIdentity(),
      onTx: (tx) => received.push(tx),
    });
    // 2600 bytes forces chunking, so the duplicate also stresses chunk
    // reassembly plus the carrier's seen-set dedupe.
    const body = randomBytes(2600);
    const pkt = { id: hexId(), kind: 'tx', ttl: 8, body };
    devA.send(pkt);
    devA.send(pkt); // identical duplicate
    await settle();
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], body);
  } finally {
    devA?.close();
    devB?.close();
  }
});

test('persists the identity file with mode 0600 and reuses it across runs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zmesh-ident-'));
  try {
    const file = path.join(dir, 'nested', 'device.id');
    const first = loadOrCreateIdentity(file);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    const second = loadOrCreateIdentity(file);
    assert.deepEqual(second.pub, first.pub);
    assert.equal(second.privateKey.type, 'private');
    assert.equal(second.publicKey.type, 'public');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a corrupt identity file instead of silently rotating keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zmesh-ident-'));
  try {
    const file = path.join(dir, 'device.id');
    fs.writeFileSync(file, '{"nope":true}\n', { mode: 0o600 });
    assert.throws(() => loadOrCreateIdentity(file), /missing key material/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('retransmits a packet sent long after the device started', async () => {
  const [pa, pb] = await grabPorts(2);
  const a = startDevice({
    port: pa, peers: [{ host: '127.0.0.1', port: pb }], identity: newIdentity(),
    retransmitRounds: 3, retransmitMs: 30,
  });
  try {
    await settle(300); // well past the first 3 rounds counted from startup
    const before = a.stats.sent;
    a.send({ kind: 'tx', body: Buffer.from('late payment') });
    await settle(300);
    // one initial transmit + 3 retransmit rounds to the single peer
    assert.equal(a.stats.sent - before, 4, 'late send must still get its retransmit rounds');
  } finally {
    a.close();
  }
});
