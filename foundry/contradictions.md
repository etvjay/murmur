# Murmur Contradictions

Conflicting statements found while building, and how each was resolved. Newest last.

| ID | Conflict | Resolution | Date |
|---|---|---|---|
| C-001 | The README said receipts and acknowledgements were not authenticated; authenticated sealing then shipped. | README, page and claims updated; the old "not done" statement removed. | 2026-10-28 |
| C-002 | The single-seed `scripts/demo.js` passes at 30% loss and fails at 40%; the multi-seed engine delivers about 93% and 72%. | Both are stated; the rates are labeled simulation and 300 seeds. | 2026-10-28 |
| C-003 | The payment request was labeled "tests only" on the page, then Run C paid one on the testnet. | Page and claims updated to `LIVE_TESTNET` with the memo caveat. | 2026-10-28 |
| C-004 | The offline expiry was stated as "about 40 blocks"; the wallet library's source sets 120 blocks since NU7 (25-second blocks), the same 50 minutes. The tip "4,550,681" quoted with it was inferred, not observed. | README, page, claims and findings corrected to "about 50 minutes" with the observed expiry and refusal heights. | 2026-10-28 |
| C-005 | A balance read for the new account was the old account's (the devtool prints every account). A poll built on it reported "spendable" early. | Per-account parsing; the finding is recorded in `docs/development/FINDINGS.md`. | 2026-10-28 |
| C-006 | The documents said testnet only, but `src/zip321.js` accepted mainnet Sapling (`zs1`) and regtest addresses, and `pay --to <address>` checked nothing. | Found while preparing the two-device test; fixed test-first (GAP-001 closed, CLM-016). | 2026-10-28 |
| C-007 | A note first said an explorer 'did not find the id in the owner's browser' (implying testnet failure), then a correction asserted it was a mainnet explorer. Neither was verified: the page footer says 'Mainnet', which is ambiguous, and both explorer hosts block this machine. | Both claims withdrawn; recorded as unknown (GAP-012). | 2026-10-28 |
| C-008 | `scripts/verify-on-chain.sh` printed 'not found' when the devtool binary was missing, so a real transaction (44e949b4…, block 4,551,855) was reported as absent. | Script fixed: a missing tool exits 2 with an error; tested with no tool, a real id and a fake id. Not yet released on `main`. | 2026-10-28 |
