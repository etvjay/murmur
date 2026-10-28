---
name: "Murmur judge page"
brand: ../BRAND.md
---

# Murmur judge page: DESIGN.md

## Overview

One published page with four hash-routed views: Home, Evidence, Simulation, Limits. Its job is to let a ZECATHON judge decide in a few minutes whether the project is real. The structure follows the XBOW reference (measured from its captured hero and its full-page screenshot): claim, then proof. Semantic match, not a copy: same roles and order, our own words, our own accent. Brand file: `../BRAND.md`; accessibility commitments are inherited.

Reference structure, top to bottom: light pill nav; centered two-line claim with an accent second line; one short paragraph and one small button; dashed divider; three bordered proof tiles with large accent numbers; a large framed panel that shows the product's own interface as proof; a centered thesis heading. Murmur's version: pill nav; "Anyone can claim a payment works offline. Murmur shows one that confirmed."; proof tiles (5 of 5, 5,222 bytes, block 4,550,000); a framed run log built from `evidence/`; a thesis section; a three-view note illustration; a "what we have not proven" block.

## Colors

| Role | Dark | Light | Origin |
|---|---|---|---|
| `ground` | `#00080B` | `#F4F6FB` | Measured from the reference (dark) |
| `tile` | `#020F15` | `#FFFFFF` | Measured from the reference (dark) |
| `panel` | `#000000` | `#FFFFFF` | Measured from the reference (dark) |
| `text` | `#AAB3B7` | `#3C4863` | Measured from the reference (dark) |
| `bright` | `#F0F6FA` | `#0F1830` | Measured from the reference (dark) |
| `accent` | `#F2B766` | `#8A5000` | Brand Lamplight, kept; the reference uses lime |
| `link` | `#7FA8FF` | `#1F4FBF` | Brand Relay blue |
| `text-dim` | `#77838A` | `#5F6B85` | Derived; reading focus only; at least 4.7:1 everywhere |
| `good` / `warn` / `bad` | `#5FD1A0` / `#F0A35E` / `#FF8E8E` | `#0B7A4E` / `#8A5000` / `#B3261E` | Semantic, never the accent |

State is always a word plus an icon, never color alone.

## Typography

Display and headings: IBM Plex Mono 400, tight tracking (-0.05em at the h1), line-height 1.0 at the largest size, as in the reference's monospaced 72px headline. Body: IBM Plex Sans 400/500 at 18px (hero paragraph 20px). Data, hashes, nav, buttons, pills: IBM Plex Mono. Scale: h1 clamp(2rem, 6.2vw, 4.5rem), h2 clamp(1.5rem, 3.6vw, 2.5rem). Body line length at most 65ch.

## Layout

Container 80rem with dashed vertical guides at its edges on wide screens, dashed horizontal dividers between sections, 24px-ish gaps, 16px minimum side gutter plus safe-area insets. Tiles: three columns, one column below 52rem. Framed panel contains a centered console of 50rem maximum.

## Elevation & Depth

Flat. Borders only (1px hairline, 12px radius). No shadow, no gradient, no blur, no glass, matching the reference's measured effects. Depth comes from three surface steps: ground, tile, panel.

## Shapes

12px radius for tiles, panels, pill nav and buttons (8px for small buttons, 10px for rows); 999px only for status pills.

## Components

Pill nav (light pill on dark, inverted in the light theme) with wordmark, four links, reading-focus and theme toggles. Proof tile. Framed run-log console with grouped rows (ring icon, step, detail, status pill). Thesis block. Same-note tiles. Evidence panels with copy buttons. Simulation stage, controls, inspector, labeled SIMULATION. Limits table.

## Motion

1. Text reveal on the thesis and "not proven" blocks: words move from `text-dim` to `text`, never from invisible.
2. Scroll motion: the run-log rows tick from pending to done in order as the panel enters; proof tiles rise 10px as they enter. Both rest fully visible.
3. Reading focus: the block nearest the viewport center keeps full text color, the others take `text-dim`. Toggle always visible, remembered when storage is available, off under reduced motion and forced colors.
All motion is disabled under reduced motion.

## Do's and Don'ts

Do show a number only if it traces to `evidence/`. Do label every simulated element "simulation". Don't use glass, shadows or gradients. Don't claim radio range, multi-hop, trustless settlement or anonymity. Don't copy the reference's wording. Don't hide text behind an animation.
