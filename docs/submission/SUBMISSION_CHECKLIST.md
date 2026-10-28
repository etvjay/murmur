# Murmur Submission Checklist

Legend: [x] done and verified, [ ] not done, [~] partly done. Items that need the owner are marked **(owner)**.

## Submission facts

- [ ] **(owner)** Confirm the ZECATHON cutoff time and time zone.
- [ ] **(owner)** Confirm what the submission form asks for (repo link, video, description, demo link).
- [ ] **(owner)** Decide the public repository location and account, then publish. Nothing has been pushed.
- [ ] **(owner)** Record the demo video from `DEMO_SCRIPT.md`.
- [ ] **(owner)** Submit on the hackathon site.

## Canon and evidence

- [x] Invariants, ground truth, PRD, status and ledgers exist and are consistent (`scripts/check-foundry.mjs`).
- [x] Run A, B and C evidence retained, with attempts and findings.
- [x] Claims and limits stated together (`CLAIMS_AND_LIMITS.md`); the simulation is labeled everywhere.
- [x] No mainnet, custody, anonymity, radio or trustless claims.
- [x] An earlier wrong claim (a 40-block expiry) was found and corrected from the source.
- [ ] The memo question is resolved (GAP-005).
- [ ] A real laptop-and-phone run (`docs/operations/acceptance-b.md`). Without it, no radio claim is made.

## Code and gates

- [x] `npm test`: 53 tests, 52 pass, 1 skipped.
- [x] The devtool patch applies cleanly to its base commit.
- [x] `scripts/scan-secrets.mjs` finds no key material in tracked files.
- [x] Clean-clone verification: `sh scripts/verify` passes from a fresh clone (53 tests, ledgers, secret scan, page build).
- [ ] A mainnet-address guard (GAP-001).

## Licenses

- [x] `MIT OR Apache-2.0`, matching the upstream devtool and librustzcash (`LICENSE-MIT`, `LICENSE-APACHE`).
- [x] Third-party notices, including fonts and the devtool patch (`THIRD_PARTY_NOTICES.md`).
- [x] Copyright holder in `LICENSE-MIT` is `etvjay` (confirmed by the owner).
- [ ] Crate-by-crate license audit of a devtool build, if a binary is ever distributed.

## Judge page

- [x] Responsive and checked in a headless browser at desktop and phone width.
- [x] Single static file; build script wraps it for hosting.
- [x] Deployed to https://murmurz.vercel.app (production). Checked in a headless browser: HTTP 200, security headers, all fonts load, no console or CSP errors, views and anchors work, the simulation runs (`docs/operations/DEPLOY_WEB.md`).
- [ ] **(owner)** Check it on a real laptop and a real phone.

## Competition

- [ ] Compare against what other ZECATHON entries and similar tools actually do. This was not researched, so the page and docs make no comparative claim.

## Runtime classification

- Implementation: `LOCAL_INTEGRATED`.
- Evidence: carrier and policy `TESTED`; three real testnet runs `LIVE_TESTNET` over loopback; relay on the page `SIMULATED`.
- Production status: not claimed. Testnet only.
