# Murmur Evidence Index

All evidence is retained in this repository under `evidence/`. Each run has its own directory and is not rewritten later. Everything is Zcash **testnet**. Public addresses, transaction ids and public keys appear in these files; key material does not (`scripts/scan-secrets.mjs`).

| Run | Directory | What it supports | Key facts |
|---|---|---|---|
| Wallet setup | `evidence/01-wallet-setup/` | A testnet wallet was created | |
| Sync | `evidence/02-sync/` | The wallet synced to the chain | |
| A: offline build | `evidence/03-acceptance-a/` | A shielded transaction can be built with the network cut | create, prove, sign, combine, extract all `ok` offline (`steps.status`); an offline probe fails as required; 20,986-byte transaction with a unified-address recipient; not broadcast |
| B: carried and confirmed | `evidence/04-e2e-loopback/` | A transaction crossed the carrier unchanged and was confirmed | txid `5110a458…8fd43`, mined in block 4,550,000; 5,222 bytes; SHA-256 `cbc99ff1…0b70f` printed by payer and gateway; one `broadcast`; loopback UDP |
| C: ZIP 321 payment, end to end | `evidence/05-zip321-e2e/` | A requested payment was built offline, carried, broadcast once and mined | txid `0efad38f…96d7`, mined in block 4,550,881 (2026-10-28 12:20:12 UTC); 3,000 zat to the merchant account; SHA-256 `ad973801…124ca` on both sides; the `sender` key on the ack and the receipt; loopback UDP |

Read the run C folder in this order: `SUMMARY.txt`, `request.jsonl` and `uri.txt`, `offline-probe.txt`, `payer.jsonl`, `gateway-listener.jsonl`, `list-tx-*-confirmed.txt`.

## Attempts and findings kept as evidence

| Folder | What it shows |
|---|---|
| `evidence/05-zip321-e2e/attempt-1-change-note-sign-failure/` | The PCZT path cannot sign a spend of an internal-scope change note: `SaplingVerify(WrongFvkForNote)` (ADR-0003, GAP-004) |
| `evidence/05-zip321-e2e/attempt-2-offline-build-not-carried/` | An offline build that was never delivered, because the isolated namespace's loopback could not reach the gateway; never broadcast |
| `evidence/05-zip321-e2e/finding-offline-expiry/` | A send built on a stale tip was refused: expiry 4,550,721, height 4,550,785 |
| `evidence/05-zip321-e2e/funding/` | The transfer that funded Run C's payer account: txid `4d0ddfe5…2b35a` |

## What the evidence does not show

- Real radio or a second physical device. Runs B and C are loopback on one machine.
- A memo reaching the merchant. Neither wallet's view of Run C shows one (GAP-005).
- Real multi-hop. See GAP-003.

## Machine-readable manifest

[`evidence-manifest.json`](evidence-manifest.json) lists each run with its state, files and facts. `scripts/check-foundry.mjs` checks that every path in it exists.

## Reproduce

- Tests and ledger checks: `sh scripts/verify`.
- Run A: `scripts/acceptance-a.sh` (needs a funded testnet wallet, the patched devtool and sudo for a network namespace).
- Run C: `scripts/run-zip321-e2e.sh <payer-account> <merchant-sapling-address>`.
