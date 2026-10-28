---
name: "Murmur judge page"
brand: ../BRAND.md
---

# Murmur judge page: DESIGN.md

## Overview

One published page with three hash-routed views (Home, Evidence, Limits) and in-page anchors for How it works, Commands and Simulation. Its job is to let a ZECATHON judge decide in a few minutes whether the project is real. The structure was first mirrored from the live xbow.com landing page, then deliberately diverged so it does not read as a copy: one unified electric-blue palette replaces XBOW's lime, and several sections are adapted from agentcard.sh instead (references captured with a headless browser on 2026-10-28). Our words, data and evidence throughout. Brand file: `../BRAND.md`.

## What comes from where

- Kept from the XBOW pass: the dark ground, flat hairline cards, big mono-like numbers, proof-first order (claim, then evidence), the lit-step reading focus, the footer ticker idea.
- Taken from Agentcard: the light serif hero headline and corner flare, chat bubbles under the hero, tilted window cards with file-name title bars on a thick border, stripe bands as dividers, the bento "Explore" cards with tilted mini windows, tabs beside a code window with an overlay card, devices drawn as connected window cards, and the blue footer with a ticker and a giant striped wordmark.
- Ours: the content, the run-log evidence, the interactive relay simulation, and the status vocabulary (verified, tests only, simulation, not run yet).

## Colors

| Role | Value | Use |
|---|---|---|
| `ink` | `#04050E` | page ground |
| `ink-2` / `ink-3` | `#090C1E` / `#0E1330` | cards, raised surfaces |
| `text` / `bright` / `dim` | `#AEB5D0` / `#F3F5FF` / `#8089AD` | body, headings, inactive and reading-focus text (at least 5.6:1) |
| `blue` | `#2B2BFF` | accent fill: buttons, borders, bubbles, footer, stripes |
| `blue-tx` | `#9BA6FF` | blue as text on dark (8.6:1); `#2B2BFF` is too dark for text |
| `red` | `#FF7D7D` | "not run yet" and offline only |

Single dark look, no light theme. State is a word plus an icon, never color alone.

## Typography

Newsreader Light for headings (tight tracking, as Agentcard's light serif), Geist for body, Geist Mono for code and file names, Silkscreen only for the ciphertext in the relay bubble.

## Layout

Container 1240px with a 16px side gutter plus safe-area insets. Section classes use `padding-block` so the gutter survives. Cards in threes stack below 900px; the device network switches from a landscape to a portrait arrangement below 720px.

## Components

Transparent sticky nav with pill buttons. Window card (file-title bar on a 4px blue border). Stripe band (blue to lavender). Bubble (plain, dashed-pixel, blue). Bento card with a tilted mini window. Tabs with a code window and overlay. Device window (select to inspect). Footer: stripes, blue panel, ticker, six-cell striped wordmark.

## Motion

1. Hero headline and section headings reveal word by word from dim to full.
2. Bubbles enter one after another (never below 35% opacity).
3. Proof cards start tilted and straighten as they reach the middle of the screen.
4. The "Why Murmur" statements use reading focus: the one nearest the middle is bright, the others dim.
5. Numbers count up; loss bars fill; code lines slide in on tab change; the hero flare drifts; the footer ticker scrolls; simulation packets travel the links.
All of it is off under reduced motion, with every element at its final state.

## Do's and Don'ts

Do show only numbers that trace to `evidence/` or the test run. Do label the simulation. Don't claim radio range, multi-hop, trustless settlement or anonymity. Don't call the payment-request flow verified on chain. Don't use lime.
