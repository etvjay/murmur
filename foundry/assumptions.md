# Murmur Assumptions

| ID | Assumption | Status | Impact if false | Evidence needed | Resolution |
|---|---|---|---|---|---|
| ASM-001 | The first users are a merchant and a payer who can each run Node, and a gateway device that can reach the internet. | OPEN | The entry point may be wrong for real users. | Two-person trial on real devices. | — |
| ASM-002 | The payer syncs the wallet shortly before going offline (an offline build is valid for about 50 minutes). | OPEN | A payment built later is refused. | A real offline scenario with timing. | — |
| ASM-003 | Loopback evidence is enough for the hackathon claim, but not for any claim about radio. | RESOLVED | A demo could overclaim radio. | Every public claim says loopback and the Limits view lists the radio test as not run. | Keep all public claims loopback-bounded. |
| ASM-004 | A phone can run Node (for example under Termux) to take part. | OPEN | The two-device test may need a different phone setup. | The two-device run. | — |
| ASM-005 | The patched devtool at base commit 0b3436b stays available and buildable. | OPEN | The offline build cannot be reproduced. | A clean build from the patch (the patch applies cleanly; a full rebuild was not repeated). | — |
| ASM-006 | The Zcash testnet and the public lightwalletd server stay reachable for reproduction. | OPEN | Runs cannot be repeated. | None; they are third-party services. | Evidence is retained in the repository. |
