# Product thesis

## One line

Private money shouldn't depend on a network someone can switch off.

## The gap

Offline payment pilots exist, but they are run by issuers. Offline messengers exist, but they carry no money. Zcash already makes a payment reveal nothing about who paid whom, but a wallet assumes a connection. Nothing joins private money and private words when the network is gone.

## What Murmur is

A carrier and a spend boundary. A payment is requested (ZIP 321), built by the wallet with the network cut, handed over as a sealed hand-over between nearby devices, broadcast once by whoever reconnects first, and confirmed on chain.

It adds three things to a Zcash wallet:

1. **Transport.** The finished raw transaction and a sealed receipt travel device to device (UDP), with hop limits, duplicate drop and chunking.
2. **A sealed hand-over.** The receipt is encrypted to one recipient and authenticated to the sender's key. Relays cannot read it or link it to a recipient.
3. **A spend boundary.** Per-payment and offline-total caps, checked before the wallet runs, so offline exposure to double-spend is bounded.

## What Murmur is not

Not a wallet, a currency, a bridge or anonymous routing. Not trustless offline settlement: a payer can double-spend before broadcast, and the policy only caps the loss. Not a radio stack: it uses an existing link and is only shown over loopback so far.

## Who it is for

People who still need to pay and message privately when a network is down or shut off. The first audience is Zcash builders and hackathon judges who need to see that it is real, which is why the evidence is public and the limits are stated next to the claims.

## Why Zcash

The payment is a real shielded Zcash transaction. Relays can read it and learn nothing about payer, recipient or amount. A Bitcoin-style payment would expose the parties to every relay. The sealed notes are transport for the hand-over, not part of Zcash; a memo carried in the transaction would tie them closer to Zcash, but the memo was not observed on chain (GAP-005).

## Differentiation

Offline mesh messengers (for example Bitchat and Briar) carry private messages without a network and have no money layer. Zcash wallets make private payments and assume connectivity. Murmur joins the two. A comparison against specific competing hackathon projects was not done; see `docs/submission/SUBMISSION_CHECKLIST.md`.

## What would change the thesis

A real two-device run that fails; evidence that the memo cannot be carried; a devtool change that makes offline signing unworkable; or a way to double-spend that the spend policy does not bound.
