# Demo script (about 3 minutes)

Goal: show a judge, in order, what Murmur is, what was really done, what it costs to trust, and what is not proven. Everything on screen is either live, a retained run, or labeled a simulation. Say which one each time.

## Setup (do before recording)

- Two terminals in the repo root, plus a browser on the judge page.
- Terminal A and B ready for the live message step. Node 18.3+, no install needed.
- Have `evidence/05-zip321-e2e/` open in an editor or `less` for the recorded-run step.
- Do not show wallet key files or `wallets/`. Do not show a mainnet anything (there is none).

## Shot list

| Time | On screen | Say |
|---|---|---|
| 0:00 | Judge page, hero and the three chat bubbles | "When the network goes dark, private money stops. Murmur carries a real shielded Zcash payment and a sealed note from device to device, and whoever reconnects first broadcasts it." |
| 0:20 | Scroll the three bubbles: payer, relay, merchant | "The payer writes a note. A relay in between sees only ciphertext. The merchant reads it. This illustration is not real output; the next part is." |
| 0:35 | Terminal: `cat evidence/05-zip321-e2e/offline-probe.txt`, then `cat evidence/05-zip321-e2e/uri.txt` | "This is a retained testnet run. First: a devtool call inside the no-network namespace fails with a DNS error, so the build really had no network. The merchant's ZIP 321 request is this URI." |
| 0:55 | `cat evidence/05-zip321-e2e/payer.jsonl` and `gateway-listener.jsonl` | "The payer built the payment offline and sent 5,222 bytes. The gateway received the same hash, opened the sealed receipt, 3,000 zat, and broadcast once. Both the acknowledgement and the receipt carry the sender's key." |
| 1:20 | `grep -A3 0efad38f evidence/05-zip321-e2e/list-tx-e7e5c8b7-6382-4103-a6dd-3635f252e41e-confirmed.txt` | "The wallet reads the block that mined it: testnet block 4,550,881. A receipt is not proof of payment; the chain is." |
| 1:40 | Terminal A: `PUB=$(node bin/murmur.js pubkey --identity /tmp/a.json); node bin/murmur.js listen --port 47101 --identity /tmp/a.json --peer 127.0.0.1:47102 --ack` ; Terminal B: `node bin/murmur.js msg --port 47102 --recipient-pub $PUB --peer 127.0.0.1:47101 --identity /tmp/b.json --text "Paid. Two bags, pickup at 5."` | "Live, on loopback: a sealed message crosses, the listener prints it with the sender's key, and the sender gets a sealed ack back. Loopback is not radio." |
| 2:05 | Browser: the simulation. Press Send, then Run 200 times | "This is a simulation, labeled as one. Six devices, packet loss you set, the carrier's rules. About 93% deliver at 30% loss, 72% at 40%. It is not evidence about radio." |
| 2:30 | Browser: Limits view | "What we have not proven: real radio or a second device, real multi-hop, the memo, spending change notes through the offline path. A payer can still double-spend before broadcast; the spend policy only bounds the loss. An offline build is good for about 50 minutes." |
| 2:50 | Terminal: `sh scripts/verify` finishing | "53 tests, 52 passing, one needs a funded wallet. Every claim is in a ledger with its evidence. Murmur. Pay and talk when the network won't." |

Step 1:40 needs `/tmp/a.json` and `/tmp/b.json` not to exist yet (the CLI creates them). Verified output of that step:

```text
listener: {"kind":"message","text":"Paid. Two bags, pickup at 5.","from":"<B pubkey>","sender":"<B pubkey>"}
sender:   {"kind":"ack","of":"message","from":"<A pubkey>","sender":"<A pubkey>"}
```

## Do not say

- "works over Bluetooth", "works phone to phone", "real multi-hop", "trustless", "anonymous", "unstoppable", "production-ready", "audited".
- That the memo was delivered.
- That the page's relay is the real carrier.

## If something fails on camera

Cut to the retained evidence. Never re-run a payment live: the payer account's only spendable notes are change notes, which the PCZT path cannot sign, and a new run needs a newly funded external note.

## Closing card

Judge page: https://murmurz.vercel.app · Repository: https://github.com/etvjay/murmur · Testnet only.
