# ADR-0001: Carry the finished raw transaction, never the PCZT

**Status:** Accepted

## Context

The wallet builds a payment as a PCZT (partially created transaction): create, prove, sign, combine, extract. The stock `pczt extract` prints only the txid, so there was no way to get the raw bytes to send over a network. The tempting shortcut is to carry the PCZT itself.

A PCZT can contain a viewing key, note plaintexts and derivation paths. Putting it on a mesh where any relay can read `tx` packets would leak exactly what a shielded transaction protects.

## Decision

The carrier relays only the finished raw transaction. The devtool gets a small patch (`patches/zcash-devtool-raw-tx.patch`):

- `pczt extract --raw` prints the raw transaction bytes on stdout and the txid on stderr;
- `pczt send-without-storing --raw` submits raw transaction bytes as given.

`src/bridge.js` runs create, prove, sign, combine, extract and returns the raw bytes. The gateway submits them with `send-without-storing --raw`.

## Consequences

- A relay can read a `tx` packet, and that is acceptable: the shielded transaction reveals nothing about payer, recipient or amount on chain.
- Murmur depends on a patched devtool. The patch applies cleanly to upstream commit `0b3436b` and is a derivative work under `MIT OR Apache-2.0`.
- Invariant I-05 is enforced by `test/bridge.test.js`.

## Alternatives rejected

- Carry the PCZT: leaks key material. Rejected.
- Re-implement transaction extraction in Node: duplicates consensus-critical code. Rejected.
