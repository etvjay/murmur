# Offline Private Mesh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry a real offline-built shielded Zcash transaction plus sealed private messages between a laptop and an Android phone with no internet, then broadcast and confirm on testnet.

**Architecture:** A dependency-free Node carrier (sealed boxes, TTL, dedup, retransmission) runs as one process per device over UDP. A thin bridge shells out to `zcash-devtool` for the PCZT create/prove/sign/combine/extract steps. A spend policy gates the bridge. Only the bridge touches Zcash.

**Tech Stack:** Node 24 (`node:test`, `node:crypto`, `node:dgram`), Termux Node on Android, `zcash-devtool` (Rust, built at `/home/ubuntu/zcash/repos/zcash-devtool/target/release/zcash-devtool`), Zcash testnet via the `zecrocks` lightwalletd server.

**Spec:** `/home/ubuntu/zcash/docs/superpowers/specs/2026-10-27-offline-private-mesh-design.md`

## Global Constraints
- No simulated components in the acceptance runs. Simulation tests must be labeled "simulation" in their names.
- Network: testnet only. Never use mainnet keys or funds.
- Packet kinds are exactly `tx` (cleartext raw shielded tx) and `sealed` (X25519 + ChaCha20-Poly1305, no recipient tag).
- Key files and wallet identity files are mode `0600` and never printed or committed.
- Default packet TTL is 8. Retransmit rounds default to 4.
- Claims allowed: private offline real shielded tx and sealed messaging between two devices, confirmed on testnet. Claims forbidden: trustless offline settlement, real multi-hop (unless a third device runs it), hop-level privacy, relay-drop resistance on real radio.
- Code lives in `/home/ubuntu/zcash/mesh/` (ES modules, no dependencies). `/home/ubuntu/zcash/mesh` is not a git repo yet.

## Review Focus
1. A shielded tx is 2-9 KB, larger than a safe UDP datagram: chunking and reassembly must survive reordering, duplicates and a missing chunk (incomplete messages expire, never deliver partial bytes).
2. Garbage or truncated datagrams from the network must be dropped without crashing the node.
3. A policy denial must stop the flow before `zcash-devtool` is invoked.
4. Insufficient wallet funds or a bridge failure must surface a clear error, not an empty or partial tx.
5. Receiving the same `tx` twice, or a gateway broadcasting a tx already on chain, must be harmless.

## File Structure
- `mesh/mesh.js` (existing): carrier only. Remove `evaluatePolicy` from it in Task 1.
- `mesh/policy.js`: `evaluatePolicy`.
- `mesh/wire.js`: packet and chunk encode/decode, reassembly.
- `mesh/runner.js`: UDP device runner.
- `mesh/bridge.js`: `zcash-devtool` wrapper.
- `mesh/cli.js`: `listen`, `pay`, `broadcast` commands.
- `mesh/cells.js`: stretch (padding, jitter).
- `mesh/test/*.test.js`, `mesh/scripts/*`, `mesh/README.md`.

---

### Task 1: Repo hygiene and policy split

**Files:**
- Create: `mesh/policy.js`, `mesh/test/policy.test.js`
- Modify: `mesh/mesh.js`, `mesh/demo.js`, `mesh/test/mesh.test.js`

**Interfaces:**
- Produces: `evaluatePolicy(policy: {maxPerPaymentZat, maxOfflineTotalZat, spentZat, minExpiryHeight, allowedRecipients?}, req: {amountZat, recipient, expiryHeight?}) -> {allowed: boolean, reasons: string[], policyHash: string}` exported from `policy.js`.

