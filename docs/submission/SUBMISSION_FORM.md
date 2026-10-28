# Submission form (ZKSNARKS Node 07, due 2026-10-28 23:59 UTC)

Text to paste into the form. Keep the claims here identical to `CLAIMS_AND_LIMITS.md`.

## Project name

Murmur

## Track

SHIELDED PAYMENTS

## Description (1902 / 2000 characters)

Murmur lets people pay and message privately over Zcash when the network is down. A merchant makes a ZIP 321 payment request. The payer's wallet builds, proves and signs a real shielded transaction with the network cut. The finished transaction and a sealed receipt hop between nearby devices over UDP, and the first device that reconnects broadcasts it once. The chain confirms it.

Why it does not leak: relays can read the transaction packet, but it is a shielded Zcash transaction, so it shows nothing about payer, recipient or amount. Receipts and notes are sealed to one recipient (X25519 + ChaCha20-Poly1305) with the sender's key in the derivation, so relays cannot read them, cannot link them to a recipient, and a forged sender fails. Only the finished raw transaction travels, never a PCZT, which can hold viewing keys. A spend policy caps each payment and the total spent offline.

What is real (Zcash testnet): Run A built a shielded transaction with every wallet step offline. Run B carried one across the carrier and it was mined in block 4,550,000. Run C paid a ZIP 321 request: every wallet step ran in a no-network namespace, the hand-over used loopback UDP, one gateway broadcast it, and it was mined in block 4,550,881. 52 tests pass (1 skipped). Every claim sits in a ledger linked to its evidence.

What is a mock or not proven: the relay on the demo page is a labeled simulation, not the carrier. Hand-overs ran over loopback on one machine; no real radio, phone-to-phone or multi-hop test has been run. The request's memo was not observed on chain. A payer can still double-spend before broadcast; the spend policy only limits the loss. An offline transaction expires about 50 minutes after the last sync. The devtool's offline signing cannot yet spend change notes, so Run C paid from an account holding an externally received note. The cryptography is unaudited. Testnet only.

## Code repository

https://github.com/etvjay/murmur

## Working demo

https://murmurz.vercel.app

The judge page: the story, each run's evidence with its transaction id and block, an interactive relay **simulation** (labeled), and the Limits view.

## Demo video

(add the link once recorded; two minutes; script in `DEMO_SCRIPT.md`)

## Checkbox

The repository is already public. Tick: "The repository will be public by the deadline. I understand a private repo at the deadline is not judged."
