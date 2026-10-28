# Murmur Product and Judge-Path Brief

**Status:** `BOUNDED SUBMISSION CANDIDATE`

This file defines the admitted scope for the ZECATHON submission (Shielded Payments track). It is the scope reference for `STATUS.md`, `foundry/`, and the docs under `docs/`.

## Objective

Show that a real shielded Zcash payment can be requested, built without a network, carried between devices as a sealed hand-over, broadcast once by whoever reconnects first, and confirmed on chain, while keeping each authority (wallet, carrier, gateway, chain, page) separate and every claim tied to evidence.

## Users

- **Merchant** who needs to be paid when the network is down and learn that a payment was handed over.
- **Payer** who needs to build a payment offline within a spend boundary they set.
- **Gateway** (any device that regains a connection) that broadcasts a received transaction.
- **Judge or reviewer** who needs to verify what is proven, what is simulated and what is not.

## Admitted scope

- the carrier: wire format and chunking, sealed boxes with sender authentication, hop-limited flooding with duplicate drop, UDP device runner (`src/`);
- the CLI: `request`, `pay`, `listen`, `msg`, `broadcast`, `pubkey` (`bin/murmur.js`);
- ZIP 321 payment requests: encode, parse, and use as the `--to` of `pay`;
- the spend policy: per-payment and offline-total caps, optional recipient list, checked before the wallet runs;
- a bridge to a patched `zcash-devtool`: create, prove, sign, combine, extract (raw), broadcast (`src/bridge.js`, `patches/`);
- the judge page with a labeled relay simulation (`apps/web`);
- immutable evidence packages for each real testnet run (`evidence/`);
- the claim and gap ledgers and their consistency check (`foundry/`, `scripts/check-foundry.mjs`).

## Explicit exclusions

- mainnet, real funds or production value;
- trustless offline settlement or double-spend prevention;
- anonymous routing, cover traffic, onion layering or hop-level privacy;
- Bluetooth or any radio transport beyond UDP over an existing link;
- key management, a wallet UI, custody or a hosted service for payments;
- bridges and other chains;
- a memo-carried note (the memo was not observed on chain; see `foundry/gaps.jsonl`);
- an independent security audit.

The judge page is presentation. Hosting it (Vercel) is delivery infrastructure only and does not promote any claim.

## Evidence ceiling

Local code and tests support `IMPLEMENTED` and `TESTED`. A real testnet run whose packet is retained in `evidence/` supports `LIVE_TESTNET` for exactly what that packet shows. A simulation supports `SIMULATED`. A claim stays at the lowest state its evidence supports. See `foundry/README.md` for the vocabulary.

## Exit condition

The submission is ready when: `sh scripts/verify` passes on one clean exact HEAD; the judge page builds and is reachable; every public claim in `README.md` and the page traces to `foundry/claims.jsonl`; every open gap has a disposition; and the demo shows only what the evidence supports.
