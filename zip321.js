// Minimal ZIP 321 payment-request encoding (single-payment subset).
// URI format: zcash:<address>?amount=<decimal ZEC, <=8dp>[&memo=<uppercase base64url, no padding>]
// A bare `zcash:<address>` is valid; amount and memo are optional on parse.

const SCHEME = 'zcash:';
const ADDR_RE = /^(ztestsapling1|utest1|zs1|zregtestsapling1|tm)[a-z0-9]{20,}$/;
const AMOUNT_RE = /^\d+(\.\d{1,8})?$/;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const unb64url = (s) => { const buf = Buffer.from(s, 'base64url'); if (buf.length > 512) throw new Error('memo exceeds 512 bytes'); return buf; };

export function encode({ address, amountZat, memo } = {}) {
  if (typeof address !== 'string' || !ADDR_RE.test(address)) {
    throw new Error(`bad address "${address ?? ''}"`);
  }
  if (!Number.isInteger(amountZat) || amountZat <= 0) {
    throw new Error(`bad amount ${amountZat}: positive integer zatoshis required`);
  }
  if (amountZat > 21000000 * 1e8) throw new Error(`bad amount ${amountZat}: exceeds total supply`);
  const zec = amountZat.toString().padStart(9, '0');
  const whole = zec.slice(0, -8).replace(/^0+(?=\d)/, '');
  const frac = zec.slice(-8).replace(/0+$/, '');
  const amount = frac ? `${whole}.${frac}` : whole;
  const memoParam = memo !== undefined
    ? `&memo=${b64url(Buffer.from(memo, 'utf8'))}`
    : '';
  return `${SCHEME}${address}?amount=${amount}${memoParam}`;
}

export function parse(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(SCHEME)) {
    throw new Error('bad scheme: only zcash: URIs are accepted');
  }
  const [addr, query = ''] = uri.slice(SCHEME.length).split('?');
  if (!addr || !ADDR_RE.test(addr)) {
    throw new Error(`bad address "${addr.slice(0, 24)}"`);
  }
  const out = { address: addr };
  const seen = {};
  let k = 0;
  let i = 0;
  while (i < query.length) {
    const eq = query.indexOf('=', i);
    const amp = query.indexOf('&', i);
    if (eq === -1) throw new Error(`bad query param "${query.slice(i, amp === -1 ? undefined : amp)}"`);
    const key = query.slice(i, eq);
    const end = amp === -1 ? query.length : amp;
    const value = query.slice(eq + 1, end);
    if (key === 'amount') {
      if ('amount' in seen) throw new Error('duplicate amount param');
      if (!AMOUNT_RE.test(value)) throw new Error(`bad amount "${value}"`);
      seen.amount = true;
      out.amountZat = Number(value.replace('.', '')) * (10 ** (8 - (value.split('.')[1]?.length ?? 0)));
    } else if (key === 'memo') {
      if ('memo' in seen) throw new Error('duplicate memo param');
      seen.memo = true;
      out.memo = unb64url(value).toString('utf8');
    } else if (key.includes('.')) {
      throw new Error('paramindex (multiple payments) not supported');
    } else if (key === 'message' || key === 'label') {
      if (key in seen) throw new Error(`duplicate ${key} param`);
      out[key] = decodeURIComponent(value);
    } else {
      if (key.startsWith('req-')) throw new Error(`unsupported REQUIRED payment param "${key}"`);
      // Unknown non-req- params are ignored per ZIP 321 forward compatibility.
    }
    k += 1;
    i = end + 1;
  }
  return out;
}
