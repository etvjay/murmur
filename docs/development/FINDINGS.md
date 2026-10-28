# Findings from the build

Things the build taught us that the next person should not rediscover. Each has a source: a run in `evidence/`, a test, or the upstream source. Where something is inferred and not observed, it says so. Open items are tracked as gaps in `foundry/gaps.jsonl`.

## Wallet and devtool

1. **`pczt sign` needs the proven PCZT for Sapling spends.** Signing the unproven one fails with `MissingProofGenerationKey`, because `prove` writes the proof-generation key into the PCZT. `src/bridge.js` therefore signs `proven.pczt`. Source: the early failure kept in the page's log cards and `test/bridge.test.js` ordering.
2. **A PCZT can contain viewing keys and note plaintexts.** Hence ADR-0001: carry only the raw transaction.
3. **Stock `pczt extract` prints only the txid.** The patch adds `--raw`.
4. **A unified-address recipient makes a ~21 KB transaction; a Sapling recipient makes ~5 KB.** Run A built 20,986 bytes (unified-address recipient). Runs B and C carried 5,222 bytes (Sapling recipient). Larger means more packets and more loss sensitivity.
5. **The PCZT path cannot sign internal-scope change notes** (`SaplingVerify(WrongFvkForNote)`). Cause: `prove` derives the proof-generation key from the external-scope Sapling key and `sign` uses the external authorizing key. Native `wallet send` signs them fine. ADR-0003, gap GAP-004. Source: `evidence/05-zip321-e2e/attempt-1-change-note-sign-failure/`; devtool `src/commands/pczt/prove.rs` and `sign.rs`. The upstream tests only use the internal key for outputs, never for spending an internal note.
6. **`wallet balance <uuid>` prints every account.** With more than one account, `wallet balance`, `list-addresses` and `pczt create` need an account UUID. The bridge's `--account` handles `pczt create`.

## Expiry

7. **An offline-built transaction is valid for about 50 minutes after the wallet's last sync.** The builder sets expiry = target height + a default delta: 40 blocks before NU7 and 120 blocks from NU7 onward (ZIP 218), about 50 minutes at 75-second and 25-second block spacing respectively. The testnet is past NU7. Observed: a send built against a stale tip carried expiry 4,550,721 and was refused at height 4,550,785 (`evidence/05-zip321-e2e/finding-offline-expiry/`). The exact tip the wallet believed at build time was not logged. Sync right before going offline.
8. **Not verified:** whether an offline transaction can be given a later expiry. Check ZIP 203 and the devtool before relying on it. Gap GAP-006.

## Running offline for real

9. **An isolated network namespace has its own loopback.** Running the whole payer in `unshare -n` cut it off from a gateway on the host, so attempt 2 delivered nothing (`attempt-2-offline-build-not-carried/`). The final run wraps only the devtool in the namespace (a wrapper that runs each call in `unshare -n`) and leaves the carrier on the host's loopback. The wrapper filters the benign `sudo: unable to resolve host` line, because the bridge reads the txid from the devtool's stderr.
10. **Prove the namespace is offline.** `scripts/run-zip321-e2e.sh` probes with a devtool call that must fail; its output is `evidence/05-zip321-e2e/offline-probe.txt` (a DNS error).
11. **Sudo and namespaces.** `sudo -n unshare -n sudo -u <user> ...` is the working pattern here. Unprivileged `unshare` is blocked.

## Testnet and funding

12. **Faucets.** One public faucet (fauzec) worked with a plain Sapling address, and another path failed ("wallet cannot pay this address"). Only the one that worked was used. The funding of the Run C payer account used the native send between two accounts of the same wallet.
13. **A freshly funded account is not instantly spendable.** The devtool's default policy asks for 3 confirmations for trusted notes and 10 for untrusted ones (`wallet send --help`). The note sent between the wallet's own accounts was pending for several minutes after it was mined. The exact rule that applied was not isolated.

## Memo

14. **The memo in a ZIP 321 request was not observed in either wallet's view of Run C.** A memo sent with native `wallet send` was displayed on both sides. `pczt inspect` does not print memos, so the test of whether the PCZT path drops the memo was inconclusive. Treat memo delivery as unverified (GAP-005) and do not build message-carrying features on it until it is resolved.

## Process

15. **Check the account when you read a balance.** Twice during this build a balance for the wrong account was read as the new account's. The fix was to parse the per-account block, and to stop trusting a poll whose output was `?`.
16. **Evidence first, claims second.** Two claims were corrected during the build: the earlier "authenticated receipts: not done" became stale when authentication shipped, and an earlier "about 40 blocks" expiry statement was wrong for a post-NU7 testnet.
