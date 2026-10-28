# Murmur Status

**Repository state:** `SUBMISSION_CANDIDATE`

**Network:** Zcash testnet only.

**Evidence ceiling:** `LIVE_TESTNET` for three runs over loopback; `TESTED` for the carrier, the policy and the bridge; `SIMULATED` for the relay on the judge page. No radio claim is made.

## Surface map

| Surface | Location | Current state |
|---|---|---|
| Carrier (sealed boxes, flooding, chunking, UDP runner) | `src/` | `TESTED` |
| CLI | `bin/murmur.js` | `TESTED` (in-process and stub devtool) |
| Spend policy and devtool bridge | `src/policy.js`, `src/bridge.js` | `TESTED` |
| ZIP 321 requests | `src/zip321.js` | `TESTED`, `LIVE_TESTNET` (Run C) |
| Devtool patch | `patches/` | applies cleanly to base `0b3436b` |
| Judge page | `apps/web/` | `IMPLEMENTED`; deployed to production at `https://murmurz.vercel.app` (checked 2026-10-28: HTTP 200, security headers, no console or CSP errors, all views working at desktop and phone width) |
| Evidence | `evidence/01` to `05` | immutable run packages |
| Ledgers | `foundry/` | 15 claims, 11 gaps, consistency-checked |

## Real runs (testnet)

| Run | Result |
|---|---|
| A | Shielded transaction built with every step offline (20,986 bytes); not broadcast |
| B | 5,222 bytes carried, one broadcast, mined in block 4,550,000 |
| C | ZIP 321 payment: every devtool step offline, loopback hand-over, one broadcast, mined in block 4,550,881 |

Details and caveats: `docs/submission/EVIDENCE_INDEX.md`.

## Gates

`sh scripts/verify` runs: 53 tests (52 pass, 1 skipped), ledger and link consistency, the secret scan and the judge-page build check. CI runs the same on Node 20 and 22.

## Open gaps by severity

High 1 (no real radio test; needs the owner's devices). Medium 4. Low 3. Three more are accepted limits. See `foundry/gaps.jsonl`.

## Not claimed

Real radio or phone-to-phone transfer; real multi-hop; a delivered memo; spending change notes through the offline path; trustless settlement; anonymous routing; mainnet; an audit.

## Next gate

1. Run the two-device test and retain the output (GAP-002).
2. Check the deployed judge page on a real laptop and phone (GAP-009).
3. Decide whether to fix the devtool's change-note signing (GAP-004) and resolve the memo (GAP-005).
4. Add the mainnet-address guard with a failing test first (GAP-001).
