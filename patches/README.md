# patches

`zcash-devtool-raw-tx.patch` adds two flags to the devtool so the mesh can carry a bare raw transaction:

- `pczt extract --raw` prints the raw transaction bytes on stdout and the txid on stderr.
- `pczt send-without-storing --raw` submits raw transaction bytes as given.

Why: the stock `pczt extract` prints only the txid. A PCZT (partially created transaction) can contain viewing keys
and note plaintexts, so Murmur must never carry one. It carries only the finished raw transaction.

Apply to upstream `zcash/zcash-devtool` at the commit in `BASE_COMMIT`:

```sh
git clone https://github.com/zcash/zcash-devtool && cd zcash-devtool
git checkout $(cat /path/to/murmur/patches/BASE_COMMIT)
git apply /path/to/murmur/patches/zcash-devtool-raw-tx.patch
cargo build --release
```

License: the patch is a derivative of `zcash-devtool` and carries its terms, `MIT OR Apache-2.0`. See
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md). Known limits of the devtool's PCZT path that the run hit are
recorded in [`docs/development/FINDINGS.md`](../docs/development/FINDINGS.md).
