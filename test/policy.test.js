import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy } from '../src/policy.js';

test('policy envelope bounds offline risk', () => {
  const policy = { maxPerPaymentZat: 10000, maxOfflineTotalZat: 20000, spentZat: 15000, minExpiryHeight: 100 };
  assert.deepEqual(evaluatePolicy(policy, { amountZat: 3000, recipient: 'x', expiryHeight: 0 }).allowed, true);
  const bad = evaluatePolicy(policy, { amountZat: 9000, recipient: 'x', expiryHeight: 50 });
  assert.deepEqual(bad.reasons, ['over-offline-total', 'expiry-too-soon']);
});

test('allows when all limits satisfied', () => {
  const policy = { maxPerPaymentZat: 10000, maxOfflineTotalZat: 20000, spentZat: 5000, minExpiryHeight: 100 };
  const decision = evaluatePolicy(policy, { amountZat: 3000, recipient: 'x', expiryHeight: 200 });
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.reasons, []);
  assert.match(decision.policyHash, /^[0-9a-f]{64}$/);
});

test('recipient-not-allowed when allowedRecipients excludes the request', () => {
  const policy = { maxPerPaymentZat: 10000, maxOfflineTotalZat: 20000, spentZat: 0, minExpiryHeight: 100, allowedRecipients: ['merchant-ua'] };
  const decision = evaluatePolicy(policy, { amountZat: 1000, recipient: 'stranger-ua', expiryHeight: 200 });
  assert.equal(decision.allowed, false);
  assert.deepEqual(decision.reasons, ['recipient-not-allowed']);
});
