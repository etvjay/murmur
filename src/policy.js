// Spend boundary the payer checks before building a transaction offline.
import { createHash } from 'node:crypto';

const sha = (b) => createHash('sha256').update(b).digest();

export function evaluatePolicy(policy, req) {
  const reasons = [];
  if (req.amountZat > policy.maxPerPaymentZat) reasons.push('over-per-payment-limit');
  if (policy.spentZat + req.amountZat > policy.maxOfflineTotalZat) reasons.push('over-offline-total');
  if (policy.allowedRecipients && !policy.allowedRecipients.includes(req.recipient)) reasons.push('recipient-not-allowed');
  if (req.expiryHeight !== undefined && req.expiryHeight !== 0 && req.expiryHeight < policy.minExpiryHeight) reasons.push('expiry-too-soon');
  return { allowed: reasons.length === 0, reasons,
    policyHash: sha(Buffer.from(JSON.stringify(policy))).toString('hex') };
}
