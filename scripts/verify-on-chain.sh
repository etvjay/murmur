#!/bin/sh
# Ask the chain server for each transaction id and print where it was mined (or that it is not on chain).
# Independent of any wallet database. Testnet only. Needs zcash-devtool (stock is enough).
#   scripts/verify-on-chain.sh <txid> [<txid> ...]
#   DEVTOOL=/path/to/zcash-devtool scripts/verify-on-chain.sh <txid>
set -u
DEVTOOL="${DEVTOOL:-zcash-devtool}"
[ "$#" -ge 1 ] || { echo "usage: $0 <txid> [<txid> ...]" >&2; exit 2; }
status=0
for tx in "$@"; do
  out=$("$DEVTOOL" inspect -l "$tx" 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
  line=$(printf '%s\n' "$out" | grep -m1 "Mined in testnet block")
  if [ -n "$line" ]; then echo "$tx  $line"; else echo "$tx  not found as a transaction on the testnet"; status=1; fi
done
exit $status
