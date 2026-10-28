# Murmur

**Pay and talk when the network won't.**

Murmur carries a real shielded Zcash transaction and sealed private notes from device to device with no internet. Whoever reconnects first broadcasts the transaction, and the payment confirms on chain.

> Built for ZECATHON, Shielded Payments track. Zcash **testnet only**. Judge page: <https://murmurz.vercel.app> (the static site in `apps/web`; deploy notes in [`docs/operations/DEPLOY_WEB.md`](docs/operations/DEPLOY_WEB.md)).

Murmur is for people who still need to pay and message each other privately when a network is down or shut off: a market stall in a blackout, a clinic after a storm, a team in a region with shutdowns. It is a transport and a spend boundary. It is not a wallet, not a new currency, not a bridge, and not anonymous routing.

## The problem

Private money and private words both depend on a network someone can switch off. Offline payment pilots are run by issuers. Offline messengers carry no money. Nothing joins private money and private words.

## How it works

```text
MERCHANT   ZIP 321 payment request  (address, amount, memo)
   ↓
PAYER      wallet builds, proves and signs a shielded transaction with the network cut
   ↓
CARRIER    raw transaction + a sealed receipt hop from device to device (UDP)
   ↓
GATEWAY    the first device with internet broadcasts the transaction, once
   ↓
CHAIN      Zcash testnet mines it; the merchant opens the sealed receipt
```

- The **wallet** (`zcash-devtool`, with a small patch in [`patches/`](patches)) holds keys and builds the transaction. Murmur never touches keys.
- The **carrier** (`src/`) moves two packet kinds. A `tx` packet is the finished raw transaction; it is public once mined and any relay may read it. A `sealed` packet is encrypted to one recipient (X25519 and ChaCha20-Poly1305, with the sender's key mixed into the derivation). Relays cannot open it and there is no recipient tag to link.
- The **spend policy** (`src/policy.js`) caps each payment and the total spent while offline. It is checked before the wallet runs.
- Only the finished raw transaction travels. A PCZT can hold viewing keys and note details, so it never leaves the payer.

## What has been shown

All runs are on the Zcash testnet. Full detail in [`docs/submission/EVIDENCE_INDEX.md`](docs/submission/EVIDENCE_INDEX.md).

| Run | What it shows | Result | Evidence |
|---|---|---|---|
| A | A shielded transaction built with the network cut | create, prove, sign, combine and extract all succeeded offline (20,986-byte transaction, unified-address recipient) | [`evidence/03-acceptance-a`](evidence/03-acceptance-a) |
| B | A transaction carried across the carrier and confirmed | 5,222 bytes, same SHA-256 on both sides, one broadcast, mined in block 4,550,000 | [`evidence/04-e2e-loopback`](evidence/04-e2e-loopback) |
| C | A ZIP 321 payment request paid end to end | every devtool step in a no-network namespace, hand-over over loopback UDP, one broadcast, mined in block 4,550,881 | [`evidence/05-zip321-e2e`](evidence/05-zip321-e2e) |

Runs B and C used loopback UDP on one machine. **No real radio, phone-to-phone or multi-hop test has been run.** The judge page's relay is a labeled simulation.

## Authority model

| Authority | Responsibility | What it cannot claim |
|---|---|---|
| Zcash testnet | Consensus and finality of the payment | It does not know the carrier or the receipt |
| Wallet (`zcash-devtool`) | Keys, note selection, proofs, signatures | It does not know the mesh; it never sees a relay |
| Carrier (`src/`) | Moving packets, sealing notes, dropping duplicates, hop limits | It cannot create a payment, sign, or prove anything was paid |
| Gateway | Broadcasting a received transaction once | It cannot make a transaction valid or confirmed |
| Relay | Forwarding packets | It cannot read a sealed note; it can drop, delay or replay a packet |
| Sealed receipt | Telling the merchant a payment was handed over | It is not proof of payment. The on-chain transaction is |
| Judge page | Presenting evidence and a labeled simulation | It is not evidence about radio |

## Limits, stated plainly

- A payer can still spend the same notes elsewhere before broadcast. The spend policy bounds the loss; nothing here is trustless offline settlement.
- Relays see packet sizes, timing and neighbors. Sealed notes hide content and recipient; the shielded transaction hides payer, recipient and amount on chain.
- An offline-built transaction expires about 50 minutes after the wallet's last sync. The wallet's default expiry delta is 120 blocks since NU7 (25-second blocks, ZIP 218). One built against a stale tip carried expiry height 4,550,721 and was refused at height 4,550,785.
- The devtool's PCZT path cannot yet sign for internal-scope change notes (`WrongFvkForNote`).
- The memo in a ZIP 321 request was not observed in either wallet's view of Run C.
- Sealed-note authentication binds keys, not people. The cryptography has not been independently audited.

Every claim and its evidence ceiling: [`docs/submission/CLAIMS_AND_LIMITS.md`](docs/submission/CLAIMS_AND_LIMITS.md), [`foundry/claims.jsonl`](foundry/claims.jsonl), [`STATUS.md`](STATUS.md). Open gaps: [`foundry/gaps.jsonl`](foundry/gaps.jsonl).

## Quick start

Needs Node 18.3 or newer. No dependencies.

```sh
npm test                    # 53 tests: 52 pass, 1 skipped (the real-devtool test needs MURMUR_E2E=1 and a funded wallet)
npm run demo                # 6-node relay simulation at 30% loss (a simulation, not radio)
sh scripts/verify           # tests, ledger consistency, secret scan, web build check
node bin/murmur.js pubkey --identity ~/id.json
node bin/murmur.js listen --port 47001 --identity ~/id.json --peer HOST:47002 --ack
node bin/murmur.js msg --port 47002 --recipient-pub <hex> --peer HOST:47001 --identity ~/id2.json --text "hi"
```

Payments need the patched devtool and a funded testnet wallet: see [`patches/README.md`](patches/README.md), [`scripts/wallet-setup.sh`](scripts/wallet-setup.sh) and [`scripts/run-zip321-e2e.sh`](scripts/run-zip321-e2e.sh). The two-device test is [`docs/operations/acceptance-b.md`](docs/operations/acceptance-b.md).

## Repository

[`REPO_STRUCTURE.md`](REPO_STRUCTURE.md) is the map. In short: `src/` and `bin/` are the carrier and CLI, `test/` the tests, `apps/web/` the judge page, `evidence/` the immutable run packages, `docs/` the canonical documents (invariants, ground truth, ADRs, submission), and `foundry/` the claim and gap ledgers.

Start with [`PRD.md`](PRD.md) for scope, [`docs/canonical/INVARIANTS.md`](docs/canonical/INVARIANTS.md) for what must always hold, and [`STATUS.md`](STATUS.md) for the current verified state.

## License

Licensed under either of [Apache License 2.0](LICENSE-APACHE) or [MIT license](LICENSE-MIT), at your option. Third-party terms: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
