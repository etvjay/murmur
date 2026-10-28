# Murmur Invariants

An invariant is something that must always hold. Each one below states what is enforced, where, and at what evidence level. If you change code that touches an invariant, keep its test green or update this file in the same change.

Status values: `ENFORCED` (a test or a script fails if it breaks), `TESTED` (covered by tests, but a determined change could still break it silently), `EVIDENCED` (shown by a retained real run), `POLICY` (a rule people follow; nothing fails if it is broken). A `POLICY` invariant is a gap until it is enforced; see the linked gap.

## Confidentiality and authenticity

| ID | Invariant | Status | Enforced by | Evidence |
|---|---|---|---|---|
| I-01 | A relay cannot read a sealed note. Only the addressed recipient opens it, and recipients find theirs by trial decryption (no recipient tag to link). | TESTED | `test/mesh.test.js`: "sealed message crosses 5 hops; relays cannot read it"; `test/runner.test.js`: "delivers a sealed message that only the recipient opens" | in-process and loopback only |
| I-02 | A sealed message cannot be forged in another sender's name, and old-format (unauthenticated) packets are rejected, not downgraded. | TESTED | `test/mesh.test.js`: "authenticated: genuine sealed message attributes the sender public key", "...rejects a forged sender claiming someone elses key", "...rejects old-format (unauthenticated) sealed packets" | `sender` field in `evidence/05-zip321-e2e/payer.jsonl` and `gateway-listener.jsonl` |
| I-03 | Tampered ciphertext, or a ciphertext addressed to someone else, never opens. | TESTED | `test/mesh.test.js`: "tampered ciphertext and wrong recipient fail to open" | |
| I-04 | Authentication binds a public key, not a person. | POLICY | Documented in `SECURITY.md`, `docs/submission/CLAIMS_AND_LIMITS.md`, the judge page | Not claimable as identity |

## Money

| ID | Invariant | Status | Enforced by | Evidence |
|---|---|---|---|---|
| I-05 | The carrier relays only the finished raw transaction, never a PCZT (which can hold viewing keys and note plaintexts). | TESTED | `test/bridge.test.js`: "stub: runs create, prove, sign, combine, extract in order" asserts the bridge returns `extract --raw` bytes | `patches/zcash-devtool-raw-tx.patch`; ADR-0001 |
| I-06 | The spend policy is evaluated before any wallet call. A denied payment runs the devtool zero times and names the reasons. | TESTED | `test/bridge.test.js`: "stub: does not invoke devtool when policy denies"; `test/cli.test.js`: "stub: pay exits 2 and names the reasons when policy denies, without running devtool"; `test/policy.test.js` | |
| I-07 | A gateway broadcasts a given transaction at most once; duplicates are dropped. | TESTED, EVIDENCED | `test/mesh.test.js`: "payment tx reaches the gateway once...", "duplicates are dropped even on a ring"; `test/runner.test.js`: "ignores a duplicate tx and calls onTx once"; `test/cli.test.js`: "stub: pay sends tx + sealed receipt; gateway listener broadcasts once..." | one `broadcast` line in `evidence/04-e2e-loopback` and `evidence/05-zip321-e2e` |
| I-08 | A sealed receipt is not proof of payment. The on-chain transaction is. | POLICY | Documented in `docs/canonical/GROUND_TRUTH.md` and shown on the judge page | Run B and C txids are on chain |
| I-09 | Murmur never holds keys. Keys stay in the wallet; the bridge passes a key file path to the devtool and never reads or prints it. | POLICY | Code review of `src/bridge.js` (it passes `identityFile` as an argument only). No test asserts that the bridge does not read the file. `scripts/scan-secrets.mjs` only guards tracked files | gap GAP-011 |

## Robustness

| ID | Invariant | Status | Enforced by | Evidence |
|---|---|---|---|---|
| I-10 | A packet's hop limit bounds its range. | TESTED | `test/mesh.test.js`: "ttl bounds the range" | |
| I-11 | Malformed or random datagrams never crash a device and never yield partial data; an incomplete message expires. | TESTED | `test/runner.test.js`: "drops garbage datagrams without throwing"; `test/wire.test.js`: "decodePacket returns null for truncated and random bytes", "expires an incomplete message after ttlMs and never returns partial bytes", "rejects chunk totals above 64" | |
| I-12 | An identity file is written with mode 0600, and a corrupt file is an error, never a silent key rotation. | TESTED | `test/runner.test.js`: "persists the identity file with mode 0600 and reuses it across runs", "rejects a corrupt identity file instead of silently rotating keys" | |
| I-13 | Large transactions survive chunking and out-of-order, duplicated delivery. | TESTED | `test/wire.test.js`: "roundtrips a 9000-byte tx packet", "reassembles chunks delivered out of order", "ignores duplicate chunks"; `test/runner.test.js`: "delivers a 9000-byte tx packet between two devices" | |

## Scope and honesty

| ID | Invariant | Status | Enforced by | Evidence |
|---|---|---|---|---|
| I-14 | Testnet only. No mainnet keys, addresses or funds. | ENFORCED (addresses) / POLICY (keys, funds) | `test/zip321.test.js`: "refuses mainnet and regtest addresses in encode and parse, and says why"; `test/cli.test.js`: "request refuses a mainnet address...", "stub: pay refuses a mainnet --to address: exit 1 and the devtool never runs", "stub: pay refuses a mainnet address inside a zcash: URI". Wallets are created with `-n test`. Keys and funds are not machine-checked | closes GAP-001 |
| I-15 | No secret enters the repository. | ENFORCED | `.gitignore` (`wallets/`, `*.key`, `*.identity`); `scripts/scan-secrets.mjs` in `scripts/verify` and CI | |
| I-16 | Every headline claim has a ledger entry whose evidence paths exist, and a claim never sits above the state its evidence supports. | ENFORCED | `scripts/check-foundry.mjs` validates `foundry/claims.jsonl` | |
| I-17 | Anything simulated is labeled as a simulation where it is shown. | POLICY | Judge page review; `scripts/demo.js` prints its label | The page labels the relay "simulation" in the heading and a badge |
| I-18 | Evidence packages are immutable: a new run gets a new directory. | POLICY | `AGENTS.md`; code review | |

## Adding or changing an invariant

1. State it as something that can be false.
2. Name the test or script that would fail. If there is none, mark it `POLICY` and open a gap.
3. Link the evidence, if a real run shows it.
4. Update `foundry/claims.jsonl` if a public claim depends on it.
