Finding: a transaction built against a stale chain tip is refused because its expiry height is already in the past.
send-built-on-stale-tip.txt is the end of the native `wallet send` output (2026-10-28, ~11:43 UTC): the node refused the
transaction because it "must not be mined at a block Height(4550785) greater than its expiry Height(4550721)".
The wallet had not synced for about two hours. After `wallet sync` the same send succeeded (see ../funding/).
Reading: the builder sets expiry = target height + a default delta. In the wallet library's source
(zcash_primitives builder.rs) that delta is 40 blocks before NU7 and 120 blocks from NU7 onward (ZIP 218), both
about 50 minutes at the respective block spacing. The testnet is past NU7, so an offline build is valid for about
50 minutes after the wallet's last sync. Whether a later expiry can be set offline is not verified.
Not observed here: the exact tip the wallet believed at build time (it is inferred, not logged).
