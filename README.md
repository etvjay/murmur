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
| A shielded tx survives chunking, loss and reordering | Verified over loopback UDP (real txs measured: 5,222 bytes to a Sapling recipient, 20,986 bytes to a unified address with an Orchard receiver) | `test/wire.test.js`, `test/runner.test.js` |
| CLI works between two separate OS processes | Verified on one machine, loopback only | `test/cli.test.js`, manual smoke run |
| Spend policy blocks a payment before any Zcash command runs | Verified (stub devtool) | `test/cli.test.js`, `test/bridge.test.js` |
| Wallet syncs and reads balance with the network cut off | Verified on testnet | `evidence/02-sync/` |
| A real shielded transaction built with the network blocked | **Verified.** `create`, `prove`, `sign`, `combine`, `extract` all succeeded inside a no-network namespace (DNS probe failed as required). Raw tx 20,986 bytes | `evidence/03-acceptance-a/` |
| Payer to gateway to chain, real devtool, through the CLI | **Verified over loopback UDP (no radio).** Payer and gateway printed the same SHA-256; sealed receipt read; ack returned; tx `5110a458bd641e5432fb6d11892dda2c70d55979bd360b09f7e13e48a4c8fd43` mined in testnet block 4,550,000 | `evidence/04-e2e-loopback/` |
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
node --test test/*.test.js        # 38 pass, 1 skipped (the real-devtool test, needs ZMESH_E2E=1 and a funded wallet)
node demo.js 30                   # 6-node simulation at 30% loss (simulation, not radio)
node cli.js pubkey --identity ~/id.json
node cli.js listen --port 47001 --identity ~/id.json --peer HOST:47002 --ack
node cli.js msg --port 47002 --recipient-pub <hex> --peer HOST:47001 --identity ~/id2.json --text "hi"
```
Real two-device procedure: `scripts/acceptance-b.md`. Real transaction procedure: `scripts/acceptance-a.sh` (needs a funded testnet wallet and `zcash-devtool`).

## Lessons from the real run
- `zcash-devtool pczt sign` fails with `MissingProofGenerationKey` on a Sapling spend unless it is given the **proven** PCZT: `prove` is what writes the proof-generation key into it. The bridge and script sign `proven.pczt`.
- `prove` works offline (the key is derived from the encrypted seed on the device).
- Transaction size depends on the recipient: about 5 KB to a Sapling address, about 21 KB to a unified address with an Orchard receiver. Larger transactions need more datagrams, so they are more sensitive to packet loss.

## Threat model and limits
- **Double-spend is bounded, not prevented.** Until the transaction is mined, the payer could spend the same notes elsewhere. The policy caps the exposure. Nothing here is trustless offline settlement; that needs a ledger.
- **Relays learn metadata.** They see packet sizes, timing and which neighbors sent what. Fixed-size cells, jitter and onion layering are future work. Today a relay can also tell `tx` packets from sealed ones.
- **Relays can drop or delay traffic.** Retransmission and redundant paths help; there is no guarantee. In the 6-node simulation with four retransmit rounds, about 93% of runs delivered at 30% loss and about 71% at 40% (300 seeds each, from the judge page's engine; the single-seed `demo.js` passes at 30% and fails at 40%).
- **Sealed messages ARE authenticated, content-side.** The sender's static key is mixed into the key derivation (blob format v2: version byte, sender key, ephemeral key, nonce, ciphertext, tag). A sealed message cannot be forged in someone else's name: a ciphertext not produced by the claimed sender's key fails the MAC. Packets from before this change are rejected, not downgraded to unauthenticated reads. What this does NOT give you: proof that a key belongs to a human, and any protection relay-side — a relay can still drop, delay or replay a genuinely sealed packet; replay suppression is per-node dedupe only.
- **An offline transaction expires about 40 blocks (roughly 50 minutes) after the wallet's last sync.** Observed on testnet: a transaction built when the wallet's tip was 4,550,681 carried expiry height 4,550,721, and the node refused it at height 4,550,785 ("must not be mined at a block Height greater than its expiry Height"). Sync right before going offline, and broadcast within the window. Whether an offline transaction can be given a later expiry is not verified; check ZIP 203 and your devtool version before relying on it.
- **The PCZT path cannot spend internal-scope change notes yet.** In this devtool build, `pczt prove` derives the proof-generation key from the external-scope Sapling key and `pczt sign` signs with the external authorizing key, so a Sapling spend of a change note fails with `SaplingVerify(WrongFvkForNote)`. The native `wallet send` signed the same change notes without error. Practical effect: after a wallet's first spend, later offline payments from the same account fail unless it still holds an externally received note. Workaround used in the real run: spend from an account that holds an externally received note. A proper fix needs a devtool change (choose the scope whose address matches each spend's recipient). Evidence: `evidence/05-zip321-e2e/attempt-1-change-note-sign-failure/`.
- **Multi-hop is simulated.** Only two physical devices were available. The relay code is exercised in tests and the demo, not over real radio.
- **No Bluetooth.** A browser or Termux process cannot do phone-to-phone Bluetooth; that needs a native app.
- **Testnet only.** Never put mainnet keys or funds into this.

## Layout
`mesh.js` carrier and sealed boxes, `wire.js` packet format and chunking, `runner.js` UDP device, `policy.js` spend policy, `bridge.js` `zcash-devtool` wrapper, `cli.js` commands, `scripts/` acceptance procedures, `evidence/` logs (no keys).

## Funding note
During the build the public Zcash testnet was past its NU7 upgrade (active since block 4,465,026). Two faucets failed (one answered "the wallet cannot pay this address" for every address type), and a third (Causeway) turned out to be a separate regtest chain. The wallet was funded by fauzec.com (1 TAZ, Sapling address, block 4,549,978).
