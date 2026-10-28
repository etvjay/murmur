import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, parse } from '../src/zip321.js';

const SAP = 'ztestsapling1cvge2ycqhv40jrdgr82qd7nv8q57urzeg83nkw07e20uwzf7j4h4nm344mmrht07nhfvx5uwlnc';
const UA = 'utest19n84cdlcpyze9zjfunqrp5znf4eqw2jj4m3semls6w5e953yk7tjs4tdweh2heag85rtvq2qfax7schzcljwyhn9qz02uguw3lmy0lj8p64cr229qtrq5hjglzxs0sgf0zje2ta6e6rq4nfj74hjxn2afxcl52ur66xhr83z9tvj3d95hkzejumym4nv5cdtmsuk45ccz7ad77te6wp';

test('encodes a payment request with amount and memo, and parses it back', () => {
  const uri = encode({ address: SAP, amountZat: 25000, memo: 'bags pickup at 5' });
  assert.equal(uri, `zcash:${SAP}?amount=0.00025&memo=${Buffer.from('bags pickup at 5').toString('base64url')}`);
  const got = parse(uri);
  assert.deepEqual(got, { address: SAP, amountZat: 25000, memo: 'bags pickup at 5' });
});

test('works with a unified address and amounts over one ZEC', () => {
  const uri = encode({ address: UA, amountZat: 125099999 });
  assert.equal(uri, `zcash:${UA}?amount=1.25099999`);
  assert.deepEqual(parse(uri), { address: UA, amountZat: 125099999 });
});

test('formats zatoshis with up to 8 decimals and trims trailing zeros', () => {
  assert.match(encode({ address: SAP, amountZat: 100000000 }), /amount=1$/);
  assert.match(encode({ address: SAP, amountZat: 110000000 }), /amount=1\.1$/);
  assert.match(encode({ address: SAP, amountZat: 1 }), /amount=0\.00000001$/);
});

test('rejects bad amounts: negative, zero, scientific, too many decimals, junk', () => {
  for (const amountZat of [-5, 0, 1.5, 'no', NaN, Infinity]) {
    assert.throws(() => encode({ address: SAP, amountZat }), /amount/);
  }
  for (const bad of ['1.123456789', '-5', '1e5', 'abc', '', '.5', '5.']) {
    assert.throws(() => parse(`zcash:${SAP}?amount=${encodeURIComponent(bad)}`), /amount/);
  }
});

test('rejects bad addresses: empty, wrong prefix, spaces, embedded params', () => {
  for (const bad of ['', 'notanaddr', 'AHOY-THERE', 'z testsapling1abc', `zcash:${SAP}`]) {
    assert.throws(() => parse(`zcash:${bad}?amount=1`), /address/);
    assert.throws(() => encode({ address: bad, amountZat: 1 }), /address/);
  }
});

test('rejects missing fields: no address at all, duplicate params, big memo, paramindex, unknown req-; ignores unknown optional', () => {
  assert.throws(() => parse(`zcash:?amount=1`), /address/);
  assert.throws(() => parse(`zcash:${SAP}?amount=1&amount=2`), /duplicate/);
  assert.throws(() => parse(`zcash:${SAP}?memo=${Buffer.alloc(513).toString('base64url')}`), /512/);
  assert.throws(() => parse(`zcash:${SAP}?amount.1=1`), /paramindex/);
  assert.throws(() => parse(`zcash:${SAP}?req-banana=1`), /REQUIRED/);
  assert.doesNotThrow(() => parse(`zcash:${SAP}?amount=1&banana=2`), 'unknown non-req- params are ignored');
  assert.throws(() => parse(`notacoin:${SAP}?amount=1`), /scheme/);
});

test('parse accepts a bare-address URI without params (optional amount)', () => {
  assert.deepEqual(parse(`zcash:${SAP}`), { address: SAP });
});

// Invariant I-14: testnet only. A mainnet or regtest address must be refused, not accepted.
const NON_TESTNET = {
  'mainnet sapling': 'zs1' + 'q'.repeat(70),
  'mainnet unified': 'u1' + 'q'.repeat(100),
  'mainnet transparent': 't1' + 'q'.repeat(30),
  'regtest sapling': 'zregtestsapling1' + 'q'.repeat(60),
};

test('refuses mainnet and regtest addresses in encode and parse, and says why', () => {
  for (const [label, addr] of Object.entries(NON_TESTNET)) {
    assert.throws(() => encode({ address: addr, amountZat: 1 }), /testnet/i, `encode must refuse a ${label} address`);
    assert.throws(() => parse(`zcash:${addr}?amount=1`), /testnet/i, `parse must refuse a ${label} address`);
  }
});

test('still accepts testnet Sapling, unified and transparent addresses', () => {
  assert.equal(parse(encode({ address: SAP, amountZat: 5 })).address, SAP);
  assert.doesNotThrow(() => parse(`zcash:${UA}?amount=1`));
});
