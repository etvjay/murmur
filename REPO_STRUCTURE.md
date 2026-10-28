# Repository Structure

The portable map of the Murmur repository. `PRD.md` is the scope; this file is the quick orientation layer.

## Control plane

```text
PRD.md                 admitted scope, exclusions, evidence ceiling
STATUS.md              current verified state and evidence ceiling
AGENTS.md              read order and hard rules for agents and contributors
foundry/state.json     machine-readable state and counts
foundry/claims.jsonl   claim ledger (each claim has a state and evidence)
foundry/gaps.jsonl     gap ledger (each gap has a severity and disposition)
foundry/assumptions.md unresolved assumptions
foundry/contradictions.md conflicting sources found and how they were resolved
foundry/README.md      ledger fields and the claim-state vocabulary
```

The control plane records claims and evidence. It contains no application code.

## Product code

```text
src/mesh.js            carrier: sealed boxes (authenticated), flooding, hop limit, duplicate drop
src/wire.js            packet format, chunking and reassembly
src/runner.js          UDP device runner and identity files
src/policy.js          spend policy (per-payment and offline-total caps)
src/bridge.js          offline build and broadcast through the patched zcash-devtool
src/zip321.js          ZIP 321 payment-request encode and parse
bin/murmur.js          CLI: request, pay, listen, msg, broadcast, pubkey
patches/               the devtool patch, its base commit and its README
apps/web/              the judge page (single HTML file) and its build script
```

## Verification and operations

```text
test/                  unit, integration and stub-devtool tests (node:test)
scripts/verify         canonical local gate
scripts/check-foundry.mjs   ledger and link consistency check
scripts/scan-secrets.mjs    secret scan over tracked files
scripts/demo.js        6-node relay simulation (a simulation, not radio)
scripts/run-zip321-e2e.sh   the real payment-request run (testnet, needs sudo for an offline namespace)
scripts/acceptance-a.sh     the offline-build run that produced evidence/03
scripts/wallet-setup.sh     create a testnet wallet
scripts/verify-on-chain.sh  ask the chain server for transaction ids (found, or not found)
```

Live runners declare their target and outputs. They are not product logic.

## Evidence packages

```text
evidence/01-wallet-setup/   testnet wallet creation
evidence/02-sync/           wallet sync
evidence/03-acceptance-a/   Run A: shielded transaction built with the network cut
evidence/04-e2e-loopback/   Run B: carried across the carrier and confirmed
evidence/05-zip321-e2e/     Run C: ZIP 321 request paid end to end, plus attempts and findings
evidence/07-chain-readback/ each cited transaction looked up on the chain server, with negative controls
```

Each run gets a new directory. Keys never enter the repository. Old runs are not rewritten.

## Documentation

```text
docs/canonical/        INVARIANTS.md, GROUND_TRUTH.md
docs/adr/              accepted architectural decisions
docs/product/          product thesis and user journeys
docs/development/      design spec, plan, findings from the build
docs/operations/       two-device test, web deploy, forum post draft
docs/submission/       architecture, claims and limits, evidence index, demo script, checklist
docs/brand/            brand identity (BRAND.md)
```

README claims link to `STATUS.md`, the ledgers or the evidence index. Historical evidence is not rewritten to describe a later state.

## Branch contract

```text
main                   canonical integrated state
work/<slice>           active implementation
release/<version>      optional release branch
```
