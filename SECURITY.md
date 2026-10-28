# Security

Murmur is a **testnet-only prototype** built for a hackathon. Do not use it with real funds.

## Scope

- Zcash **testnet** only. Never use mainnet keys, mainnet addresses or real funds.
- The cryptography (X25519 key agreement, ChaCha20-Poly1305, SHA-256 key derivation) uses Node's built-in `node:crypto`. The construction in `src/mesh.js` has **not been independently audited**.
- Sealed-note authentication binds a **public key** to a message. It does not prove the key belongs to a person.
- A relay can drop, delay, replay or observe the size and timing of any packet.
- A payer can double-spend before broadcast. The spend policy bounds the loss; it does not remove the risk.

## Secrets

Wallet identities, mnemonics and mesh identity files must never be committed. `wallets/`, `*.key` and `*.identity` are git-ignored, and `scripts/scan-secrets.mjs` (run by `scripts/verify` and CI) fails on key material in tracked files. Evidence packages contain public addresses, transaction ids and public keys only.

## Reporting a problem

Open an issue on the repository, or contact the maintainers privately if the problem would expose key material. Include the commit, what you ran and what you saw. Please do not include real keys or funds in a report.