- [ ] **Step 1:** Move the existing policy test out of `mesh.test.js` into `policy.test.js` importing from `../policy.js`; add a test `allows when all limits satisfied` asserting `allowed === true` and `reasons` empty, and `recipient-not-allowed` appears when `allowedRecipients` excludes the request.
- [ ] **Step 2:** Run `cd /home/ubuntu/zcash/mesh && node --test test/policy.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3:** Move `evaluatePolicy` verbatim into `policy.js`; remove it from `mesh.js`; update `demo.js` imports.
- [ ] **Step 4:** Run `node --test test/`. Expected: all pass (note: pass each file explicitly if the directory form fails: `node --test test/*.test.js`).
- [ ] **Step 5:** `git init` in `/home/ubuntu/zcash/mesh`, add a `.gitignore` containing `wallets/`, `*.key`, `*.identity`, `node_modules/`, then commit `refactor: split policy from carrier`.

### Task 2: Wire format and chunk reassembly

**Files:**
- Create: `mesh/wire.js`, `mesh/test/wire.test.js`

**Interfaces:**
- Produces:
  - `encodePacket(pkt: {id: string, kind: 'tx'|'sealed', ttl: number, body: Buffer}) -> Buffer`
  - `decodePacket(buf: Buffer) -> pkt | null` (null on malformed)
  - `chunk(packetBytes: Buffer, maxPayload = 1200) -> Buffer[]` where each chunk carries `{msgId, index, total}`
  - `class Reassembler { constructor({ttlMs = 10000}); add(chunk: Buffer, now = Date.now()) -> Buffer | null }`

- [ ] **Step 1:** Write failing tests: `roundtrips a 9000-byte tx packet`; `reassembles chunks delivered out of order`; `ignores duplicate chunks`; `returns null until all chunks arrive`; `expires an incomplete message after ttlMs and never returns partial bytes`; `decodePacket returns null for truncated and random bytes`.
- [ ] **Step 2:** Run `node --test test/wire.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement the four exports in `wire.js`. Use a fixed header (version byte, kind byte, ttl byte, 16-byte id) and a 4-byte chunk header; reject chunk totals above 64.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: wire format with chunking`.

### Task 3: UDP device runner

**Files:**
- Create: `mesh/runner.js`, `mesh/test/runner.test.js`

**Interfaces:**
- Consumes: `Node`, `seal`, `open`, `newIdentity` from `mesh.js`; `encodePacket`, `decodePacket`, `chunk`, `Reassembler` from `wire.js`.
- Produces:
  - `loadOrCreateIdentity(path: string) -> identity` (file mode 0600; reuse across runs)
  - `startDevice({port: number, peers: {host: string, port: number}[], identity, onTx?: (tx: Buffer) => void, onSealed?: (msg: object) => void, retransmitRounds = 4, retransmitMs = 500}) -> {send(pkt), close(), stats}`

- [ ] **Step 1:** Write failing tests using two real `dgram` sockets on `127.0.0.1` in one test process (real UDP, not mocked): `delivers a 9000-byte tx packet between two devices`; `delivers a sealed message that only the recipient opens`; `drops garbage datagrams without throwing`; `ignores a duplicate tx and calls onTx once`.
- [ ] **Step 2:** Run `node --test test/runner.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `startDevice` on top of `Node` with a `Network`-compatible send adapter that chunks and sends via UDP, plus a timer for retransmission of held packets. Document in a comment that this task's tests use loopback; real-radio proof is Task 7.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat: UDP device runner`.

### Task 4: Zcash bridge

**Files:**
- Create: `mesh/bridge.js`, `mesh/test/bridge.test.js`, `mesh/scripts/wallet-setup.sh`

**Interfaces:**
- Consumes: `evaluatePolicy` from `policy.js`.
- Produces:
  - `buildOfflineTx({devtool: string, walletDir: string, identityFile: string, address: string, valueZat: number, memo?: string, policy, spentZat}) -> Promise<{tx: Buffer, policyHash: string}>` — throws `PolicyDenied` (with `.reasons`) before running any command; throws `BridgeError` with the failing subcommand and stderr otherwise.
  - `broadcastTx({devtool, walletDir, tx: Buffer, server = 'zecrocks'}) -> Promise<{txid: string}>`

- [ ] **Step 1:** Write failing unit tests with a stub `devtool` script (a tiny executable shell script in the test that records its arguments): `does not invoke devtool when policy denies`; `runs create, prove, sign, combine, extract in order`; `throws BridgeError naming the failing step`. Mark the stub tests as "stub" in their names. Add `real devtool builds a tx (ZMESH_E2E=1 only)` skipped unless the env var is set.
- [ ] **Step 2:** Run `node --test test/bridge.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement with `child_process.execFile` and the exact subcommands from `zcash-devtool/doc/walkthrough.md` (`pczt -w <wallet> create ...`, `prove`, `sign --identity`, `combine -i ... -i ...`, `extract`). Read `src/commands/pczt/extract.rs` first to confirm the extract output format and how to read the raw tx.
- [ ] **Step 4:** `scripts/wallet-setup.sh`: init a testnet wallet (`wallet -w <dir> init --name zmesh -i <key> -n test -s zecrocks`), print only the receiving address. Do not print the key file or mnemonic.
- [ ] **Step 5:** Run the stub tests. Expected: PASS. Commit `feat: zcash-devtool bridge`.

### Task 5: Acceptance A (real offline transaction)

**Files:**
- Create: `mesh/scripts/acceptance-a.sh`, `mesh/evidence/` (output directory)

- [ ] **Step 1:** Run the wallet setup, give the user the address and faucet link, and wait for them to fund it. Sync the wallet online and record the balance.
- [ ] **Step 2:** Verify offline capability of each step. Run `create`, `prove`, `sign`, `combine`, `extract` under `unshare -rn` (network namespace with no network). Record which succeed. If `prove` needs the network, record that and run it online, and state the result in the README.
- [ ] **Step 3:** Assert the extracted tx file is non-empty and is the expected size range (2-9 KB). Save command logs to `evidence/`.
- [ ] **Step 4:** Reconnect, broadcast via `broadcastTx`, record the txid, then confirm on a testnet explorer or by `wallet sync` and balance. Record the confirmation.
- [ ] **Step 5:** Commit evidence (without keys or mnemonics) `test: acceptance A evidence`.

### Task 6: CLI

**Files:**
- Create: `mesh/cli.js`, `mesh/test/cli.test.js`

**Interfaces:**
- Produces commands: `node cli.js listen --port N --identity FILE [--peer host:port ...] [--gateway --devtool PATH --wallet DIR]`; `node cli.js pay --to ADDR --amount ZAT --recipient-pub HEX --peer host:port --identity FILE --wallet DIR --devtool PATH --message TEXT`; `node cli.js pubkey --identity FILE` (prints the public key hex).

- [ ] **Step 1:** Write failing tests: `pubkey prints 64 hex chars`; `pay exits non-zero and names the reasons when policy denies`; `listen prints a decrypted message to stdout`. Use real UDP on loopback.
- [ ] **Step 2:** Run `node --test test/cli.test.js`. Expected: FAIL.
- [ ] **Step 3:** Implement with `node:util` `parseArgs`. `listen` prints each received sealed message as a JSON line and, with `--gateway`, calls `broadcastTx` on each `tx` once.
- [ ] **Step 4:** Run the tests. Expected: PASS. Commit `feat: CLI`.

### Task 7: Acceptance B (two real devices)

**Files:**
- Create: `mesh/scripts/termux-setup.md`, `mesh/scripts/acceptance-b.md`, `mesh/evidence/`

- [ ] **Step 1:** Write `termux-setup.md`: install Termux, `pkg install nodejs`, copy `mesh/` to the phone (adb push, or `scp` over the hotspot), run `node cli.js pubkey`.
- [ ] **Step 2:** Write `acceptance-b.md` with the exact procedure: enable the phone hotspot with mobile data off, join the laptop, note both IPs, phone runs `listen`, laptop runs `pay` with a transaction from Task 5, laptop is offline from the internet during the exchange (no uplink).
- [ ] **Step 3:** The user runs it. Capture: phone screenshot showing the decrypted message, laptop log showing the sealed receipt, and proof of no internet (failed `ping 1.1.1.1`).
- [ ] **Step 4:** Laptop reconnects and broadcasts (reuse Task 5's step). Save evidence. Commit `test: acceptance B evidence`.

### Task 8: Stretch — cells, jitter, relay-kill (only if Tasks 5 and 7 passed)

**Files:**
- Create: `mesh/cells.js`, `mesh/test/cells.test.js`, `mesh/test/relay-kill.sim.test.js`

**Interfaces:**
- Produces: `padToCells(buf: Buffer, cellSize = 1024) -> Buffer[]`, `unpadCells(cells: Buffer[]) -> Buffer`, `jitterMs(maxMs = 200, rng = Math.random) -> number`.

- [ ] **Step 1:** Tests: `all cells have equal size so tx and sealed are indistinguishable by size`; `unpad restores the original bytes`; `jitter stays within [0, maxMs]`; and a simulation test named `simulation: delivery survives killing one relay of three`.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS. **Step 5:** Commit `feat: fixed-size cells and jitter (stretch)`.

### Task 9: README, threat model, claims

**Files:**
- Create: `mesh/README.md`

- [ ] **Step 1:** Write the README from spec sections 1, 5 and 8: purpose, how to run Acceptance A and B, threat model (what relays see, double-spend bounded not prevented, relay can drop), results with links to `evidence/`, and an explicit "not verified" list for anything that did not run.
- [ ] **Step 2:** Check every claim against `evidence/`. Remove any claim without evidence.
- [ ] **Step 3:** Commit `docs: README and threat model`.

---

## Self-Review Notes
- Spec coverage: carrier (Tasks 1-3), policy (1), bridge (4), acceptance A (5), CLI (6), acceptance B (7), stretch (8), README and claims (9).
- Spec section 4 step 1 (merchant shares a ZIP 321 request) is covered by `pay --to ADDR --amount`; a full ZIP 321 URI parser is not built and the README says so.
- Chunking is core (Task 2), not stretch, because transactions exceed a safe datagram size. Padding and jitter remain stretch.
- Real multi-hop needs a third device: Task 8's relay-kill test is simulation and is labeled so.
