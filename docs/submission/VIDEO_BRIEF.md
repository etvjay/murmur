# Murmur video brief (demo, launch and product reveal)

Everything a video maker (or the HyperFrames plugin) needs in one place. Written 2026-10-28. This file does not build a video. It is the source of truth for facts, wording, design and assets, so nothing on screen has to be invented.

Rule that overrides everything below: **every sentence, number and image on screen must trace to a file in this repo.** If something is not listed here as true, do not say it.

---

## 1. What to make

| Cut | Length | Where it is used | Audience |
|---|---|---|---|
| **Demo video** (required) | 1:50 target, **hard limit 2:00** | The ZKSNARKS Node 07 submission form field "Demo video" | ZECATHON judges, technical, skeptical |
| Launch / product reveal (optional) | 30 to 45 s | Social post, README header, forum post | Zcash builders |
| Vertical cut of the reveal (optional) | 20 to 30 s, 9:16 | Social | Same |

Deadline for the submission form: **Oct 28, 2026, 23:59 UTC**. Record the demo cut first; the others are extras.

Output: 1920x1080, 30 fps, MP4, clean audio. Captions on (judges often watch muted). Keep text inside the center 90% of the frame.

---

## 2. The product in plain words

**Name:** Murmur. **Tagline:** "Pay and talk when the network won't."

Murmur carries a real shielded Zcash transaction, and sealed private notes, from one nearby device to another when the network is down. Whoever reconnects first broadcasts the transaction, and it settles on chain.

How a payment moves:
1. A merchant asks for a payment with a ZIP 321 link.
2. The payer's wallet builds the shielded transaction with the network cut off (every wallet step runs offline).
3. The finished transaction and a sealed receipt travel device to device.
4. A gateway (any device that has internet again) broadcasts it once.
5. The chain mines it. The merchant opens the sealed receipt. The chain, not the receipt, is the proof of payment.

