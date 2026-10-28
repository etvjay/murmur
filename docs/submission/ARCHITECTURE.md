# Architecture

## Components

```text
                     ┌────────────────────────────┐
                     │  Zcash testnet (consensus) │   mines the transaction
                     └─────────────▲──────────────┘
                                   │ broadcast (once)
   merchant            payer       │            gateway
┌────────────┐   ┌──────────────┐  │   ┌─────────────────────┐
│ request    │   │ wallet       │  │   │ listen --gateway    │
│ (ZIP 321)  │──▶│ (devtool,    │  │   │ receives, dedupes,  │
│            │   │  offline)    │  └───│ broadcasts, acks    │
└────────────┘   └──────┬───────┘      └──────────▲──────────┘
                        │ raw tx + sealed receipt │
                        ▼                         │
                 ┌──────────────┐   relays   ┌────┴───────┐
                 │ carrier (UDP)│──▶  ···  ──▶│  carrier   │
                 └──────────────┘            └────────────┘
```

| Component | File | Responsibility |
|---|---|---|
| CLI | `bin/murmur.js` | `request`, `pay`, `listen`, `msg`, `broadcast`, `pubkey`. One JSON object per line on stdout. Exit codes: 0 ok, 1 usage, 2 policy denied, 3 no ack in time, 4 bridge failure |
| Carrier | `src/mesh.js` | Two packet kinds, flooding with a hop limit, duplicate drop, per-node retransmission of held packets, sealed boxes |
| Wire format | `src/wire.js` | Packet encode and decode, chunking (default payload 1,200 bytes, at most 64 chunks), reassembly with expiry |
| Device runner | `src/runner.js` | UDP sockets, identity files (mode 0600) |
| Spend policy | `src/policy.js` | Per-payment cap, offline-total cap, optional recipient list; returns a policy hash |
| Bridge | `src/bridge.js` | Runs the devtool: create, prove, sign (the proven PCZT), combine, extract `--raw`; broadcast with `send-without-storing --raw` |
| ZIP 321 | `src/zip321.js` | Encode and parse payment requests (address, amount, memo) |

## Packet kinds

- **`tx`**: the finished raw transaction. Public once mined. A gateway (a node with a connection) broadcasts it once.
- **`sealed`**: a payload encrypted to one recipient: a receipt, an acknowledgement or a message. The blob is `[0x02][sender public][ephemeral public][nonce][ciphertext][tag]`. The key is derived from the ephemeral-recipient and sender-recipient Diffie-Hellman results (X25519) and encrypted with ChaCha20-Poly1305. Recipients find theirs by trial decryption, so there is no recipient tag to link. ADR-0002.

## Flow of a payment

1. The merchant makes a ZIP 321 request.
2. The payer's wallet syncs while online. With the network cut, `murmur pay` checks the spend policy, then the bridge runs create, prove, sign, combine and extract. Each devtool call can be run inside a no-network namespace.
3. The carrier sends the raw transaction and a sealed receipt to a nearby peer. Peers forward both with a hop limit and drop duplicates.
4. A gateway receives the transaction, broadcasts it once and returns a sealed acknowledgement.
5. The chain mines it. The wallet reads the block to confirm. The merchant opens the receipt.

## Authority boundaries

| Concern | Owner | Never owned by |
|---|---|---|
| Keys, note selection, proofs, signatures | the wallet (devtool) | the carrier |
| Finality of the payment | Zcash consensus | the gateway, the receipt, the page |
| Moving packets, sealing, dropping duplicates | the carrier | the wallet |
| Spend limits | `src/policy.js`, checked before the wallet runs | the relay |
| What is proven | `foundry/claims.jsonl` and `evidence/` | the README or the page on their own |

## The judge page

`apps/web/index.html` is a single HTML file with three hash-routed views (Home, Evidence, Limits) and in-page anchors. Its relay is a labeled simulation with its own engine (ADR-0004). `apps/web/build.mjs` wraps it into `dist/index.html` for static hosting (Vercel).

## What is deliberately absent

No server, no database, no account system, no mainnet, no custody. The only network the product uses is the existing link between devices and the Zcash lightwalletd server a gateway talks to.
