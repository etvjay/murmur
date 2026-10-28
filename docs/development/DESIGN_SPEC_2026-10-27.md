# Offline private payments and messaging on Zcash: design

Date: 2026-10-27. Target: ZECATHON, SHIELDED PAYMENTS track.
Status: draft for review. No product code beyond the existing prototype (`/home/ubuntu/zcash/mesh/`) is written against this spec.

## 1. Purpose
In an internet blackout, people still need to pay each other and talk without exposing who they are or what they say. The product carries two things between nearby devices with no internet: a real shielded Zcash transaction, and sealed private messages and receipts. A device that regains internet broadcasts the transaction.

Success for this submission: a real shielded testnet transaction, built with the network blocked on a laptop, handed to an Android phone over a local Wi-Fi link with no internet, answered with a sealed receipt and message, then broadcast and confirmed on chain.

## 2. Scope
In:
- Offline PCZT build, sign and extract with `zcash-devtool`.
- Carrier library: packet format, sealed boxes, TTL, duplicate suppression, retransmission.
- Spend policy checked before building.
- A real two-device run (laptop and Android phone via Termux) over a hotspot with mobile data off.
- Threat model and limits in the README.

Out (documented as future work, never claimed):
- Real multi-hop radio. Only two devices are available. Multi-hop is covered by unit and simulation tests and labeled as such.
- Bluetooth transport (needs a native Android app).
- Hop-level metadata privacy (onion layering, cover traffic).
- Any UI.

### Stretch (only after acceptance tests A and B pass)
- Fixed-size cells: split every packet into equal-size cells so relays cannot distinguish `tx` from `sealed` by size.
- Random forwarding jitter to blur timing.
- Relay-kill test: drop a relay mid-transfer in simulation and assert delivery over a redundant path.
- Real multi-hop: only if a third device is available. Otherwise stays simulation-only and labeled so.
- Not attempted: trustless offline settlement (a ledger is required to prevent double-spend; FROST escrow is a research project), onion routing, cover traffic.

## 3. Architecture
Four units with narrow interfaces.
1. **Carrier** (`mesh.js`): `seal`, `open`, `Node`, `Network`. Knows nothing about Zcash.
2. **Policy**: `evaluatePolicy(policy, request)` returns `{allowed, reasons, policyHash}`. Ported in concept from `arc-policy-envelope`.
3. **Zcash bridge**: runs `zcash-devtool pczt create/prove/sign/combine/extract` and returns raw transaction bytes. Only unit that touches Zcash. Stock `pczt extract` prints only the txid, so this relies on a small local patch to our `zcash-devtool` clone (`extract --raw`, `send-without-storing --raw`). The mesh must carry the raw transaction and never the PCZT: a PCZT can contain the payer's viewing key, note plaintexts and derivation paths. (Review finding 2026-10-27; an earlier draft carried the combined PCZT.)
4. **Device runner**: one process per device, UDP socket on the local link, loads a node identity, sends and receives packets.

Packet kinds:
- `tx`: raw shielded transaction. Public on chain anyway. Any node with internet may broadcast it.
- `sealed`: encrypted to one recipient (X25519, ChaCha20-Poly1305). Recipients find theirs by trial decryption, so no recipient tag exists.

## 4. Data flow
1. Merchant (phone) shares its payment address and a ZIP 321 request.
2. Payer (laptop) runs the policy check, then builds, proves, signs and extracts the transaction with the network blocked.
3. Payer sends a `tx` packet and sealed packets (note and message) to the phone.
4. Phone decrypts, replies with a sealed receipt.
5. Payer reconnects and broadcasts. We confirm on a testnet explorer.

## 5. Error handling and limits
- Lost packets: retransmit for a fixed number of rounds. Simulation showed reliable delivery up to about 30% loss and failure at 40% and above with 4 rounds.
- Policy denial stops the flow before any transaction is built.
- Double-spend: bounded by the policy (per-payment cap, offline total, recipient allowlist, expiry), not prevented. The payer could spend the same notes elsewhere before broadcast.
- Relays and observers learn packet size, timing and neighbors. A relay may drop or delay packets.
- Offline transactions need an expiry later than the wallet default or none; verify against ZIP 203 and `zcash-devtool` before relying on it.
- `pczt prove` runs offline when given the wallet's age identity (verified 2026-10-28). `sign` must be given the proven PCZT for Sapling spends. Real transaction size: 5,222 bytes (Sapling recipient) to 20,986 bytes (unified recipient with Orchard receiver).

## 6. Testing
- Unit tests: carrier, sealed boxes (tamper and wrong recipient), policy, duplicate suppression, TTL. 7 exist.
- Simulation tests: loss and retransmission. Labeled simulation.
- Acceptance test A (real Zcash): build the transaction with the network blocked; assert extraction succeeds; broadcast after reconnect; assert confirmation. Skip with a clear message if `zcash-devtool` or funds are missing.
- Acceptance test B (real devices): laptop and phone exchange `tx` and sealed packets over the hotspot with mobile data off; assert the phone decrypts the message and the laptop decrypts the receipt.
- Evidence: logs and screenshots of the offline state, the packets, and the on-chain confirmation.

## 7. Prerequisites and risks
- `zcash-devtool` release build (running), a synced testnet wallet, and TAZ from the faucet (browser proof-of-work, done by the user).
- Termux with Node on the phone.
- One-day deadline: if acceptance test A or B cannot run, the submission states exactly which parts were not verified.

## 8. Claims we will and will not make
Will: private, offline, real shielded transaction and sealed messaging between two devices, confirmed on testnet.
Will not: trustless offline settlement, real multi-hop range, hop-level privacy, resistance to a relay that drops traffic.
