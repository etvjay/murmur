# Related work

Facts below come from public documentation read on 2026-10-28. Nothing here was installed or run, and no claim is made about how any product performs.

## Offline Protocol Mesh SDK

Offline Protocol publishes a mesh networking SDK for devices without internet: encrypted device-to-device messaging over Bluetooth LE, Wi-Fi peer streams and relays, device-issued identities, and store-and-forward delivery. Documentation: https://www.offlineprotocol.com/docs

- **Bindings.** React Native, Python (PyPI), Rust crates, plus Swift and Android previews. The Python binding's peer-stream transport is TCP over an existing IP network; the documentation states it does not create a Wi-Fi Direct network, and that Bluetooth has separate platform requirements.
- **Local use needs no account or API key**, per the documentation.
- **Licence.** The mesh SDK is AGPL-3.0-only, with a commercial licence available. Murmur is MIT OR Apache-2.0. Bundling or linking the SDK would make the combined work subject to the AGPL's terms, so Murmur does not depend on it. See https://www.offlineprotocol.com/docs/operations/licensing.md
- **Zcash.** The company's founder has publicly described a demo of a shielded ZEC payment between two phones over Bluetooth built on the SDK. We have not seen its code or evidence and make no claim about it.

### How it relates to Murmur

Murmur's gap is the transport. Its carrier runs over UDP on one machine and has no radio test (GAP-002). Offline Protocol's SDK targets exactly that layer, with real Bluetooth on phones. Murmur's contribution sits above the transport: a finished raw Sapling transaction built with every wallet step offline, a ZIP 321 request, sealed receipts and notes, a spend policy that caps the offline exposure, and a claims ledger tied to retained evidence.

### Why Murmur does not use it in this submission

1. It is a phone-app SDK. Using it means a native app tested on real devices, which this build environment cannot do (no Bluetooth).
2. Its licence differs from Murmur's.
3. It would bring its own session encryption (MLS), and Murmur's retained evidence was produced with its own carrier. Swapping the transport would invalidate that evidence until re-run.
4. A desktop Python test over TCP would show the same thing our loopback runs already show, not radio.

### Future work

Treat the SDK as a candidate Bluetooth transport behind Murmur's carrier interface: carry the same finished raw transaction as an opaque payload, and re-run the retained evidence on two phones. That would need either AGPL compliance for the transport component or a commercial licence, and a decision on where encryption lives.
