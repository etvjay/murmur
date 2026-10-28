Attempt 2: the whole payer ran inside a no-network namespace.
Result: the offline build succeeded (payer.jsonl: sent, txid 5bee8c92..., 5,222 bytes; offline.tx saved) using a
spend of an externally received Sapling note from a separate account. It was NOT delivered: the namespace has its own
isolated loopback, so the gateway outside it never received the packets. This transaction was never broadcast and
is not used. The next run sends only the devtool steps into the namespace and carries over the host loopback.
