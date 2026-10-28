#!/bin/sh
# Real run: a ZIP 321 payment request -> a payment built with the network cut -> sealed hand-over over loopback UDP
# -> the gateway broadcasts once -> the wallet confirms. Testnet only.
#
# Prerequisites (all testnet):
#  - the patched zcash-devtool at $DEVTOOL
#  - a wallet at $WALLET with a funded PAYER account that holds an externally received Sapling note
#    (see README, "Spending change notes": the devtool's PCZT path cannot sign internal-scope change notes yet)
#  - sudo that can run `unshare -n` (the offline namespace)
#
# Usage: scripts/run-zip321-e2e.sh <payer-account-uuid> <merchant-sapling-address> [evidence-dir]
set -eu
ACCOUNT="${1:?payer account uuid}"
MERCHANT_ADDR="${2:?merchant sapling address}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVTOOL="${DEVTOOL:-$ROOT/../repos/zcash-devtool/target/release/zcash-devtool}"
WALLET="${WALLET:-$ROOT/wallets/acceptance-wallet}"
KEY="${WALLET_KEY:-$WALLET/dev-key.txt}"           # the wallet's age identity: passed by path, never printed
E="${3:-$ROOT/evidence/05-zip321-e2e}"
AMOUNT="${AMOUNT:-3000}"
MEMO="${MEMO:-murmur zip321 memo}"
PORT_G=21031; PORT_P=21032
mkdir -p "$E"; cd "$ROOT"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "== 1. sync, so the transaction expiry is measured from the real chain tip =="
"$DEVTOOL" wallet -w "$WALLET" sync -s zecrocks > "$E/sync-before.txt" 2>&1
"$DEVTOOL" wallet -w "$WALLET" balance "$ACCOUNT" > "$E/balance-before.txt" 2>&1 || true

echo "== 2. the merchant makes a ZIP 321 request =="
node bin/murmur.js request --address "$MERCHANT_ADDR" --amount "$AMOUNT" --memo "$MEMO" > "$E/request.jsonl"
URI="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$E/request.jsonl','utf8')).uri)")"
echo "uri=$URI" > "$E/uri.txt"

echo "== 3. the payer builds the payment with every devtool step OFFLINE (no-network namespace) and hands it over on loopback =="
# Each devtool call runs inside `unshare -n`; the carrier itself talks over the host's loopback to the gateway.
printf '#!/bin/bash\nexec sudo -n unshare -n sudo -u %s %s "$@" 2> >(grep -v "unable to resolve host" >&2)\n' "$(id -un)" "$DEVTOOL" > "$TMP/offline-devtool"
chmod +x "$TMP/offline-devtool"
# Probe: the namespace must have no route to the server, otherwise this run proves nothing.
if "$TMP/offline-devtool" wallet -w "$WALLET" get-info > "$E/offline-probe.txt" 2>&1; then
  echo "ERROR: the namespace can reach the network; aborting" >&2; exit 1
fi
node bin/murmur.js pubkey --identity "$TMP/m.id" > /dev/null
node bin/murmur.js pubkey --identity "$TMP/p.id" > /dev/null
MPUB="$(node bin/murmur.js pubkey --identity "$TMP/m.id")"
node bin/murmur.js listen --port $PORT_G --identity "$TMP/m.id" --peer 127.0.0.1:$PORT_P --gateway \
  --devtool "$DEVTOOL" --wallet "$WALLET" --ack > "$E/gateway-listener.jsonl" 2> "$E/gateway-listener.stderr" &
GPID=$!
sleep 1
node bin/murmur.js pay --to "$URI" --recipient-pub "$MPUB" --peer 127.0.0.1:$PORT_G \
  --identity "$TMP/p.id" --wallet "$WALLET" --wallet-key "$KEY" --devtool "$TMP/offline-devtool" --account "$ACCOUNT" \
  --wait-ms 30000 --port $PORT_P --save-tx "$E/offline.tx" > "$E/payer.jsonl" 2> "$E/payer.stderr" || true
sleep 2
kill $GPID 2>/dev/null || true
wait $GPID 2>/dev/null || true

echo "== 4. confirm: sync, balance, transactions =="
"$DEVTOOL" wallet -w "$WALLET" sync -s zecrocks > "$E/sync-after.txt" 2>&1 || true
"$DEVTOOL" wallet -w "$WALLET" balance "$ACCOUNT" > "$E/balance-after.txt" 2>&1 || true
"$DEVTOOL" wallet -w "$WALLET" list-tx "$ACCOUNT" > "$E/list-tx.txt" 2>&1 || true
echo "payer:";   cat "$E/payer.jsonl"
echo "gateway:"; cat "$E/gateway-listener.jsonl"
