# ADR-0004: The judge page's relay is a labeled simulation, separate from the carrier

**Status:** Accepted

## Context

Judges will not build a Rust tool or run a UDP mesh. They need something to look at. Only two physical devices were available, so real multi-hop could not be shown.

## Decision

The judge page (`apps/web`) includes an interactive six-device relay. It is a re-implementation of the carrier's rules (flooding, hop limit, duplicate drop, retransmission, seeded random loss) in the page's own script. It uses the browser's AES-GCM for the demonstration ciphertext, not the carrier's X25519 and ChaCha20-Poly1305. It is labeled "simulation" in its heading, in a badge, in every result line and in the Limits view.

Delivery rates shown on the page (93% of runs at 30% loss and 72% at 40%, four retransmit rounds, 300 seeds each) come from this simulation and are labeled as such.

## Consequences

- The simulation is not evidence about radio, range or the real carrier. Ground truth item 8 and invariant I-17 say so.
- Two implementations of the relay rules exist. They can drift. `test/mesh.test.js` covers the carrier; the page's engine was checked in Node against the same scenarios, not by a shared test. This is recorded as an accepted limit.
- Real multi-hop stays `not run` until a third device is available (GAP-003).

## Alternatives rejected

- Run the real carrier in the browser: needs UDP, which browsers lack.
- Show a recorded animation and call it a demo: not interactive, and easier to overclaim.
