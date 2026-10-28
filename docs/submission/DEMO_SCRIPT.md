# Demo script (1:50, for a two-minute limit)

Goal: show a judge, in order, what Murmur is, what was really done, and what is not proven. Everything on screen is either live, a retained run, or labeled a simulation. Say which one each time. About 190 spoken words; leave a few seconds of slack.

## Setup (before recording)

- Two terminals in the repo root, and a browser open on https://murmurz.vercel.app.
- For the live message step, `/tmp/a.json` and `/tmp/b.json` must not exist yet (the CLI creates them).
- Have these ready to paste (they only read files in `evidence/05-zip321-e2e/`):
  `cat evidence/05-zip321-e2e/offline-probe.txt evidence/05-zip321-e2e/uri.txt`
  `cat evidence/05-zip321-e2e/payer.jsonl evidence/05-zip321-e2e/gateway-listener.jsonl`
  `grep -A3 0efad38f evidence/05-zip321-e2e/list-tx-e7e5c8b7-6382-4103-a6dd-3635f252e41e-confirmed.txt`
- Do not show `wallets/` or any key file.

## Shot list

| Time | On screen | Say |
|---|---|---|
| 0:00 | Judge page: hero, then the three chat bubbles | "When the network goes dark, private money stops. Murmur carries a real shielded Zcash payment and a sealed note from device to device. Whoever reconnects first broadcasts it." |
| 0:12 | Terminal: the offline-probe and uri.txt command | "This is a retained testnet run. The wallet built the payment inside a no-network namespace. This call fails with a DNS error, so there really was no network. The merchant's request is this ZIP 321 link." |
| 0:27 | Terminal: the payer.jsonl and gateway-listener.jsonl command | "The payer sent 5,222 bytes over UDP. The gateway got the same hash, opened the sealed receipt, 3,000 zat, and broadcast once. The receipt and the ack carry the sender's key." |
| 0:41 | Terminal: the grep command | "Mined in testnet block 4,550,881. A receipt isn't proof of payment. The chain is." |
| 0:50 | Terminal A: `PUB=$(node bin/murmur.js pubkey --identity /tmp/a.json); node bin/murmur.js listen --port 47101 --identity /tmp/a.json --peer 127.0.0.1:47102 --ack`. Terminal B: `node bin/murmur.js msg --port 47102 --recipient-pub $PUB --peer 127.0.0.1:47101 --identity /tmp/b.json --text "Paid. Two bags, pickup at 5."` | "Live, on loopback: a sealed message crosses and the listener prints it with the sender's key. Loopback is not radio." |
| 1:05 | Browser: the simulation. Press Send payment, then Run 200 times | "On the demo page this is a simulation, labeled as one. Six devices, packet loss you set. About 93% deliver at 30% loss. It is not evidence about radio." |
| 1:20 | Browser: the Limits view | "Not proven: real radio or a second device, real multi-hop, and the memo. A payer can still double-spend before broadcast; the spend policy only caps the loss. An offline build lasts about 50 minutes. Testnet only." |
| 1:40 | Closing card (the page hero or a title slide) | "Murmur. Pay and talk when the network won't." |

Verified output of the 0:50 step:

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
