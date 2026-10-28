# Third-party notices

Murmur is licensed under either of [Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT), at your option.
This file lists what Murmur depends on, derives from, or loads, and under which terms. It records what was
checked; where a license was not checked here, it says so.

## What this repository contains

| Component | Where | License | Notes |
|---|---|---|---|
| Murmur source (carrier, CLI, tests, scripts) | `src/`, `bin/`, `test/`, `scripts/` | MIT OR Apache-2.0 | Node.js standard library only. No npm dependencies. |
| Judge page | `apps/web/` | MIT OR Apache-2.0 | One HTML file plus a build script. No bundled third-party code, images or logos. |
| Patch to `zcash-devtool` | `patches/zcash-devtool-raw-tx.patch` | MIT OR Apache-2.0 | A derivative of `zcash-devtool`; see below. |
| Evidence packages | `evidence/` | MIT OR Apache-2.0 | Logs from testnet runs. Contains public addresses, transaction ids and public keys only. Key material is excluded (see `scripts/scan-secrets`). |

## Required external tool: zcash-devtool

- Project: `zcash/zcash-devtool`. Licensed `MIT OR Apache-2.0` (declared in its `Cargo.toml`; its README repeats the dual license).
  The MIT file in the checkout used here reads "Copyright (c) 2020-2023 The Electric Coin Company".
- Murmur's patch applies to upstream commit `0b3436b` (see `patches/BASE_COMMIT`). It adds `pczt extract --raw`
  and `pczt send-without-storing --raw`. Because it is a derivative of that code, the patch carries the upstream
  terms (`MIT OR Apache-2.0`) and the upstream copyright notice.
- The devtool binary is **not** distributed in this repository. Building it pulls `librustzcash` and its crates.
  `librustzcash` declares `MIT OR Apache-2.0` at its workspace root. Crate-by-crate licenses for a given build
  were not audited here; run `cargo license` (or `cargo deny check licenses`) on your build before redistributing a binary.

## Web fonts on the judge page

The page loads these from Google Fonts at view time. They are not bundled or redistributed by this repository.
As listed on Google Fonts they are licensed under the SIL Open Font License 1.1:

- Geist and Geist Mono
- Newsreader
- Silkscreen

If you self-host them, keep their license files with the font files.

## Design references

The judge page's layout and motion ideas were studied from public websites (xbow.com and agentcard.sh) through the
A1 Gallery. No code, images, logos, fonts or copy were taken from them. The wording, data and illustrations are original.

## Protocol label

The sealed-box key-derivation string `zmesh-v2` in `src/mesh.js` is a wire-format constant from the project's earlier
working name. It is kept so blob format v2 stays compatible. It is not a trademark claim.

## Not included

Zcash, the Zcash testnet, the faucet used to fund the testnet wallet, and the public lightwalletd server
(`testnet.zec.rocks`) are third-party services. Murmur is not affiliated with or endorsed by them.
