# zmesh: offline private payments and messaging for Zcash

Built for ZECATHON (SHIELDED PAYMENTS). Testnet only.

In an internet blackout, people still need to pay each other and talk without exposing who they are or what they say. zmesh carries two things between nearby devices with no internet:

- a real shielded Zcash transaction, built offline, and
- sealed private messages and receipts (X25519 + ChaCha20-Poly1305, no recipient tag, so a relay cannot read them or tell whom they are for).

A device that regains internet broadcasts the transaction.

## Status: what is verified and what is not

| Claim | Status | Evidence |
|---|---|---|
| Sealed messages cross a mesh; relays cannot read them | Verified in tests (simulation and loopback UDP) | `test/mesh.test.js`, `test/runner.test.js` |
| A shielded tx (2-9 KB) survives chunking, loss and reordering | Verified over loopback UDP | `test/wire.test.js`, `test/runner.test.js` |
| CLI works between two separate OS processes | Verified on one machine, loopback only | `test/cli.test.js`, manual smoke run |
| Spend policy blocks a payment before any Zcash command runs | Verified (stub devtool) | `test/cli.test.js`, `test/bridge.test.js` |
| Wallet syncs and reads balance with the network cut off | Verified on testnet | `evidence/02-sync/` |
| A real shielded transaction built with the network blocked | **Not yet run.** Needs testnet funds (faucets were down during the build; see below) | `scripts/acceptance-a.sh` |
| Broadcast and on-chain confirmation | **Not yet run** | `scripts/acceptance-a.sh` |
| Laptop and phone exchange a message over a real Wi-Fi link | **Not yet run** (needs the devices) | `scripts/acceptance-b.md` |
| Multi-hop relaying over real radio | **Not tested.** Only simulated | `test/mesh.test.js`, `demo.js` |

Update this table from `evidence/` when the acceptance runs finish. Anything without evidence stays "not run".

## How it works
1. The payer's wallet (`zcash-devtool`) builds, proves and signs a PCZT offline, then extracts the final raw transaction.
2. The carrier sends the raw transaction (`tx` packet) and a sealed receipt/message to nearby devices over UDP, chunked to fit the link, with a hop limit, duplicate suppression and per-packet retransmission.
3. Any device with internet broadcasts the `tx` packet once. The recipient decrypts the sealed receipt.
4. A spend policy (per-payment cap, offline total, recipient allowlist) runs before anything is built.

**The mesh carries the raw transaction, never the PCZT.** A PCZT can contain the payer's viewing key, note plaintexts and derivation paths. Stock `zcash-devtool pczt extract` prints only the txid, so this repo relies on a two-flag local patch (`extract --raw`, `send-without-storing --raw`) to the `zcash-devtool` clone. The patch is not upstream.

## Run it
```
node --test test/*.test.js        # 38 pass, 1 skipped (needs a funded wallet)
node demo.js 30                   # 6-node simulation at 30% loss (simulation, not radio)
node cli.js pubkey --identity ~/id.json
node cli.js listen --port 47001 --identity ~/id.json --peer HOST:47002 --ack
node cli.js msg --port 47002 --recipient-pub <hex> --peer HOST:47001 --identity ~/id2.json --text "hi"
```
Real two-device procedure: `scripts/acceptance-b.md`. Real transaction procedure: `scripts/acceptance-a.sh` (needs a funded testnet wallet and `zcash-devtool`).

## Threat model and limits
- **Double-spend is bounded, not prevented.** Until the transaction is mined, the payer could spend the same notes elsewhere. The policy caps the exposure. Nothing here is trustless offline settlement; that needs a ledger.
- **Relays learn metadata.** They see packet sizes, timing and which neighbors sent what. Fixed-size cells, jitter and onion layering are future work. Today a relay can also tell `tx` packets from sealed ones.
- **Relays can drop or delay traffic.** Retransmission and redundant paths help; there is no guarantee. The simulation showed reliable delivery up to about 30% packet loss and failure at 40% or more with four retransmit rounds.
- **Receipts and acks are not authenticated.** Sealed boxes hide the content but do not prove who sent it, so anyone who knows a recipient's public key can forge an ack. The on-chain transaction is the proof of payment, not the ack. Authenticated sealing (mixing the sender's static key into the key derivation) is the next fix.
- **Minimum expiry cannot be enforced offline.** The raw transaction's expiry height is set by the wallet. An offline transaction needs an expiry later than the wallet default or none; verify this against ZIP 203 and your devtool version before relying on it.
- **Multi-hop is simulated.** Only two physical devices were available. The relay code is exercised in tests and the demo, not over real radio.
- **No Bluetooth.** A browser or Termux process cannot do phone-to-phone Bluetooth; that needs a native app.
- **Testnet only.** Never put mainnet keys or funds into this.

## Layout
`mesh.js` carrier and sealed boxes, `wire.js` packet format and chunking, `runner.js` UDP device, `policy.js` spend policy, `bridge.js` `zcash-devtool` wrapper, `cli.js` commands, `scripts/` acceptance procedures, `evidence/` logs (no keys).

## Why testnet funding is not done yet
During the build the public Zcash testnet was upgrading to NU7 (active since block 4,465,026). The faucet we tried reported "the wallet cannot pay this address" for unified, Sapling and transparent addresses alike, and its status page showed zero payouts in 24 hours. The acceptance runs resume as soon as the wallet has testnet coins.
