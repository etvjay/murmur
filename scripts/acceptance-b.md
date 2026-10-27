# Acceptance B: two real devices, no internet on the link

Goal: prove the carrier works between a laptop and an Android phone over a real Wi-Fi link with the phone's mobile data off. Part 1 (messaging) needs no funds. Part 2 (payment) needs the funded wallet from Acceptance A. Run Part 1 first.

Evidence to keep (screenshots or pasted terminal text) goes in `mesh/evidence/03-devices/`. Do not paste key files or mnemonics.

## 0. Setup (both devices need internet once, only for this step)

**Laptop** (Node 18.3+ required):
```
cd /home/ubuntu/zcash/mesh   # or wherever the repo is
tar czf dist/zmesh.tgz --transform 's,^,zmesh/,' mesh.js wire.js runner.js policy.js bridge.js cli.js package.json
cd dist && python3 -m http.server 8000     # serves the tarball on your local network
```

**Phone** (Termux from F-Droid; the Play Store build is outdated):
```
pkg update && pkg install nodejs curl
```
Then, with the phone and laptop on the same Wi-Fi or the phone's hotspot:
```
curl -fsSO http://<LAPTOP_IP>:8000/zmesh.tgz && tar xzf zmesh.tgz && cd zmesh
node cli.js pubkey --identity ~/phone-id.json     # prints 64 hex chars: the phone's public key
```
Write the phone's public key down (it is not a secret). The identity file stays on the phone.

On the laptop: `node cli.js pubkey --identity ~/laptop-id.json`.

## 1. Go offline
1. Turn **mobile data off** on the phone. Turn **Wi-Fi hotspot on** (the phone shares nothing but a local network).
2. Join the laptop to the phone's hotspot. Disable any other network on the laptop (Ethernet, VPN).
3. Prove there is no internet. On the laptop: `ping -c 3 1.1.1.1` must fail. Screenshot it.
4. Find the two IPs. Laptop: `ip -4 addr` (the address on the hotspot interface). Phone: usually `192.168.43.1` (hotspot settings show it). In Termux, `ifconfig` may be blocked on newer Android; if so use the hotspot settings.
5. Allow inbound UDP on the laptop for port 47002 if a firewall is on (`sudo ufw allow 47002/udp`).

## 2. Part 1: private message, both directions
Phone (listener, acknowledges):
```
node cli.js listen --port 47001 --identity ~/phone-id.json --peer <LAPTOP_IP>:47002 --ack
```
Laptop (sender):
```
node cli.js msg --port 47002 --recipient-pub <PHONE_PUBKEY> --peer <PHONE_IP>:47001 \
  --identity ~/laptop-id.json --text "hello over a link with no internet" --wait-ms 5000
```
Pass when: the phone prints a JSON line with the text, the laptop prints a JSON line with `"kind":"ack"`, and the laptop exits 0. Screenshot both.

Optional range check: walk apart until delivery stops, and note the distance. Report it as measured, not as a guarantee.

## 3. Part 2: payment (needs a funded wallet)
Prerequisite: Acceptance A passed, so `evidence/` has a txid. The phone only runs the carrier (no wallet), so the payee is any testnet address you control, for example a second address from the same wallet (`wallet generate-address -p sapling`, then `zcash-devtool inspect <ua>` for the plain Sapling address). Build and send the payment with the network down:
```
node cli.js pay --to <RECIPIENT_TESTNET_ADDRESS> --amount 5000 --recipient-pub <PHONE_PUBKEY> \
  --peer <PHONE_IP>:47001 --port 47002 --identity ~/laptop-id.json \
  --wallet <WALLET_DIR> --wallet-key <WALLET_KEY_FILE> \
  --devtool /home/ubuntu/zcash/repos/zcash-devtool/target/release/zcash-devtool \
  --save-tx ~/offline.tx --wait-ms 8000
```
Pass when: the phone prints `"kind":"tx"` and `"kind":"receipt"` lines, the `sha256` on the phone equals the `sha256` on the laptop's `"kind":"sent"` line, and the laptop prints an `ack`.

## 4. Broadcast (back online)
Turn the hotspot off, reconnect the laptop to the internet, then:
```
node cli.js broadcast --tx ~/offline.tx --devtool <DEVTOOL> --wallet <WALLET_DIR>
```
Then sync the wallet and check the testnet explorer for the txid recorded by Acceptance A. Screenshot the confirmation.

## What this does and does not show
- Shows: a real private message and a real shielded transaction crossing a real Wi-Fi link with no internet, sealed receipt returned.
- Does not show: multi-hop relaying (two devices only), Bluetooth, or any protection against a relay that drops traffic.
- Receipts and acks are not authenticated: the sealed box hides content but does not prove who sent it. The on-chain transaction is the proof of payment, not the ack.
