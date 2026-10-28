#!/bin/sh
# Ask the chain server for each transaction id and print where it was mined, or that it is not a transaction.
# Independent of any wallet database. Needs zcash-devtool (stock is enough).
#   scripts/verify-on-chain.sh <txid> [<txid> ...]
#   DEVTOOL=/path/to/zcash-devtool scripts/verify-on-chain.sh <txid>
# Exit: 0 all found; 1 at least one is not a transaction on the chain; 2 usage or the tool could not run.
set -u
DEVTOOL="${DEVTOOL:-zcash-devtool}"
[ "$#" -ge 1 ] || { echo "usage: $0 <txid> [<txid> ...]" >&2; exit 2; }
command -v "$DEVTOOL" >/dev/null 2>&1 || [ -x "$DEVTOOL" ] || { echo "error: cannot run '$DEVTOOL'. Set DEVTOOL=/path/to/zcash-devtool. Nothing was checked." >&2; exit 2; }
status=0
for tx in "$@"; do
  out=$("$DEVTOOL" inspect -l "$tx" 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
  if printf '%s\n' "$out" | grep -q "Mined in testnet block"; then
    echo "$tx  $(printf '%s\n' "$out" | grep -m1 'Mined in testnet block' | sed 's/^ *- *//')"
  elif printf '%s\n' "$out" | grep -q "most likely a hash"; then
    echo "$tx  not a transaction on the chain served to this tool"; [ "$status" -eq 0 ] && status=1
  else
    echo "$tx  could not be checked (tool or network error): $(printf '%s\n' "$out" | head -1 | cut -c1-120)" >&2; status=2
  fi
done
exit $status
