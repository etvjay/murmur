# foundry

The control plane's ledgers. They record what is claimed, what supports it and what is still open. They contain no application code. `node scripts/check-foundry.mjs` keeps them consistent with the repository.

## Files

| File | Holds |
|---|---|
| `state.json` | Machine-readable state: phase, evidence ceiling, counts of open gaps by severity |
| `claims.jsonl` | One claim per line, with its state and evidence paths |
| `gaps.jsonl` | One gap per line, with severity and disposition |
| `assumptions.md` | Unresolved assumptions and what would resolve them |
| `contradictions.md` | Conflicting sources found, and how each was resolved |

## Claim states

Ordered from weakest to strongest. A claim's `state` is what its evidence supports. Its `required_state` is what its public wording needs. The check fails if `state` is weaker than `required_state`.

| State | Meaning |
|---|---|
| `NOT_CLAIMED` | Deliberately not claimed. Recorded so nobody claims it by accident |
| `IMPLEMENTED` | Exists and builds; not independently verified |
| `SIMULATED` | Shown only by a simulation |
| `TESTED` | Covered by tests in `test/` |
| `LIVE_TESTNET` | Shown by a retained real testnet run in `evidence/` |

## Claim fields

`id`, `claim`, `category`, `state`, `required_state`, `evidence` (repository paths that must exist), `limitations`, `last_verified_head`, `last_verified_at`.

## Gap fields

`id`, `title`, `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `class`, `surface`, `status`, `expected`, `observed`, `evidence`, `closure`.

Status is `OPEN`, `CLOSURE_DEFINED` (the way to close it is known), `ACCEPTED_LIMIT` (stated as a limit, not to be fixed) or `CLOSED`. `OPEN` and `CLOSURE_DEFINED` gaps count as open in `state.json`.

## Rules

- A new defect or unknown becomes a gap or an assumption.
- A fix should add a regression guard, and then close the gap.
- Do not raise a claim's state without adding the evidence.
- Evidence under `evidence/` is immutable; add a new directory for a new run.
