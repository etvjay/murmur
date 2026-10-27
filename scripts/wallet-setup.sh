#!/bin/sh
# Initialize a throwaway TESTNET wallet for the offline private mesh prototype.
#
# Usage: scripts/wallet-setup.sh <wallet-dir>
# (override the devtool binary with ZMESH_DEVTOOL)
#
# Prints ONLY the receiving address on stdout. The age identity file path and
# the (encrypted) mnemonic are never printed. Mainnet is never used: the
# network flag is hard-coded to `-n test` and the server to zecrocks.
set -eu

wallet_dir="${1:?usage: scripts/wallet-setup.sh <wallet-dir>}"
devtool="${ZMESH_DEVTOOL:-/home/ubuntu/zcash/repos/zcash-devtool/target/release/zcash-devtool}"
identity_file="$wallet_dir/dev-key.txt"

mkdir -p "$wallet_dir"

# Empty stdin is intentional: an automated init reads a line of mnemonic and
# generates a fresh one when the line is empty (see walkthrough.md). stdout is
# redirected to stderr so the address below stays alone on stdout.
"$devtool" wallet -w "$wallet_dir" init --name zmesh -i "$identity_file" -n test -s zecrocks \
  </dev/null 1>&2

# list-addresses prints an account line, a QR block (depending on build
# features) and `     Default Address: <ua>`; pick out just the address.
"$devtool" wallet -w "$wallet_dir" list-addresses \
  | awk '/Default Address:/ { sub(/^.*Default Address: */, ""); print; exit }'