What it adds to a Zcash wallet: **a carrier** (transport with hop limit, duplicate drop, chunking), **a sealed hand-over** (receipt encrypted to one recipient, authenticated to the sender's key), and **a spend boundary** (per-payment and offline-total caps, checked before the wallet runs).

**The gap it fills:** offline payment pilots are run by issuers; offline messengers (Bitchat, Briar) carry no money; Zcash wallets assume a connection. Nothing joins private money and private words when the network is gone.

**Promise (use as the closing idea):** "What it moves, it moves sealed. What it claims, it can show."

### Message pillars (pick from these, do not add new ones)
1. It works without a network. A real shielded transaction was built with the network cut off.
2. It stays private in transit. Messages and receipts are sealed to one recipient; relays cannot read them.
3. It settles on chain. Any connected device broadcasts it, and it is mined.
4. It says what it cannot do. Limits are listed next to the claims.

### Approved phrases
"Built with the network cut." / "Sealed to one recipient." / "Shown, not claimed." / "Whoever reconnects first broadcasts." / "Sealed in transit." / "Pass it on."

---

## 3. Truth boundaries (read before writing any caption)

### You MAY say (each is backed by retained evidence)
| Claim | Evidence | Required caveat in the same breath |
|---|---|---|
| A real shielded Zcash transaction was built with the network cut off | `evidence/03-acceptance-a/` | Built, not broadcast, in Run A |
| A transaction crossed the carrier unchanged and was mined in block 4,550,000 | `evidence/04-e2e-loopback/` | Loopback on one machine, not radio |
| A ZIP 321 payment request was paid: every wallet step ran in a no-network namespace, one gateway broadcast it, mined in block **4,550,881** | `evidence/05-zip321-e2e/` | Loopback on one machine, not radio |
| The transaction ids are on the chain, and transactions never broadcast are not | `evidence/07-chain-readback/` | One chain server |
| Sealed notes are authenticated to the sender's key; forged senders and old-format packets are rejected | `test/mesh.test.js`, `sender` field in `evidence/05-zip321-e2e/payer.jsonl` | none |
| Testnet addresses only; mainnet and regtest addresses are refused | `test/zip321.test.js`, `test/cli.test.js` | none |
| 58 tests, 57 pass, 1 skipped | `sh scripts/verify` | The skipped one is stated |

### You MUST NOT say
- "Works over Bluetooth", "phone to phone", "real multi-hop", "radio", "range" (no such test has been run).
- "Trustless", "anonymous", "unstoppable", "unhackable", "production-ready", "audited".
- That the memo reached the merchant (it was not observed on chain, GAP-005).
- That a **public block explorer** shows these transactions. The public testnet explorer follows a different chain (GAP-012, `evidence/08-chain-comparison/`). The proof is the chain-server lookup.
- "**The** Zcash testnet" as if there were one network. Say **"a Zcash test network"** or "the testnet.zec.rocks network".
- That the relay simulation on the page is the real carrier.
- Any number that is not in section 4.

### Limits to state on camera (the "Limits" beat)
- No real radio or second physical device has been proven (Acceptance B may change this, see section 9).
- Multi-hop is a labeled simulation only.
- A payer can still double-spend before broadcast; the spend policy only caps the loss.
- An offline-built transaction expires about 50 minutes after the last sync.
- The devtool's offline signing cannot yet spend change notes.
- The cryptography is unaudited. Testnet only.

---

## 4. Verified facts and numbers

| Fact | Value | Source |
|---|---|---|
| Run C transaction id | `0efad38fd3d577779817d949caa695e4391adc4329b0700b6a4b37c5b66f96d7` (short: `0efad38f…96d7`) | `evidence/05-zip321-e2e/SUMMARY.txt` |
| Run C block / time | 4,550,881 / 2026-10-28 12:20:12 UTC | `list-tx-*-confirmed.txt` |
| Run C amount | 3,000 zat to the merchant account | `gateway-listener.jsonl` |
| Raw transaction size | 5,222 bytes | `payer.jsonl` |
| Transaction hash (sha256) | `ad973801c3c260fb041485cc41d6bbb91e01cd70e9e0cd26f3effdf9613124ca`, identical on payer and gateway | `payer.jsonl`, `gateway-listener.jsonl` |
| Run B transaction / block | `5110a458…8fd43` / 4,550,000 | `evidence/04-e2e-loopback/` |
| Run A raw transaction | 20,986 bytes, unified-address recipient, not broadcast | `evidence/03-acceptance-a/` |
| Offline proof | the same wallet call fails with `dns error ... Temporary failure in name resolution` | `evidence/05-zip321-e2e/offline-probe.txt` |
| Payment request | `zcash:ztestsapling1cvge...nlc?amount=0.00003&memo=bXVybXVyIHppcDMyMSBtZW1v` | `evidence/05-zip321-e2e/uri.txt` |
| Chain read-back blocks | 4,549,978 / 4,550,000 / 4,550,789 / 4,550,881 | `evidence/07-chain-readback/readback.txt` |
| Tests | 58 total, 57 pass, 1 skipped | `sh scripts/verify` |
| Relay simulation | about 93% of runs deliver at 30% packet loss (six devices, four retransmit rounds, 300 seeds per setting); **labeled simulation** | `docs/submission/CLAIMS_AND_LIMITS.md`, the page's Simulation section |
| Spend policy defaults | 1,000,000 zat per payment; 5,000,000 zat offline total (CLI defaults, overridable) | `bin/murmur.js` (checks in `src/policy.js`) |
| Carrier packet | sealed notes use X25519 + ChaCha20-Poly1305; chunks of 1,200 bytes, up to 64 | `src/mesh.js`, `src/wire.js` |
| Licence | MIT OR Apache-2.0 | `LICENSE-MIT`, `LICENSE-APACHE` |

Do not round, rename or restate these. Show hashes and ids in monospace, shortened with an ellipsis only as written above.

---

## 5. Design system (match the live page)

Source files: `docs/brand/BRAND.md`, `apps/web/DESIGN.md`, `apps/web/index.html`. Live reference: https://murmurz.vercel.app.

**Look in one line:** a night screen with one electric-blue light source. Near-black ground, thin blue stripe bands as horizons, and small windows with file-name title bars for every piece of evidence, as if each log were an open file.

### Color (single accent, no lime, no gradient neon)
| Role | Hex | Use |
|---|---|---|
| Night `ink` | `#04050E` | Frame background (mandatory) |
| `ink-2` / `ink-3` | `#090C1E` / `#0E1330` | Cards, raised surfaces |
| Mist `bright` | `#F3F5FF` | Headlines, primary text |
| `text` | `#AEB5D0` | Body text |
| `dim` | `#8089AD` | Inactive or secondary text |
| Electric blue | `#2B2BFF` | The one accent: buttons, borders, sender bubble, stripes, end card |
| `blue-2` / `blue-3` | `#4C4CFF` / `#7E86FF` | Hover and gradient steps |
| Signal tint `blue-tx` | `#9BA6FF` | Blue used **as text** on dark (`#2B2BFF` is too dark for text) |
| `blue-tint` | `#C9D0FF` | Stripe highlights |
| Red | `#FF7D7D` | Only for "not run yet" and "offline" |

State is a word plus an icon, never color alone ("verified", "simulation", "not run yet").

### Typography (all Google Fonts, open licence)
- **Headlines:** Newsreader Light (300), tight tracking (about -0.025em), Georgia fallback. Large, calm, lowercase-friendly serif.
- **Body / captions:** Geist 400 to 600.
- **Code, hashes, txids, file names, terminal:** Geist Mono 400 to 500.
- **Ciphertext only:** Silkscreen (pixel font), e.g. the relay's view `9F3A C71E 04B2 E8D1 5A60 B7F2`.

### Components to borrow
- **Window card:** a file-name title bar on a 4 px electric-blue border, content inside. Use for every log, terminal and evidence shot. Slightly tilted (a few degrees) at rest, straightening as it settles.
- **Chat bubbles:** plain for the sender, dashed pixel type for what a relay sees (ciphertext), blue for the reader. The hero conversation: "Paid. Two bags, pickup at 5." then `9F3A C71E 04B2 E8D1 5A60 B7F2` then the same plain text on the other side.
- **Stripe band:** thin blue-to-lavender horizontal stripes as dividers and as the horizon.
- **Footer / end card:** blue panel, scrolling ticker, giant striped wordmark "Murmur" (six cells). There is **no logo file**: the wordmark is Newsreader Light "Murmur", optionally with the striped treatment. A logo sting must be built from that.

### Motion language
- Headlines reveal word by word from dim to full.
- Bubbles enter one after another and never sit below about 35% opacity.
- Proof windows start tilted and straighten.
- Numbers count up. Packets travel along thin blue links between small device windows.
- Calm, exact, slightly stubborn pacing. Ease-out, no bounce, no shake. Hold each evidence shot long enough to read the number (about 3 s minimum for a txid or block).
- Reduced-motion rules on the web page do not apply to video, but keep flashes out.

### Do not
Neon gradients, lime, glow overload, stock "hacker" imagery, padlocks and green matrix text, anything that implies radio waves or range, any motion that suggests the simulation is the real system.

### Voice on screen
Plain, specific, evidence first. Short sentences. Lead with the fact, then the meaning ("5,222 bytes crossed unchanged. Both sides hash to the same value."). No exclamation marks. Prefer concrete nouns (transaction, receipt, relay) over "solution" or "platform". Litmus test: if a sentence would still be true with another mesh app's name on it, rewrite it.

### Accessibility
Text contrast at least WCAG AA (body on `#04050E` is 5.6:1 or better); captions burned in or provided; do not rely on color to separate verified from not verified.

---

## 6. Storyboard A: the demo cut (1:50, the one to submit)

About 190 spoken words, a few seconds of slack. Narration is first person plural, calm, unhurried. Source: `docs/submission/DEMO_SCRIPT.md`.

| Time | On screen | Narration |
|---|---|---|
| 0:00 | The judge page hero, then the three chat bubbles | "When the network goes dark, private money stops. Murmur carries a real shielded Zcash payment and a sealed note from device to device. Whoever reconnects first broadcasts it." |
| 0:12 | Terminal window: `offline-probe.txt` (DNS error) then `uri.txt` | "This is a retained run on a Zcash test network. The wallet built the payment inside a no-network namespace. This call fails with a DNS error, so there really was no network. The merchant's request is this ZIP 321 link." |
| 0:27 | Terminal window: `payer.jsonl` and `gateway-listener.jsonl` | "The payer sent 5,222 bytes over UDP. The gateway got the same hash, opened the sealed receipt, 3,000 zat, and broadcast once. The receipt and the ack carry the sender's key." |
| 0:41 | Terminal window: the block line for `0efad38f` | "Mined in block 4,550,881 on the test network. A receipt isn't proof of payment. The chain is." |
| 0:50 | Two terminals: listener and sender (live, loopback) | "Live, on loopback: a sealed message crosses and the listener prints it with the sender's key. Loopback is not radio." |
| 1:05 | The page's simulation: press Send payment, then Run 200 times | "On the demo page this is a simulation, labeled as one. Six devices, packet loss you set. About 93% deliver at 30% loss. It is not evidence about radio." |
| 1:20 | The page's Limits view | "Not proven: real radio or a second device, real multi-hop, and the memo. A payer can still double-spend before broadcast; the spend policy only caps the loss. An offline build lasts about 50 minutes. Testnet only." |
| 1:40 | End card: wordmark, tagline, URLs | "Murmur. Pay and talk when the network won't." |

End card text: `murmurz.vercel.app` and `github.com/etvjay/murmur` and "Testnet only."

If anything on screen fails while recording, cut to retained evidence. **Never re-run a payment live** (the payer account's only spendable notes are change notes the offline path cannot sign).

### Exact terminal lines to show (verbatim from the repo)
```text
# offline-probe.txt (the proof there was no network)
Connecting to testnet.zec.rocks:443
Error: transport error
Caused by:
    0: dns error
    2: failed to lookup address information: Temporary failure in name resolution

# uri.txt
zcash:ztestsapling1cvge2ycqhv40jrdgr82qd7nv8q57urzeg83nkw07e20uwzf7j4h4nm344mmrht07nhfvx5uwlnc?amount=0.00003&memo=bXVybXVyIHppcDMyMSBtZW1v

# payer.jsonl
{"kind":"sent","txid":"0efad38f…96d7","bytes":5222,"sha256":"ad973801…124ca"}
{"kind":"ack","of":"receipt","from":"fdc4b11c…046b","sender":"fdc4b11c…046b"}

# gateway-listener.jsonl
{"kind":"tx","bytes":5222,"sha256":"ad973801…124ca"}
{"kind":"receipt","amountZat":3000,"txid":"0efad38f…96d7","from":"b72cbbb5…d04a","sender":"b72cbbb5…d04a"}
{"kind":"broadcast","ok":true}
```
Use the full values from the files when they are shown large enough to read; the shortened forms above are for layout planning.

### The live message step (verified output)
```text
listener: {"kind":"message","text":"Paid. Two bags, pickup at 5.","from":"<B pubkey>","sender":"<B pubkey>"}
sender:   {"kind":"ack","of":"message","from":"<A pubkey>","sender":"<A pubkey>"}
```
Commands are in `docs/submission/DEMO_SCRIPT.md` (step 0:50). `/tmp/a.json` and `/tmp/b.json` must not exist before recording.

---

## 7. Storyboard B: launch / product reveal (30 to 45 s, silent-friendly)

A proposal. Every line below is built from approved phrases and section 4 facts only.

| Beat | Visual | On-screen text |
|---|---|---|
| 1 (0 to 4 s) | Black frame. A small "no connection" indicator in red `#FF7D7D`. Silence. | "The network is off." |
| 2 (4 to 9 s) | Bubble appears: "Paid. Two bags, pickup at 5." It turns into the pixel ciphertext. | "Sealed to one recipient." |
| 3 (9 to 16 s) | Two small device windows joined by a thin blue link; a packet travels between them. A caption below: "simulation" in a small chip. | "Pass it on." (and the chip: "simulation") |
| 4 (16 to 24 s) | A device reconnects (the red indicator turns blue). A "broadcast" line draws. | "Whoever reconnects first broadcasts." |
| 5 (24 to 32 s) | A file window: the txid and "Block 4,550,881" count up. | "Mined in block 4,550,881." |
| 6 (32 to 38 s) | A Limits window: three lines. | "No radio test yet. Testnet only." |
| 7 (38 to 45 s) | End card, blue panel, striped wordmark. | "Murmur. Pay and talk when the network won't." plus the URLs |

Vertical variant: stack the two device windows vertically and run beats 1, 2, 4, 5, 7 only.

---

## 8. Assets available

### Fonts
Google Fonts: `https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Silkscreen:wght@400;700&display=swap`

### Live surfaces to screen-record
- Judge page: https://murmurz.vercel.app (views: Home, Evidence, Limits; sections: How it works, Commands, Simulation). **The live site is currently an older build** (see section 9). Re-record the page after the redeploy so the wording matches.
- Repository: https://github.com/etvjay/murmur

### Existing screenshots (Playwright captures, may be stale after the redeploy; recapture)
`/home/ubuntu/tools/shots/`: `murmur-hero.png`, `mm-hero.png`, `mm-00.png` to `mm-05.png`, `mm-full.png`, `mm-phone.png`, `live-desktop.png`, `live-phone.png`. These live outside the repo on the build machine.

### Reference sites used for the page design (not for copying)
Structure from xbow.com; hero serif, bubbles, window cards, stripe bands and footer from agentcard.sh. The page deliberately diverged from both (one blue palette, our own content).

### Files in the repo to open on camera (read-only, safe)
`evidence/05-zip321-e2e/{offline-probe.txt,uri.txt,payer.jsonl,gateway-listener.jsonl,SUMMARY.txt}`, `evidence/07-chain-readback/readback.txt`, `docs/submission/CLAIMS_AND_LIMITS.md`.
The grep line to show the block: `grep -A3 0efad38f evidence/05-zip321-e2e/list-tx-e7e5c8b7-6382-4103-a6dd-3635f252e41e-confirmed.txt`

### NEVER show on screen
`wallets/` (any file), identity files (`*-id.json`, `/tmp/a.json`, `/tmp/b.json` contents), mnemonics, `dev-key.txt`, any wallet key file, or **viewing keys** (`uivktest...`, `uviewtest...`; they let a stranger watch balances). `scripts/scan-secrets.mjs` guards the repo, but a live terminal is not covered: check each frame.

### Audio
Narration is calm, unhurried, one voice. No music is required. If music is added, it must be royalty-free and low (under about -24 dB under voice); do not add sound effects that imply radio or a "hack". TTS is acceptable if it is clear; the script above is about 190 words.

---

## 9. Open items that may change the video

1. **Acceptance B (two real devices over Wi-Fi/hotspot, no internet).** Being run by the owner. If it passes, a new scene can show a real message crossing between a laptop and a phone over a link with the internet off, labeled "Wi-Fi link, two devices, no internet", **not Bluetooth and not range**. Evidence would land in `evidence/06-two-devices/`. Until then, say "no real radio or second device proven".
2. **Redeploy pending.** The branch `work/mainnet-guard` holds wording fixes (test-network phrasing, explorer mismatch note, related work) not yet on the live site or `main`. Wait for the redeploy before screen-recording the page.
3. **Network question.** The hackathon has not said which testnet submissions should use. Our evidence is on the network served by `testnet.zec.rocks` (chain `test`, NU7). Until that is settled, keep the phrase "a Zcash test network".
4. **Related work.** Offline Protocol's Mesh SDK targets the Bluetooth layer Murmur lacks (`docs/submission/RELATED_WORK.md`). Do not compare in the video; mention nothing about competitors.

---

## 10. Pre-export checklist

- [ ] Every number on screen appears in section 4.
- [ ] No banned phrase from section 3 (search the caption file for: bluetooth, radio, range, trustless, anonymous, unstoppable, audited, "the Zcash testnet", explorer).
- [ ] "Simulation" is visible whenever the relay or loss numbers are shown.
- [ ] Loopback is named wherever the carrier is shown.
- [ ] No key, identity file, mnemonic or viewing key visible in any frame (scrub frame by frame in the terminal shots).
- [ ] The demo cut is 2:00 or shorter.
- [ ] Captions on; text readable at phone size.
- [ ] End card shows both URLs and "Testnet only."
- [ ] Paste the final video link into the submission form, tick the public-repo checkbox, and submit before 23:59 UTC with time to spare.

---

## 11. Index of source files

| Need | File |
|---|---|
| Product thesis | `docs/product/PRODUCT_THESIS.md` |
| User journeys | `docs/product/USER_JOURNEYS.md` |
| Brand (colors, type, voice, claims) | `docs/brand/BRAND.md` |
| Page design spec | `apps/web/DESIGN.md` |
| Demo script and commands | `docs/submission/DEMO_SCRIPT.md` |
| Claims and limits | `docs/submission/CLAIMS_AND_LIMITS.md` |
| Evidence index and manifest | `docs/submission/EVIDENCE_INDEX.md`, `docs/submission/evidence-manifest.json` |
| Submission form text | `docs/submission/SUBMISSION_FORM.md` |
| Invariants | `docs/canonical/INVARIANTS.md` |
| Ground truth | `docs/canonical/GROUND_TRUTH.md` |
| Gaps (what is unproven) | `foundry/gaps.jsonl` |
