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

- Night `#00080B`: the dark ground; mandatory.
- Mist `#E9EDF5`: primary light text and light-theme ground; mandatory.
- Signal lime `#CDFF00`: the single accent, used for proof numbers, the active step and packets in motion; mandatory. (Replaces Lamplight after the XBOW-based rebuild.)
- Relay blue `#7FA8FF`: links between nodes and secondary data; optional.

### Typefaces

Proposed, pending approval. Licensing not verified.

- Display and headings: Geist Mono, fallback system monospace.
- Body: Geist, fallback system sans-serif.
- Data (hashes, txids, code, navigation labels): Geist Mono, fallback system monospace.

### Art Direction

A neighborhood at night with the power out: a dark ground, a few small points of warm light, thin lines passing between them. Panels read as lit windows, translucent and few. Evidence is shown as plain documents (hashes, block numbers, logs), never as decoration.

## Governance

### Claims

Approved, evidenced:
- "A real shielded Zcash testnet transaction was built with the network cut off." Evidence: `evidence/03-acceptance-a/`.
- "A payment crossed the carrier and was confirmed on the Zcash testnet in block 4,550,000." Evidence: `evidence/04-e2e-loopback/`. Note: loopback only, no radio.

Draft, not approved (do not publish):
- Any statement about phone-to-phone radio performance, range, or multi-hop delivery on real devices.
- Any statement that receipts are authenticated.

### Accessibility Commitments

- WCAG 2.2 AA minimum for text contrast and focus visibility.
- Honor reduced-motion and high-contrast preferences; any dimming effect must keep text above AA contrast.
- Never rely on color alone to separate "verified" from "not verified".

### Naming

Product name: Murmur. The working package name `zmesh` is internal. Collisions with existing products have not been checked.
