Chain comparison (2026-10-28, ~14:40 UTC). Testnet only. Read-only.

Question: do testnet.zec.rocks (the chain server our wallet uses) and testnet.zcashexplorer.app follow the same chain?
Method: ask testnet.zec.rocks for the block hash at heights the explorer also has (getblock.mjs, gRPC GetBlock),
and compare with the hashes the explorer displayed (pasted by the owner at 14:32 UTC; the explorer blocks this machine).

Height 4496700
  explorer             0080560f1db9b5eb5369c75d45d33ef52c49333dc0e821a68d08e28ec5dde2a1
  zec.rocks (as served) bf970ca78f95a17f27a3669677a6f76d9a47257104c6c3ce0d8d3f2d118e0000
  zec.rocks (reversed)  00008e112d3f8d0dcec3c6047125479a6df7a6779666a3277fa1958fa70c97bf
Height 4496714
  explorer             019de2880617a0474e89a33872e5281b6d37d630b82066e5a0205707a002373c
  zec.rocks (reversed)  000026e08a37912ff980bb4491195fef7203e8dd9381c9f0bc1d274419c69721

Result: the hashes differ at both heights in either byte order. These are different chains.
Also, the explorer's tip was 4,496,714 at 14:32 UTC; zec.rocks was at 4,551,197 at the same minute.
Our transaction block 4550881 on zec.rocks: 0000158f00656c241c2749a6f9549963e8162c67adf6bb620ee470792a04e6eb.

Not established: which of the two is the canonical public Zcash testnet, and which network the hackathon uses.
The hackathon Resources page (as pasted by the owner) names no testnet server, faucet or explorer.
