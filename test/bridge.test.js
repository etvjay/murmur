// Bridge tests. The "stub" tests exercise bridge.js against a tiny fake devtool
// shell script that records its arguments and emits canned bytes — it never
// touches key material, wallet databases, or the network. The end-to-end test
// shells out to the real zcash-devtool and only runs when ZMESH_E2E=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildOfflineTx, broadcastTx, BridgeError, PolicyDenied } from '../bridge.js';

const STUB_TXID = 'ab'.repeat(32);

function makeStub({ failAt } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zmesh-stub-'));
  const log = path.join(dir, 'invocations.log');
  const whoami = path.join(dir, 'wallet'); // served as walletDir in the test
  fs.mkdirSync(whoami);
  const idFile = path.join(dir, 'id.age');
  fs.writeFileSync(idFile, 'stub identity placeholder (no key material)\n');
  let script = '#!/bin/sh\necho "$@" >> "' + log + '"\n';
  script += 'step=""\nfor a in "$@"; do case "$a" in create|prove|sign|combine|extract|send-without-storing) if [ -z "$step" ]; then step="$a"; fi;; esac; done\n';
  if (failAt) {
    script += 'if [ "$step" = "' + failAt + '" ]; then echo "stub: ' + failAt + ' failed" >&2; exit 1; fi\n';
  }
  // Emulate the real tool's IO contract: binary PCZT out for the producing
  // steps (respecting --output), a bare txid for extract, and
  // "Sending transaction..." + txid for send-without-storing.
  script += 'out=""; prev=""; for a in "$@"; do if [ "$prev" = "--output" ]; then out="$a"; fi; prev="$a"; done\n';
  script += 'case "$step" in\n';
  script += '  create|prove|sign|combine) if [ -n "$out" ]; then printf stub-pczt > "$out"; else printf stub-pczt; fi;;\n';
  // `extract --raw` (local devtool patch): raw tx bytes on stdout, txid on stderr.
  script += '  extract) cat > /dev/null; echo ' + STUB_TXID + ' >&2; printf stub-rawtx;;\n';
  script += '  send-without-storing) cat > /dev/null; printf "Sending transaction...\\n";;\n';
  script += '  *) exit 64;;\n';
  script += 'esac\n';
  const devtool = path.join(dir, 'stub-devtool');
  fs.writeFileSync(devtool, script);
  fs.chmodSync(devtool, 0o755);
  return { devtool, idFile, log, walletDir: whoami, dir };
}

const stubPolicy = {
  maxPerPaymentZat: 10000, maxOfflineTotalZat: 20000, spentZat: 5000, minExpiryHeight: 100,
};
const stubArgs = {
  address: 'ztestsapling1stubaddress00000000000000000000000000000000000000000000000000000',
  valueZat: 1000,
};

test('stub: runs create, prove, sign, combine, extract in order', async () => {
  const stub = makeStub();
  try {
    const out = await buildOfflineTx({
      devtool: stub.devtool, walletDir: stub.walletDir, identityFile: stub.idFile,
      ...stubArgs, policy: stubPolicy, spentZat: 5000,
    });
    assert.ok(out.tx instanceof Buffer, 'tx must be a Buffer');
    assert.ok(out.tx.length > 0, 'tx must not be empty');
    // The mesh must carry the public raw transaction, never the PCZT (which can hold
    // viewing keys, note plaintexts and derivation paths).
    assert.equal(out.tx.toString(), 'stub-rawtx');
    assert.equal(out.txid, STUB_TXID);
    assert.equal(out.policyHash.length, 64);
    const log = fs.readFileSync(stub.log, 'utf8');
    assert.match(log, /extract --raw/);
    const steps = log.split('\n').map((l) => {
      const tokens = l.split(' ');
      const known = ['create', 'prove', 'sign', 'combine', 'extract', 'send-without-storing'];
      return tokens.find((t) => known.includes(t));
    }).filter(Boolean);
    assert.deepEqual(steps, ['create', 'prove', 'sign', 'combine', 'extract']);
  } finally {
    fs.rmSync(stub.dir, { recursive: true, force: true });
  }
});

