Chain read-back (2026-10-28, ~13:50 UTC). Testnet only.

Question: are the transactions the repository cites really on the Zcash testnet, at the blocks it states?
Method: ask the chain server for each transaction by id, independent of the wallet database:
    zcash-devtool inspect -l <txid>
The devtool talks to the public lightwalletd server testnet.zec.rocks (chain "test", NU7 consensus branch).
readback.txt holds the first lines of each answer.

Result:
  e5ecdc13...  faucet funding             mined in block 4549978
  5110a458...  Run B, carried             mined in block 4550000
  4d0ddfe5...  Run C payer funding        mined in block 4550789
  0efad38f...  Run C, ZIP 321 payment     mined in block 4550881
Negative controls (the lookup says no when it should): the transaction built offline in attempt 2 and never broadcast
(5bee8c92...), Run A's transaction, never broadcast (904164e1...), and a made-up id (000...001) all return
"This is most likely a hash of some sort", i.e. not a transaction on the chain.

What this does not show:
  - It used one server (testnet.zec.rocks). A second independent server was not queried.
  - A public TESTNET block explorer was not confirmed. From this machine the testnet explorers returned 403
    (bot blocking) or did not resolve. The owner's check used a MAINNET explorer (zcashexplorer.app, footer says
    "Mainnet"), where a testnet id is correctly "not found"; that says nothing against these transactions.
    testnet.zcashexplorer.app has not yet been checked from a browser. Do not cite an explorer link until one is verified.
  - It shows that the transaction exists and where it was mined. It does not reveal shielded contents (by design).
Noise: after the lines kept here the devtool panics ("parameter file size is not correct") because it then tries to
verify proofs and the Zcash proving parameters are not installed on this machine. That does not affect the lookup.
