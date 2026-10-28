# Murmur Ground Truth

The current verified state of the project, with the boundaries that do not move. If another document disagrees with this one about what is proven, this one wins, and the disagreement belongs in `foundry/contradictions.md`.

## Repository

- Product: Murmur, a carrier for shielded Zcash payments and sealed notes between nearby devices.
- Network: Zcash **testnet** only.
- Language: Node.js 18.3+, standard library only (no npm dependencies).
- Wallet: a patched `zcash/zcash-devtool` (base `0b3436b`, patch in `patches/`).
- Tests: 58 in total, 57 passing, 1 skipped (the real-devtool test, which needs `MURMUR_E2E=1` and a funded wallet).
- Control plane: `PRD.md`, `STATUS.md`, `foundry/`.

## Frozen semantic boundaries

These definitions hold across the code, the docs and the page.

1. **A `tx` packet is public.** It carries a finished raw shielded transaction. Any relay may read it; the shielded transaction itself reveals nothing about payer, recipient or amount on chain.
2. **A `sealed` packet is private to one recipient.** It carries a receipt, note or message. Relays cannot open it. The sender's static key is mixed into the key derivation, so a ciphertext not produced by the claimed sender fails.
3. **A broadcast is not a confirmation.** The chain decides finality. A payment is confirmed when its transaction is mined, as shown by the wallet reading the block.
4. **A sealed receipt is not proof of payment.** It tells the merchant a payment was handed over. The on-chain transaction is the proof.
5. **The carrier is transport.** It cannot create a payment, sign, prove or hold keys. The wallet does that.
6. **Authentication binds keys, not people.** A verified sender is a public key.
7. **The spend policy bounds exposure; it does not prevent double-spend.** Until the transaction is mined, the payer could spend the same notes elsewhere.
8. **A simulation is not evidence about radio.** The judge page's relay is a labeled re-implementation of the carrier's rules, not the carrier.
9. **Loopback is not radio.** Runs B and C used UDP on one machine.

## Milestone status

| Milestone | State | Evidence |
|---|---|---|
| Carrier: sealed boxes, hop limit, duplicate drop, chunking, UDP runner | `TESTED` | `test/` |
| Authenticated sealing (blob format v2, sender key in the derivation) | `TESTED`, `LIVE_TESTNET` (the `sender` field in Run C logs) | `test/mesh.test.js`, `evidence/05-zip321-e2e` |
| Spend policy and bridge to the devtool | `TESTED` | `test/bridge.test.js`, `test/policy.test.js` |
| ZIP 321 request and `pay --to <uri>` | `TESTED`, `LIVE_TESTNET` | `test/zip321.test.js`, `evidence/05-zip321-e2e` |
| Run A: shielded transaction built with the network cut | `LIVE_TESTNET` | `evidence/03-acceptance-a` |
| Run B: carried across the carrier, confirmed (block 4,550,000) | `LIVE_TESTNET` (loopback) | `evidence/04-e2e-loopback` |
| Run C: ZIP 321 request paid end to end (block 4,550,881) | `LIVE_TESTNET` (loopback) | `evidence/05-zip321-e2e` |
| Judge page with a labeled simulation | `IMPLEMENTED` | `apps/web` |
| Two-device run over a real link (laptop and phone) | not run | `docs/operations/acceptance-b.md` |
| Real multi-hop | not run (simulation only) | `scripts/demo.js`, `apps/web` |

## Current evidence boundary

Real testnet runs show: a shielded transaction built with the network cut (Run A); a transaction carried across the carrier unchanged and mined once (Run B); a ZIP 321 payment built offline, handed over on loopback, broadcast once and mined (Run C).

Run C pays from a separate account because the devtool's PCZT path cannot sign for internal-scope change notes (`evidence/05-zip321-e2e/attempt-1-change-note-sign-failure`). Run C's first delivery attempt failed because the payer ran inside an isolated network namespace whose loopback could not reach the gateway (`attempt-2-offline-build-not-carried`); the final run sends only the devtool steps into the namespace.

## Not yet implemented, not yet proven

- Real radio, phone-to-phone or laptop-to-phone transfer.
- Real multi-hop relaying.
- The memo in a payment request reaching the merchant (not observed in Run C).
- Spending change notes through the PCZT path.
- Setting a later expiry on an offline transaction (an offline build expires about 50 minutes after the wallet's last sync: 120 blocks at the post-NU7 25-second spacing).
- Bluetooth.
- An independent audit of the sealed-box construction.

## Allowed public claim

Murmur carries a real shielded Zcash transaction and sealed notes between devices. On the Zcash testnet, a payment requested with ZIP 321 was built with every wallet step offline, handed over on loopback UDP, broadcast once by a gateway and mined in block 4,550,881. A transaction carried across the carrier was mined in block 4,550,000. Sealed notes are authenticated to the sender's key. The spend policy bounds offline exposure. The relay on the judge page is a simulation.

Murmur does not claim: trustless offline settlement, anonymous routing, radio range, real multi-hop, a delivered memo, production readiness or an audit.

## Current frontier

Run the two-device test; decide whether to fix the devtool's change-note signing; and resolve the memo question.
