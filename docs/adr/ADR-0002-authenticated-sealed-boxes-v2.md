# ADR-0002: Sealed boxes carry and bind the sender's key (blob format v2)

**Status:** Accepted

## Context

The first sealed boxes were anonymous: anyone who knew a recipient's public key could encrypt to it, so a relay or a bystander could forge an acknowledgement or a receipt that looked like it came from the gateway or the payer.

## Decision

Blob format v2 is `[0x02][sender public key, 32][ephemeral public key, 32][nonce, 12][ciphertext][tag, 16]`.

The key is `sha256("zmesh-v2" | DH(ephemeral, recipient) | DH(sender, recipient) | sender public | ephemeral public)`. The sender's static key takes part in the derivation and travels in the blob, so a ciphertext not produced by the claimed sender's key fails authentication. `seal(recipientPublic, plaintext, sender)` requires a sender. `open(identity, blob)` returns `{ plaintext, sender }` or `null`. Old-format blobs are rejected, not opened without authentication.

The string `zmesh-v2` is the format's label from the project's earlier working name. It is kept so the format stays compatible. It is not a product name.

## Consequences

- A forged sender, a tampered ciphertext and an old-format packet all fail to open (invariants I-02, I-03; `test/mesh.test.js`).
- The authenticated sender is a **key**, not a person (I-04).
- What it does not give: protection against a relay dropping, delaying or replaying a genuine packet. Replay suppression is per-node duplicate drop only.
- The construction is built from `node:crypto` primitives and has not been independently audited.

## Alternatives rejected

- Sign each message separately: larger packets, same key problem, more code.
- Leave receipts unauthenticated and rely on the chain: the receipt then proves nothing to the merchant before confirmation, which is the moment it matters.
