# Agent Directive

Before modifying behavior, read in this order:

1. `PRD.md` (admitted scope and exclusions)
2. `docs/canonical/INVARIANTS.md` (what must always hold)
3. `docs/canonical/GROUND_TRUTH.md` (frozen boundaries and current evidence)
4. `foundry/state.json`, then open items in `foundry/gaps.jsonl`
5. affected claims in `foundry/claims.jsonl`
6. `docs/adr/` for the decision behind the code you are touching
7. the affected implementation and tests

## Hard rules

- **Testnet only.** Never put mainnet keys, mainnet addresses or real funds anywhere. Never print or commit a wallet identity, mnemonic or key file (`wallets/` is git-ignored; `scripts/scan-secrets.mjs` enforces it).
- **Nothing simulated without saying so.** Anything simulated is labeled "simulation" in its name and where it is shown.
- **No claim without evidence.** Do not report a state above what the evidence supports. Keep `IMPLEMENTED`, `TESTED`, `SIMULATED` and `LIVE_TESTNET` separate. A broadcast is not a confirmation. A sealed receipt is not proof of payment.
- **Test first.** Write the failing test, watch it fail for the right reason, then implement.
- **Evidence is immutable.** Add a new directory under `evidence/` for a new run. Do not rewrite an old run to describe a later state. Scrub secrets before committing.
- **Every new defect or unknown becomes a gap or assumption** in `foundry/`, and every meaningful fix should add a regression guard.
- **Side effects need an explicit decision.** Pushes, deploys, hosted-resource changes, spending testnet funds in bulk and credential use are not implied by a task. A local change is not a release.
- **The carrier relays only a finished raw transaction.** Never carry a PCZT.

## Verification

`sh scripts/verify` is the canonical local gate: tests, ledger consistency, secret scan, web build check. CI runs the same.

## Do not add

Mainnet support, a hosted payment service, key custody, a generic bridge, or any claim about radio range or real multi-hop until `evidence/` contains a run that shows it.
