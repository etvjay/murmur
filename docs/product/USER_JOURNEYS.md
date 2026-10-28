# User journeys

Each journey names what the user does, what the system guarantees, and which evidence shows it.

## 1. Merchant asks for a payment

1. The merchant runs `murmur request --address <sapling address> --amount <zat> [--memo TEXT]`.
2. It prints a ZIP 321 URI as one JSON line: `{"kind":"request","uri":"zcash:...?amount=...&memo=..."}`.
3. The merchant shares the URI (QR, text, any channel) and runs `murmur listen` as the gateway or as a receiver of sealed receipts.

Guarantee: the URI parses back to the same address and amount (`test/zip321.test.js`). Evidence: `evidence/05-zip321-e2e/request.jsonl`, `uri.txt`.
Limit: the memo in the URI was not observed on chain.

## 2. Payer builds and hands over, offline

1. While online, the payer syncs the wallet (an offline build is valid for about 50 minutes after the last sync).
2. With the network cut, the payer runs `murmur pay --to <uri or address> --recipient-pub <hex> --peer HOST:PORT --identity ... --wallet ... --wallet-key ... --devtool ... [--account UUID]`.
3. The spend policy is checked first. A denied payment exits with code 2, names the reasons and runs the wallet zero times.
4. The wallet creates, proves, signs, combines and extracts the transaction. The carrier sends the raw transaction and a sealed receipt to the peer.

Guarantee: only the finished raw transaction is carried; the receipt is sealed to the merchant and authenticated to the payer's key. Evidence: `evidence/03-acceptance-a`, `evidence/05-zip321-e2e` (`payer.jsonl`, `offline-probe.txt`).

## 3. Gateway broadcasts

1. Any device that regains a connection runs `murmur listen --gateway --ack --devtool ... --wallet ...`.
2. It receives the transaction, drops duplicates, broadcasts it once and returns a sealed acknowledgement.
3. Or, with a saved transaction, `murmur broadcast --tx offline.tx --devtool ... --wallet ...`.

Guarantee: one broadcast per transaction. Evidence: `gateway-listener.jsonl` in Runs B and C.

## 4. Merchant sees the result

1. The merchant opens the sealed receipt (amount, policy hash, txid, the payer's key).
2. The payment is confirmed when the wallet reads the block that mined it.

Guarantee: the receipt tells the merchant a payment was handed over. Only the chain proves payment. Evidence: Run C mined in block 4,550,881.

## 5. Judge checks the claims

1. Open the judge page: the home view shows the story and the numbers; Evidence shows each run with its txid and block; Limits lists what is not proven.
2. Run the simulation to see the relay's rules under loss. It is labeled a simulation.
3. Run `sh scripts/verify` to check the tests, the ledgers and the secret scan.

## 6. Two people on real devices (not yet run)

The laptop-and-phone procedure is `docs/operations/acceptance-b.md`. Until it is run, no claim is made about real radio.
