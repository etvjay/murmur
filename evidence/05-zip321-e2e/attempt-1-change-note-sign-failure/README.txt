Attempt 1 (kept as evidence of a limitation, not a success)
Signing a PCZT that spends an internal-scope change note fails in this devtool build:
  Error: Failed to sign Sapling spend 0: SaplingVerify(WrongFvkForNote)
Cause: `pczt prove` derives the proof-generation key from the external-scope Sapling key and `pczt sign` signs
with the external authorizing key, while a change note is addressed to the internal scope. The native
`wallet send` path signed the same change notes without error (wallet tx 4d0ddfe5...).
Workaround used in the run next to this folder: spend from a separate account that holds an externally received note.
