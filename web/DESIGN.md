---
name: "Murmur judge page"
brand: ../BRAND.md
---

# Murmur judge page: DESIGN.md

## Overview

Built from scratch on one source: XBOW. Colors and type values come from the A1 Gallery's measured tokens; the layout mirrors the live xbow.com landing page section by section (captured with a headless browser on 2026-10-28, because A1's home capture is older than the live site). No other reference. Four hash-routed views: Home (from the XBOW home and about pages), Evidence (from the customer story page), Simulation (from the contact page), Limits (from the testimonial grid). Our own words and data throughout.

## Colors (measured from XBOW's hero unless noted)

| Role | Value | Source |
|---|---|---|
| `ground` | `#00080B` | measured background |
| `panel` | `#000000` | measured surface |
| `card` | `#020F15` | measured secondary |
| `text` | `#AAB3B7` | measured text |
| `bright` | `#F0F6FA` | measured light |
| `lime` | `#CDFF00` | measured accent |
| `dim` | `#7D878B` | derived, inactive timeline items, at least 5.2:1 |
| `amber` / `red` | `#FFB547` / `#FF7468` | derived status colors (XBOW uses warm severity pills) |

Single dark look, as on XBOW. No light theme.

## Typography

Headings: Geist Mono 400, tracking -0.05em, line-height 1.0 at 72px (XBOW uses Avenue Mono at these values; Avenue Mono is commercial, Geist Mono is the closest face available on Google Fonts). Body: Geist (XBOW's measured body face), 18px, 20px for hero copy. Labels, chips, dates, nav, buttons: Geist Mono, small, uppercase where XBOW uses uppercase.

## Layout

Container 1368px (measured), dotted vertical guides at the page edges, dotted horizontal rules between sections, 24px gaps (measured), centered hero with generous top padding, three-column stat cards, two-column split layouts that stack below 860–960px.

## Elevation & Depth

Flat 12px cards with hairline borders (measured: border on, radius 12, maximum 22 for the big framed panel). Soft radial vignette inside the large framed panel. Lime glow only on the active timeline item and the beam, as in the XBOW about page.

## Components

Light pill nav with mono links and a dark call-to-action. Stat cards with large lime mono numbers. Framed proof panel with a crosshair, a vertical lime beam and a run-log console (rows with status chips). Numbered-ring timeline with dotted connector. Line-art cards with lime-on-teal corner gradient (from the XBOW blog). Case-study header with breadcrumb, chip and date, sticky table of contents with lime icon, lime-bar quote. Contact-style split with a form card. Status cards in a column grid.

## Motion

1. Stat numbers count up once when they come into view.
2. The beam in the proof panel grows with scroll; when it reaches the console, the run-log rows tick in order; the crosshair pulses.
3. Timeline: the step nearest the middle of the screen lights up (lime ring, lit card, glow); the others dim but stay readable. This is the page's reading focus.
4. Section headings reveal word by word from dim to full.
5. Simulation packets travel the links; lost packets stop and fade.
A1 records screenshots and tokens, not motion, so these are built from XBOW's "animated" and "scroll-animation" tags and the states visible in its captures. All motion is off under reduced motion, with every element at its final state.

## Do's and Don'ts

Do show only numbers that trace to `evidence/`. Do label the simulation as a simulation. Don't copy XBOW's wording or imagery. Don't hide text behind motion. Don't claim radio range, multi-hop, trustless settlement or anonymity.
