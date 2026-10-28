# Murmur Claims and Limits

## Supported claims

On the Zcash **testnet**, within the evidence in `evidence/` and the tests in `test/`:

- A shielded transaction can be built with every wallet step offline, shown by a no-network namespace whose probe fails (Run A and Run C).
- A transaction was carried across the carrier unchanged, with the same SHA-256 on both sides, broadcast once and mined in block 4,550,000 (Run B).
- A payment requested with ZIP 321 was built offline, handed over on loopback UDP, broadcast once by a gateway and mined in block 4,550,881 (Run C). The merchant account received 0.00003 TAZ.
- Sealed notes are authenticated to the sender's key; a forged sender, a tampered ciphertext and an old-format packet fail to open (`test/mesh.test.js`; the `sender` field in Run C logs).
- The carrier relays only a finished raw transaction, never a PCZT (`test/bridge.test.js`, ADR-0001).
- The spend policy is checked before the wallet runs, and a denied payment runs the wallet zero times (`test/bridge.test.js`, `test/cli.test.js`).
- A gateway broadcasts a given transaction at most once (tests; Runs B and C).
- Large transactions survive chunking, reordering and duplicates (`test/wire.test.js`, `test/runner.test.js`).
- In a six-device **simulation**, with four retransmit rounds and 300 seeds per setting, about 93% of runs deliver at 30% packet loss and about 72% at 40%.

## Explicit limits

This submission does not claim:

- real radio, phone-to-phone or laptop-to-phone transfer (the two-device test has not been run);
- real multi-hop relaying (simulation only);
- trustless offline settlement: a payer can still double-spend before broadcast, and the spend policy only bounds the loss;
- anonymous routing or hop-level privacy: relays see packet sizes, timing and neighbors, and can tell `tx` packets from sealed ones;
- that sealed-note authentication identifies a person: it binds a public key;
- that a relay cannot drop, delay or replay a genuine packet;
- that the memo in a ZIP 321 request reaches the merchant: it was not observed in Run C;
- that the PCZT path can spend change notes: it cannot (`WrongFvkForNote`), so Run C paid from an account holding an externally received note;
- that an offline transaction stays valid: it expires about 50 minutes after the wallet's last sync (120 blocks at the post-NU7 25-second spacing);
- Bluetooth, mainnet, custody, a hosted payment service or production readiness;
- an independent audit of the sealed-box construction;
- that the judge page's relay is the real carrier. It is a labeled simulation.

## Labels used

| Label | Meaning |
|---|---|
| `TESTED` | Covered by tests in `test/` |
| `LIVE_TESTNET` | Shown by a retained real testnet run in `evidence/` |
| `SIMULATED` | Shown only by a simulation |
| `IMPLEMENTED` | Exists and builds; not independently verified |
| loopback | Hand-over was UDP on one machine, not a radio |

Every claim above has an entry in `foundry/claims.jsonl`; open gaps are in `foundry/gaps.jsonl`.
