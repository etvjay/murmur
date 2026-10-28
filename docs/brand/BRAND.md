---
name: "Murmur"
tagline: "Pay and talk when the network won't."
specVersion: "0.3.0"
version: 1
language: en
---

# Murmur

Brand identity for the offline private payments and messaging project built for ZECATHON (Shielded Payments track). Status: draft. Name approved by the owner; visual primitives below are proposals awaiting approval.

## Strategy

### Overview

Murmur carries a real shielded Zcash transaction and sealed private messages between nearby devices when the internet is down. Any device that regains a connection broadcasts the transaction. It started as a hackathon build, and the evidence for it is a testnet transaction built with the network cut off and mined in block 4,550,000.

The problem is simple. Private money and private words both depend on a network that can be switched off. Murmur keeps them moving without handing anyone a record of who paid whom.

Before: a blackout means cash or nothing, and messages that route through servers someone controls. After: a payment and a note pass from phone to phone, sealed, and settle on chain when someone reconnects.

### Audience

Primary: ZECATHON judges and Zcash developers deciding whether this is real and worth building on.
Secondary: people in regions with shutdowns, outages or disasters, and the builders who design for them.
They are technical or technical-adjacent, skeptical of privacy claims, and read evidence before slogans.

### Positioning

For people who need to pay and message privately without a working network, Murmur is the carrier that moves a real shielded transaction and sealed messages device to device.

Explicit negations:
- Not a wallet. It does not hold or manage keys for anyone.
- Not a new currency or a bridge. It moves Zcash and nothing else.
- Not trustless offline settlement. A payer can still double-spend before broadcast, and the policy only limits the exposure.
- Not anonymous routing. Relays still see packet size, timing and neighbors.

Whitespace: Bitchat and Briar carry private messages without a network and have no money layer. Zcash wallets make private payments and assume connectivity. Murmur joins the two.

### Personality

Calm, exact, a little stubborn. It sounds like a careful engineer at a kitchen table with the lights out: warm, plain, unwilling to overclaim.

### References & Anti-References

- Bitchat: borrow the clarity of a mesh that relays hop to hop; do not copy its messaging-only scope.
- Briar: borrow the sober, trust-first tone around privacy; do not copy a dated, utilitarian presentation.
- Signal: borrow plain language about what is and is not protected; do not copy its consumer-app warmth for a technical audience.
- Anti-reference: crypto launch pages that promise "unstoppable" and "trustless" without evidence; neon-gradient hype; claims of anonymity.

### Promise

What it moves, it moves sealed. What it claims, it can show.

### Guardrails

- Never claim trustless offline settlement, real multi-hop range, hop-level privacy, or resistance to a relay that drops traffic.
- Never present a simulation as the real system. Label simulations as simulations.
- Every number on the site traces to a file in `evidence/`.
- Litmus test: if a sentence would still be true after replacing Murmur with any other mesh app, rewrite it.

## Voice

### Identity

Plain, specific, and evidence-first. Short sentences. Say what happened, with the number.

### Tagline & Slogans

- Primary: "Pay and talk when the network won't."
- Secondary: "Sealed in transit."
- Secondary: "Pass it on."

### Message Pillars

1. It works without a network. A real shielded transaction was built with the network cut off.
2. It stays private in transit. Messages and receipts are sealed to one recipient; relays cannot read them.
3. It settles on chain. Any connected device broadcasts the transaction, and the payment confirms on the Zcash testnet.
4. It says what it cannot do. Double-spend risk, relay metadata and unproven radio tests are listed in plain view.

### Phrases

- "Built with the network cut."
- "Sealed to one recipient."
- "Shown, not claimed."
- "Whoever reconnects first broadcasts."

### Tonal Rules

- Lead with the fact, then the meaning. Example: "5,222 bytes crossed unchanged. Both sides hash to the same value."
- Name limits next to claims, in the same breath.
- Use "simulation" every time something is simulated.
- No exclamation marks. No "unstoppable", "trustless", "unhackable".
- Prefer the concrete noun (transaction, receipt, relay) over the abstract one (solution, platform).

## Visual

### Core Colors

Proposed, pending approval.

- Night `#04050E`: the dark ground; mandatory.
- Mist `#F3F5FF`: primary light text; mandatory.
- Electric blue `#2B2BFF`: the single accent, used for stripes, file-title windows, the sender's bubble, buttons and the footer; mandatory.
- Signal tint `#9BA6FF`: blue used as text on the dark ground (links, numbers, chips), because `#2B2BFF` itself is too dark for text; mandatory for text.

### Typefaces

Proposed, pending approval. Licensing not verified. All four are open-licensed Google Fonts.

- Display and headings: Newsreader Light, fallback Georgia.
- Body: Geist, fallback system sans-serif.
- Code, hashes, txids and file names: Geist Mono, fallback system monospace.
- Pixel accent for ciphertext only: Silkscreen, fallback Geist Mono.

### Art Direction

A night screen with one electric-blue light source. A near-black ground, thin blue stripe bands as horizons, and small windows with file-name title bars for every piece of evidence, as if each log were an open file. Messages appear as chat bubbles: plain for the sender, dashed pixel type for what a relay sees, blue for the reader. Evidence is shown as documents (hashes, block numbers, logs), never as decoration.

## Governance

### Claims

Approved, evidenced:
- "A real shielded Zcash testnet transaction was built with the network cut off." Evidence: `evidence/03-acceptance-a/`.
- "A payment crossed the carrier and was confirmed on the Zcash testnet in block 4,550,000." Evidence: `evidence/04-e2e-loopback/`. Note: loopback only, no radio.

- "A ZIP 321 payment request was paid on the Zcash testnet: every devtool step ran in a no-network namespace, the hand-over was loopback UDP, one gateway broadcast, mined in block 4,550,881." Evidence: `evidence/05-zip321-e2e/`. Note: loopback only, no radio.
- "Sealed notes are authenticated to the sender's key; a forged sender and old-format packets are rejected." Evidence: `test/mesh.test.js`, and the `sender` field in `evidence/05-zip321-e2e/payer.jsonl`.

Draft, not approved (do not publish):
- That the memo in a payment request reaches the merchant. It was not observed in either wallet's view of the confirmed transaction.
- Any statement about phone-to-phone radio performance, range, or multi-hop delivery on real devices.

### Accessibility Commitments

- WCAG 2.2 AA minimum for text contrast and focus visibility.
- Honor reduced-motion and high-contrast preferences; any dimming effect must keep text above AA contrast.
- Never rely on color alone to separate "verified" from "not verified".

### Naming

Product name: Murmur. The working package name `zmesh` is internal. Collisions with existing products have not been checked.