test('stub: does not invoke devtool when policy denies', async () => {
  const stub = makeStub();
  const log = stub.log;
  try {
    await assert.rejects(
      () => buildOfflineTx({
        devtool: stub.devtool, walletDir: stub.walletDir, identityFile: stub.idFile,
        // 30000 zat clears the per-payment limit (10000) so the denial comes
        // from both the per-payment cap and the offline-total cap.
        ...stubArgs, valueZat: 30000, policy: stubPolicy, spentZat: 0,
      }),
      (err) => err instanceof PolicyDenied && err.reasons.length > 0
    );
    assert.ok(!fs.existsSync(log), 'stub devtool script must not have been run');
  } finally {
    fs.rmSync(stub.dir, { recursive: true, force: true });
  }
});

test('stub: throws BridgeError naming the failing step', async () => {
  const stub = makeStub({ failAt: 'sign' });
  try {
    try {
      await buildOfflineTx({
        devtool: stub.devtool, walletDir: stub.walletDir, identityFile: stub.idFile,
        ...stubArgs, policy: stubPolicy, spentZat: 5000,
      });
      assert.fail('expected buildOfflineTx to reject');
    } catch (err) {
      assert.ok(err instanceof BridgeError);
      assert.match(err.message, /sign/);
      assert.match(err.message, /stub: sign failed/);
    }
  } finally {
    fs.rmSync(stub.dir, { recursive: true, force: true });
  }
});

test('stub: BridgeError carries the failing step and stderr', async () => {
  const stub = makeStub({ failAt: 'create' });
  try {
    try {
      await buildOfflineTx({
        devtool: stub.devtool, walletDir: stub.walletDir, identityFile: stub.idFile,
        ...stubArgs, policy: stubPolicy, spentZat: 5000,
      });
      assert.fail('expected buildOfflineTx to reject');
    } catch (err) {
      assert.ok(err instanceof BridgeError);
      assert.equal(err.step, 'create');
      assert.match(err.stderr, /create failed/);
      assert.match(err.message, /create/);
    }
  } finally {
    fs.rmSync(stub.dir, { recursive: true, force: true });
  }
});

test('stub: broadcastTx sends the raw tx with --raw and echoes the txid it was given', async () => {
  const stub = makeStub();
  try {
    const { txid } = await broadcastTx({
      devtool: stub.devtool, walletDir: stub.walletDir, tx: Buffer.from('stub-rawtx'), txid: STUB_TXID,
    });
    assert.equal(txid, STUB_TXID);
    const log = fs.readFileSync(stub.log, 'utf8');
    assert.match(log, /send-without-storing/);
    assert.match(log, /--raw/);
    assert.match(log, /-s zecrocks/);
    assert.match(log, /-w /);
  } finally {
    fs.rmSync(stub.dir, { recursive: true, force: true });
  }
});

test('stub: broadcastTx failure surfaces a BridgeError naming the step', async () => {
  const stub = makeStub({ failAt: 'send-without-storing' });
  try {
    try {
      await broadcastTx({ devtool: stub.devtool, walletDir: stub.walletDir, tx: Buffer.from('x') });
      assert.fail('expected broadcastTx to reject');
    } catch (err) {
      assert.ok(err instanceof BridgeError);
      assert.equal(err.step, 'send-without-storing');
      assert.match(err.message, /send-without-storing/);
    }
  } finally {
    fs.rmSync(stub.dir, { recursive: true, force: true });
  }
});

test('real devtool builds a tx (ZMESH_E2E=1 only)', { skip: !process.env.ZMESH_E2E ? 'set ZMESH_E2E=1 with the e2e env vars to run' : false }, async () => {
  const { ZMESH_E2E_DEVTOOL, ZMESH_E2E_WALLET, ZMESH_E2E_IDENTITY, ZMESH_E2E_ADDRESS } = process.env;
  assert.ok(ZMESH_E2E_DEVTOOL && ZMESH_E2E_WALLET && ZMESH_E2E_IDENTITY && ZMESH_E2E_ADDRESS, 'run scripts/e2e-env.sh first or export ZMESH_E2E_*');
  const result = await buildOfflineTx({
    devtool: ZMESH_E2E_DEVTOOL, walletDir: ZMESH_E2E_WALLET, identityFile: ZMESH_E2E_IDENTITY,
    address: ZMESH_E2E_ADDRESS, valueZat: 1000,
    policy: { maxPerPaymentZat: 1000, maxOfflineTotalZat: 1000, spentZat: 0, minExpiryHeight: 0 },
    spentZat: 0,
  });
  assert.ok(Buffer.isBuffer(result.tx));
  assert.match(result.policyHash, /^[0-9a-f]{64}$/);
});
