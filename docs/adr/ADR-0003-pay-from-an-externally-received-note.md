# ADR-0003: Real runs pay from an account holding an externally received note

**Status:** Accepted, with an open gap (GAP-004)

## Context

The offline build uses the devtool's PCZT path. Run C's first attempt failed at the signing step:

```text
Error: Failed to sign Sapling spend 0: SaplingVerify(WrongFvkForNote)
```

The wallet's only spendable notes were change notes from its own earlier spend. Those belong to the internal key scope. In the devtool, `pczt prove` derives the proof-generation key from the external-scope Sapling key and `pczt sign` signs with the external authorizing key, so a spend of an internal-scope note fails the signer's check that the key matches the note's recipient. The native `wallet send` signed the same change notes without error. The faucet note that worked on Oct 27 was received externally.

## Decision

Real runs spend from an account that holds an externally received Sapling note. For Run C a fresh account (`murmur-pay`) was created in the same wallet and funded from the existing account with the native `wallet send`, which signs correctly. The bridge takes an `--account <uuid>` so the devtool knows which account to spend from when the wallet has more than one.

The failed attempt is kept as evidence under `evidence/05-zip321-e2e/attempt-1-change-note-sign-failure/`.

## Consequences

- After a payer's first spend, later offline payments from the same account fail unless it still holds an externally received note.
- The README, the judge page and `docs/submission/CLAIMS_AND_LIMITS.md` state this limit.
- A proper fix is a devtool change: in `prove` and `sign`, choose the scope whose address matches each spend's recipient. It was not done because the devtool's dependency sources had been cleared from the build cache, so a rebuild means re-downloading them. It is recorded as GAP-004.

## Alternatives rejected

- Hide the limitation by only demonstrating a first spend: dishonest.
- Switch the offline build to the native send path: it needs the network for note witnesses and does not give the PCZT roles that make an offline build reviewable.
